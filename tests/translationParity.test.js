// Guards every translated language against the English source of truth.
// A language that drifts (missing key, missing template, dropped slot, a
// stray dash) would degrade silently at runtime: missing keys fall back to
// English, but a dropped slot would lose a real value from the document.
// These checks make that impossible to merge unnoticed.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const i18nDir = path.join(__dirname, "..", "public", "i18n");
const config = require(path.join(i18nDir, "config"));
const english = require(path.join(i18nDir, "en"));
const englishBank = require(path.join(i18nDir, "templates-en"));

const englishKeys = Object.keys(english);
const englishExactIds = Object.keys(englishBank.exact);
const englishPatterns = englishBank.patterns;

function slotsIn(value) {
  return (String(value).match(/\{(\w+)\}/g) || []).sort();
}

// Every configured language other than English must ship both files.
const translatedCodes = config.languages
  .map((entry) => entry.code)
  .filter((code) => code !== "en");

test("translation parity", async (t) => {
  await t.test("every configured language has a strings file and a template bank", () => {
    const missing = translatedCodes.filter((code) => {
      return !fs.existsSync(path.join(i18nDir, code + ".js")) ||
        !fs.existsSync(path.join(i18nDir, "templates-" + code + ".js"));
    });
    assert.deepEqual(missing, []);
  });

  for (const code of translatedCodes) {
    // A language with missing files is already reported by the check above.
    // Skipping it here keeps the remaining languages reportable rather than
    // aborting the whole loop on the first missing file.
    if (!fs.existsSync(path.join(i18nDir, code + ".js")) ||
        !fs.existsSync(path.join(i18nDir, "templates-" + code + ".js"))) {
      continue;
    }
    const strings = require(path.join(i18nDir, code));
    const bank = require(path.join(i18nDir, "templates-" + code));

    await t.test(code + ": strings match the English key set exactly", () => {
      const keys = Object.keys(strings);
      const missing = englishKeys.filter((key) => !Object.prototype.hasOwnProperty.call(strings, key));
      const extra = keys.filter((key) => !Object.prototype.hasOwnProperty.call(english, key));
      assert.deepEqual(missing, [], code + " is missing keys");
      assert.deepEqual(extra, [], code + " has unknown keys");
    });

    await t.test(code + ": every interpolation slot survives translation", () => {
      const broken = englishKeys.filter((key) => {
        const englishSlots = slotsIn(english[key]);
        if (englishSlots.length === 0) return false;
        return String(slotsIn(strings[key])) !== String(englishSlots);
      });
      assert.deepEqual(broken, [], code + " changed interpolation slots");
    });

    await t.test(code + ": template bank covers every exact sentence and pattern", () => {
      const missingExact = englishExactIds.filter(
        (id) => !Object.prototype.hasOwnProperty.call(bank.exact || {}, id)
      );
      const missingPatterns = englishPatterns
        .map((entry) => entry.id)
        .filter((id) => !Object.prototype.hasOwnProperty.call(bank.patterns || {}, id));
      assert.deepEqual(missingExact, [], code + " bank is missing exact sentences");
      assert.deepEqual(missingPatterns, [], code + " bank is missing patterns");
    });

    await t.test(code + ": every template slot survives translation", () => {
      const broken = englishPatterns
        .filter((entry) => {
          const translated = (bank.patterns || {})[entry.id];
          if (!translated) return false;
          return String(slotsIn(translated)) !== String(slotsIn(entry.template));
        })
        .map((entry) => entry.id);
      assert.deepEqual(broken, [], code + " changed template slots");
    });

    await t.test(code + ": no em or en dashes anywhere", () => {
      const offenders = [];
      Object.entries(strings).forEach(([key, value]) => {
        if (/[–—]/.test(String(value))) offenders.push("strings:" + key);
      });
      Object.entries(bank.exact || {}).forEach(([id, value]) => {
        if (/[–—]/.test(String(value))) offenders.push("exact:" + id);
      });
      Object.entries(bank.patterns || {}).forEach(([id, value]) => {
        if (/[–—]/.test(String(value))) offenders.push("pattern:" + id);
      });
      assert.deepEqual(offenders, []);
    });

    await t.test(code + ": no empty values", () => {
      const empty = Object.entries(strings)
        .filter(([, value]) => String(value).trim() === "")
        .map(([key]) => key);
      assert.deepEqual(empty, []);
    });
  }

  await t.test("the config banner strings exist for every enabled language", () => {
    const incomplete = config.languages
      .filter((entry) => entry.code !== "en")
      .filter((entry) => !entry.bannerOffer || !entry.bannerSwitch || !entry.bannerDismiss)
      .map((entry) => entry.code);
    assert.deepEqual(incomplete, []);
  });

  await t.test("no config banner string contains an em or en dash", () => {
    const offenders = config.languages
      .filter((entry) => /[–—]/.test([entry.bannerOffer, entry.bannerSwitch, entry.bannerDismiss, entry.nativeName].join(" ")))
      .map((entry) => entry.code);
    assert.deepEqual(offenders, []);
  });
});
