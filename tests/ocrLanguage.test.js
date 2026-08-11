// Which Tesseract languages OCR loads, and for whom.
//
// WHAT WENT WRONG. OCR ran `-l eng` for every reader. A photographed Gujarati
// notice came back as transliterated Latin nonsense, "oilelsy UzLALL SIGsUa",
// with zero Gujarati characters recovered. That output is WORD SHAPED, so the
// plausibility gate could not catch it: mean token length 3.88, no single
// character tokens, all four signals comfortably passed. Six confident cue cards,
// built on nothing. Measured recall 0/10 on content words.
//
// WHY THE FLAG IS COMBINED RATHER THAN SWITCHED. A Gujarati speaker in the UK
// mostly receives ENGLISH letters, so the interface language does not predict the
// document's script. Measured:
//
//   reader   flag       english doc   own-script doc
//   gu       eng             11/11          0/10
//   gu       guj              0/11         10/10
//   gu       eng+guj         11/11         10/10
//
// Switching to the reader's language alone would have broken the common case
// completely. Combining costs 0.0% on the English document.
//
// None of this needs a tesseract binary: the mapping is pure and is tested as
// such, which matters because CI has no OCR installed.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const REPO = path.join(__dirname, "..");
const {
  ocrLanguagesFor,
  OCR_LANGUAGES_BY_INTERFACE_LANGUAGE
} = require(path.join(REPO, "src", "services", "textExtraction"));

// Derived from config, never a hand-maintained copy. See i18nStandards.test.js.
const config = require(path.join(REPO, "public", "i18n", "config.js"));
const ALL_CODES = config.languages.map((entry) => entry.code);

test("OCR language selection", async (t) => {
  await t.test("English gets exactly what it always got", () => {
    // THE INVIOLABLE ONE. If an English reader's flag ever changes, English OCR
    // output changes, and English is the frozen benchmark for this whole engine.
    assert.equal(ocrLanguagesFor("en"), "eng");
  });

  await t.test("a reader in a non-Latin script gets their script AND English", () => {
    for (const [code, expected] of Object.entries(OCR_LANGUAGES_BY_INTERFACE_LANGUAGE)) {
      assert.equal(ocrLanguagesFor(code), expected, code + " maps to the wrong flag");
      assert.match(expected, /^eng\+/,
        code + " must keep English first: their letters are usually in English, and " +
        "the script pack alone measured 0/11 on an English document");
    }
  });

  await t.test("every configured language resolves to something", () => {
    // A tenth language cannot ship with an undefined flag: tesseract would be
    // handed the string "undefined" and fail every photo for that reader.
    for (const code of ALL_CODES) {
      const flag = ocrLanguagesFor(code);
      assert.ok(typeof flag === "string" && flag.length > 0, code + " resolves to nothing");
      assert.match(flag, /^[a-z+]+$/, code + " produced a flag with unexpected characters: " + flag);
    }
  });

  await t.test("an unknown or missing language falls back to English, never to nothing", () => {
    for (const value of [undefined, null, "", "  ", "zz", "not-a-language", 42, {}]) {
      assert.equal(ocrLanguagesFor(value), "eng");
    }
  });

  await t.test("every language not in the map is deliberately still on English", () => {
    // Polish and Romanian DO have a measured deficit under eng: every word
    // carrying a diacritic outside English's set is misread, 0 of 14 in both.
    // That is real and recorded, but adding those packs is a separate decision on
    // separate evidence. This pins the current, deliberate state so the omission
    // stays visible rather than being forgotten.
    //
    // The list is DERIVED: config minus the mapped languages. Writing it out by
    // hand is what i18nStandards.test.js forbids, because a hand-maintained copy
    // is how a tenth language ships while silently exempt from a safety test.
    const unmapped = ALL_CODES.filter((code) => !(code in OCR_LANGUAGES_BY_INTERFACE_LANGUAGE));
    assert.ok(unmapped.length >= 5, "expected several languages to remain on English");
    for (const code of unmapped) {
      assert.equal(ocrLanguagesFor(code), "eng",
        code + " has changed. If that is intended, the deficit measurement for it " +
        "belongs in the commit that changes it.");
    }
  });

  await t.test("every pack the map asks for is installed by the image", () => {
    // THE DRIFT GUARD. The map and the Dockerfile are edited in different files
    // and nothing else connects them. A language added here but not installed
    // there fails at runtime with "Failed loading language", which
    // textExtraction catches and turns into "This document is hard to read" for
    // every photo from that reader, with no log line.
    const dockerfile = fs.readFileSync(path.join(REPO, "Dockerfile"), "utf8");
    const needed = new Set(["eng"]);
    for (const flag of Object.values(OCR_LANGUAGES_BY_INTERFACE_LANGUAGE)) {
      for (const part of flag.split("+")) needed.add(part);
    }
    for (const lang of needed) {
      assert.ok(dockerfile.includes("tesseract-ocr-" + lang + "="),
        "the Dockerfile does not install a pinned tesseract-ocr-" + lang +
        ", but the language map asks for it");
    }
    // And the build must assert each one is loadable, not merely installed.
    // Matched against the assertion loop's own word list rather than the whole
    // file, and with plain string containment: \b is ASCII-only and is banned
    // repo-wide by tests/wordBoundarySafety.test.js.
    const loopStart = dockerfile.indexOf("for lang in");
    assert.ok(loopStart !== -1, "expected a --list-langs assertion loop in the Dockerfile");
    // Searched FROM the loop, not from the start of the file: an earlier mention
    // of --list-langs in a comment made this slice empty and the test vacuous.
    const loop = dockerfile.slice(loopStart, dockerfile.indexOf("--list-langs", loopStart));
    assert.ok(loop.length > 0, "the assertion loop is empty");
    // Split on non-letters, not whitespace: the last item in a shell word list
    // carries the terminating semicolon ("pan;"), which exact token matching
    // misses while the language is in fact present.
    const named = new Set(loop.split(/[^a-z]+/));
    for (const lang of needed) {
      assert.ok(named.has(lang),
        "the Dockerfile must name " + lang + " in its --list-langs assertion");
    }
  });

  await t.test("every pack the image installs is pinned with its epoch", () => {
    const dockerfile = fs.readFileSync(path.join(REPO, "Dockerfile"), "utf8");
    const packs = [...dockerfile.matchAll(/tesseract-ocr-([a-z]+)=([^\s\\]+)/g)];
    assert.ok(packs.length >= 6, "expected eng, osd and the four Indic packs to be pinned");
    for (const [, lang, version] of packs) {
      assert.match(version, /^\d+:/,
        "tesseract-ocr-" + lang + " is pinned as " + version + " without an epoch. " +
        "Debian strips the epoch from the .deb filename but apt requires it, so a " +
        "pin copied off the filename fails the build for the wrong reason.");
    }
  });
});
