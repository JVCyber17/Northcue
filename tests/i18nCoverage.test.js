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
