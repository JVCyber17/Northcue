// RECOVERY VOCABULARY SEVERITY, pinned. Founder's Fix b (variant ii) of
// 25 September 2026, from the real Kestrelford reminder: "liability order"
// and the Magistrates' Court, in any apostrophe form, rate HIGH only when
// the same letter also shows an unconditional missed-payment signal.
// Annual council tax bills routinely mention liability orders in their
// recovery small print and must NOT escalate on the phrase alone; a real
// missed-instalment reminder must.

const test = require("node:test");
const assert = require("node:assert/strict");

const { runClearStepsEngine } = require("../src/services/clearStepsEngine");

function severityOf(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto" }
  }).api_output.trust.severity_level;
}

const BILL_HEAD = [
  "Kestrelford Borough Council",
  "Council Tax Bill 2026/27",
  "",
  "Dear Ms Ellis,",
  "",
  "Your council tax for the year is £1,680.00, payable by ten monthly",
  "instalments as shown on the schedule below.",
  ""
];

test("annual-bill recovery small print stays low", () => {
  // The founder's sentence, verbatim: the reminder notice and the court are
  // both inside a conditional-future sentence, so nothing escalates.
  const severity = severityOf([...BILL_HEAD,
    "If you miss an instalment we will send you a reminder notice, and we",
    "may apply to the magistrates' court for a liability order."
  ].join("\n"));
  assert.equal(severity, "low",
    "recovery small print must not escalate an annual bill");
});

test("a real missed-instalment reminder rates high", () => {
  // The Kestrelford shape: heading title, past-fact missed payment, curly
  // apostrophe on the court.
  const severity = severityOf([
    "Kestrelford Borough Council",
    "Council Tax Reminder Notice 2026/27",
    "",
    "Dear Ms Ellis,",
    "",
    "Our records show that the council tax instalment of £140.00 due on",
    "1 September 2026 has not been paid.",
    "",
    "Please pay £140.00 by 8 October 2026. If you do not, the balance",
    "becomes payable in full and we may apply to the Magistrates’ Court",
    "for a liability order."
  ].join("\n"));
  assert.equal(severity, "high", "the reminder must escalate");
});

test("all three apostrophe forms of the court escalate beside a signal", () => {
  ["magistrates' court", "magistrates’ court", "magistrates court"].forEach((form) => {
    const severity = severityOf([...BILL_HEAD,
      "Your instalment has not been received.",
      "We may apply to the " + form + " for enforcement."
    ].join("\n"));
    assert.equal(severity, "high", form + " must count");
  });
});

test("the title-only rule for reminder notice", () => {
  // As a heading it counts; the same words deep in body prose do not.
  const asHeading = severityOf([
    "Kestrelford Borough Council",
    "Council Tax Reminder Notice",
    "",
    "Dear Ms Ellis,",
    "",
    "The balance may be recovered through a liability order if unpaid."
  ].join("\n"));
  assert.equal(asHeading, "high", "a reminder-notice title is the signal");

  const inProse = severityOf([...BILL_HEAD,
    "Paying on time means we never need to issue you a reminder notice",
    "of the kind that can lead to a liability order being sought."
  ].join("\n"));
  assert.equal(inProse, "low",
    "reminder notice in body prose is not a title and must not count");
});

test("conditional and future signals are ignored, as in Fix a", () => {
  const severity = severityOf([...BILL_HEAD,
    "If an instalment is missed your account will show as overdue, and we",
    "may apply to the magistrates court for a liability order."
  ].join("\n"));
  assert.equal(severity, "low",
    "a conditional overdue must not arm the recovery phrase");
});

test("bare not-paid and not-received are deliberately not signals", () => {
  const severity = severityOf([...BILL_HEAD,
    "Any amount not paid on time may be recovered; a liability order from",
    "the magistrates court allows recovery of sums not received."
  ].join("\n"));
  assert.equal(severity, "low",
    "the bare fragments must not escalate; only the exact signal forms do");
});

test("the phrases without any signal stay exactly as before", () => {
  const severity = severityOf([...BILL_HEAD,
    "A liability order is a court order obtained from the magistrates court."
  ].join("\n"));
  assert.equal(severity, "low");
});
