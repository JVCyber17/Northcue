// A minimal text-only PDF writer, so corpus documents can be LAID OUT and then
// EXTRACTED rather than hand-written.
//
// WHY THIS EXISTS. Every corpus document was a hand-written string passed
// straight to the engine, so nothing in the corpus had ever been through
// extractTextFromPdf. The bug that broke production lives exactly there:
// pdfjs joins pages with "\n\n" and emits no page marker, and no hand-written
// fixture can contain that fact. See CORPUS_STRATEGY.md, Track 1.
//
// NO DEPENDENCY. pdfjs-dist reads PDFs and there is no writer in the tree, and
// the project rule is not to add libraries unless truly necessary. A text PDF
// is a catalog, a page tree, one font and a content stream per page, so it is
// written here directly rather than pulled in.
//
// WHAT IT DELIBERATELY DOES NOT DO. No images, no embedded fonts, no vector
// drawing. It positions text, which is the only thing extraction reads.
//
// ENCODING. Helvetica with WinAnsiEncoding, so Latin-1 plus the pound sign.
// Characters outside that (Polish, Welsh, and every non-Latin script) cannot be
// written by this and are reported by generate.js rather than silently mangled.
// That limitation is itself a finding about the pipeline and is recorded.

"use strict";

const PAGE_WIDTH = 595;   // A4 points
const PAGE_HEIGHT = 842;
const MARGIN_LEFT = 56;
const MARGIN_TOP = 56;
const LINE_HEIGHT = 13;
const FONT_SIZE = 10;

// WinAnsi is Latin-1 with a handful of substitutions in 0x80..0x9F. Anything
// above 0xFF cannot be represented at all.
function toWinAnsi(text) {
  const unsupported = [];
  let out = "";
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    if (code < 0x100) { out += ch; continue; }
    unsupported.push(ch);
    out += "?";
  }
  return { out, unsupported };
}

function escapeForStream(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// A page is an array of { text, x, y } placements, or plain strings which flow
// down the page from the top margin.
function contentStreamFor(page) {
  const parts = ["BT", "/F1 " + FONT_SIZE + " Tf"];
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;
  let lastX = null;
  let lastY = null;
  const unsupported = [];

  page.forEach((entry) => {
    const isPlaced = entry && typeof entry === "object";
    const raw = isPlaced ? entry.text : entry;
    const x = isPlaced && entry.x != null ? entry.x : MARGIN_LEFT;
    let y;
    if (isPlaced && entry.y != null) {
      y = PAGE_HEIGHT - entry.y;
    } else {
      y = cursorY;
      cursorY -= LINE_HEIGHT;
    }
    if (raw === "" || raw == null) return;      // blank line: space only

    const converted = toWinAnsi(raw);
    unsupported.push(...converted.unsupported);
    // Absolute placement each time. Td is relative to the previous text line
    // origin, so the delta is computed rather than assumed.
    const dx = lastX === null ? x : x - lastX;
    const dy = lastY === null ? y : y - lastY;
    parts.push(lastX === null
      ? x + " " + y + " Td"
      : dx + " " + dy + " Td");
    parts.push("(" + escapeForStream(converted.out) + ") Tj");
    lastX = x;
    lastY = y;
  });

  parts.push("ET");
  return { stream: parts.join("\n"), unsupported };
}

// pages: array of pages, each an array of lines or placements.
function writePdf(pages) {
  const objects = [];
  const unsupported = [];
  const pageObjectNumbers = [];

  // 1 catalog, 2 page tree, then per page: page object + content stream.
  let next = 3;
  const perPage = pages.map(() => ({ page: next++, content: next++ }));
  const fontNumber = next++;

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [" +
    perPage.map((p) => p.page + " 0 R").join(" ") +
    "] /Count " + pages.length + " >>";

  pages.forEach((page, index) => {
    const built = contentStreamFor(page);
    unsupported.push(...built.unsupported);
    const nums = perPage[index];
    pageObjectNumbers.push(nums.page);
    objects[nums.page] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
      PAGE_WIDTH + " " + PAGE_HEIGHT + "] /Contents " + nums.content +
      " 0 R /Resources << /Font << /F1 " + fontNumber + " 0 R >> >> >>";
    objects[nums.content] = "<< /Length " + Buffer.byteLength(built.stream, "latin1") +
      " >>\nstream\n" + built.stream + "\nendstream";
  });

  objects[fontNumber] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 1; i < objects.length; i++) {
    if (!objects[i]) continue;
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += i + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  const count = objects.length;
  pdf += "xref\n0 " + count + "\n0000000000 65535 f \n";
  for (let i = 1; i < count; i++) {
    pdf += String(offsets[i] || 0).padStart(10, "0") + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + count + " /Root 1 0 R >>\nstartxref\n" +
    xrefOffset + "\n%%EOF\n";

  return { buffer: Buffer.from(pdf, "latin1"), unsupported: [...new Set(unsupported)] };
}

module.exports = { writePdf, PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, LINE_HEIGHT };
