// THE MISSED-RECEIPT DATE, pinned. Founder's approved fix of 25 September
// 2026, from the Kestrelford reminder: "instalment of £140.00 due on
// 1 September 2026 has not been paid." wrote the past tense AFTER the date,
// so the arrears skip's backward window never saw it and card 4 presented
// the missed instalment as the deadline while the real obligation ("pay by
// 8 October 2026") sat one sentence later. A date whose own sentence states
// the payment was not received is a receipt statement and skips, exactly as
// past-tense labels always have; the founder's condition holds a marker
// inside a conditional sentence to be a genuine FUTURE deadline that never
// skips.

const test = require("node:test");
const assert = require("node:assert/strict");

const { runClearStepsEngine } = require("../src/services/clearStepsEngine");
const coLocation = require("../src/utils/coLocation");

function deadlineCard(text) {
  const output = runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto" }
  }).api_output;
  return output.cards.find((card) => card.id === "when_is_it_due");
}

const REMINDER = [
  "Kestrelford Borough Council",
  "Council Tax Reminder Notice",
  "",
  "Dear Ms Ellis,",
  "",
  "Our records show that the council tax instalment of £140.00 due on",
  "1 September 2026 has not been paid.",
  "",
  "Please pay £140.00 by 8 October 2026 to keep your instalment plan."
].join("\n");

test("the missed instalment date yields to the letter's pay-by date", () => {
  const card = deadlineCard(REMINDER);
  assert.ok(String(card.short_answer).includes("8 October 2026"),
    "the obligation date must win, got: " + card.short_answer);
  assert.ok(!String(card.short_answer).includes("1 September"),
    "the missed instalment must not present as the deadline");
});

test("a conditional not-received sentence keeps its future deadline", () => {
  // The founder's condition, verbatim shape: this is a genuine deadline.
  const card = deadlineCard([
    "Fenwick Water Services",
    "Payment Plan Confirmation",
    "",
    "Dear Ms Chen,",
    "",
    "Your payment plan for the water account is set up as agreed.",
    "If your payment due on 12 June 2026 is not received, we may cancel",
    "the payment plan."
  ].join("\n"));
  assert.ok(String(card.short_answer).includes("12 June 2026"),
    "a conditional sentence states a future deadline, got: " + card.short_answer);
});

test("a conditional clause after the marker does not exempt the receipt statement", () => {
  const card = deadlineCard([
    "Kestrelford Borough Council",
    "Council Tax Reminder Notice",
    "",
    "Dear Ms Ellis,",
    "",
    "The instalment of £140.00 due on 1 September 2026 has not been paid;",
    "if you disagree with this, please contact us.",
    "",
    "Please pay £140.00 by 8 October 2026 to keep your instalment plan."
  ].join("\n"));
  assert.ok(String(card.short_answer).includes("8 October 2026"),
    "the receipt statement still skips, got: " + card.short_answer);
});

test("a positive receipt never triggers the skip", () => {
  // Confident bill path, so selectDeadline is the mechanism under test.
  const card = deadlineCard([
    "Fenwick Energy Supply Ltd",
    "Your Electricity Bill",
    "",
    "Dear Ms Chen,",
    "",
    "We have received your payment of £50.00 with thanks.",
    "Please pay the remaining balance of £20.00 by 30 October 2026."
  ].join("\n"));
  assert.ok(String(card.short_answer).includes("30 October 2026"),
    "the genuine deadline stands, got: " + card.short_answer);

  // And at the selector: "has now been paid" carries no NOT, so the bound
  // date is returned untouched; only a negated receipt skips.
  const positive = coLocation.selectDeadline(
    "The instalment due on 1 September 2026 has now been paid in full. Please pay the balance by 30 October 2026.",
    () => true);
  assert.equal(positive && positive.value, "1 September 2026",
    "a positive receipt sentence must not skip the bound date");
});

test("a cut-off letter with only the missed date invents no deadline", () => {
  const card = deadlineCard([
    "Kestrelford Borough Council",
    "Council Tax Reminder Notice",
    "",
    "Dear Ms Ellis,",
    "",
    "Our records show that the council tax instalment of £140.00 due on",
    "1 September 2026 has not been paid."
  ].join("\n"));
  assert.ok(!String(card.short_answer).includes("Due by"),
    "no deadline may be presented from a receipt statement alone, got: " + card.short_answer);
  assert.equal(card.date, null, "the date field stays empty");
});

test("selectDeadline itself: skip-and-continue, conditional exemption", () => {
  const skip = coLocation.selectDeadline(
    "The instalment of £140.00 due on 1 September 2026 has not been paid. Please pay by 8 October 2026.",
    () => true);
  assert.equal(skip && skip.value, "8 October 2026");
  const keep = coLocation.selectDeadline(
    "If your payment due on 12 June 2026 is not received, we may cancel the plan.",
    () => true);
  assert.equal(keep && keep.value, "12 June 2026");
});
