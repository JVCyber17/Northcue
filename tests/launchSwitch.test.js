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
// The founder's wave-one pair, 6 August 2026. Wave two is everything else.
const WAVE_ONE = ["gu", "hi"];

function runOf(id) {
  const doc = CORPUS.find((d) => d.id === id);
  return runClearStepsEngine({ extractedText: doc.text, fileMeta: META });
}

test("the switch is off, and off means byte-identical to today", async (t) => {
  await t.test("config.launch.open lists no wave-two code in the repo", () => {
    // Wave one opens gu and hi in the founder-approved flag commit; the
    // wave-two languages, everything else the config lists, must never
    // appear here without a verified pack and his word. If a wave-two
    // code shows up, someone opened a gate by accident and this is the
    // alarm.
    assert.ok(Array.isArray(config.launch.open));
    const waveTwo = LANGS.filter((c) => !WAVE_ONE.includes(c));
    assert.deepEqual(config.launch.open.filter((c) => waveTwo.includes(c)), []);
  });

  await t.test("exactly the listed languages pass; every other language is refused", () => {
    // Derived from the repo's own launch list, so this pin is the truth
    // before the flag commit (nobody passes) and after it (gu and hi pass,
    // wave two refused) without an edit.
    const saved = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
    try {
      const run = runOf("council_tax");
      LANGS.forEach((lang) => {
        const expected = config.launch.open.includes(lang) ? null : "non_english_language";
        assert.equal(ai.providerSkipReason({ rulesRun: run, language: lang }), expected, lang);
      });
    } finally {
      if (saved === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = saved;
    }
  });
});

test("the wave-one shape: gu and hi open, the seven observably unchanged", async (t) => {
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
  const before = config.launch.open;
  config.launch.open = WAVE_ONE.slice();
  try {
    await t.test("gu and hi pass the language gate", () => {
      const run = runOf("council_tax");
      WAVE_ONE.forEach((lang) => {
        assert.equal(ai.providerSkipReason({ rulesRun: run, language: lang }), null, lang);
      });
    });
    await t.test("every wave-two language is still refused, byte-identical", () => {
      const run = runOf("council_tax");
      LANGS.filter((c) => !WAVE_ONE.includes(c)).forEach((lang) => {
        assert.equal(ai.providerSkipReason({ rulesRun: run, language: lang }),
          "non_english_language", lang);
      });
    });
    await t.test("the scam refusal holds through the open gu and hi gates", () => {
      const scam = runOf("polish_phishing");
      WAVE_ONE.forEach((lang) => {
        assert.equal(ai.providerSkipReason({ rulesRun: scam, language: lang }),
          "verification_only_state", lang);
      });
    });
  } finally {
    config.launch.open = before;
    if (saved === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = saved;
  }
});

test("when the switch opens fully, only the language branch opens", async (t) => {
  // Flipped in-process and restored; the repo state never changes here.
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
  config.launch.open = LANGS.slice();
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
    config.launch.open = [];
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
