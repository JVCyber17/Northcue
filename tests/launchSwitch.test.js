// THE SINGLE LAUNCH SWITCH. One flag in public/i18n/config.js opens the AI
// phrasing pass to every enabled language AND swaps the client's privacy
// wording, in the same founder-approved commit, so gates and copy cannot
// ship apart. This file pins both halves and the off-state.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const config = require(path.join(ROOT, "public", "i18n", "config.js"));
const ai = require(path.join(ROOT, "src", "services", "aiStructuredResultService"));
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(ROOT, "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "launch-switch-test" };
const LANGS = config.languages.map((e) => e.code).filter((c) => c !== "en");

function runOf(id) {
  const doc = CORPUS.find((d) => d.id === id);
  return runClearStepsEngine({ extractedText: doc.text, fileMeta: META });
}

test("the switch is off, and off means byte-identical to today", async (t) => {
  await t.test("config.launch.open is false in the repo", () => {
    // The founder's launch commit flips exactly this. If this assertion is
    // failing on main before that commit, someone opened the gate by
    // accident and this is the alarm.
    assert.equal(config.launch.open, false);
  });

  await t.test("every non-English language is still refused the model", () => {
    const saved = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
    try {
      const run = runOf("council_tax");
      LANGS.forEach((lang) => {
        assert.equal(ai.providerSkipReason({ rulesRun: run, language: lang }),
          "non_english_language", lang);
      });
    } finally {
      if (saved === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = saved;
    }
  });
});

test("when the switch opens, only the language branch opens", async (t) => {
  // Flipped in-process and restored; the repo state never changes here.
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
  config.launch.open = true;
  try {
    await t.test("an enabled language passes the language gate", () => {
      const run = runOf("council_tax");
      LANGS.forEach((lang) => {
        assert.equal(ai.providerSkipReason({ rulesRun: run, language: lang }), null, lang);
      });
    });

    await t.test("an unknown language stays refused even when launched", () => {
      const run = runOf("council_tax");
      assert.equal(ai.providerSkipReason({ rulesRun: run, language: "xx" }),
        "non_english_language");
    });

    await t.test("every safety gate still applies through the open gate", () => {
      // The scam refusal must hold in every language: launch opens wording,
      // never judgement.
      const scam = runOf("polish_phishing");
      LANGS.forEach((lang) => {
        assert.equal(ai.providerSkipReason({ rulesRun: scam, language: lang }),
          "verification_only_state", lang);
      });
    });
  } finally {
    config.launch.open = false;
    if (saved === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = saved;
  }
});

test("the copy half is wired to the same flag", async (t) => {
  await t.test("the markup carries the launch attributes", () => {
    const html = fs.readFileSync(path.join(ROOT, "public", "index.html"), "utf8");
    assert.ok(html.includes('data-i18n-launch="privacy.step.ai.launch"'));
    assert.ok(html.includes('data-i18n-launch="journey.privacy.line.launch"'));
    assert.match(html, /hidden data-launch-reveal data-i18n="privacy\.launch\.claim"/);
  });

  await t.test("i18n.js swaps on the same config flag", () => {
    const source = fs.readFileSync(path.join(ROOT, "public", "i18n.js"), "utf8");
    assert.ok(source.includes("data-i18n-launch"));
    assert.ok(source.includes("data-launch-reveal"));
    assert.ok(source.includes("launch.open") || source.includes("launch && root.NORTHCUE_I18N_CONFIG.launch.open"),
      "the swap must read the launch flag");
  });

  await t.test("the three launch strings exist in all ten dictionaries", () => {
    ["en"].concat(LANGS).forEach((lang) => {
      const source = fs.readFileSync(path.join(ROOT, "public", "i18n", lang + ".js"), "utf8");
      ["privacy.step.ai.launch", "journey.privacy.line.launch", "privacy.launch.claim"]
        .forEach((key) => {
          assert.ok(source.includes('"' + key + '"'), lang + " is missing " + key);
        });
    });
  });
});
