const fs = require("node:fs");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { preprocessImageForOcr, discardPreprocessedImage } = require("./imagePreprocessing");

const execFileAsync = promisify(execFile);
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// A CEILING ON THE OCR PROCESS, for the same reason the orientation pass has one.
//
// Without it a single upload can occupy an OCR process indefinitely. The route is
// rate limited to 30 uploads a minute per client but nothing caps how many OCR
// children run at once, so on a 512MB instance a handful of stalled processes is
// enough to exhaust the box. Measured worst case on the synthetic set was 3.0s, on
// pure noise at full resolution and before the size cap existed, so this is around
// twenty times the slowest real observation: generous enough never to cut off a
// genuine read, small enough to stop a pile-up.
//
// A timeout kill lands in the same catch as every other failure and produces the
// honest refusal, which is the right outcome: no cards are better than cards built
// on a half-finished read.
const OCR_TIMEOUT_MS = 60000;

// WHICH TESSERACT LANGUAGES TO LOAD, CHOSEN FROM THE READER'S INTERFACE LANGUAGE.
//
// The problem this solves: a photographed Gujarati notice read with -l eng comes
// back as transliterated Latin nonsense, "oilelsy UzLALL SIGsUa", with zero
// Gujarati characters recovered. It is word-shaped, so every plausibility signal
// passes and it reaches the reader as six confident cards built on nothing. No
// shape check can catch that, by construction.
//
// WHY THE READER'S LANGUAGE IS COMBINED WITH ENGLISH RATHER THAN REPLACING IT.
// A Gujarati speaker in the UK mostly receives ENGLISH letters, so the interface
// language does not predict the document's script. Measured on synthetic notices,
// recall of content words:
//
//   reader   flag       english doc   own-script doc
//   gu       eng             11/11          0/10
//   gu       guj              0/11         10/10     <- would break the common case
//   gu       eng+guj         11/11         10/10
//
// and the same shape for hin, ben and pan. Combining costs nothing on the English
// document (0.0% drop) and is the only option that serves both, which is why the
// reader's language alone is not used.
//
// Data, not branches, per docs/i18n/engineering-standards.md. A language absent
// from this map gets English, which is the current behaviour for every language.
const OCR_LANGUAGES_BY_INTERFACE_LANGUAGE = {
  gu: "eng+guj",
  hi: "eng+hin",
  bn: "eng+ben",
  pa: "eng+pan"
};

const DEFAULT_OCR_LANGUAGES = "eng";

// English readers, and readers of the five Latin-script languages, are unchanged:
// they get "eng" exactly as before, so their OCR output is byte identical. That is
// deliberate. Polish and Romanian DO have a measured deficit under eng (every word
// carrying ł, ą, ę, ś, ż or ă, ș, ț is misread), but adding those packs is a
// separate decision on separate evidence and is not bundled in here.
function ocrLanguagesFor(interfaceLanguage) {
  const cleaned = String(interfaceLanguage || "").toLowerCase().trim();
  return OCR_LANGUAGES_BY_INTERFACE_LANGUAGE[cleaned] || DEFAULT_OCR_LANGUAGES;
}

async function extractTextFromInput({ pastedText, filePath, mimeType, originalName }) {
  if (typeof pastedText === "string" && pastedText.trim()) {
    return pastedText.trim();
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return "";
  }

  const size = fs.statSync(filePath).size;
  if (size < 20) return "";

  if (mimeType === "text/plain") {
    try {
      return fs.readFileSync(filePath, "utf8").trim();
    } catch (error) {
      return "";
    }
  }

  // PDFs are handled upstream in extractUploadedFileText (simplifyRoute.js) and
  // never reach this function. Images are also handled upstream via extractTextFromImage.
  // The server's ALLOWED_TYPES only permits PDF, images, and plain text, so in
  // practice this fallback is dead code for all currently accepted file types.
  // It is left in place so that if ALLOWED_TYPES is extended (e.g. DOCX) the
  // scaffold returns something safe rather than crashing.
  return "";
}

async function extractTextFromImage({ filePath, interfaceLanguage }) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      success: false,
      error: "This document is hard to read. Please upload a clearer image."
    };
  }

  // Turn the page upright first. This returns the original path unchanged if
  // anything at all goes wrong, so OCR still runs on something either way.
  const preprocessed = await preprocessImageForOcr({ filePath });

  try {
    // Tesseract writes OCR text to stdout when the output target is "stdout".
    // Keep this developer-only step separate from the AI pipeline for now.
    //
    // --psm 6 STAYS, AND THE MEASUREMENT IS WHY. PSM 6 assumes a single uniform
    // block, and a letter plainly is not one, so PSM 3 (auto page segmentation)
    // reads like the obvious correction. Measured across the synthetic set, it is
    // not: on a page photographed at a 7 degree angle, PSM 3 returns COMPLETELY
    // EMPTY output, 0 of 17 keywords against PSM 6's 17 of 17, because its layout
    // analysis rejects the whole page at that skew. Its one advantage was reading
    // rotated pages, and the preprocessing step above now fixes those properly by
    // turning the pixels rather than by asking OCR to cope. PSM 1 measured
    // identically to PSM 3, including the same empty result on the angled page.
    // Do not swap this on the flag's description; measure it again first.
    const { stdout } = await execFileAsync(
      "tesseract",
      [preprocessed.path, "stdout", "-l", ocrLanguagesFor(interfaceLanguage), "--psm", "6"],
      {
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
        timeout: OCR_TIMEOUT_MS
      }
    );

    const extractedText = normaliseOcrText(stdout);
    const inputQuality = rateInputQuality(extractedText);

    if (inputQuality === "poor") {
      return {
        success: false,
        error: "This document is hard to read. Please upload a clearer image."
      };
    }

    return {
      success: true,
      extracted_text: extractedText,
      input_quality: inputQuality
    };
  } catch (error) {
    return {
      success: false,
      error: "This document is hard to read. Please upload a clearer image."
    };
  } finally {
    // Only ever removes a file this function created. The original upload is
    // owned by the route and deleted there.
    discardPreprocessedImage(preprocessed);
  }
}

function isImageMimeType(mimeType) {
  return IMAGE_MIME_TYPES.has(String(mimeType || "").toLowerCase());
}

function normaliseOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// GARBLED OCR IS NOT SHORT, WHICH IS WHY VOLUME ALONE CANNOT SEE IT.
//
// A page photographed sideways produces MORE tokens than the same page upright:
// Tesseract reads the stems and bowls of rotated glyphs as separate marks. The
// measured case, a synthetic letter rotated 90 degrees, returned 313 letters in
// 235 tokens and cleared every volume bar below with a "good" rating, while
// containing none of the words actually printed on the page. Volume answers "is
// there enough of it", and the answer was yes. Nothing asked "is it text".
//
// These four signals measure shape rather than amount. They are four views of one
// failure, so the refusal needs TWO of them to agree; no single signal decides.
// The weakest is the word-character ratio, whose margin to real prose is 0.10,
// which is precisely why it cannot refuse anything on its own.
//
// SCRIPT NEUTRALITY IS THE CONSTRAINT THAT CHOSE THESE SIGNALS. The word class is
// [\p{L}\p{M}\p{N}], the class tests/wordBoundarySafety.test.js already enforces
// across src/, because \p{L} alone treats an Indic vowel sign (category M) as a
// non letter and splits a word through the middle of it. \p{Cf} keeps a ZWNJ
// inside a word rather than cutting it in two.
//
// A "recognisable dictionary-shaped word" signal was considered and rejected. It
// cannot be made script neutral without shipping wordlists for ten languages, and
// the language with the weakest list is the one that would then be quietly
// refused. A "longest run of clean tokens" signal was also measured and rejected:
// the garbled sample scored 8 and real Polish scored 6, so it discriminated in the
// wrong direction.
//
// Thresholds sit in the gap measured between 16 real samples (nine OCR and PDF
// outputs, seven language dictionaries, four of them Indic scripts) and the
// garbled sample. Every real sample fails zero of four. The garbled sample fails
// four of four. See ENGINE_STATE.md, THE SHAPE RULE.
const OCR_WORD_CHARACTER = /[\p{L}\p{M}\p{N}]/u;
const OCR_WORD_SHAPED_TOKEN = /^[\p{L}\p{M}\p{N}\p{Cf}]+$/u;

// Below this many word-bearing tokens the ratios are too noisy to act on, so the
// volume bands govern alone and nothing new can refuse. Measured: the garbled
// sample still fails 2 of 4 at five tokens, but 2 is the bare minimum for a
// refusal and a decision should not rest on the minimum.
const PLAUSIBILITY_MIN_TOKENS = 12;

const PLAUSIBILITY_LIMITS = {
  minMeanTokenLength: 2.5,      // real 4.13 (Hindi) .. 6.52,  garbled 1.42
  maxSingleCharacterRatio: 0.35, // real 0.00 .. 0.12,          garbled 0.65
  minWordShapedRatio: 0.45,      // real 0.67 .. 0.87,          garbled 0.27
  minWordCharacterRatio: 0.85    // real 0.95 .. 0.97,          garbled 0.73
};

const PLAUSIBILITY_FAILURES_ALLOWED = 1;

function measureTextShape(text) {
  const tokens = String(text || "").split(/\s+/u).filter((token) => token.length > 0);

  // Tokens with no word character at all, such as a run of pipes or dashes, are
  // evidence neither way and are left out of every ratio below.
  const wordBearing = tokens.filter((token) => OCR_WORD_CHARACTER.test(token));
  if (!wordBearing.length) {
    return { tokenCount: 0, meanTokenLength: 0, singleCharacterRatio: 1, wordShapedRatio: 0, wordCharacterRatio: 0 };
  }

  const lengths = wordBearing.map((token) => [...token].length);
  const singleCharacter = lengths.filter((length) => length === 1).length;
  const wordShaped = wordBearing.filter(
    (token) => OCR_WORD_SHAPED_TOKEN.test(token) && [...token].length >= 2
  ).length;

  const visible = [...String(text || "")].filter((character) => /\S/u.test(character));
  const wordCharacters = visible.filter((character) => OCR_WORD_CHARACTER.test(character));

  return {
    tokenCount: wordBearing.length,
    meanTokenLength: lengths.reduce((total, length) => total + length, 0) / wordBearing.length,
    singleCharacterRatio: singleCharacter / wordBearing.length,
    wordShapedRatio: wordShaped / wordBearing.length,
    wordCharacterRatio: visible.length ? wordCharacters.length / visible.length : 0
  };
}

function countPlausibilityFailures(shape) {
  let failures = 0;
  if (shape.meanTokenLength < PLAUSIBILITY_LIMITS.minMeanTokenLength) failures += 1;
  if (shape.singleCharacterRatio > PLAUSIBILITY_LIMITS.maxSingleCharacterRatio) failures += 1;
  if (shape.wordShapedRatio < PLAUSIBILITY_LIMITS.minWordShapedRatio) failures += 1;
  if (shape.wordCharacterRatio < PLAUSIBILITY_LIMITS.minWordCharacterRatio) failures += 1;
  return failures;
}

function looksLikeGarbledText(text) {
  const shape = measureTextShape(text);
  if (shape.tokenCount < PLAUSIBILITY_MIN_TOKENS) return false;
  return countPlausibilityFailures(shape) > PLAUSIBILITY_FAILURES_ALLOWED;
}

// HOW MUCH TEXT IS THERE, COUNTED IN ANY SCRIPT.
//
// These replace [A-Za-z0-9], which counted nothing at all in four of the ten
// languages this product ships in. Roughly 780 characters of real Bengali,
// Gujarati, Hindi or Panjabi containing no Latin scored zero letters and zero
// words, rated poor, and was refused: a Gujarati PDF with a perfect text layer
// was told it "appears to be a scanned document rather than a text document".
// The reader was told their document was the problem. It was not, and there was
// nothing they could do about it. See ENGINE_STATE.md, THE ASCII GATE.
//
// The class is the one tests/wordBoundarySafety.test.js already enforces across
// src/: \p{L} alone treats an Indic vowel sign (category M) as a non letter and
// splits a word through the middle of it. \p{Cf} keeps a ZWNJ inside a word
// rather than cutting it in two.
//
// Shared with hasEnoughText in simplifyRoute.js deliberately, so the two gates
// cannot drift apart on what counts as a word.
//
// MEASURED, rather than assumed to transfer: on the same six dictionary entries
// in every language, all ten now rate good, and every one of them reaches
// borderline at one entry and good at two. The thresholds below mean the same
// thing in Devanagari, Gujarati, Bengali and Gurmukhi as they do in Latin, so
// they are unchanged.
const WORD_CHARACTERS = /[\p{L}\p{M}\p{N}]/gu;
const WORD_TOKENS = /[\p{L}\p{M}\p{N}\p{Cf}]+/gu;

function countWordCharacters(text) {
  return (String(text || "").match(WORD_CHARACTERS) || []).length;
}

function countWords(text) {
  return (String(text || "").match(WORD_TOKENS) || []).length;
}

function rateInputQuality(text) {
  const cleaned = normaliseOcrText(text);
  const words = countWords(cleaned);
  const letters = countWordCharacters(cleaned);

  // Shape is checked before volume because a wall of fragments clears every bar
  // below. This can only ever move a rating down to "poor", never up.
  if (looksLikeGarbledText(cleaned)) return "poor";

  if (letters >= 80 && words >= 12) return "good";
  if (letters >= 25 && words >= 5) return "borderline";
  return "poor";
}

// pdfjs-dist v6 requires Node >=22.13.0 (uses Promise.withResolvers, added in Node 22).
// On Node 20 or 21 the dynamic import below throws TypeError and falls through to the
// catch, returning { text: "", pageCount: 0 } — the PDF upload would silently appear
// as a scanned document. Ensure the deployment runtime satisfies the engines field.
// ESM-only: dynamic import() from CJS works in Node >=12; module is cached after first load.
async function extractTextFromPdf({ filePath }) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { text: "", pageCount: 0 };
  }

  let getDocument;
  try {
    ({ getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs"));
  } catch {
    return { text: "", pageCount: 0 };
  }

  let doc;
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    doc = await getDocument({ data, verbosity: 0, disableAutoFetch: true }).promise;
  } catch {
    return { text: "", pageCount: 0 };
  }

  const pageCount = doc.numPages;
  if (pageCount > 5) return { text: "", pageCount };

  const parts = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) {
      pageText += item.str || "";
      if (item.hasEOL) pageText += "\n";
    }
    parts.push(pageText);
  }

  const text = normaliseOcrText(parts.join("\n\n"));
  return { text, pageCount };
}

module.exports = {
  extractTextFromInput,
  extractTextFromImage,
  extractTextFromPdf,
  isImageMimeType,
  rateInputQuality,
  // Exported so the calibration test can assert the real measured margin between
  // the worst passing sample and the best failing one, rather than reimplementing
  // the arithmetic and testing its own copy of it.
  measureTextShape,
  PLAUSIBILITY_LIMITS,
  // Shared with hasEnoughText in simplifyRoute.js so both gates count a word the
  // same way. A second copy is how one of them ends up ASCII-only again.
  countWordCharacters,
  countWords,
  // Exported so a test can pin the mapping without going through OCR, which is
  // the only way to check it on a machine with no tesseract binary.
  ocrLanguagesFor,
  OCR_LANGUAGES_BY_INTERFACE_LANGUAGE
};
