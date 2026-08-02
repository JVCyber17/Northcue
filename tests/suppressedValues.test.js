// A value suppressed AFTER a sentence has been composed from it.
//
// THE SHAPE. A builder computes a value, writes a sentence from it, and returns
// both. A caller then decides this document may not carry that value and sets
// the FIELD to null. The sentence is not rebuilt, so the field says one thing
// and the card says another, and the card is what the reader sees.
//
// THE CASE THIS FILE WAS OPENED FOR. buildBenefitsReadingAidExtraction says
// exactly what it wants and why:
//
//   // Do not attach a single calendar date: benefits letters often list
//   // several dates and we cannot reliably tell which (if any) is the real
//   // deadline.
//   signals.primaryDate = null;
//
// extractReadableDocumentSignals had already built signals.dateMessage from the
// non-null primaryDate. So the Hindi DWP letter read
//
//   "The document shows 18 June 2026 as the date that matters."
//
// with deadline null beside it. 18 June is its next payment date. The
// obligation is to send information by 24 June. A wrong fact stated calmly, on
// a benefits letter, in a language the reviewer reads.
//
// FOUR DOCUMENTS TAKE THAT PATH AND ONLY ONE WAS WRONG, which is why nothing
// caught it: the other three had a null primaryDate already, for unrelated
// reasons, and fell through to the honest list form.
//
// THE FIX IS THE SHAPE, NOT THE SYMPTOM. The suppression is now an argument to
// the builder rather than an assignment after it, so no value derived from it
// can survive it, including one added later by someone who has never read this
// file.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "suppressed" };
const analyse = (text) => runClearStepsEngine({ extractedText: text, fileMeta: META });
const byId = (id) => CORPUS.find((entry) => entry.id === id).text;

const BENEFITS_REASON = "Benefits or welfare letters are handled as a reading aid only.";

function cardSentences(out) {
  const parts = [];
  (out.api_output.structured_result.cards || []).forEach((card, index) => {
    ["simple_explanation", "action_needed", "read_aloud_text"].forEach((field) => {
      if (typeof card[field] === "string" && card[field]) parts.push([index + 1, field, card[field]]);
    });
    (card.key_points || []).forEach((point) => parts.push([index + 1, "key_point", String(point)]));
  });
  return parts;
}

test("a benefits letter never names one date as the date that matters", async (t) => {
  await t.test("the four documents on that path, and what each card 4 says", () => {
    // Pinned as a set. Three of the four hid the defect, so a change that
    // silently moves one of them off this path also removes the only document
    // that can show it.
    const onThePath = CORPUS.filter((entry) =>
      analyse(entry.text).structured_output.extractor_internal.review_reason === BENEFITS_REASON
    ).map((entry) => entry.id);
    assert.deepEqual(onThePath.sort(), [
      "benefits_dwp", "blank_template", "genuine_dwp_identity_check",
      "spec_hindi_dwp_universal_credit"
    ], "the benefits reading-aid path no longer covers the documents it was measured on");
  });

  await t.test("none of them names a single date, field or sentence", () => {
    const NAMES_ONE = /shows .* as the date that matters|Due by |Your appointment is on /i;
    CORPUS.forEach((entry) => {
      const out = analyse(entry.text);
      const x = out.structured_output.extractor_internal;
      if (x.review_reason !== BENEFITS_REASON) return;
      assert.equal(x.deadline, null, entry.id + ": the field must stay null");
      const signals = x.readable_unsupported_signals || {};
      assert.equal(signals.primaryDate, null, entry.id + ": and so must the value behind it");
      cardSentences(out).forEach(([n, field, sentence]) => {
        assert.ok(!NAMES_ONE.test(sentence),
          entry.id + " card " + n + " " + field + " names a single date while the " +
          "field beside it says there is none: " + JSON.stringify(sentence.slice(0, 90)));
      });
    });
  });

  await t.test("the Hindi letter lists both its dates and asserts neither", () => {
    // The document that exposed it. 18 June is the next payment date and 24
    // June is the obligation, and the engine has no basis to choose, so it says
    // so. Listing claims nothing, which is the supported state.
    const out = analyse(byId("spec_hindi_dwp_universal_credit"));
    const card4 = out.api_output.structured_result.cards[3];
    assert.equal(card4.simple_explanation,
      "These dates appear in the document: 18 June 2026, 24 June 2026. Check what they refer to.");
    assert.equal(card4.possible_deadline, null);
  });

  await t.test("and the suppression is asked for, not undone afterwards", () => {
    // The structural half. If a future change reintroduces the assignment, the
    // three assertions above still pass on three of the four documents and fail
    // only on the Hindi one, which is exactly how thin this was. This asserts
    // the mechanism instead: a benefits letter that carries ONE unambiguous
    // co-located deadline must still name no date, because the path forbids it
    // rather than because the text happened not to support one.
    const letter = [
      "Department for Work and Pensions",
      "Universal Credit",
      "National Insurance number: QQ 12 34 56 C",
      "",
      "Dear Mr Vaidya",
      "",
      "Your Universal Credit payment has been reviewed.",
      "You must pay the overpayment by 24 June 2026."
    ].join("\n");
    const out = analyse(letter);
    const x = out.structured_output.extractor_internal;
    assert.equal(x.review_reason, BENEFITS_REASON, "premise: this is on the benefits path");
    const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
    assert.ok(co.selectDeadline(letter, () => true),
      "premise: co-location DOES bind a deadline here, so only the path suppresses it");
    assert.equal(x.deadline, null);
    assert.equal((x.readable_unsupported_signals || {}).primaryDate, null);
    assert.ok(!/as the date that matters/.test(
      out.api_output.structured_result.cards[3].simple_explanation),
      "the sentence must be built from the suppressed value, not patched after it");
  });
});

test("no card asserts something the field beside it denies", async (t) => {
  // The sweep, kept as a test so the next suppression is caught by machine
  // rather than by someone reading for it. Run over all 70 documents.
  //
  // The honest LIST forms are allowed to name a date: "These dates appear in
  // the document" claims nothing about what they mean, which is the whole
  // reason that wording exists.
  const LISTS_WITHOUT_CLAIMING =
    /These dates appear|These may be important dates|Check these visible dates|letter is dated|Check what they refer to|Check this date|Check the date|cannot be matched/i;
  const NAMES_A_DATE_AS_THE_ONE = /shows .* as the date that matters|^Due by |Your appointment is on /i;

  await t.test("a null deadline is never contradicted by a card", () => {
    const offences = [];
    CORPUS.forEach((entry) => {
      const out = analyse(entry.text);
      if (out.structured_output.extractor_internal.deadline) return;
      cardSentences(out).forEach(([n, field, sentence]) => {
        if (LISTS_WITHOUT_CLAIMING.test(sentence)) return;
        if (NAMES_A_DATE_AS_THE_ONE.test(sentence)) {
          offences.push(entry.id + " card " + n + " " + field + ": " + sentence.slice(0, 80));
        }
      });
    });
    assert.deepEqual(offences, []);
  });

  await t.test("a null selected amount is never contradicted by a card", () => {
    const NAMES_AN_AMOUNT = /(?:£|GBP)\s?\d/;
    const ALLOWED = /An amount is shown|amounts on the original|Check the amount|cannot be matched/i;
    const offences = [];
    CORPUS.forEach((entry) => {
      const out = analyse(entry.text);
      if (out.structured_output.extractor_internal.selected_amount) return;
      cardSentences(out).forEach(([n, field, sentence]) => {
        if (ALLOWED.test(sentence)) return;
        if (NAMES_AN_AMOUNT.test(sentence)) {
          offences.push(entry.id + " card " + n + " " + field + ": " + sentence.slice(0, 80));
        }
      });
    });
    assert.deepEqual(offences, []);
  });

  await t.test("a null contact number is never contradicted by a card", () => {
    const NAMES_A_NUMBER = /(?<![\d+])0(?!0)\d[\d\s]{7,12}\d\b|\+\d{1,3}[\s.-]?\d/;
    const offences = [];
    CORPUS.forEach((entry) => {
      const out = analyse(entry.text);
      if (out.structured_output.extractor_internal.contact_number) return;
      cardSentences(out).forEach(([n, field, sentence]) => {
        if (NAMES_A_NUMBER.test(sentence)) {
          offences.push(entry.id + " card " + n + " " + field + ": " + sentence.slice(0, 80));
        }
      });
    });
    assert.deepEqual(offences, []);
  });
});
