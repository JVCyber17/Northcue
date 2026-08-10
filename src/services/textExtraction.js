const fs = require("node:fs");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

async function extractTextFromImage({ filePath }) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      success: false,
      error: "This document is hard to read. Please upload a clearer image."
    };
  }

  try {
    // Tesseract writes OCR text to stdout when the output target is "stdout".
    // Keep this developer-only step separate from the AI pipeline for now.
    const { stdout } = await execFileAsync(
      "tesseract",
      [filePath, "stdout", "-l", "eng", "--psm", "6"],
      {
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true
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

function rateInputQuality(text) {
  const cleaned = normaliseOcrText(text);
  const words = cleaned.match(/[A-Za-z0-9$]+/g) || [];
  const letters = cleaned.replace(/[^A-Za-z0-9]/g, "");

  // Shape is checked before volume because a wall of fragments clears every bar
  // below. This can only ever move a rating down to "poor", never up.
  if (looksLikeGarbledText(cleaned)) return "poor";

  if (letters.length >= 80 && words.length >= 12) return "good";
  if (letters.length >= 25 && words.length >= 5) return "borderline";
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
  PLAUSIBILITY_LIMITS
};
