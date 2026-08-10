// Guards the plausibility half of the OCR quality gate.
//
// WHY IT EXISTS. The gate measured volume only: letters and word count. Garbled
// OCR is not short, so it sailed through. A synthetic letter photographed sideways
// produced 313 letters in 235 tokens, rated "good", and contained none of the
// words printed on the page. That is fluent nonsense arriving on an official
// letter, which is worse than an honest refusal, and no volume threshold could
// ever have seen it.
//
// WHAT THIS FILE IS FOR. Two things a future change must not quietly undo:
//   1. The gate must keep refusing garbled text (the rotated cases).
//   2. The gate must NOT refuse real prose in any of the ten languages. The
//      signals are script neutral by construction and this proves it stays so.
//
// The fixtures are captured OCR output, not images, so this runs with no tesseract
// binary present. Production has no tesseract either, which is the point.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const REPO = path.join(__dirname, "..");
const FIXTURES = path.join(__dirname, "fixtures", "ocr-samples");
const {
  rateInputQuality,
  measureTextShape,
  PLAUSIBILITY_LIMITS
} = require(path.join(REPO, "src", "services", "textExtraction"));

// Derived from config, never a hand-maintained copy. See i18nStandards.test.js.
const config = require(path.join(REPO, "public", "i18n", "config.js"));
const ALL_CODES = config.languages.map((entry) => entry.code);

const MUST_PASS = ["01-straight", "04-angled", "05-dark-background", "06-fold-shadow", "07-low-light", "09-pdf-textlayer"];
const MUST_FAIL = ["02-rotated-pixels", "03-rotated-exif", "08-unreadable-noise"];

const read = (name) => fs.readFileSync(path.join(FIXTURES, name + ".txt"), "utf8");

// The volume-only gate as it stood before the plausibility check. Kept here so the
// "never more permissive" property is asserted against the real previous behaviour
// rather than assumed.
function volumeOnlyRating(text) {
  const cleaned = String(text || "").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const words = cleaned.match(/[A-Za-z0-9$]+/g) || [];
  const letters = cleaned.replace(/[^A-Za-z0-9]/g, "");
  if (letters.length >= 80 && words.length >= 12) return "good";
  if (letters.length >= 25 && words.length >= 5) return "borderline";
  return "poor";
}

function failureCount(text) {
  const shape = measureTextShape(text);
  let failures = 0;
  if (shape.meanTokenLength < PLAUSIBILITY_LIMITS.minMeanTokenLength) failures += 1;
  if (shape.singleCharacterRatio > PLAUSIBILITY_LIMITS.maxSingleCharacterRatio) failures += 1;
  if (shape.wordShapedRatio < PLAUSIBILITY_LIMITS.minWordShapedRatio) failures += 1;
  if (shape.wordCharacterRatio < PLAUSIBILITY_LIMITS.minWordCharacterRatio) failures += 1;
  return failures;
}

// Real prose in each language, taken from that language's own dictionary. Latin is
// stripped so the Indic cases are genuinely Indic: with "Northcue" and "PDF" left
// in, a Latin-only check scrapes past and proves nothing.
function prose(code, stripLatin) {
  const src = fs.readFileSync(path.join(REPO, "public", "i18n", code + ".js"), "utf8");
  const re = new RegExp('"[a-zA-Z0-9_.]+":\\s*"((?:[^"\\\\]|\\\\.)*)"', "g");
  const values = [...src.matchAll(re)].map((m) => m[1]).filter((v) => v.length > 40).slice(0, 14);
  const joined = values.join(" ");
  return stripLatin ? joined.replace(/[A-Za-z0-9]+/g, "").replace(/\s+/g, " ").trim() : joined;
}

test("OCR plausibility gate", async (t) => {
  await t.test("every sample that must pass, passes", () => {
    for (const name of MUST_PASS) {
      const text = read(name);
      assert.notEqual(rateInputQuality(text), "poor",
        name + " is legible text and must not be refused");
    }
  });

  await t.test("every garbled sample is refused", () => {
    for (const name of MUST_FAIL) {
      assert.equal(rateInputQuality(read(name)), "poor",
        name + " is not text and must be refused");
    }
  });

  await t.test("the two rotated samples are the ones the old gate called good", () => {
    // The regression this file exists for. If these ever stop being "good" under
    // the volume-only rating, the fixtures have drifted and the test below is no
    // longer proving anything.
    for (const name of ["02-rotated-pixels", "03-rotated-exif"]) {
      assert.equal(volumeOnlyRating(read(name)), "good",
        name + " must still be what volume alone would have accepted");
      assert.equal(rateInputQuality(read(name)), "poor",
        name + " must now be refused");
    }
  });

  await t.test("an EXIF orientation flag changes nothing, which is why both must fail", () => {
    // 03 is 02 with an EXIF Orientation=6 segment spliced in. Nothing in the
    // extraction path reads that flag, so the OCR output is identical. Recorded
    // here so a future EXIF fix has a fixture that shows what it changed.
    assert.equal(read("02-rotated-pixels"), read("03-rotated-exif"),
      "the two rotated fixtures must stay byte identical until EXIF is handled");
  });

  await t.test("the margin between the worst passing and best failing sample", () => {
    const passing = MUST_PASS.map((n) => ({ n, f: failureCount(read(n)) }));
    const failing = MUST_FAIL.map((n) => ({ n, f: failureCount(read(n)) }));

    const worstPassing = Math.max(...passing.map((p) => p.f));
    const bestFailing = Math.min(...failing.map((p) => p.f));

    assert.equal(worstPassing, 0,
      "no legible sample may trigger even one signal. Triggered: " + JSON.stringify(passing));
    assert.ok(bestFailing >= 2,
      "every garbled sample must trigger at least the two required. Got: " + JSON.stringify(failing));
  });

  await t.test("each signal keeps its measured headroom against real prose", () => {
    // Asserts the gap, not just the verdict. A future tune that moves a threshold
    // close to real prose fails here even while the verdicts still look right.
    for (const code of ALL_CODES) {
      const shape = measureTextShape(prose(code, false));
      assert.ok(shape.meanTokenLength >= PLAUSIBILITY_LIMITS.minMeanTokenLength + 1,
        code + " mean token length has under 1.0 of headroom: " + shape.meanTokenLength);
      assert.ok(shape.singleCharacterRatio <= PLAUSIBILITY_LIMITS.maxSingleCharacterRatio - 0.1,
        code + " single character ratio is within 0.1 of the limit: " + shape.singleCharacterRatio);
      assert.ok(shape.wordShapedRatio >= PLAUSIBILITY_LIMITS.minWordShapedRatio + 0.1,
        code + " word shaped ratio is within 0.1 of the limit: " + shape.wordShapedRatio);
      assert.ok(shape.wordCharacterRatio >= PLAUSIBILITY_LIMITS.minWordCharacterRatio + 0.05,
        code + " word character ratio is within 0.05 of the limit: " + shape.wordCharacterRatio);
    }
  });

  await t.test("no language's own prose is refused by the plausibility signals", () => {
    // THE POINT OF THIS TEST. Four of the ten languages are Indic. A signal built
    // on \p{L} alone, or on ASCII, refuses them silently and no English test sees
    // it.
    //
    // For a non-Latin language the prose is tested with Latin stripped out, so it
    // cannot pass on embedded brand names like "Northcue" or "PDF". Which
    // languages those are is DERIVED from the dictionaries, never listed here: a
    // hardcoded list would go stale the moment a language is added, which is the
    // failure i18nStandards.test.js exists to prevent.
    //
    // Stripping Latin from a Latin-script language is not the same test. It leaves
    // bare diacritics, which are correctly garbage-shaped. Caught by this test
    // failing on Polish when it was first written.
    const nonAsciiShare = (text) => {
      const wordChars = [...text].filter((c) => /[\p{L}\p{M}\p{N}]/u.test(c));
      if (!wordChars.length) return 0;
      return wordChars.filter((c) => c.charCodeAt(0) > 127).length / wordChars.length;
    };

    const checked = [];
    for (const code of ALL_CODES) {
      const full = prose(code, false);
      const nonLatinScript = nonAsciiShare(full) >= 0.5;
      const sample = nonLatinScript ? prose(code, true) : full;
      if (!sample || measureTextShape(sample).tokenCount < 12) continue;
      checked.push(code + (nonLatinScript ? " (Latin stripped)" : ""));
      assert.equal(failureCount(sample), 0,
        code + " prose in its own script triggers a plausibility signal, which " +
        "means the gate is not script neutral");
    }

    assert.equal(checked.length, ALL_CODES.length,
      "every configured language must actually be checked, not skipped: " + checked.join(", "));
    // The Indic four are the reason this test exists, so their coverage is asserted
    // rather than left to the loop above happening to reach them.
    const strippedCount = checked.filter((c) => c.includes("stripped")).length;
    assert.ok(strippedCount >= 4,
      "expected at least the four Indic languages to be tested with Latin removed, got " +
      strippedCount + ": " + checked.join(", "));
  });

  await t.test("the gate is never more permissive than it was", () => {
    // The one direction this change was not allowed to move. Every sample, plus
    // every language's prose, must rate no better than the volume-only gate did.
    const order = { poor: 0, borderline: 1, good: 2 };
    const samples = [
      ...[...MUST_PASS, ...MUST_FAIL].map((n) => [n, read(n)]),
      ...ALL_CODES.map((c) => ["prose-" + c, prose(c, false)]),
      ...ALL_CODES.map((c) => ["stripped-" + c, prose(c, true)])
    ];
    for (const [label, text] of samples) {
      assert.ok(order[rateInputQuality(text)] <= order[volumeOnlyRating(text)],
        label + " rates BETTER than the volume-only gate did, which is a loosening");
    }
  });

  await t.test("short text is left to the volume bands alone", () => {
    // Under 12 word-bearing tokens the ratios are too noisy to refuse on, so the
    // new check must abstain and the old behaviour must be untouched.
    const short = ["Council notice test ref 2026", "Amount 123.45 due 28 March", "a b c d e f"];
    for (const text of short) {
      assert.equal(rateInputQuality(text), volumeOnlyRating(text),
        JSON.stringify(text) + " is short enough that only volume may judge it");
    }
  });

  await t.test("a PDF text layer is unaffected", () => {
    assert.equal(rateInputQuality(read("09-pdf-textlayer")), "good",
      "a real PDF text layer must keep rating good");
  });

  await t.test("empty and whitespace input stay poor without throwing", () => {
    for (const text of ["", "   ", "\n\n\n", null, undefined]) {
      assert.equal(rateInputQuality(text), "poor");
    }
  });
});
