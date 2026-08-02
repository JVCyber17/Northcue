// Lay every corpus document out as a real PDF, extract it with the real
// extractor, and report what changes.
//
//   node scripts/corpus-pdf/generate.js            report differences only
//   node scripts/corpus-pdf/generate.js --all      report every document
//   node scripts/corpus-pdf/generate.js --write    also write the PDFs to disk
//   node scripts/corpus-pdf/generate.js --fixture  rewrite tests/fixtures/extracted-corpus.json
//
// WHY. Every corpus document is a hand-written string passed straight to the
// engine, so the corpus has never once seen what extractTextFromPdf produces.
// The production failure lived exactly there. See CORPUS_STRATEGY.md, Track 1.
//
// This script is the measurement, not the fixture. Turning a document into an
// extracted fixture is a per-document decision, because a document that reads
// differently after extraction is a FINDING and must be understood before it is
// frozen.

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { CORPUS } = require("../engine-baseline/corpus");
const { SPEC_ANCHORED, PAGE_BREAK } = require("../engine-baseline/corpus-spec-anchored");
const { writePdf } = require("./writePdf");
const { extractTextFromPdf } = require("../../src/services/textExtraction");
const { runClearStepsEngine } = require("../../src/services/clearStepsEngine");
const { countDocumentSignals } = require("../../src/utils/documentSignals");

const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "pdf-round-trip" };
const OUT_DIR = path.join(__dirname, "generated");

// Where to break a document into pages. A document with no explicit break is a
// single page, which is still worth extracting: the blank-line loss applies.
//
// A page break is declared as the 0-based line index the second page starts at,
// found by the marker below rather than hard-coded, so editing a document does
// not silently move its page break.
const PAGE_BREAK_AFTER = {
  bill_with_contacts_page: (lines) =>
    lines.findIndex((l, i) => i > 20 && l.trim() === "British Gas"),
  letter_with_terms_on_back: (lines) =>
    lines.findIndex((l, i) => i > 15 && l.trim() === "Shelter Mutual Insurance"),
  statement_with_transactions_page: (lines) =>
    lines.findIndex((l, i) => i > 10 && l.trim() === "Northbridge Building Society")
};

// The spec-anchored documents declare their own page breaks with a form feed,
// which corpus.js strips before the engine ever sees them. Reading the original
// here is what lets a three page bill be laid out as three pages rather than
// one very long one.
const SPEC_BY_ID = new Map(SPEC_ANCHORED.map((entry) => [entry.id, entry]));

function pagesFor(entry) {
  const declared = SPEC_BY_ID.get(entry.id);
  if (declared) {
    return declared.text.split(PAGE_BREAK).map((page) => page.split("\n"));
  }
  const lines = entry.text.split("\n");
  const finder = PAGE_BREAK_AFTER[entry.id];
  if (!finder) return [lines];
  const at = finder(lines);
  return at > 0 ? [lines.slice(0, at), lines.slice(at)] : [lines];
}

function shapeOf(text) {
  const run = runClearStepsEngine({ extractedText: text, fileMeta: FILE_META });
  const t = run.structured_output.trust_internal;
  const x = run.structured_output.extractor_internal;
  return {
    category: t.document_category,
    mode: t.processing_mode,
    trust: t.trust_assessment,
    severity: t.severity_level,
    multi: t.is_multi_document,
    nonDoc: t.is_probable_non_document,
    quality: t.input_quality,
    amount: x.selected_amount,
    deadline: run.api_output.structured_result.summary.deadline_iso,
    contact: x.contact_number,
    signals: countDocumentSignals(text),
    cards: run.api_output.structured_result.cards.map((c) => c.simple_explanation)
  };
}

function differences(a, b) {
  const out = [];
  Object.keys(a).forEach((key) => {
    if (key === "cards") {
      a.cards.forEach((card, i) => {
        if (card !== b.cards[i]) out.push("card " + (i + 1) + ":\n        was " +
          JSON.stringify(card) + "\n        now " + JSON.stringify(b.cards[i]));
      });
      return;
    }
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      out.push(key + ": " + JSON.stringify(a[key]) + " -> " + JSON.stringify(b[key]));
    }
  });
  return out;
}

async function main() {
  const showAll = process.argv.includes("--all");
  const writeFiles = process.argv.includes("--write");
  const writeFixture = process.argv.includes("--fixture");
  const fixture = {};
  if (writeFiles && !fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "northcue-pdf-"));

  let skipped = 0, identical = 0, moved = 0;
  const movedIds = [];

  for (const entry of CORPUS) {
    const { buffer, unsupported } = writePdf(pagesFor(entry));
    if (unsupported.length) {
      skipped++;
      console.log("SKIPPED  " + entry.id.padEnd(36) +
        "characters this writer cannot encode: " + JSON.stringify(unsupported.join("")));
      continue;
    }
    const file = path.join(writeFiles ? OUT_DIR : tmp, entry.id + ".pdf");
    fs.writeFileSync(file, buffer);
    const extracted = await extractTextFromPdf({ filePath: file });

    fixture[entry.id] = extracted.text;
    const before = shapeOf(entry.text);
    const after = shapeOf(extracted.text);
    const diff = differences(before, after);
    if (!diff.length) {
      identical++;
      if (showAll) console.log("same     " + entry.id);
      continue;
    }
    moved++;
    movedIds.push(entry.id);
    console.log("MOVED    " + entry.id + "   (" + extracted.pageCount + " page(s))");
    diff.forEach((d) => console.log("      " + d));
  }

  if (!writeFiles) fs.rmSync(tmp, { recursive: true, force: true });
  if (writeFixture) {
    const target = path.join(__dirname, "..", "..", "tests", "fixtures", "extracted-corpus.json");
    fs.writeFileSync(target, JSON.stringify({
      note: "What extractTextFromPdf returns for each corpus document after it has " +
        "been laid out as a real PDF. Regenerate with: node scripts/corpus-pdf/generate.js --fixture",
      writtenBy: "scripts/corpus-pdf/generate.js",
      unencodable: CORPUS.filter((e) => !(e.id in fixture)).map((e) => e.id),
      documents: fixture
    }, null, 2) + "\n", "utf8");
    console.log("  fixture written: " + Object.keys(fixture).length + " documents");
  }
  console.log("");
  console.log("  " + CORPUS.length + " documents.  identical after extraction: " + identical +
    ".  moved: " + moved + ".  not encodable: " + skipped + ".");
  if (movedIds.length) console.log("  moved: " + movedIds.join(", "));
}

main().catch((err) => { console.error(err); process.exit(1); });
