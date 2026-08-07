// A LAUNCHED READER'S CARDS ARRIVE IN THEIR LANGUAGE. This file pinned the
// wave-one defect fix (the gate opened but nothing asked the model to WRITE
// Gujarati); under the translate-after-English architecture, approved by the
// founder on 6 August 2026, the same promise is kept by a different
// mechanism, and this file pins that one instead: the FIRST call generates
// ENGLISH for everyone, with no write-in instruction, and the SECOND call
// translates the guarded cards into the launched reader's language. The
// outbound prompts are captured through a stubbed provider, exactly as
// before.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const config = require(path.join(ROOT, "public", "i18n", "config.js"));

// The stub must exist BEFORE the service module is loaded; capture every
// outbound body and answer both call shapes: generation gets the English
// benchmark candidate, translation gets its own input back with every
// reader-facing string marked, which keeps the shape and parity contracts.
const captured = [];
const realFetch = global.fetch;
global.fetch = async (url, options) => {
  if (!String(url).includes("openai")) return realFetch(url, options);
  const body = JSON.parse(options.body);
  captured.push(body);
  const system = body.input.find((m) => m.role === "system").content;
  if (system.startsWith("You translate Northcue cue cards")) {
    const source = JSON.parse(body.input.find((m) => m.role === "user").content);
    const translated = JSON.parse(JSON.stringify(source));
    translated.cards.forEach((card) => {
      ["title", "simple_explanation", "read_aloud_text"].forEach((field) => {
        if (typeof card[field] === "string" && card[field]) card[field] = "T " + card[field];
      });
      if (Array.isArray(card.key_points)) card.key_points = card.key_points.map((p) => "T " + p);
    });
    return {
      ok: true, status: 200,
      json: async () => ({ output_text: JSON.stringify(translated) }),
      text: async () => ""
    };
  }
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

const LANGUAGE_NAMES = {
  gu: "Gujarati", hi: "Hindi", pl: "Polish", ro: "Romanian", es: "Spanish",
  fr: "French", pt: "Portuguese", bn: "Bengali", pa: "Panjabi"
};

async function promptsFor(language) {
  captured.length = 0;
  const doc = CORPUS.find((d) => d.id === "council_tax");
  const rulesRun = runClearStepsEngine({
    extractedText: doc.text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "prompt-pin-" + language },
    facts: CORPUS_FACTS.council_tax || null
  });
  await ai.applySafetyPassAndRecordAiStatus({ rulesRun, extractedText: doc.text, language });
  return captured.map((body) => JSON.stringify(body.input.find((m) => m.role === "system")));
}

test("the launched reader's language arrives through the translation call", async (t) => {
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
  try {
    assert.equal(config.launch.proseArchitecture, "translate",
      "premise: the founder's flip commit has landed");

    for (const lang of config.launch.open) {
      await t.test(lang + ": English generation first, then translation into " + (LANGUAGE_NAMES[lang] || lang), async () => {
        const systems = await promptsFor(lang);
        assert.equal(systems.length, 2, "a launched reader makes exactly two provider calls");
        assert.ok(systems[0].includes("Use UK English"),
          "the first call must generate English for everyone");
        assert.ok(!systems[0].includes("own script"),
          "the first call must carry no write-in instruction");
        assert.ok(systems[1].includes(LANGUAGE_NAMES[lang] || lang),
          lang + " is launched but the translation call does not name it");
      });
    }

    await t.test("English carries no write-in instruction and makes one call", async () => {
      const systems = await promptsFor("en");
      assert.equal(systems.length, 1, "an English reader makes exactly one provider call");
      assert.ok(!systems[0].includes("own script"),
        "English gained a write-in instruction it must not have");
    });

    await t.test("an unlaunched language never reaches the provider at all", async () => {
      const unlaunched = config.languages.map((e) => e.code)
        .find((c) => c !== "en" && !config.launch.open.includes(c));
      assert.ok(unlaunched, "premise: an unlaunched language exists");
      const systems = await promptsFor(unlaunched);
      assert.equal(systems.length, 0,
        unlaunched + " reached the provider while unlaunched");
    });
  } finally {
    if (saved === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = saved;
  }
});
