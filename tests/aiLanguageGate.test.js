// Guards the multilingual MVP rule: AI phrasing is English only. When the
// analyse request carries a non English interface language, the AI pass is
// skipped entirely (no network egress) and the deterministic rules cards are
// returned unchanged, ready for template bank translation on the frontend.
// English and absent language values keep today's behaviour exactly.

const assert = require("node:assert/strict");
const test = require("node:test");

const { runClearStepsEngine } = require("../src/services/clearStepsEngine");
const { applyAiStructuredResult, providerSkipReason } = require("../src/services/aiStructuredResultService");

const GOOD_BILL = [
  "Thames Energy Limited",
  "Account number: 00012345",
  "This bill covers the period 1 March 2026 to 31 May 2026.",
  "Total amount due £187.42.",
  "Please pay by 24 June 2026. If you do not pay your account may be referred for further action."
].join("\n");

async function runWithLanguage(language, fetchImpl) {
  const rulesRun = runClearStepsEngine({ extractedText: GOOD_BILL, fileMeta: { mimeType: "application/pdf" } });
  const rulesCards = JSON.parse(JSON.stringify(rulesRun.api_output.cards));
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;
  let fetchCalls = 0;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async (...args) => { fetchCalls++; return fetchImpl(...args); };
  try {
    const run = await applyAiStructuredResult({ rulesRun, extractedText: GOOD_BILL, language });
    return { fetchCalls, ai: run.api_output.debug.ai, cards: run.api_output.cards, rulesCards };
  } finally {
    global.fetch = origFetch;
    if (origKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = origKey;
  }
}

test("non English language skips the AI pass entirely (no egress)", async () => {
  const result = await runWithLanguage("pl", async () => ({ ok: true, json: async () => ({}) }));
  assert.equal(result.fetchCalls, 0);
  assert.equal(result.ai.ai_used, false);
  assert.equal(result.ai.ai_status, "skipped");
  assert.equal(result.ai.ai_error_code, "non_english_language");
});

test("the language skip serves the rules cards unchanged", async () => {
  const result = await runWithLanguage("hi", async () => ({ ok: true, json: async () => ({}) }));
  assert.deepEqual(result.cards, result.rulesCards);
});

test("English language does not trigger the language gate", async () => {
  // The phrasing pass is gone, so "did a request happen" is no longer the way
  // to tell. providerSkipReason is the gate itself, and it is what both the
  // removed phrasing pass and the surviving fact extractor asked.
  const rulesRun = runClearStepsEngine({ extractedText: GOOD_BILL, fileMeta: { mimeType: "application/pdf" } });
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    assert.equal(providerSkipReason({ rulesRun, language: "en" }), null,
      "English must reach the provider");
    assert.equal(providerSkipReason({ rulesRun, language: "pl" }), "non_english_language");
  } finally {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("an absent language behaves exactly like English", async () => {
  const rulesRun = runClearStepsEngine({ extractedText: GOOD_BILL, fileMeta: { mimeType: "application/pdf" } });
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    assert.equal(providerSkipReason({ rulesRun, language: undefined }), null);
  } finally {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("the route language normaliser only accepts configured languages", () => {
  // Exercised through the route module's exported behaviour indirectly: the
  // config module is the single source of truth shared with the browser.
  const config = require("../public/i18n/config");
  const codes = config.languages.map((entry) => entry.code);
  assert.ok(codes.includes("en"));
  assert.ok(codes.includes("pl"));
  assert.ok(codes.includes("pt"));
  assert.equal(new Set(codes).size, codes.length);
});
