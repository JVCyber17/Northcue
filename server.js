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
const { createHttpError, getPublicErrorResponse } = require("./src/utils/httpErrors");
const { loadEnvFile } = require("./src/utils/loadEnv");
const { inspectPdfPageLimit } = require("./src/utils/pdfSafety");
const { createRateLimiter } = require("./src/utils/rateLimiter");
const { cleanupOldTemporaryFiles } = require("./src/utils/temporaryStorageCleanup");

loadEnvFile(__dirname);
warnIfSupabaseConfigMissing();

const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_FEEDBACK_BYTES = 64 * 1024;
const MAX_ANALYTICS_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const TEMP_FILE_RETENTION_MS = Number(process.env.TEMP_FILE_RETENTION_MS || 60 * 60 * 1000);
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(__dirname, "private_storage", "uploads");
const RESULT_DIR = path.join(__dirname, "private_storage", "results");

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
    "/api/simplify": 30,
    "/api/upload": 30,
    "/api/feedback": 20,
    "/api/analytics": 240,
    default: 60
  }
});

ensurePrivateFolders();

const server = http.createServer(async (req, res) => {
  try {
    const pathOnly = req.url.split("?")[0] || "/";

    if (req.method === "GET") {
      return serveStaticFile(req, res);
    }

    if (req.method === "POST" && (pathOnly === "/api/simplify" || pathOnly === "/api/upload")) {
      if (isRateLimited(req, res, pathOnly)) return;
      return handleSimplify(req, res);
    }

    if (req.method === "POST" && pathOnly === "/api/feedback") {
      if (isRateLimited(req, res, pathOnly)) return;
      return handleFeedback(req, res);
    }

    if (req.method === "POST" && pathOnly === "/api/analytics") {
      if (isRateLimited(req, res, pathOnly)) return;
      return handleAnalytics(req, res);
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

server.listen(PORT, () => {
  if (process.stdout.isTTY) {
    console.log(`ClearSteps is running at http://localhost:${PORT}`);
  }
});

function ensurePrivateFolders() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(RESULT_DIR, { recursive: true });
  cleanupOldTemporaryFiles({
    directories: [UPLOAD_DIR, RESULT_DIR],
    maxAgeMs: TEMP_FILE_RETENTION_MS,
    logger: console
  });
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
      error: "ClearSteps is receiving too many requests from this browser right now. Please wait a moment and try again."
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

function readRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        reject(createHttpError("Request body is too large.", 413, "payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipartForm(body, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]);
  const form = { file: null, fields: {} };
  if (!boundary) return form;

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(body, boundaryBuffer);

  for (const part of parts) {
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;

    const rawHeaders = part.slice(0, headerEnd).toString("utf8");
    const dataStart = headerEnd + 4;
    let data = part.slice(dataStart);

    if (data.slice(-2).toString() === "\r\n") {
      data = data.slice(0, -2);
    }

    const disposition = rawHeaders.match(/content-disposition:\s*form-data;(.+)/i);
    const fileNameMatch = rawHeaders.match(/filename="([^"]*)"/i);
    const typeMatch = rawHeaders.match(/content-type:\s*([^\r\n]+)/i);

    if (disposition && fileNameMatch && fileNameMatch[1]) {
      form.file = {
        filename: path.basename(fileNameMatch[1]),
        contentType: (typeMatch && typeMatch[1].trim().toLowerCase()) || "application/octet-stream",
        data
      };
      continue;
    }

    const nameMatch = rawHeaders.match(/name="([^"]*)"/i);
    if (disposition && nameMatch && nameMatch[1]) {
      form.fields[nameMatch[1]] = data.toString("utf8").trim();
    }
  }

  return form;
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = buffer.indexOf(separator);

  while (start !== -1) {
    const next = buffer.indexOf(separator, start + separator.length);
    if (next === -1) break;

    const part = buffer.slice(start + separator.length, next);
    const trimmed = trimBoundaryPart(part);
    if (trimmed.length) parts.push(trimmed);
    start = next;
  }

  return parts;
}

function trimBoundaryPart(part) {
  let output = part;

  if (output.slice(0, 2).toString() === "\r\n") {
    output = output.slice(2);
  }

  if (output.slice(0, 2).toString() === "--") {
    return Buffer.alloc(0);
  }

  return output;
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
    ".svg": "image/svg+xml"
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
