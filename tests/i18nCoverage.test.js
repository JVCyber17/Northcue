// Guards the Tier 1 dictionary: every i18n key referenced by the markup or the
// frontend code must exist in the English dictionary, because English is the
// fallback for every language. A missing key would render as the raw key.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const publicDir = path.join(__dirname, "..", "public");
const english = require(path.join(publicDir, "i18n", "en.js"));

function extractHtmlKeys(html) {
  const keys = new Set();
  const attrPattern = /data-i18n(?:-[a-z-]+)?="([^"]+)"/g;
  let match;
  while ((match = attrPattern.exec(html)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function extractTCallKeys(source) {
  const keys = new Set();
  const callPattern = /\bt\(\s*"([^"]+)"/g;
  let match;
  while ((match = callPattern.exec(source)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

// Keys also reach t() through data maps (helpGuides, feedbackChoices, the
// labelKeys maps, cardEncouragementKeys), where a typo would ship as a raw
// key on screen without ever appearing in a literal t("...") call. So every
// string literal that LOOKS like a dictionary key (dotted, and rooted in a
// namespace en.js actually has) must exist in en.js, wherever it is written.
function extractDictionaryShapedLiterals(source, namespaces) {
  const keys = new Set();
  const literalPattern = /"([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+)+)"/g;
  let match;
  while ((match = literalPattern.exec(source)) !== null) {
    if (namespaces.has(match[1].split(".")[0])) {
      keys.add(match[1]);
    }
  }
  return keys;
}

test("i18n coverage", async (t) => {
  const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(publicDir, "app.js"), "utf8");
  const i18nJs = fs.readFileSync(path.join(publicDir, "i18n.js"), "utf8");

  await t.test("every data-i18n key in index.html exists in en.js", () => {
    const missing = [...extractHtmlKeys(html)].filter(
      (key) => !Object.prototype.hasOwnProperty.call(english, key)
    );
    assert.deepEqual(missing, []);
  });

  await t.test("every t() key in app.js exists in en.js", () => {
    const missing = [...extractTCallKeys(appJs)].filter(
      (key) => !Object.prototype.hasOwnProperty.call(english, key)
    );
    assert.deepEqual(missing, []);
  });

  await t.test("every t() key in i18n.js exists in en.js", () => {
    const missing = [...extractTCallKeys(i18nJs)].filter(
      (key) => !Object.prototype.hasOwnProperty.call(english, key)
    );
    assert.deepEqual(missing, []);
  });

  await t.test("every dictionary-shaped literal in app.js exists in en.js", () => {
    // Closes the key-map gap found in the caller-to-bank audit: keys stored
    // in data maps never pass through a literal t("...") call, so the
    // extraction above cannot see them. A dotted literal rooted in a real
    // dictionary namespace must resolve, wherever in app.js it is written.
    const namespaces = new Set(Object.keys(english).map((key) => key.split(".")[0]));
    const missing = [...extractDictionaryShapedLiterals(appJs, namespaces)].filter(
      (key) => !Object.prototype.hasOwnProperty.call(english, key)
    );
    assert.deepEqual(missing, [],
      "these look like dictionary keys but do not exist in en.js");
  });

  await t.test("no English string contains an em or en dash", () => {
    const offenders = Object.entries(english)
      .filter(([, value]) => /[–—]/.test(String(value)))
      .map(([key]) => key);
    assert.deepEqual(offenders, []);
  });

  await t.test("en.js has no empty values", () => {
    const empty = Object.entries(english)
      .filter(([, value]) => String(value).trim() === "")
      .map(([key]) => key);
    assert.deepEqual(empty, []);
  });
});
