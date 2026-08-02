const test = require("node:test");
const assert = require("node:assert");

const { requestStructuredResultFromOpenAi } = require("../src/services/aiStructuredResultService");

// Guards the determinism config so it can never silently regress. Stubs fetch to
// capture the OUTGOING request body (no live API call), then asserts the sampling
// settings. If someone changes temperature back to 0.2, this test fails.
test("AI request pins temperature to 0 for deterministic phrasing", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";

  let capturedBody = null;
  global.fetch = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    // Minimal valid Responses-API-shaped payload so the function completes cleanly.
    return new Response(JSON.stringify({ model: "gpt-4.1-mini-test", id: "resp_test", output_text: "{}" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    await requestStructuredResultFromOpenAi({
      extractedText: "Some document text.",
      fallbackStructuredResult: { cards: [] },
      model: "gpt-4.1-mini",
      inputQuality: "good",
      garbledByOcr: false
    });

    assert.ok(capturedBody, "expected an outgoing request body");
    assert.strictEqual(capturedBody.temperature, 0, "temperature must be 0 for deterministic output");
    assert.strictEqual(capturedBody.store, false, "store must stay false (privacy)");
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
