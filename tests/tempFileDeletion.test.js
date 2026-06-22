const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const { simplifyRoute } = require("../src/routes/simplifyRoute");
const { requestStructuredResultFromOpenAi } = require("../src/services/aiStructuredResultService");

// These tests require the route module directly (not server.js), so no .env is
// loaded and Supabase is unconfigured — the session-tracking calls no-op safely.

function makeDirs() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "northcue-test-"));
  const uploadsDir = path.join(base, "uploads");
  const resultsDir = path.join(base, "results");
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(resultsDir, { recursive: true });
  return { uploadsDir, resultsDir };
}

function writeUpload(uploadsDir, text) {
  const jobId = crypto.randomUUID();
  const savedPath = path.join(uploadsDir, `${jobId}.txt`);
  fs.writeFileSync(savedPath, text);
  return {
    jobId,
    savedPath,
    filename: "letter.txt",
    contentType: "text/plain",
    sizeBytes: Buffer.byteLength(text)
  };
}

test("temp upload file is deleted after a successful read", async () => {
  const { uploadsDir, resultsDir } = makeDirs();
  const file = writeUpload(
    uploadsDir,
    "This council tax letter explains your payment and the due date for this year."
  );
  assert.ok(fs.existsSync(file.savedPath), "precondition: file should exist before processing");

  const result = await simplifyRoute({
    file,
    fields: { anonymousSessionId: "anon-test" },
    directories: { uploadsDir, resultsDir }
  });

  assert.equal(result.success, true);
  assert.ok(!fs.existsSync(file.savedPath), "temp file must be deleted on the success path");
});

test("temp upload file is deleted after an unreadable (failure) read", async () => {
  const { uploadsDir, resultsDir } = makeDirs();
  const file = writeUpload(uploadsDir, "no");
  assert.ok(fs.existsSync(file.savedPath));

  const result = await simplifyRoute({
    file,
    fields: { anonymousSessionId: "anon-test" },
    directories: { uploadsDir, resultsDir }
  });

  assert.equal(result.success, false);
  assert.ok(!fs.existsSync(file.savedPath), "temp file must be deleted on the failure path");
});

test("OpenAI request body sets store:false", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  let capturedBody = null;

  global.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ output_text: "{}" }) };
  };

  try {
    await requestStructuredResultFromOpenAi({
      extractedText: "some document text",
      fallbackStructuredResult: {},
      model: "gpt-4.1-mini",
      inputQuality: "good",
      garbledByOcr: false
    });
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }

  assert.ok(capturedBody, "request body should have been captured");
  assert.equal(capturedBody.store, false, "request body must include store:false");
});
