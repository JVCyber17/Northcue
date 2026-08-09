const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { simplifyRoute } = require("./src/routes/simplifyRoute");
const { warnIfSupabaseConfigMissing } = require("./src/config/supabaseConfig");
const { saveAnalyticsEvent } = require("./src/services/analyticsService");
const { saveFeedbackEvent } = require("./src/services/feedbackService");
const {
  getOrCreateAnonymousSessionId,
  appendAnonymousSessionCookie
} = require("./src/services/anonymousSessionService");
const { getPublicErrorResponse } = require("./src/utils/httpErrors");
const { readRequestBody, parseMultipartForm, jsonBodyToFields } = require("./src/utils/requestParsing");
const { loadEnvFile } = require("./src/utils/loadEnv");
const { inspectPdfPageLimit } = require("./src/utils/pdfSafety");
const { createRateLimiter } = require("./src/utils/rateLimiter");
const { cleanupOldTemporaryFiles } = require("./src/utils/temporaryStorageCleanup");

loadEnvFile(__dirname);
warnIfSupabaseConfigMissing();
assertSafeFileRetentionConfig();
assertSafeMeasurementLanguageConfig();

const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_FEEDBACK_BYTES = 64 * 1024;
const MAX_ANALYTICS_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const TEMP_FILE_RETENTION_MS = Number(process.env.TEMP_FILE_RETENTION_MS || 10 * 60 * 1000);
const TEMP_FILE_SWEEP_INTERVAL_MS = Math.max(60000, Number(process.env.TEMP_FILE_SWEEP_INTERVAL_MS || 5 * 60 * 1000));
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(__dirname, "private_storage", "uploads");
const RESULT_DIR = path.join(__dirname, "private_storage", "results");

// northcue.co.uk is the single canonical host. Requests arriving on the .uk
// domain (bare or www) are permanently redirected to the same path there.
const CANONICAL_HOST = "northcue.co.uk";
const HOSTS_TO_REDIRECT = new Set(["northcue.uk", "www.northcue.uk"]);

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

const rateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limitsByRoute: {
    "/api/simplify": Number(process.env.RATE_LIMIT_SIMPLIFY_MAX || 30),
    "/api/upload": Number(process.env.RATE_LIMIT_SIMPLIFY_MAX || 30),
    "/api/feedback": 20,
    "/api/analytics": 240,
    default: 60
  }
});

ensurePrivateFolders();

// Permanently redirect the .uk domain (bare or www) to the canonical .co.uk
// host, preserving the full path and query. Returns true if it handled the
// request. Any other host (including northcue.co.uk and Render's internal
// health-check host) is left untouched.
function redirectToCanonicalHost(req, res) {
  const host = (req.headers.host || "").split(":")[0].toLowerCase();
  if (!HOSTS_TO_REDIRECT.has(host)) return false;
  res.writeHead(301, { Location: `https://${CANONICAL_HOST}${req.url}` });
  res.end();
  return true;
}

// Sent on EVERY response, including redirects, 404s and static assets. Set with
// setHeader rather than inside each writeHead so no response path can be added
// later that quietly skips them.
//
// THE CSP IS BUILT FROM WHAT THE SITE ACTUALLY LOADS, which is unusually little:
// zero third party origins, self hosted woff2 fonts, no third party scripts, no
// analytics beacon, and no inline event handlers, so script-src needs no
// 'unsafe-inline'. Two relaxations are real and deliberate:
//
//   style-src 'unsafe-inline'  index.html carries 39 style= attributes. CSP
//     Level 3 covers those under style-src, so a strict policy would break the
//     page. BACKLOG: move those 39 attributes into styles.css and drop this,
//     which is the one change that would make this policy strict. The 52
//     element.style assignments in app.js are CSSOM and are NOT affected by CSP,
//     so they are not part of that work.
//   img-src data:               the wallpaper art is built as
//     url("data:image/svg+xml,...") in app.js. Without this the backgrounds go.
//
// frame-ancestors 'none' and X-Frame-Options DENY say the same thing to new and
// old browsers respectively. HSTS is deliberately WITHOUT preload: preload is
// hard to reverse and commits every subdomain.
const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'"
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // The photo button is <input type="file" capture>, which hands off to the OS
  // camera app and is not governed by this feature, so locking camera down does
  // not break it. getUserMedia is not used anywhere.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
};

function applySecurityHeaders(res) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
}

function createNorthcueServer() {
  return http.createServer(async (req, res) => {
    try {
      applySecurityHeaders(res);

      if (redirectToCanonicalHost(req, res)) return;

      const pathOnly = req.url.split("?")[0] || "/";

      if (req.method === "GET" && pathOnly === "/health") {
        return sendJson(res, 200, {
          status: "ok",
          service: "northcue",
          timestamp: new Date().toISOString()
        });
      }

      if (req.method === "GET") {
        return serveStaticFile(req, res);
      }

      if (req.method === "POST" && (pathOnly === "/api/simplify" || pathOnly === "/api/upload")) {
        if (isRateLimited(req, res, pathOnly)) return;
        return await handleSimplify(req, res);
      }

      if (req.method === "POST" && pathOnly === "/api/feedback") {
        if (isRateLimited(req, res, pathOnly)) return;
        return await handleFeedback(req, res);
      }

      if (req.method === "POST" && pathOnly === "/api/analytics") {
        if (isRateLimited(req, res, pathOnly)) return;
        return await handleAnalytics(req, res);
      }

      sendJson(res, 404, { error: "Not found." });
    } catch (error) {
      const response = getPublicErrorResponse(error);
      console.error("Request failed:", {
        code: error.code || "server_error",
        statusCode: response.statusCode
      });
      sendJson(res, response.statusCode, response.payload);
    }
  });
}

if (require.main === module) {
  const server = createNorthcueServer();
  startTemporaryFileSweeper();
  server.listen(PORT, () => {
    if (process.stdout.isTTY) {
      console.log(`Northcue is running at http://localhost:${PORT}`);
    }
  });
}

module.exports = { createNorthcueServer };

function ensurePrivateFolders() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(RESULT_DIR, { recursive: true });
  cleanupOldTemporaryFiles({
    directories: [UPLOAD_DIR, RESULT_DIR],
    maxAgeMs: TEMP_FILE_RETENTION_MS,
    logger: console
  });
}

// Refuse to start in production with raw-upload retention enabled. This env flag
// is a local-debugging escape hatch only; in production it would silently keep
// users' raw uploaded documents on disk, breaking the "deleted after processing"
// guarantee. Hard-failing here makes that impossible to enable by accident.
function assertSafeFileRetentionConfig() {
  if (process.env.NODE_ENV === "production" && process.env.CLEARSTEPS_ENABLE_FILE_RETENTION) {
    throw new Error(
      "CLEARSTEPS_ENABLE_FILE_RETENTION must not be set in production: it disables deletion of raw uploaded documents."
    );
  }
}

// The same shape, for the measurement-only language override. That flag lets an
// in-process caller ask the model for output in a language whose safety guards
// do not exist yet, which is exactly what must never be served to a reader.
//
// The service refuses it under NODE_ENV=production on its own, so this is the
// second of two locks rather than the only one. It is here because a deploy
// carrying the flag should fail loudly at boot rather than run with a dead
// setting nobody notices, which is the same argument as the line above.
function assertSafeMeasurementLanguageConfig() {
  if (process.env.NODE_ENV === "production" && process.env.CLEARSTEPS_MEASUREMENT_LANGUAGE) {
    throw new Error(
      "CLEARSTEPS_MEASUREMENT_LANGUAGE must not be set in production: it asks the model for output in languages whose safety guards are not built."
    );
  }
}

// Recurring sweeper so stragglers (e.g. a file whose unlink failed, or a crash
// before deletion) are removed during uptime, not only at startup. Lightweight
// and unref()'d so it never keeps the process alive on its own.
function startTemporaryFileSweeper() {
  const timer = setInterval(() => {
    cleanupOldTemporaryFiles({
      directories: [UPLOAD_DIR, RESULT_DIR],
      maxAgeMs: TEMP_FILE_RETENTION_MS,
      logger: console
    });
  }, TEMP_FILE_SWEEP_INTERVAL_MS);

  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

function isRateLimited(req, res, pathOnly) {
  rateLimiter.prune();
  const result = rateLimiter.check({
    routeKey: pathOnly,
    clientKey: getClientKey(req)
  });

  if (result.allowed) return false;

  sendJson(
    res,
    429,
    {
      success: false,
      code: "rate_limited",
      error: "Northcue is receiving too many requests from this browser right now. Please wait a moment and try again."
    },
    {
      "Retry-After": String(result.retryAfterSeconds)
    }
  );
  return true;
}

function getClientKey(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwardedFor || req.socket.remoteAddress || "unknown";
}

async function handleSimplify(req, res) {
  const anonymousSession = getOrCreateAnonymousSessionId(req);
  const contentType = req.headers["content-type"] || "";
  let fields = {};
  let file = null;

  if (contentType.startsWith("multipart/form-data")) {
    const body = await readRequestBody(req, MAX_UPLOAD_BYTES);
    const form = parseMultipartForm(body, contentType);
    fields = form.fields;

    if (form.file) {
      if (!ALLOWED_TYPES.has(form.file.contentType)) {
        return sendJson(res, 400, { error: "Please upload a PDF, JPG, PNG, WEBP, or text file." });
      }

      if (form.file.contentType === "application/pdf") {
        const pdfSafety = inspectPdfPageLimit(form.file.data, 5);
        if (!pdfSafety.allowed) {
          return sendJson(res, 400, {
            success: false,
            code: "pdf_too_many_pages",
            error: "Please upload a PDF with 5 pages or fewer for now."
          });
        }
      }

      const jobId = crypto.randomUUID();
      const filePath = path.join(UPLOAD_DIR, `${jobId}${extensionForType(form.file.contentType)}`);
      fs.writeFileSync(filePath, form.file.data);

      file = {
        jobId,
        savedPath: filePath,
        filename: form.file.filename,
        contentType: form.file.contentType,
        sizeBytes: form.file.data.length
      };
    }
  } else if (contentType.includes("application/json")) {
    const body = await readRequestBody(req, MAX_UPLOAD_BYTES);
    try {
      const json = JSON.parse(body.toString("utf8"));
      fields = jsonBodyToFields(json);
    } catch (error) {
      return sendJson(res, 400, { error: "Invalid JSON body." });
    }
  } else {
    return sendJson(res, 400, { error: "Use multipart upload or JSON text input." });
  }

  const isStoredAnalysisRequest = fields.action === "analyse" && fields.jobId;
  if (!file && !String(fields.pastedText || "").trim() && !isStoredAnalysisRequest) {
    return sendJson(res, 400, { error: "Upload a document or provide pasted text." });
  }

  const result = await simplifyRoute({
    file,
    fields: {
      ...fields,
      anonymousSessionId: anonymousSession.anonymousSessionId
    },
    directories: {
      uploadsDir: UPLOAD_DIR,
      resultsDir: RESULT_DIR
    }
  });

  if (anonymousSession.shouldSetCookie) {
    appendAnonymousSessionCookie(req, res, anonymousSession.anonymousSessionId);
  }
  sendJson(res, 200, result);
}

async function handleFeedback(req, res) {
  const anonymousSession = getOrCreateAnonymousSessionId(req);
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return sendJson(res, 400, { error: "Use JSON for feedback." });
  }

  const body = await readRequestBody(req, MAX_FEEDBACK_BYTES);
  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid JSON body." });
  }

  try {
    const result = await saveFeedbackEvent(payload, {
      anonymousSessionId: anonymousSession.anonymousSessionId
    });
    if (anonymousSession.shouldSetCookie) {
      appendAnonymousSessionCookie(req, res, anonymousSession.anonymousSessionId);
    }
    return sendJson(res, 201, {
      success: true,
      feedback_id: result.id
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error("Feedback save failed:", {
      statusCode,
      code: error.code || "feedback_save_failed"
    });
    return sendJson(res, statusCode, {
      success: false,
      error: statusCode === 400
        ? error.message
        : "Feedback could not be saved right now."
    });
  }
}

async function handleAnalytics(req, res) {
  const anonymousSession = getOrCreateAnonymousSessionId(req);
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return sendJson(res, 400, { error: "Use JSON for analytics." });
  }

  const body = await readRequestBody(req, MAX_ANALYTICS_BYTES);
  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid JSON body." });
  }

  try {
    const result = await saveAnalyticsEvent(payload, {
      anonymousSessionId: anonymousSession.anonymousSessionId
    });
    if (anonymousSession.shouldSetCookie) {
      appendAnonymousSessionCookie(req, res, anonymousSession.anonymousSessionId);
    }
    return sendJson(res, 202, {
      success: true,
      analytics_event_id: result.id
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error("Analytics save failed:", {
      statusCode,
      code: error.code || "analytics_save_failed"
    });
    return sendJson(res, statusCode, {
      success: false,
      error: statusCode === 400
        ? error.message
        : "Analytics event could not be saved right now."
    });
  }
}

function extensionForType(contentType) {
  if (contentType === "application/pdf") return ".pdf";
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "text/plain") return ".txt";
  return ".bin";
}

// Icon PNGs under /icons/ are stable brand assets that rarely change, so they
// get a real browser cache instead of the global no-store. This stops every
// page load and card render refetching the same icons. The lifetime is one
// week rather than a year with immutable, because the icon filenames are not
// versioned: if an icon file is ever redesigned under the same name, users
// pick it up within a week. HTML, JS, and CSS stay no-store below so deploys
// keep reaching users instantly.
const ICON_CACHE_CONTROL = "public, max-age=604800";

function serveStaticFile(req, res) {
  const pathOnly = req.url.split("?")[0] || "/";
  // Two literal rewrites, both to a real file that already exists.
  //
  // /privacy is the published privacy policy. It has to be a real URL: a council
  // doing due diligence pastes it into a form, a funder saves it, and someone
  // arriving from a search must get the policy rather than the app shell. It is
  // static HTML sharing this stylesheet, so it survives a hard refresh, works
  // opened cold, returns real content to a crawler, and still reads with
  // JavaScript disabled.
  //
  // THE REWRITE HAPPENS BEFORE THE EXTENSION LOOKUP ON PURPOSE. The request
  // becomes /privacy.html here, then flows through the SAME allowlist below with
  // no exception carved for it. Nothing extensionless is ever served, and the
  // guard added in ca6635f is untouched.
  const cleanUrl = pathOnly === "/" ? "/index.html"
    : pathOnly === "/privacy" ? "/privacy.html"
    : pathOnly;
  const decodedPath = decodeURIComponent(cleanUrl);
  const requestedPath = path.normalize(path.join(PUBLIC_DIR, decodedPath));

  if (!requestedPath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  if (!fs.existsSync(requestedPath) || fs.statSync(requestedPath).isDirectory()) {
    return sendJson(res, 404, { error: "Not found." });
  }

  // THIS IS AN ALLOWLIST, NOT A LOOKUP, and the difference is the whole point.
  //
  // It used to fall back to application/octet-stream for anything it did not
  // recognise, which meant every file inside public/ was on the public web
  // whether or not the site needed it. public/CLAUDE.md is engineering notes
  // that happen to live beside the frontend, and it was being served: it
  // described internal decisions and a list of known defects to anyone who
  // asked for /CLAUDE.md.
  //
  // Serving only the types a browser actually needs fixes the cause rather than
  // that one file, so a note, a backup or an export dropped into public/ later
  // is private by default instead of published by default. Nothing is moved or
  // deleted to achieve it; the files stay exactly where they are.
  //
  // .txt is here deliberately for assets/fonts/OFL.txt. The bundled fonts are
  // SIL Open Font Licence, and that licence travels with the font software, so
  // it stays reachable rather than being cut for tidiness.
  const SERVABLE_CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
    // Added deliberately, for one file: assets/northcue-privacy-policy.pdf, the
    // downloadable copy of the published policy that a funder or a council can
    // save. The allowlist exists to serve only what the site needs, and the site
    // now needs to serve this. It is the only .pdf in public/.
    ".pdf": "application/pdf"
  };

  const ext = path.extname(requestedPath);
  const contentType = SERVABLE_CONTENT_TYPES[ext.toLowerCase()];
  if (!contentType) {
    // Deliberately the same response as a file that is not there, so this
    // cannot be used to work out which files exist.
    return sendJson(res, 404, { error: "Not found." });
  }

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": decodedPath.startsWith("/icons/") ? ICON_CACHE_CONTROL : "no-store"
  });
  fs.createReadStream(requestedPath).pipe(res);
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}
