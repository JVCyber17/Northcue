// Guards classification against single phrases that appear on genuine UK
// official correspondence.
//
// Every classifier in the classification layer is a flat OR over substring
// matches. There is no scoring and no counterweight, so one matching substring
// decides the outcome, and detectDocumentCategory opens with four
// unconditional early returns that each fire before any real category test.
// That is how one ordinary sentence can turn a notice of enforcement into
// something the reader is told they wrote themselves, or into a suspected scam
// with its deadline deleted.
//
// Before this file, npm test contained no behavioural assertion on
// classification at all: the only gate was the 30 document baseline harness,
// which has no adversarial variants. Every phrase below was verified against
// the real engine during the audit recorded in
// KNOWN_CLASSIFICATION_DEFECTS.md at the repo root.
//
// The flips that remain unfixed live in that file, not here, because a test
// asserting current-but-wrong behaviour teaches the next session that the
// behaviour is intended.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// Inserts a line just under the letterhead, where a real banner or clause sits.
function withLine(id, line) {
  const lines = byId(id).split("\n");
  lines.splice(1, 0, line);
  return lines.join("\n");
}

function classify(text) {
  const run = runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "classification-test" }
  });
  return {
    trust: run.structured_output.trust_internal,
    extraction: run.structured_output.extractor_internal,
    structured: run.api_output.structured_result,
    cards: run.api_output.structured_result.cards
  };
}

test("W1: a document we may not trust keeps its date visible", async (t) => {
  // The verification_only branch of buildExtraction hardcoded deadline: null.
  // That is right when the scam call is right, and it meant a WRONG scam call
  // silently deleted the one fact the reader most needs. A person warned that
  // a letter might be fake needs to know how long they have to check it.
  await t.test("the stated date reaches card 4 instead of being deleted", () => {
    // "FINAL WARNING" is standard on genuine enforcement correspondence and
    // still forces verification_only. Until that is fixed, the date must at
    // least survive the misclassification.
    const run = classify(withLine("court_fine", "FINAL WARNING"));
    assert.equal(run.trust.processing_mode, "verification_only", "premise of this test has changed");
    assert.match(run.cards[3].simple_explanation, /30 September 2026/,
      "the parsed date must still be shown to the reader");
    assert.match(run.cards[3].simple_explanation, /Check this with the organisation before acting/);
  });

  await t.test("it is shown as stated, never as owed", () => {
    // The date is on screen, but nothing downstream may treat it as an
    // obligation: a scam's deadline is not a deadline.
    const run = classify(withLine("court_fine", "FINAL WARNING"));
    assert.equal(run.extraction.deadline, null, "deadline must stay null");
    assert.equal(run.structured.summary.main_date, null, "main_date must stay null");
    assert.equal(run.cards[3].possible_deadline, null, "possible_deadline must stay null");
    assert.doesNotMatch(run.cards[3].simple_explanation, /Due by/,
      "an unverified date must never be phrased as a due date");
  });

  await t.test("a document with no parseable date says nothing new", () => {
    // scam_phishing says "within 24 hours", which is not a date. The branch
    // must not invent one.
    const run = classify(byId("scam_phishing"));
    assert.equal(run.trust.processing_mode, "verification_only");
    assert.equal(run.extraction.unverified_date, null);
    assert.equal(run.cards[3].simple_explanation, "No deadline clearly stated.");
  });

  await t.test("trusted documents are untouched by this path", () => {
    // The wording must appear only where trust is withheld. Everywhere else
    // "Due by" still means due by.
    CORPUS.forEach((entry) => {
      const run = classify(entry.text);
      if (run.trust.processing_mode === "verification_only") return;
      assert.doesNotMatch(run.cards[3].simple_explanation, /Check this with the organisation/, entry.id);
    });
  });

  await t.test("the new sentence is a bank pattern in every language", () => {
    // A pattern the engine can emit but the bank does not carry renders in
    // English for every other language. adding-a-bank-sentence.md, step 2.
    const languages = require(path.join(__dirname, "..", "public", "i18n", "config.js"))
      .languages.map((entry) => entry.code);
    languages.forEach((code) => {
      const bank = require(path.join(__dirname, "..", "public", "i18n", "templates-" + code + ".js"));
      const patterns = Array.isArray(bank.patterns)
        ? Object.fromEntries(bank.patterns.map((p) => [p.id, p.template]))
        : bank.patterns;
      const template = patterns["tpl.deadline.unverified"];
      assert.ok(template, code + " is missing tpl.deadline.unverified");
      assert.match(template, /\{date\}/, code + " dropped the {date} slot");
      assert.doesNotMatch(template, /[–—]/, code + " has a dash");
    });
  });
});
