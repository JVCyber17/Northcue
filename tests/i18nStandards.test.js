// Guards the i18n engineering standards (docs/i18n/engineering-standards.md).
//
// Each check here exists because the failure it guards against was either
// found in the July 2026 audit or is the obvious way the standard erodes:
// a language list creeping back into application code, a switched-away
// language staying in memory, or a non English file sneaking into the initial
// page bundle.
//
// The money format note had a guard here too, that its language list stayed
// config data rather than a hardcoded constant. The note was removed from every
// card and every language on 8 August 2026, so the guard went with it.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const REPO = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(REPO, "public");
const config = require(path.join(PUBLIC_DIR, "i18n", "config.js"));

const CODES = config.languages
  .map((entry) => entry.code)
  .filter((code) => code !== "en");

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

// Three or more consecutive quoted language codes is a hand-maintained
// language list. Built from config so this test never carries one itself.
function languageListPattern() {
  const one = '["\'](?:' + CODES.join("|") + ')["\']';
  return new RegExp(one + "\\s*,\\s*" + one + "\\s*,\\s*" + one);
}

test("i18n engineering standards", async (t) => {
  await t.test("application code holds no language list", () => {
    // Language differences are data in config.js; application code must not
    // enumerate languages. The data files themselves are exempt by design.
    ["public/app.js", "public/i18n.js", "public/sw.js", "public/i18n/templateBank.js"]
      .forEach((relPath) => {
        assert.equal(languageListPattern().test(read(relPath)), false,
          relPath + " must not contain a hardcoded language list");
      });
  });

  await t.test("only the active language stays in memory", () => {
    const i18n = require(path.join(PUBLIC_DIR, "i18n.js"));

    globalThis.NORTHCUE_STRINGS_RO = { probe: "dictionary" };
    globalThis.NORTHCUE_TEMPLATES_RO = { probe: "bank" };
    i18n.unloadLanguage("ro");
    assert.equal(globalThis.NORTHCUE_STRINGS_RO, undefined,
      "unloading a language must remove its dictionary global");
    assert.equal(globalThis.NORTHCUE_TEMPLATES_RO, undefined,
      "unloading a language must remove its template bank global");

    // English is the canonical key set and the fallback; it never unloads.
    globalThis.NORTHCUE_STRINGS_EN = { probe: "english" };
    i18n.unloadLanguage("en");
    assert.deepEqual(globalThis.NORTHCUE_STRINGS_EN, { probe: "english" });
    delete globalThis.NORTHCUE_STRINGS_EN;

    // The policy must be wired into switching, not just available. The call
    // only exists inside setLanguage, so a whole-file match is enough.
    assert.match(read("public/i18n.js"), /unloadLanguage\(previous\)/,
      "setLanguage must unload the previously active language");
  });

  await t.test("dynamic labels re-resolve when a language loads or switches", () => {
    // Init-time t() calls resolve from English because a language file loads
    // asynchronously, and applyTranslations only reaches data-i18n markup.
    // app.js must therefore re-resolve the strings it writes dynamically
    // (toggle aria-labels and spans, the keyed status line, the detected
    // type line) on every language load, and the hook must sit outside the
    // two-languages-enabled switcher gate or the dev preview never gets it.
    const appSource = read("public/app.js");
    assert.match(appSource, /function refreshDynamicI18nText\(\)/,
      "the dynamic wording refresh function must exist");
    assert.match(appSource,
      /addEventListener\("northcue:languagechange", refreshDynamicI18nText\)/,
      "the refresh must run on every language load or switch");
  });

  await t.test("the initial page bundle carries no non-English language file", () => {
    const html = read("public/index.html");
    CODES.forEach((code) => {
      assert.doesNotMatch(html, new RegExp("/i18n/" + code + "\\.js"),
        code + " dictionary must not be in the initial bundle");
      assert.doesNotMatch(html, new RegExp("/i18n/templates-" + code + "\\.js"),
        code + " template bank must not be in the initial bundle");
    });
  });

  await t.test("tests and scripts derive languages from config, never a copy", () => {
    // A hand-maintained copy of the language list is how a tenth language
    // ships while silently exempt from a safety test. Only config.js and the
    // per-language data files may enumerate languages.
    ["tests", "scripts"].forEach((dir) => {
      fs.readdirSync(path.join(REPO, dir))
        .filter((name) => name.endsWith(".js"))
        .filter((name) => name !== "i18nStandards.test.js")
        .forEach((name) => {
          assert.equal(languageListPattern().test(read(path.join(dir, name))), false,
            path.join(dir, name) + " must derive languages from config.js");
        });
    });
  });
});
