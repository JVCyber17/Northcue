// A LAUNCHED READER'S MODEL WRITES IN THEIR LANGUAGE. Found by the wave-one
// live confirmation, 6 August 2026: the gate opened for Gujarati but
// nothing asked the model to WRITE Gujarati, so a launched reader got
// English prose their bank cannot translate. The fix routes the launched
// language into the same writeInLanguage mechanism the measurement
// override always used, which is the mechanism every vocabulary was
// measured against. This file pins it by capturing the real outbound
// system prompt through a stubbed provider.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const config = require(path.join(ROOT, "public", "i18n", "config.js"));

// The stub must exist BEFORE the service module is loaded by this test's
// runs; capture every outbound body.
const captured = [];
const realFetch = global.fetch;
global.fetch = async (url, options) => {
  if (!String(url).includes("openai")) return realFetch(url, options);
  captured.push(JSON.parse(options.body));
  const FIXTURE = require(path.join(ROOT, "tests", "fixtures", "english-benchmark-candidates.json"));
  return {
    ok: true, status: 200,
    json: async () => ({ output_text: JSON.stringify(FIXTURE.candidates.council_tax) }),
    text: async () => ""
  };
};

const ai = require(path.join(ROOT, "src", "services", "aiStructuredResultService"));
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(ROOT, "scripts", "engine-baseline", "corpus"));
const CORPUS_FACTS = require(path.join(ROOT, "tests", "fixtures", "corpus-facts.json"));

const LANGUAGE_NAMES = { gu: "Gujarati", hi: "Hindi" };

async function promptFor(language) {
  captured.length = 0;
  const doc = CORPUS.find((d) => d.id === "council_tax");
  const rulesRun = runClearStepsEngine({
    extractedText: doc.text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "prompt-pin-" + language },
    facts: CORPUS_FACTS.council_tax || null
  });
  await ai.applySafetyPassAndRecordAiStatus({ rulesRun, extractedText: doc.text, language });
  if (!captured.length) return null;
  const system = captured[0].input.find((m) => m.role === "system");
  return JSON.stringify(system);
}

test("the outbound prompt carries the launched reader's language", async (t) => {
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
  try {
    for (const lang of config.launch.open) {
      await t.test(lang + ": the system prompt says to write " + (LANGUAGE_NAMES[lang] || lang), async () => {
        const system = await promptFor(lang);
        assert.ok(system, "the provider was never called for launched " + lang);
        assert.ok(system.includes(LANGUAGE_NAMES[lang] || lang),
          lang + " is launched but the model is not asked to write it");
        assert.ok(system.includes("own script"),
          "the script instruction is missing");
      });
    }

    await t.test("English carries no write-in instruction", async () => {
      const system = await promptFor("en");
      assert.ok(system, "the provider was never called for English");
      assert.ok(!system.includes("own script"),
        "English gained a write-in instruction it must not have");
    });

    await t.test("an unlaunched language never reaches the provider at all", async () => {
      const unlaunched = config.languages.map((e) => e.code)
        .find((c) => c !== "en" && !config.launch.open.includes(c));
      assert.ok(unlaunched, "premise: an unlaunched language exists");
      const system = await promptFor(unlaunched);
      assert.equal(system, null,
        unlaunched + " reached the provider while unlaunched");
    });
  } finally {
    if (saved === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = saved;
  }
});
