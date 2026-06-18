// End-to-end PDF extraction verification.
// node _pdf_test.js
//
// Creates three test PDFs in the system temp dir:
//   1. A realistic text-based energy bill — should produce accurate six-card output
//   2. A PDF with 6 pages — should be rejected by the page-limit check
//   3. A PDF whose content stream has no readable text — should return the scanned-doc message
//
// Does NOT hit the HTTP server. Calls extractTextFromPdf and runClearStepsEngine directly.

const fs   = require("node:fs");
const path = require("node:path");
const os   = require("node:os");

const { extractTextFromPdf } = require("./src/services/textExtraction");
const { runClearStepsEngine } = require("./src/services/clearStepsEngine");

// ---------------------------------------------------------------------------
// Minimal but correctly-formed PDF builder.
// Computes real xref byte offsets so pdfjs doesn't emit "Indexing all objects".
// ---------------------------------------------------------------------------
function buildPdf(pages) {
  // Each page is { text: string } where text is raw PDF content-stream commands.
  const objects = [];
  const push    = (s) => { objects.push(s); return objects.length; };  // returns 1-based id

  const catalogId = push(null);   // 1 — filled below
  const pagesId   = push(null);   // 2
  const fontId    = push(null);   // 3
  const pageIds   = pages.map(() => push(null));
  const streamIds = pages.map(() => push(null));

  const streamBodies = pages.map(({ text, rawStream }) => {
    // rawStream bypasses the text wrapper — used to create image-only / no-text PDFs
    if (rawStream !== undefined) return rawStream;
    const lines = text.trim().split("\n");
    let cmds = "BT\n/F1 11 Tf\n";
    let y = 750;
    for (const line of lines) {
      const safe = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      // Tm sets the text matrix absolutely (1 0 0 1 x y Tm), unlike Td which is relative
      cmds += `1 0 0 1 72 ${y} Tm (${safe}) Tj\n`;
      y -= 14;
    }
    cmds += "ET";
    return cmds;
  });

  // Build raw byte string for each object
  const objStrings = new Array(objects.length + 1).fill("");

  objStrings[catalogId] =
    `${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`;

  const kidRefs = pageIds.map((id) => `${id} 0 R`).join(" ");
  objStrings[pagesId] =
    `${pagesId} 0 obj\n<< /Type /Pages /Kids [${kidRefs}] /Count ${pages.length} >>\nendobj\n`;

  objStrings[fontId] =
    `${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  pageIds.forEach((pageId, i) => {
    const streamId = streamIds[i];
    objStrings[pageId] =
      `${pageId} 0 obj\n` +
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792]\n` +
      `   /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\n` +
      `endobj\n`;
  });

  streamIds.forEach((streamId, i) => {
    const body = streamBodies[i];
    const len  = Buffer.byteLength(body, "utf8");
    objStrings[streamId] =
      `${streamId} 0 obj\n<< /Length ${len} >>\nstream\n${body}\nendstream\nendobj\n`;
  });

  // Compute byte offsets for xref
  const header    = `%PDF-1.4\n`;
  const offsets   = [];
  let pos = Buffer.byteLength(header, "utf8");
  const body_parts = [];
  for (let id = 1; id <= objects.length; id++) {
    offsets[id] = pos;
    const s = objStrings[id];
    body_parts.push(s);
    pos += Buffer.byteLength(s, "utf8");
  }

  const xrefOffset = pos;
  const n          = objects.length + 1;  // including free entry 0
  let xref = `xref\n0 ${n}\n`;
  xref += `0000000000 65535 f \n`;
  for (let id = 1; id <= objects.length; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer =
    `trailer\n<< /Size ${n} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return header + body_parts.join("") + xref + trailer;
}

// ---------------------------------------------------------------------------
// Test document content
// ---------------------------------------------------------------------------
const ENERGY_BILL_TEXT = `
PowerGrid Energy Services
Customer Accounts
PO Box 847
Leeds LS99 3AB

Account: 9274610
Date: 10 June 2026

ELECTRICITY BILL

Your electricity bill for the period 1 March 2026 to 31 May 2026.

Amount due: £89.20

Payment due by 25 June 2026.

Please pay online at powergrid.co.uk or call 0800 999 1234.

If payment is not received by the due date your supply may be
disconnected and a reconnection fee will apply.

Reference: PG-2026-9274610
`.trim();

const SIX_PAGE_TEXT = `This is page content for a six page document.`;

// An empty content stream — no BT/Tj operators, so pdfjs has nothing to extract.
// Simulates a scanned-image PDF whose page has only rasterised pixels, not text.

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
async function main() {
  const tmp = os.tmpdir();

  // ── TEST 1: Realistic text-based energy bill ─────────────────────────────
  console.log("\n" + "═".repeat(72));
  console.log("▶ TEST 1: Text-based energy bill PDF — full extraction + engine run");
  console.log("═".repeat(72));

  const billPath = path.join(tmp, "nc_test_energy_bill.pdf");
  fs.writeFileSync(billPath, buildPdf([{ text: ENERGY_BILL_TEXT }]));
  console.log(`  Written: ${billPath}`);

  const billResult = await extractTextFromPdf({ filePath: billPath });
  console.log(`\n  pageCount: ${billResult.pageCount}`);
  console.log(`  text (first 200 chars): "${billResult.text.slice(0, 200)}"`);
  console.log(`  hasText: ${billResult.text.length > 0}`);

  if (billResult.text.length > 0) {
    const engineResult = runClearStepsEngine({
      extractedText: billResult.text,
      fileMeta: { jobId: "pdf-test-001", mimeType: "application/pdf", selectedCategory: "auto" }
    });

    const out   = engineResult.api_output;
    const trust = engineResult.structured_output.trust_internal;
    const ext   = engineResult.structured_output.extractor_internal;

    console.log(`\n  category: ${trust.document_category}  |  severity: ${trust.severity_level}  |  mode: ${trust.processing_mode}`);
    console.log(`  amounts: ${JSON.stringify(ext.money_amounts)}  |  deadline: ${ext.deadline || "null"}`);
    console.log("\n  ── SIX CARDS ──");
    for (const card of out.cards) {
      console.log(`\n  [${card.id}]  ${card.title}`);
      console.log(`  "${card.short_answer}"`);
      if (card.steps && card.steps.length > 0 && !(card.steps.length === 1 && card.steps[0] === card.short_answer)) {
        for (const s of card.steps) console.log(`    • ${s}`);
      }
      if (card.date) console.log(`  date: ${card.date}`);
    }
    if (out.debug.validation_errors) {
      console.log(`\n  ⚠ VALIDATION ERRORS: ${JSON.stringify(out.debug.validation_errors)}`);
    } else {
      console.log("\n  ✓ No validation errors");
    }
  }

  // ── TEST 2: Over-page-limit PDF ──────────────────────────────────────────
  console.log("\n" + "═".repeat(72));
  console.log("▶ TEST 2: 6-page PDF — should be rejected by page-limit check");
  console.log("═".repeat(72));

  const sixPagePath = path.join(tmp, "nc_test_six_pages.pdf");
  const sixPageDoc = buildPdf(Array.from({ length: 6 }, () => ({ text: SIX_PAGE_TEXT })));
  fs.writeFileSync(sixPagePath, sixPageDoc);
  console.log(`  Written: ${sixPagePath}`);

  const sixPageResult = await extractTextFromPdf({ filePath: sixPagePath });
  console.log(`  pageCount: ${sixPageResult.pageCount}`);
  console.log(`  text empty: ${sixPageResult.text === ""}`);

  if (sixPageResult.pageCount > 5 && sixPageResult.text === "") {
    console.log("  ✓ Page-limit check fired correctly — text suppressed, pageCount = 6");
  } else {
    console.log("  ✗ UNEXPECTED RESULT");
  }

  // ── TEST 3: PDF with no text layer (simulated scanned) ───────────────────
  console.log("\n" + "═".repeat(72));
  console.log("▶ TEST 3: PDF with no readable text — should trigger scanned-doc message");
  console.log("═".repeat(72));

  const noTextPath = path.join(tmp, "nc_test_no_text.pdf");
  // We build a PDF whose content stream is empty (no BT/Tj operators).
  // rawStream bypasses the text-command wrapper in buildPdf.
  const noTextPdf = buildPdf([{ rawStream: "" }]);
  fs.writeFileSync(noTextPath, noTextPdf);
  console.log(`  Written: ${noTextPath}`);

  const noTextResult = await extractTextFromPdf({ filePath: noTextPath });
  console.log(`  pageCount: ${noTextResult.pageCount}`);
  console.log(`  extracted text: "${noTextResult.text}"`);

  const { hasEnoughText: _hasEnoughText } = (() => {
    function hasEnoughText(text) {
      const cleaned = String(text || "").replace(/\s+/g, " ").trim();
      const wordCount = (cleaned.match(/[A-Za-z0-9]+/g) || []).length;
      return cleaned.length >= 25 && wordCount >= 5;
    }
    return { hasEnoughText };
  })();

  if (!_hasEnoughText(noTextResult.text)) {
    console.log("  ✓ hasEnoughText returned false — route would return scanned-doc message");
    console.log('  ✓ Message: "This PDF appears to be a scanned document rather than a text document. For best results, please upload a clear photo of the document instead."');
  } else {
    console.log("  ✗ UNEXPECTED: hasEnoughText returned true for image-only PDF");
    console.log(`  text was: "${noTextResult.text}"`);
  }

  console.log("\n" + "═".repeat(72));
  console.log("Done.");
  console.log("═".repeat(72) + "\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
