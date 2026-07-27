// Guards the language off switch. The enabled flag in public/i18n/config.js is
// the only control that keeps a machine drafted language out of production, so
// these tests protect the two things that make it a real off switch: the list
// the UI builds from must honour the flag, and English must always survive as
// the fallback.
//
// The switcher buttons are static markup in index.html, so hiding them is not
// automatic. wireLanguageControls() in app.js hides every [data-language-open]
// control when fewer than two languages are enabled. app.js is a browser file
// with no module system and no DOM here, so that guard is checked at source
// level: it is a tripwire against the guard being deleted, not a substitute
// for the browser check.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const config = require(path.join(PUBLIC_DIR, "i18n", "config.js"));
const i18n = require(path.join(PUBLIC_DIR, "i18n.js"));

test("language off switch", async (t) => {
  await t.test("English is always enabled as the fallback", () => {
    const english = config.languages.find((entry) => entry.code === "en");
    assert.ok(english, "config must contain English");
    assert.equal(english.enabled, true);
    assert.equal(config.defaultLanguage, "en");
  });

  await t.test("every language declares enabled explicitly as a boolean", () => {
    // A missing or truthy string flag would quietly switch a language on.
    config.languages.forEach((entry) => {
      assert.equal(typeof entry.enabled, "boolean", entry.code + " must set enabled to a boolean");
    });
  });

  await t.test("languageList only returns enabled languages", () => {
    const listed = i18n.languageList().map((entry) => entry.code).sort();
    const expected = config.languages
      .filter((entry) => entry.enabled)
      .map((entry) => entry.code)
      .sort();
    assert.deepEqual(listed, expected);
  });

  await t.test("a disabled language is not treated as supported", () => {
    const disabled = config.languages.filter((entry) => !entry.enabled);
    disabled.forEach((entry) => {
      assert.equal(i18n.isSupported(entry.code), false, entry.code + " is disabled and must not be supported");
    });
  });

  await t.test("the switcher is hidden when fewer than two languages are enabled", () => {
    // Source level tripwire, see the note at the top of this file.
    const appSource = fs.readFileSync(path.join(PUBLIC_DIR, "app.js"), "utf8");
    assert.match(
      appSource,
      /languageList\(\)\.length\s*<\s*2/,
      "wireLanguageControls must still guard on fewer than two enabled languages"
    );
    assert.match(
      appSource,
      /querySelectorAll\("\[data-language-open\]"\)[\s\S]{0,200}classList\.add\("hidden"\)/,
      "the guard must hide every language switcher control"
    );
  });

  await t.test("the detection banner cannot offer a disabled language", () => {
    // detectionState() reads navigator.languages, which does not exist here,
    // so this asserts the gate it depends on rather than the browser path.
    const disabled = config.languages.filter((entry) => !entry.enabled).map((entry) => entry.code);
    disabled.forEach((code) => {
      assert.equal(i18n.isSupported(code), false);
    });
  });
});
