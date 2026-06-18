// IMPORTANT: set env vars before requiring server.js — the rate limiter reads them at module load time.
process.env.RATE_LIMIT_SIMPLIFY_MAX = "2";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const { createNorthcueServer } = require("../server");

// ── Helpers ──────────────────────────────────────────────────────────────────

function httpRequest(port, { method = "POST", path = "/api/simplify", headers = {}, body = null, clientIp }) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    if (clientIp) reqHeaders["x-forwarded-for"] = clientIp;
    if (body) reqHeaders["content-length"] = String(Buffer.byteLength(body));

    const req = http.request(
      { hostname: "127.0.0.1", port, method, path, headers: reqHeaders },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function multipartBody(boundary, file) {
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
    `Content-Type: ${file.mimeType}\r\n\r\n`
  );
  const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data || "");
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([head, data, tail]);
}

function jsonBody(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8");
}

// ── Integration test suite ────────────────────────────────────────────────────

test("upload error handling — all 7 scenarios", async (t) => {
  const testServer = createNorthcueServer();
  const port = await new Promise((resolve) => {
    testServer.listen(0, () => resolve(testServer.address().port));
  });

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 1: Wrong file type
    // Uploading a .docx file (Word document) with the correct MIME type for
    // that format. Must be rejected BEFORE any processing with a calm message.
    // ─────────────────────────────────────────────────────────────────────────
    await t.test("scenario 1a — .docx MIME type rejected before processing", async () => {
      const boundary = "----TestBoundary001";
      const body = multipartBody(boundary, {
        filename: "letter.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        data: Buffer.from("PK fake docx content")
      });
      const res = await httpRequest(port, {
        path: "/api/simplify",
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        body,
        clientIp: "10.1.0.1"
      });

      assert.equal(res.status, 400, `expected 400, got ${res.status}`);
      assert.equal(typeof res.body.error, "string", "error must be a string");
      assert.ok(res.body.error.includes("PDF"), `error must mention PDF: "${res.body.error}"`);
      assert.ok(!res.body.error.includes("Error:"), `must not expose raw Error: "${res.body.error}"`);
      assert.ok(!res.body.error.includes("stack"), `must not expose stack trace: "${res.body.error}"`);
    });

    await t.test("scenario 1b — .zip MIME type rejected before processing", async () => {
      const boundary = "----TestBoundary001b";
      const body = multipartBody(boundary, {
        filename: "archive.zip",
        mimeType: "application/zip",
        data: Buffer.from("PK fake zip data")
      });
      const res = await httpRequest(port, {
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        body,
        clientIp: "10.1.0.2"
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes("PDF"), `error must mention PDF: "${res.body.error}"`);
    });

    await t.test("scenario 1c — .exe renamed as octet-stream rejected before processing", async () => {
      const boundary = "----TestBoundary001c";
      const body = multipartBody(boundary, {
        filename: "document.exe",
        mimeType: "application/octet-stream",
        data: Buffer.from("MZ fake exe header")
      });
      const res = await httpRequest(port, {
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        body,
        clientIp: "10.1.0.3"
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes("PDF"), `error must mention PDF: "${res.body.error}"`);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 2: Oversized file
    // Body exceeds MAX_UPLOAD_BYTES (15 MB). Must be rejected cleanly with
    // a calm 413, not a crash or hang. This was previously broken by the
    // missing `await` — the 413 error escaped the try/catch.
    // ─────────────────────────────────────────────────────────────────────────
    await t.test("scenario 2 — body exceeding 15 MB is rejected with calm 413", async () => {
      const boundary = "----TestBoundary002";
      const largeData = Buffer.alloc(16 * 1024 * 1024, 0x41); // 16 MB of 'A'
      const body = multipartBody(boundary, {
        filename: "huge.pdf",
        mimeType: "application/pdf",
        data: largeData
      });
      const res = await httpRequest(port, {
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        body,
        clientIp: "10.2.0.1"
      });

      assert.equal(res.status, 413, `expected 413, got ${res.status}`);
      assert.equal(res.body.code, "payload_too_large");
      assert.ok(res.body.error.toLowerCase().includes("too large"), `error must say too large: "${res.body.error}"`);
      assert.ok(!res.body.error.includes("Error:"), "must not expose raw Error object");
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 3: Empty / corrupted file
    // A file with the right MIME type (application/pdf) but content that is
    // not a valid PDF (empty bytes, or raw text masquerading as PDF).
    // Must fail gracefully with a calm message — no crash, no stack trace.
    // ─────────────────────────────────────────────────────────────────────────
    await t.test("scenario 3a — empty PDF (0 bytes) fails gracefully", async () => {
      const boundary = "----TestBoundary003a";
      const body = multipartBody(boundary, {
        filename: "empty.pdf",
        mimeType: "application/pdf",
        data: Buffer.alloc(0)
      });
      const res = await httpRequest(port, {
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        body,
        clientIp: "10.3.0.1"
      });

      // Either a 400 or 200 with success:false is acceptable — must NOT be 500 or a crash
      assert.ok(res.status < 500, `server must not 5xx on empty PDF, got ${res.status}`);
      assert.equal(res.body.success, false, "success must be false");
      assert.ok(typeof res.body.error === "string", "must have a string error message");
      assert.ok(!res.body.error.includes("Error:"), "must not expose raw Error");
      assert.ok(!res.body.error.includes("at "), "must not contain stack trace lines");
    });

    await t.test("scenario 3b — text file renamed .pdf (non-PDF content) fails gracefully", async () => {
      const boundary = "----TestBoundary003b";
      const fakeContent = "This is definitely not a PDF. It is a plain text document.";
      const body = multipartBody(boundary, {
        filename: "letter.pdf",
        mimeType: "application/pdf",
        data: Buffer.from(fakeContent, "utf8")
      });
      const res = await httpRequest(port, {
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        body,
        clientIp: "10.3.0.2"
      });

      assert.ok(res.status < 500, `must not 5xx on non-PDF content, got ${res.status}`);
      assert.equal(res.body.success, false);
      assert.ok(typeof res.body.error === "string");
      assert.ok(!res.body.error.includes("Error:"));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 4: No file attached at all
    // Multipart request with no file part and no pasted text.
    // Must return 400 with a calm "upload a document" message.
    // ─────────────────────────────────────────────────────────────────────────
    await t.test("scenario 4a — multipart with no file and no text is rejected", async () => {
      const boundary = "----TestBoundary004a";
      // Valid multipart structure, but no file part — just an empty body
      const body = Buffer.from(`--${boundary}--\r\n`);
      const res = await httpRequest(port, {
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        body,
        clientIp: "10.4.0.1"
      });

      assert.equal(res.status, 400);
      assert.ok(typeof res.body.error === "string");
      assert.ok(
        res.body.error.toLowerCase().includes("upload") || res.body.error.toLowerCase().includes("document"),
        `error must mention upload or document: "${res.body.error}"`
      );
    });

    await t.test("scenario 4b — JSON body with empty text field is rejected", async () => {
      const body = jsonBody({ text: "" });
      const res = await httpRequest(port, {
        headers: { "content-type": "application/json" },
        body,
        clientIp: "10.4.0.2"
      });

      assert.equal(res.status, 400);
      assert.ok(typeof res.body.error === "string");
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 5: Malformed / garbage request
    // Wrong Content-Type, non-JSON body claiming to be JSON, raw binary with
    // no boundary. Server must respond cleanly — never crash or hang.
    // ─────────────────────────────────────────────────────────────────────────
    await t.test("scenario 5a — wrong Content-Type (text/csv) is rejected with calm message", async () => {
      const res = await httpRequest(port, {
        headers: { "content-type": "text/csv" },
        body: Buffer.from("field1,field2\nval1,val2"),
        clientIp: "10.5.0.1"
      });

      assert.equal(res.status, 400);
      assert.ok(typeof res.body.error === "string");
      assert.ok(
        res.body.error.toLowerCase().includes("multipart") || res.body.error.toLowerCase().includes("json"),
        `error should mention accepted formats: "${res.body.error}"`
      );
      assert.ok(!res.body.error.includes("Error:"));
    });

    await t.test("scenario 5b — malformed JSON body rejected with calm message", async () => {
      const body = Buffer.from("{this is not valid json at all!!!");
      const res = await httpRequest(port, {
        headers: { "content-type": "application/json" },
        body,
        clientIp: "10.5.0.2"
      });

      assert.equal(res.status, 400);
      assert.ok(typeof res.body.error === "string");
      assert.ok(!res.body.error.includes("SyntaxError"), "must not expose SyntaxError class name");
      assert.ok(!res.body.error.includes("at "), "must not contain stack frames");
    });

    await t.test("scenario 5c — completely empty body with no Content-Type returns 400", async () => {
      const res = await httpRequest(port, {
        headers: {},
        body: null,
        clientIp: "10.5.0.3"
      });

      assert.equal(res.status, 400);
      assert.ok(typeof res.body.error === "string");
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 6: Rate limiting
    // Uses RATE_LIMIT_SIMPLIFY_MAX=2 (set at module load time).
    // Third request from the same IP must get a 429 with a calm message and
    // a Retry-After header.
    // ─────────────────────────────────────────────────────────────────────────
    await t.test("scenario 6 — third request from same IP is rate-limited with calm 429", async () => {
      const clientIp = "10.6.0.1";
      // Two requests burn the limit (any valid-structure request counts, even 400s)
      await httpRequest(port, {
        headers: { "content-type": "application/json" },
        body: jsonBody({ text: "" }),
        clientIp
      });
      await httpRequest(port, {
        headers: { "content-type": "application/json" },
        body: jsonBody({ text: "" }),
        clientIp
      });

      // Third request should be blocked
      const res = await httpRequest(port, {
        headers: { "content-type": "application/json" },
        body: jsonBody({ text: "" }),
        clientIp
      });

      assert.equal(res.status, 429, `expected 429, got ${res.status}`);
      assert.equal(res.body.code, "rate_limited");
      assert.ok(typeof res.body.error === "string");
      assert.ok(
        res.body.error.toLowerCase().includes("too many") || res.body.error.toLowerCase().includes("wait"),
        `rate limit message should say to wait: "${res.body.error}"`
      );
      assert.ok(!res.body.error.includes("Error:"));
      assert.ok(res.headers["retry-after"], "Retry-After header must be present");
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 7: Concurrent simultaneous uploads
    // Three uploads in parallel using pasted text (avoids file I/O).
    // Verifies: all complete, all have unique job_ids, no cross-contamination
    // (each result contains the text that was sent in that request).
    // ─────────────────────────────────────────────────────────────────────────
    await t.test("scenario 7 — three concurrent uploads complete independently without interference", async () => {
      const texts = [
        "Council Tax Notice from Sheffield City Council. Your payment of £1,200.00 is due by 01 July 2026. Please pay your council tax instalment promptly to avoid further action.",
        "British Gas Energy Bill. Your electricity bill for this period is £89.50. Payment due by 15 July 2026. Please ensure payment reaches us by the due date.",
        "Enforcement Notice from Sheffield Environmental Services. You must remove the waste by 26 May 2026. Failure to comply may result in prosecution and fixed penalty notices."
      ];

      const results = await Promise.all(
        texts.map((text, i) =>
          httpRequest(port, {
            headers: { "content-type": "application/json" },
            body: jsonBody({ text }),
            clientIp: `10.7.0.${i + 1}`
          })
        )
      );

      // All three must succeed (status 200, six cards)
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        assert.equal(res.status, 200, `request ${i + 1} must return 200, got ${res.status}`);
        assert.equal(Array.isArray(res.body.cards) && res.body.cards.length, 6,
          `request ${i + 1} must return 6 cards`);
        assert.ok(typeof res.body.job_id === "string" && res.body.job_id.length > 0,
          `request ${i + 1} must have a job_id`);
      }

      // All job_ids must be distinct
      const jobIds = results.map((r) => r.body.job_id);
      const unique = new Set(jobIds);
      assert.equal(unique.size, 3, `all three job_ids must be distinct, got: ${jobIds.join(", ")}`);

      // Each result must have processed its own content independently.
      // The council tax text mentions Sheffield City Council → government category.
      // The enforcement notice has consequence language → at least high severity.
      const councilCategory = results[0].body.trust.document_category;
      assert.ok(
        ["bill_or_payment", "government"].includes(councilCategory),
        `council tax text must get a recognised category, got: ${councilCategory}`
      );
      assert.notEqual(results[2].body.trust.severity_level, "low",
        "enforcement notice must not be low severity");
    });

  } finally {
    await new Promise((resolve) => testServer.close(resolve));
  }
});
