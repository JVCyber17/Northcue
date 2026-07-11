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
const { readRequestBody, parseMultipartForm } = require("./src/utils/requestParsing");
const { loadEnvFile } = require("./src/utils/loadEnv");
const { inspectPdfPageLimit } = require("./src/utils/pdfSafety");
const { createRateLimiter } = require("./src/utils/rateLimiter");
const { cleanupOldTemporaryFiles } = require("./src/utils/temporaryStorageCleanup");

loadEnvFile(__dirname);
warnIfSupabaseConfigMissing();
assertSafeFileRetentionConfig();

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

function createNorthcueServer() {
  return http.createServer(async (req, res) => {
    try {
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
      fields = {
        pastedText: typeof json.text === "string" ? json.text : "",
        documentCategory: typeof json.documentCategory === "string" ? json.documentCategory : "auto",
        action: typeof json.action === "string" ? json.action : "",
        jobId: typeof json.job_id === "string" ? json.job_id : ""
      };
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

function serveStaticFile(req, res) {
  const pathOnly = req.url.split("?")[0] || "/";
  const cleanUrl = pathOnly === "/" ? "/index.html" : pathOnly;
  const decodedPath = decodeURIComponent(cleanUrl);
  const requestedPath = path.normalize(path.join(PUBLIC_DIR, decodedPath));

  if (!requestedPath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  if (!fs.existsSync(requestedPath) || fs.statSync(requestedPath).isDirectory()) {
    return sendJson(res, 404, { error: "Not found." });
  }

  const ext = path.extname(requestedPath);
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".ico": "image/x-icon"
  };

  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
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
