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
// ============================================================================
// HOW IT WRITES POLISH, GUJARATI, HINDI, BENGALI AND PANJABI WITHOUT A FONT
// ============================================================================
//
// The first version used Helvetica with WinAnsiEncoding, so it could write
// Latin-1 and nothing else, and it skipped six corpus documents: every Polish
// and Romanian one. That was the wrong limit to accept, because the languages
// most in need of extraction coverage are exactly the ones it could not reach.
//
// EXTRACTION READS THE /ToUnicode CMap, NOT THE GLYPHS. That is the whole
// trick, and it was verified before being built on: a PDF whose content stream
// says "AB", with a ToUnicode map sending byte 0x41 to U+0142 and 0x42 to
// U+0A85, extracts as "ł" followed by the Gujarati letter A. So every character
// in a document is allocated a byte code, and the ToUnicode map carries its
// real codepoint. Any script the engine can be handed, this can now write.
//
// WHAT THAT MEANS, AND THE HONEST CAVEAT. These PDFs are correct in their TEXT
// LAYER and wrong in their GLYPHS: opened in a viewer, a Polish letter renders
// as Latin nonsense, because Helvetica has no Polish glyphs and none is
// embedded. They are fixtures for the extraction path, not visual reproductions
// of a letter, and must never be presented as the latter. What the engine
// consumes is the text layer, and the text layer is exactly right.
//
// The ceiling is 256 distinct characters per document, which no realistic
// letter approaches: Latin plus digits plus punctuation plus a full Indic
// syllabary is around 150. Over that, this throws rather than truncating.

"use strict";

const PAGE_WIDTH = 595;   // A4 points
const PAGE_HEIGHT = 842;
const MARGIN_LEFT = 56;
const MARGIN_TOP = 56;
const LINE_HEIGHT = 13;
const FONT_SIZE = 10;
const MAX_CODES = 256;

// Codes 0x20..0x7E keep their own meaning, so an English document's content
// stream stays readable in a hex dump. Everything else is allocated from 0x80
// upwards, and ToUnicode is emitted for every code either way.
function buildCodeTable(pages) {
  const toCode = new Map();
  let next = 0x80;
  const seen = [];
  pages.forEach((page) => page.forEach((entry) => {
    const raw = entry && typeof entry === "object" ? entry.text : entry;
    for (const ch of String(raw == null ? "" : raw)) {
      if (toCode.has(ch)) continue;
      const point = ch.codePointAt(0);
      let code;
      if (point >= 0x20 && point <= 0x7E) {
        code = point;
      } else {
        if (next > 0xFF) {
          throw new Error("writePdf: more than " + MAX_CODES +
            " distinct characters in one document; split it or add a second font");
        }
        code = next++;
      }
      toCode.set(ch, code);
      seen.push([code, point]);
    }
  }));
  return { toCode, seen };
}

function toBytes(text, toCode) {
  let out = "";
  for (const ch of String(text)) {
    const code = toCode.get(ch);
    // Escape the three characters a PDF literal string treats specially, and
    // write everything else as a three digit octal escape so no byte can be
    // mistaken for structure.
    if (code === 0x28) out += "\\(";
    else if (code === 0x29) out += "\\)";
    else if (code === 0x5C) out += "\\\\";
    else if (code >= 0x20 && code <= 0x7E) out += String.fromCharCode(code);
    else out += "\\" + code.toString(8).padStart(3, "0");
  }
  return out;
}

function toUnicodeCMap(seen) {
  const pairs = seen
    .slice()
    .sort((a, b) => a[0] - b[0])
    .map(([code, point]) => "<" + code.toString(16).padStart(2, "0") + "> <" +
      point.toString(16).padStart(4, "0").toUpperCase() + ">");
  // bfchar sections are capped at 100 entries by the specification.
  const sections = [];
  for (let i = 0; i < pairs.length; i += 100) {
    const chunk = pairs.slice(i, i + 100);
    sections.push(chunk.length + " beginbfchar\n" + chunk.join("\n") + "\nendbfchar");
  }
  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CMapName /NorthcueCorpus def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<00> <FF>",
    "endcodespacerange",
    sections.join("\n"),
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end"
  ].join("\n");
}

// A page is an array of { text, x, y } placements, or plain strings which flow
// down the page from the top margin.
function contentStreamFor(page, toCode) {
  const parts = ["BT", "/F1 " + FONT_SIZE + " Tf"];
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;
  let lastX = null;
  let lastY = null;

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

    const dx = lastX === null ? x : x - lastX;
    const dy = lastY === null ? y : y - lastY;
    parts.push(lastX === null ? x + " " + y + " Td" : dx + " " + dy + " Td");
    parts.push("(" + toBytes(raw, toCode) + ") Tj");
    lastX = x;
    lastY = y;
  });

  parts.push("ET");
  return parts.join("\n");
}

// pages: array of pages, each an array of lines or placements.
function writePdf(pages) {
  const { toCode, seen } = buildCodeTable(pages);
  const objects = [];

  let next = 3;
  const perPage = pages.map(() => ({ page: next++, content: next++ }));
  const fontNumber = next++;
  const cmapNumber = next++;

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [" +
    perPage.map((p) => p.page + " 0 R").join(" ") +
    "] /Count " + pages.length + " >>";

  pages.forEach((page, index) => {
    const stream = contentStreamFor(page, toCode);
    const nums = perPage[index];
    objects[nums.page] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
      PAGE_WIDTH + " " + PAGE_HEIGHT + "] /Contents " + nums.content +
      " 0 R /Resources << /Font << /F1 " + fontNumber + " 0 R >> >> >>";
    objects[nums.content] = "<< /Length " + Buffer.byteLength(stream, "latin1") +
      " >>\nstream\n" + stream + "\nendstream";
  });

  objects[fontNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica " +
    "/Encoding /WinAnsiEncoding /ToUnicode " + cmapNumber + " 0 R >>";
  const cmap = toUnicodeCMap(seen);
  objects[cmapNumber] = "<< /Length " + Buffer.byteLength(cmap, "latin1") +
    " >>\nstream\n" + cmap + "\nendstream";

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

  // unsupported is kept in the returned shape, always empty now, so callers
  // written against the Latin-1 version keep working and their "skipped" branch
  // simply never fires.
  return { buffer: Buffer.from(pdf, "latin1"), unsupported: [] };
}

module.exports = { writePdf, PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, LINE_HEIGHT, MAX_CODES };
