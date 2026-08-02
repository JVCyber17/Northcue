// What the engine does to a document that came out of the EXTRACTOR rather than
// out of an editor.
//
// THE GAP THIS CLOSES. Every corpus document is a hand-written `text:` string
// passed straight to runClearStepsEngine. Nothing in the corpus had ever been
// through extractTextFromPdf, and the failure that reached a live reader lived
// exactly there: pdfjs joins pages with "\n\n" and emits no page marker, and no
// hand-written fixture can contain that fact. See CORPUS_STRATEGY.md, Track 1.
//
// HOW IT WORKS. scripts/corpus-pdf/ lays each document out as a real PDF and
// records what the real extractor returns, in tests/fixtures/extracted-corpus
// .json. This file asserts the engine reaches the SAME answer on the extracted
// text as on the authored text, and names every document where it does not.
//
// The corpus keeps its authored text on purpose. Freezing extracted text into
// corpus.js would make the documents unreadable and, worse, would hide the
// differences this file exists to surface.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const EXTRACTED = require(path.join(__dirname, "fixtures", "extracted-corpus.json"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "round-trip-test" };

// The tallest document in the corpus, in pages. extractTextFromPdf refuses
// anything over five, so this can never exceed that.
const MAX_PAGES = 3;

// THE ONE DIFFERENCE, and it is the corpus being wrong rather than the engine.
//
// The authored fixture puts a blank line between "Dear Mr Vaidya" and the
// appointment sentence. Co-location's second test is same-blank-line-delimited
// block, so the date does not bind and card 4 reads "No clear due date".
//
// Real extraction emits no blank lines at all: a blank line produces no text
// item, so no hasEOL, so no newline. Everything lands in one block, the date
// binds, and card 4 reads "Your appointment is on 7 July 2026."
//
// So the hand-written corpus was PESSIMISTIC about a real NHS letter, and had
// been recording a decline that the engine does not actually make on a real
// document. That is the whole argument for Track 1 in one entry.
const KNOWN_DIFFERENCES = {
  // TRACK 2, and the two most valuable entries in this file. Both spec-anchored
  // documents read DIFFERENTLY through the real extraction path, in opposite
  // directions, and neither difference is visible in hand-written text.
  //
  // spec_energy_bill_full: authored severity is URGENT, extracted severity is
  // LOW. The authored text over-alarms a routine quarterly bill and the real
  // one does not. The corpus, not the engine, was wrong.
  //
  // spec_council_tax_demand_full: authored amount is £1,578.64, which is what
  // the reader owes after the single person discount. Extracted amount is
  // £2,104.86, the gross band D figure. THE REAL PATH NAMES A NUMBER 33 PERCENT
  // HIGHER THAN THE READER OWES, and only the real path does. This is the
  // strongest argument in the repo for extracting rather than authoring.
  spec_energy_bill_full: "authored is rated urgent, extracted is rated low; the " +
    "page join changes which block the Ofgem debt paragraph sits in",
  spec_council_tax_demand_full: "authored picks the net £1,578.64, extracted " +
    "picks the gross £2,104.86, which is not what the reader owes",
  genuine_nhs_booking_link: "blank lines put the greeting and the appointment date in " +
    "different blocks; real extraction has no blank lines, so the date binds"
};

function shapeOf(text) {
  const run = runClearStepsEngine({ extractedText: text, fileMeta: META });
  const t = run.structured_output.trust_internal;
  const x = run.structured_output.extractor_internal;
  return {
    category: t.document_category,
    mode: t.processing_mode,
    trust: t.trust_assessment,
    severity: t.severity_level,
    multi: t.is_multi_document,
    nonDoc: t.is_probable_non_document,
    amount: x.selected_amount,
    deadline: run.api_output.structured_result.summary.deadline_iso,
    cards: run.api_output.structured_result.cards.map((c) => c.simple_explanation)
  };
}

test("the extracted fixture describes the corpus", async (t) => {
  await t.test("every encodable document is in it", () => {
    const missing = CORPUS
      .map((e) => e.id)
      .filter((id) => !(id in EXTRACTED.documents) && !EXTRACTED.unencodable.includes(id));
    assert.deepEqual(missing, [],
      "regenerate with: node scripts/corpus-pdf/generate.js --fixture");
  });

  await t.test("it describes no document the corpus no longer has", () => {
    const ids = new Set(CORPUS.map((e) => e.id));
    const stale = Object.keys(EXTRACTED.documents).filter((id) => !ids.has(id));
    assert.deepEqual(stale, []);
  });

  await t.test("every document is encodable, in every script", () => {
    // This assertion used to say the opposite. The first writer used Helvetica
    // with WinAnsiEncoding and skipped six documents, every Polish and Romanian
    // one, which was the wrong limit to accept: the languages most in need of
    // extraction coverage were the ones it could not reach.
    //
    // Extraction reads the /ToUnicode CMap rather than the glyphs, so a byte can
    // carry any codepoint. Nothing is skipped now.
    assert.deepEqual(EXTRACTED.unencodable, [],
      "a document has become unencodable; writePdf allocates a code per distinct " +
      "character and throws past 256, so this would mean one document is enormous");
    assert.equal(Object.keys(EXTRACTED.documents).length, CORPUS.length);
  });

  await t.test("a non-Latin script survives the round trip character for character", () => {
    // The claim the ToUnicode approach rests on. If this fails, the fixtures for
    // every non-English document are quietly wrong.
    const normalise = (v) => v.split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
    ["polish_rent_arrears", "intl_polish_clinic_appointment", "intl_romanian_school_meeting"]
      .forEach((id) => {
        const authored = CORPUS.find((e) => e.id === id).text;
        assert.equal(normalise(EXTRACTED.documents[id]), normalise(authored), id);
      });
    assert.match(EXTRACTED.documents.polish_rent_arrears, /zaległość/,
      "Polish diacritics must survive, not be transliterated");
  });
});

test("extraction does not change what the reader is told", async (t) => {
  const moved = [];
  Object.entries(EXTRACTED.documents).forEach(([id, extractedText]) => {
    const entry = CORPUS.find((e) => e.id === id);
    if (!entry) return;
    const authored = shapeOf(entry.text);
    const extracted = shapeOf(extractedText);
    if (JSON.stringify(authored) !== JSON.stringify(extracted)) moved.push(id);
  });

  await t.test("the documents that read differently are exactly the known ones", () => {
    assert.deepEqual(moved.sort(), Object.keys(KNOWN_DIFFERENCES).sort(),
      "a document now reads differently after extraction. That is a finding about " +
      "the authored text, not a test to update: read it before pinning it.");
  });

  await t.test("the known difference is still the one described", () => {
    const entry = CORPUS.find((e) => e.id === "genuine_nhs_booking_link");
    const authored = shapeOf(entry.text);
    const extracted = shapeOf(EXTRACTED.documents.genuine_nhs_booking_link);
    assert.equal(authored.deadline, null, "authored: the date does not bind");
    assert.equal(extracted.deadline, "2026-07-07", "extracted: it does");
    assert.match(extracted.cards[3], /appointment is on 7 July 2026/);
  });

  await t.test("no document gains or loses a refusal through extraction alone", () => {
    // The safety half. A wording difference is a finding; a document that is
    // read on one path and refused on the other is a defect.
    Object.entries(EXTRACTED.documents).forEach(([id, extractedText]) => {
      const entry = CORPUS.find((e) => e.id === id);
      if (!entry) return;
      const a = shapeOf(entry.text);
      const b = shapeOf(extractedText);
      assert.equal(a.mode, b.mode, id + ": processing_mode moved through extraction");
      assert.equal(a.nonDoc, b.nonDoc, id + ": the non-document gate moved");
      assert.equal(a.multi, b.multi, id + ": the multi-letter gate moved");
    });
  });
});

test("extraction really is different from authoring", async (t) => {
  // If this ever passes trivially, the round trip has stopped testing anything.
  await t.test("blank lines do not survive extraction", () => {
    const withBlanks = CORPUS.filter((e) =>
      e.id in EXTRACTED.documents && /\n\s*\n/.test(e.text));
    assert.ok(withBlanks.length > 20, "premise: most authored documents have blank lines");
    withBlanks.forEach((entry) => {
      const extracted = EXTRACTED.documents[entry.id];
      // The ONLY blank line extraction produces is a page JOIN, so a document
      // has at most pageCount - 1 of them. This said "at most one" until the
      // first three page document arrived, which is the assumption a corpus of
      // single page documents lets you make without noticing.
      const blankRuns = (extracted.match(/\n\s*\n/g) || []).length;
      assert.ok(blankRuns <= MAX_PAGES - 1,
        entry.id + " kept " + blankRuns + " blank runs; extraction should leave at " +
        "most one per page join, and no corpus document has more than " + MAX_PAGES +
        " pages");
    });
  });

  await t.test("a multi page document is joined with exactly one blank line", () => {
    // The production bug in one assertion: pages are joined with "\n\n" and
    // nothing marks the boundary. Any rule that wants to know where a page ended
    // cannot find out from the text.
    const twoPagers = ["bill_with_contacts_page", "letter_with_terms_on_back",
      "statement_with_transactions_page"];
    twoPagers.forEach((id) => {
      const extracted = EXTRACTED.documents[id];
      assert.equal((extracted.match(/\n\s*\n/g) || []).length, 1, id);
      assert.doesNotMatch(extracted, /^\s*page\s+\d/im,
        id + ": extraction must not be assumed to emit a page marker");
    });
  });
});
