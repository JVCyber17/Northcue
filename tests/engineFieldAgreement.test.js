// AN ENGINE FIELD AND THE SENTENCE BESIDE IT MAY NOT DISAGREE.
//
// THIS IS THE TEST THAT SHOULD HAVE EXISTED. Three defects shipped through the
// same gap, and none of them was catchable by any test in this repo:
//
//   card 4 read "The visits are scheduled for 12 and 13 March 2018" above a
//   sub-line reading "No clear date was found in the document."
//
//   the passed-deadline warning silently vanished whenever the model rewrote
//   card 4, because the client matched the RENDERED SENTENCE against a template
//   bank the model's wording never matches
//
//   ten reading-aid documents carried a deadline_iso whose only gate was that
//   same lookup happening to fail
//
// Every one is the same shape: a value the ENGINE owns, and a sentence the
// MODEL owns, rendered together with nothing reconciling them. The engine tests
// could not see it because they stop at runClearStepsEngine. The client tests
// could not see it because they mirror app.js rather than running it.
//
// SO THIS CATCHES THE CLASS, NOT THE THREE INSTANCES. It is a registry: every
// place the client derives a reader-visible claim from an engine-owned field
// has to be listed here with how it is reconciled. Adding a new one without
// listing it fails, which is the only mechanism that would have caught any of
// the three before a reader met it.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));
const { sanitizeStructuredResultWithVerdict } =
  require(path.join(ROOT, "src", "utils", "validateStructuredResult"));
const { CORPUS } = require(path.join(ROOT, "scripts", "engine-baseline", "corpus"));
const APP_JS = fs.readFileSync(path.join(ROOT, "public", "app.js"), "utf8");

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "agreement" };
const analyse = (text) => runClearStepsEngine({ extractedText: text, fileMeta: META });

// THE REGISTRY. One entry per reader-visible claim the client derives from an
// engine-owned field. `reads` is the expression as it appears in app.js, so a
// rename breaks this deliberately.
const ENGINE_DERIVED_CLAIMS = [
  {
    reads: "card.date",
    where: "shortCardExplanation, card 4's sub-line",
    claim: "whether a due date was found",
    reconciled: "NOT RECONCILED. The sub-line reads the engine field and the " +
      "answer above it comes from the model, so a card can name dates above " +
      "\"No clear date was found in the document.\" Item C, proposed and not " +
      "yet built."
  },
  {
    reads: "card.date",
    where: "buildCardDetail, card 4's detail view",
    claim: "whether a due date was found",
    reconciled: "NOT RECONCILED, the same pair on a second surface."
  },
  {
    reads: "summary.deadline_iso",
    where: "passedDeadlineLine",
    claim: "that a deadline has passed",
    reconciled: "RECONCILED. Keyed on deadline_iso and document_category, both " +
      "engine-owned, with no read of any rendered sentence. The reading-aid " +
      "path cannot reach it because deadlineIsoFor refuses that path."
  }
];

test("every engine-derived client claim is registered", async (t) => {
  await t.test("app.js reads no engine-owned card field this file has not listed", () => {
    // The mechanism that makes this catch the CLASS. A new client rule reading
    // an engine field is a new chance for the two to disagree, and it cannot be
    // added without appearing here.
    const ENGINE_OWNED = ["card.date", "possible_deadline", "possible_payment", "deadline_iso"];
    // Registry keys may be qualified ("summary.deadline_iso"); compare on the
    // bare field so a qualified entry still counts as registered.
    const registered = new Set(ENGINE_DERIVED_CLAIMS
      .map((entry) => entry.reads.split(".").slice(-2).join("."))
      .concat(ENGINE_DERIVED_CLAIMS.map((entry) => entry.reads.split(".").pop())));
    const unregistered = [];

    ENGINE_OWNED.forEach((field) => {
      // Reads inside a rendering function, ignoring the payload plumbing in
      // normalizeApiResult and structuredCardToUiCard, which copy rather than
      // claim anything.
      const pattern = new RegExp(field.replace(".", "\\."), "g");
      let match;
      while ((match = pattern.exec(APP_JS)) !== null) {
        const line = APP_JS.slice(APP_JS.lastIndexOf("\n", match.index) + 1,
          APP_JS.indexOf("\n", match.index));
        if (/^\s*(\/\/|\*)/.test(line)) continue;                 // a comment
        if (/date:\s*card\.possible_deadline/.test(line)) continue; // the copy
        if (/^\s*(possible_deadline|possible_payment|deadline_iso):/.test(line)) continue;
        if (registered.has(field)) continue;
        unregistered.push(field + "  " + line.trim().slice(0, 70));
      }
    });

    assert.deepEqual(unregistered, [],
      "app.js derives a reader-visible claim from an engine field that is not " +
      "in ENGINE_DERIVED_CLAIMS. Add it, and say how the two are reconciled:\n" +
      unregistered.join("\n"));
  });

  await t.test("the registry states a reconciliation for every entry", () => {
    ENGINE_DERIVED_CLAIMS.forEach((entry) => {
      assert.ok(entry.reconciled && entry.reconciled.length > 20,
        entry.where + ": every entry must say how the field and the sentence agree, " +
        "or say plainly that they do not");
    });
  });
});

test("a model answer cannot contradict the engine field beside it", async (t) => {
  // Behavioural, on the pairs that CAN be checked mechanically. A model
  // rewrite that names a date or an amount must not sit beside an engine field
  // that denies one.
  const NAMES_A_DATE = /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/i;
  const NAMES_MONEY = /(?:£|GBP)\s?[\d,]+(?:\.\d{2})?/;

  function servedWithModelDates(text) {
    const run = analyse(text);
    const fallback = run.api_output.structured_result;
    const candidate = JSON.parse(JSON.stringify(fallback));
    // A model that asserts a date and an amount on the cards that carry them.
    candidate.cards[3].simple_explanation = "The visits are scheduled for 12 and 13 June 2026.";
    candidate.cards[4].simple_explanation = "The amount to pay is £298.53.";
    return { fallback, served: sanitizeStructuredResultWithVerdict(candidate, fallback, text).result };
  }

  await t.test("possible_deadline stays engine-owned however the model words card 4", () => {
    CORPUS.slice(0, 25).forEach((entry) => {
      const { fallback, served } = servedWithModelDates(entry.text);
      assert.equal(served.cards[3].possible_deadline, fallback.cards[3].possible_deadline,
        entry.id + ": the model moved the engine's deadline field");
    });
  });

  await t.test("possible_payment stays engine-owned however the model words card 5", () => {
    CORPUS.slice(0, 25).forEach((entry) => {
      const { fallback, served } = servedWithModelDates(entry.text);
      assert.equal(served.cards[4].possible_payment, fallback.cards[4].possible_payment,
        entry.id + ": the model moved the engine's payment field");
    });
  });

  await t.test("THE KNOWN CONTRADICTION, recorded rather than asserted away", () => {
    // The HMRC shape, and it is still wrong. The field says no date, the answer
    // names one, and the client sub-line reads the field.
    //
    // medical_letter is the corpus document that reproduces it: the engine
    // holds no deadline, so card 4's sub-line says "No clear date was found in
    // the document." while a model answer above it can name one.
    //
    // Asserted as WRONG on purpose, so closing it FAILS this test and forces
    // the note to be rewritten rather than left stale. Item C.
    const letter = CORPUS.find((entry) => entry.id === "medical_letter").text;
    const { fallback, served } = servedWithModelDates(letter);
    assert.equal(fallback.cards[3].possible_deadline, null,
      "premise: the engine holds no deadline for this letter");
    assert.equal(served.cards[3].possible_deadline, null,
      "and the model cannot give it one");
    assert.match(APP_JS, /card\.date \? t\("journey\.explainDueWithDate"\) : t\("journey\.explainDueNoDate"\)/,
      "the sub-line no longer reads card.date; item C has landed and this test " +
      "should be rewritten to assert agreement rather than record the gap");
  });

  await t.test("and money, the same shape on card 5", () => {
    // No sub-line reads possible_payment at all, so there is no contradiction
    // to see here. That absence IS the finding recorded as item F: on a bailiff
    // notice the amount is in the payload and on no card.
    const bill = CORPUS.find((entry) => entry.id === "bill_in_credit").text;
    const { fallback } = servedWithModelDates(bill);
    assert.equal(fallback.cards[4].possible_payment, null,
      "premise: an in-credit bill holds no payment");
    const rendering = APP_JS.slice(APP_JS.indexOf("function shortCardExplanation"));
    assert.ok(!/possible_payment/.test(rendering),
      "possible_payment is now rendered somewhere; item F has landed and it " +
      "needs an entry in ENGINE_DERIVED_CLAIMS above");
  });
});
