// Guards the severity ladder in every language.
//
// This is the most safety critical property in the translation layer. If two
// tiers read alike, a bailiff notice and routine post look the same to someone
// scanning in a language they read slowly. Hindi and Panjabi both did exactly
// that: ज़रूरी and ਜ਼ਰੂਰੀ mean both "necessary" and "urgent", so they opened the
// urgent tier and the tier below it identically.
//
// Getting the metric right took three attempts and the failures are worth
// keeping, because each is a plausible test that does not work:
//   1. "Do the tier openings differ" flags English itself. English opens every
//      tpl.risk tier with "Ignoring this" on purpose.
//   2. "Characters until divergence" missed the real bug: Hindi diverged at
//      character 12, only because one tier ended "है." and the other "है,".
//   3. "First clause, splitting on commas" flags Polish, Gujarati and Bengali,
//      which attach the urgency clause with a comma where English does not.
//      Those three were correct.
//
// What separates the defect from the false alarms is the RELATIONSHIP between
// tiers. English high_stakes_urgent is high_stakes plus an extra clause, so a
// translation doing the same is right. English mip.urgent and mip.high use
// different adjectives, so a translation that makes one a prefix of the other
// has collapsed a tier that English keeps apart.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const LANGS = ["pl", "ro", "gu", "hi", "bn", "pt", "es", "fr", "pa"];
const en = require("../public/i18n/templates-en");

const LADDERS = {
  "most important point": ["tpl.mip.urgent", "tpl.mip.high", "tpl.mip.medium", "tpl.mip.information_only"],
  banner: ["tpl.banner.suspicious_urgent", "tpl.banner.high_stakes_urgent", "tpl.banner.high_stakes",
           "tpl.banner.urgent", "tpl.banner.caution", "tpl.banner.safe"],
  risk: ["tpl.risk.urgent", "tpl.risk.high", "tpl.risk.medium"]
};

// The first sentence is where the tier lives and it is what a frightened
// person reads before deciding how worried to be.
function opening(value) {
  return String(value).split(/[.!?]/)[0].replace(/\s+/g, " ").trim().toLowerCase();
}

function relation(a, b) {
  const x = opening(a), y = opening(b);
  if (x === y) return "identical";
  if (x.startsWith(y) || y.startsWith(x)) return "prefix";
  return "distinct";
}

const RANK = { distinct: 0, prefix: 1, identical: 2 };

test("severity ladder", async (t) => {
  const banks = {};
  LANGS.forEach((code) => {
    banks[code] = require(path.join(__dirname, "..", "public", "i18n", "templates-" + code));
  });

  await t.test("no language collapses a distinction English preserves", () => {
    const failures = [];
    Object.entries(LADDERS).forEach(([name, tiers]) => {
      for (let i = 0; i < tiers.length; i++) {
        for (let j = i + 1; j < tiers.length; j++) {
          const enRel = relation(en.exact[tiers[i]], en.exact[tiers[j]]);
          LANGS.forEach((code) => {
            const a = (banks[code].exact || {})[tiers[i]];
            const b = (banks[code].exact || {})[tiers[j]];
            if (!a || !b) return;
            const rel = relation(a, b);
            if (RANK[rel] > RANK[enRel]) {
              failures.push(code + " " + name + ": " + tiers[i] + " vs " + tiers[j] +
                " is " + rel + ", English is " + enRel);
            }
          });
        }
      }
    });
    assert.deepEqual(failures, []);
  });

  await t.test("the check catches the Hindi collapse it was written for", () => {
    // The exact strings that shipped before the fix. A test that cannot fail
    // on the bug it targets is worth nothing.
    const before = {
      urgent: "यह ज़रूरी है. आपको आज ही कदम उठाना पड़ सकता है.",
      high: "यह ज़रूरी है, लेकिन कोई आपातकाल नहीं."
    };
    assert.equal(relation(before.urgent, before.high), "prefix");
    assert.equal(relation(en.exact["tpl.mip.urgent"], en.exact["tpl.mip.high"]), "distinct");
    assert.ok(RANK.prefix > RANK.distinct, "the old Hindi values must rank worse than English");
  });

  await t.test("the urgent tier shares no wording with the tier below it", () => {
    // Belt and braces on the specific pair that failed, in every language.
    LANGS.forEach((code) => {
      const urgent = opening(banks[code].exact["tpl.mip.urgent"]);
      const high = opening(banks[code].exact["tpl.mip.high"]);
      assert.notEqual(urgent, high, code + " urgent and high open identically");
      assert.ok(!urgent.startsWith(high) && !high.startsWith(urgent),
        code + " urgent and high are prefixes of one another");
    });
  });
});
