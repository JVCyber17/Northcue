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

function rateInputQuality(text) {
  const cleaned = normaliseOcrText(text);
  const words = cleaned.match(/[A-Za-z0-9$]+/g) || [];
  const letters = cleaned.replace(/[^A-Za-z0-9]/g, "");

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
  rateInputQuality
};
