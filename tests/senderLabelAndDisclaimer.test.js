// THE SENDER LABEL AND THE PAYMENT DISCLAIMER, pinned. Founder's fix of
// 25 September 2026, from a live Polish floor-path finding:
//
// 1. A field label ("Property Reference No.") on the top line of a bill was
//    composed into the card 1 headline as the sender, while the protected
//    key point named the real sender from the guarded fact candidate. The
//    fact door already refused label shapes (SENDER_FIELD_LABEL_SHAPE,
//    factCandidates.js); the rules door now refuses the same shape, from
//    the same exported constant, so the two cannot drift apart.
// 2. A letter that says, in its own exact words, "This is not a request
//    for payment." must not have "appears to require an action" as its
//    most important point, and must not be framed as asking to pay.
//    Normal mode and low severity only; card 3's composed actions stay.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { runClearStepsEngine } = require("../src/services/clearStepsEngine");
const factCandidates = require("../src/utils/factCandidates");

function runEngine(text, mimeType = "application/pdf", facts = undefined) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType, selectedCategory: "auto" },
    facts
  }).api_output;
}

const card = (output, id) => output.cards.find((c) => c.id === id);
const structuredCard = (output, id) =>
  output.structured_result.cards.find((c) => c.card_id === id);

const STATEMENT_BILL = [
  "Property Reference No.",
  "82441907",
  "Fenwick Energy Supply Ltd",
  "Your Electricity Bill",
  "",
  "Dear Ms Chen,",
  "",
  "This is your annual electricity bill summary for the supply at 12 Alder Way.",
  "This is not a request for payment. Your monthly Direct Debit continues",
  "as normal and your tariff is unchanged. If your details have changed,",
  "please contact us on 0800 4471 220."
].join("\n");

test("a field label on the top line never becomes the card 1 sender", () => {
  const output = runEngine(STATEMENT_BILL);
  const headline = card(output, "what_is_this").short_answer;
  assert.ok(headline.includes("Fenwick Energy Supply Ltd"),
    "the real sender beneath the label must win, got: " + headline);
  assert.ok(!/reference/i.test(headline),
    "no label word may reach the headline, got: " + headline);
});

test("the headline and the protected sender key point agree", () => {
  const output = runEngine(STATEMENT_BILL, "application/pdf",
    { sender: "Fenwick Energy Supply Ltd" });
  const headline = card(output, "what_is_this").short_answer;
  const senderPoint = (structuredCard(output, "what_is_this").key_points || [])
    .find((point) => point.startsWith(factCandidates.SENDER_KEY_POINT_PREFIX));
  assert.ok(headline.includes("Fenwick Energy Supply Ltd"), "headline names the sender");
  assert.ok(senderPoint && senderPoint.includes("Fenwick Energy Supply Ltd"),
    "the protected key point names the same sender");
});

test("label shapes are refused and real senders are not", () => {
  const attempt = (firstLine) => {
    const output = runEngine([firstLine, "Fenwick Energy Supply Ltd",
      "Your Electricity Bill", "", "Dear Ms Chen,", "",
      "This is your electricity bill for the supply at 12 Alder Way.",
      "Please pay the amount due shown on your account."].join("\n"));
    return card(output, "what_is_this").short_answer;
  };
  ["Property Reference No.", "Customer Reference", "Supply Address:",
    "Account Number", "Meter reference"].forEach((label) => {
    const headline = attempt(label);
    assert.ok(headline.includes("Fenwick Energy Supply Ltd"),
      JSON.stringify(label) + " must be skipped as a label, got: " + headline);
  });
  // A real sender whose name merely CONTAINS a label word is untouched:
  // the shape is end-anchored.
  const kept = attempt("Number One Energy Ltd");
  assert.ok(kept.includes("Number One Energy Ltd"),
    "an end-anchored shape must not reject a real sender, got: " + kept);
});

test("both sender doors share the one exported label shape", () => {
  assert.ok(factCandidates.SENDER_FIELD_LABEL_SHAPE instanceof RegExp,
    "the shape must be exported");
  const engine = fs.readFileSync(
    path.join(__dirname, "..", "src", "services", "clearStepsEngine.js"), "utf8");
  const senderDoor = engine.slice(engine.indexOf("function extractSummaryFirstLineSender"),
    engine.indexOf("function extractSummaryFirstLineSender") + 1600);
  assert.ok(senderDoor.includes("factCandidates.SENDER_FIELD_LABEL_SHAPE.test(line)"),
    "the rules door must use the shared shape, not a copy");
});

test("the letter's own payment disclaimer stands down the inferred obligation", () => {
  const output = runEngine(STATEMENT_BILL);
  assert.equal(output.trust.processing_mode, "normal");
  assert.equal(output.trust.severity_level, "low");
  const point = card(output, "what_matters_most").short_answer;
  assert.equal(point, "This looks like information only.",
    "the disclaimer letter must not read as requiring an action");
  assert.equal(card(output, "what_do_i_need_to_do").short_answer,
    "Contact the sender using trusted contact details.",
    "the conditional contact action stays on card 3");
});

test("without the disclaimer the same letter keeps the action point", () => {
  const output = runEngine(STATEMENT_BILL.replace(
    "This is not a request for payment. ", ""));
  assert.equal(card(output, "what_matters_most").short_answer,
    "This document appears to require an action from you. See what you need to do.");
});

// A minimal pair that flips on the disclaimer sentence alone: both letters
// are normal mode, low severity, same sender, same amount.
const BILL_BASE = [
  "Fenwick Energy Supply Ltd",
  "Your Electricity Bill",
  "",
  "Dear Ms Chen,",
  "",
  "This is your annual electricity bill summary for the supply at 12 Alder Way."
];
const PAY_DUE_LETTER = [...BILL_BASE,
  "The total amount due is £64.00. Please pay by 30 October 2026."].join("\n");
const DISCLAIMER_LETTER = [...BILL_BASE,
  "This is not a request for payment. The amount of £64.00 will be collected by Direct Debit."].join("\n");

test("the disclaimer suppresses the payment-ask headline frame", () => {
  const control = runEngine(PAY_DUE_LETTER);
  assert.equal(control.trust.processing_mode, "normal");
  assert.equal(control.trust.severity_level, "low");
  assert.ok(/asking you to pay/.test(card(control, "what_is_this").short_answer),
    "the pay-ask frame is unchanged on a genuine payment request");

  const output = runEngine(DISCLAIMER_LETTER);
  assert.equal(output.trust.processing_mode, "normal");
  assert.equal(output.trust.severity_level, "low");
  const headline = card(output, "what_is_this").short_answer;
  assert.ok(!/asking you to pay|payment request for/.test(headline),
    "no pay-ask frame on a disclaimer letter, got: " + headline);
  assert.ok(headline.includes("Fenwick Energy Supply Ltd"),
    "the neutral bill frame still names the sender");
  assert.equal(card(output, "what_matters_most").short_answer,
    "This looks like information only.");
});

test("caution mode never softens on the disclaimer", () => {
  // text/plain metadata rates caution by design; the gate needs normal mode.
  const cautionLetter = [...BILL_BASE,
    "This is not a request for payment. If your details have changed, please contact us."].join("\n");
  const caution = runEngine(cautionLetter, "text/plain");
  assert.notEqual(caution.trust.processing_mode, "normal",
    "precondition: the text/plain upload is not normal mode");
  assert.notEqual(card(caution, "what_matters_most").short_answer,
    "This looks like information only.",
    "a non-normal document must not soften on the sentence");
});

test("escalated severity never softens on the disclaimer", () => {
  const overdue = runEngine([...BILL_BASE,
    "This is not a request for payment. Your previous balance is overdue and a final notice may follow."].join("\n"));
  assert.ok(["medium", "high", "urgent"].includes(overdue.trust.severity_level),
    "precondition: the overdue letter escalates, got " + overdue.trust.severity_level);
  assert.notEqual(card(overdue, "what_matters_most").short_answer,
    "This looks like information only.",
    "an escalated letter keeps its own most important point");
});
