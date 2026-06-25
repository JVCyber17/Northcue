// HTTP request-body parsing for the Northcue server. One responsibility:
// turn a raw incoming request into usable data — read the body with a hard
// size cap, and decode multipart/form-data uploads. These are pure,
// stateless helpers (no server state), kept here so server.js can focus on
// routing, validation, delegation and responding. Behaviour is unchanged
// from when these lived in server.js.

const path = require("node:path");
const { createHttpError } = require("./httpErrors");

function readRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let tooLarge = false;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        if (!tooLarge) {
          tooLarge = true;
          reject(createHttpError("Request body is too large.", 413, "payload_too_large"));
        }
        // Drain remaining bytes without storing them so the socket stays open
        // long enough for the server to write the 413 response before closing.
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => { if (!tooLarge) resolve(Buffer.concat(chunks)); });
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

module.exports = { readRequestBody, parseMultipartForm };
