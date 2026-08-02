// The structural lure rule, and the ceiling on what it is allowed to do.
//
// The rule is in src/utils/lureShape.js: a link, an amount, no reference and no
// telephone number. It exists because every other scam rule in the engine is an
// English phrase, and a Polish smish carries none of them.
//
// MOST OF THIS FILE IS THE CEILING, NOT THE RULE. The rule is four calls to
// functions that already existed. What needs pinning is that it is advisory:
// it may withhold "high" trust and it may do nothing else. The tests below
// assert that against the real engine on all 70 corpus documents AND against a
// constructed worst case, because the corpus not containing a counterexample is
// not the same as one being impossible.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { hasLureShape, LURE_SHAPE_SIGNAL } = require(path.join(__dirname, "..", "src", "utils", "lureShape"));
const { hasLink, hasCurrencyAmount, hasTelephoneNumber } =
  require(path.join(__dirname, "..", "src", "utils", "documentSignals"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "lure-shape-test" };

// Measured on 2 August 2026. Named rather than derived so that a document
// joining or leaving this set is a deliberate test change.
const FIRES_ON = [
  "polish_phishing",
  "smish_parcel_link_only",
  "smish_parcel_link_only_pl",
  "scam_council_refund_link_only",
  "scam_dvla_vehicle_tax",
  "scam_hmrc_refund_es",
  "scam_energy_refund_pt"
];

// EMPTY, AND IT WAS NOT. intl_sole_trader_invoice was here: a plumber's
// invoice with a payment link, a total, no reference code and a +44 number the
// engine could not see, so the rule read an absence that was not there. The
// phone fix on 2 August 2026 made the number visible and the invoice stopped
// firing. Kept as a named empty list rather than deleted, because the next
// false positive should land here and be argued about, not absorbed into
// FIRES_ON.
const KNOWN_FALSE_POSITIVES = [];

// The ten scams in the corpus. The three not in FIRES_ON are missed, and each
// is missed by a part of the rule working correctly.
const SCAMS = [
  "scam_phishing", "polish_phishing", "smish_parcel_link_only",
  "smish_parcel_link_only_pl", "scam_council_refund_link_only",
  "scam_dvla_vehicle_tax", "scam_hmrc_refund_es", "scam_bank_security_fr",
  "scam_crypto_investment_pl", "scam_energy_refund_pt"
];

function trustOf(text) {
  return runClearStepsEngine({ extractedText: text, fileMeta: META }).structured_output.trust_internal;
}

test("the rule fires where it was measured to fire", async (t) => {
  await t.test("exactly seven documents, and no genuine one among them", () => {
    const fired = CORPUS.filter((e) => hasLureShape(e.text)).map((e) => e.id);
    assert.deepEqual(fired.sort(), FIRES_ON.slice().sort());
    fired.forEach((id) => {
      assert.ok(SCAMS.includes(id) || KNOWN_FALSE_POSITIVES.includes(id),
        id + " is neither a scam nor a recorded false positive, and the rule fired on it");
    });
  });

  await t.test("the false positive rate is zero in sixty, and stays visible", () => {
    // Written as a set rather than a count, because the membership is the
    // argument for how far this rule may be trusted. It was one in fifty until
    // the phone fix; the invoice that made it one is still in the corpus and
    // still has a link, a total and no reference code, so if this ever returns
    // to one the fix has been undone rather than the corpus changed.
    const genuine = CORPUS.filter((e) => !SCAMS.includes(e.id));
    assert.equal(genuine.length, 60, "the genuine/scam split has changed");
    const firedOnGenuine = genuine
      .filter((e) => trustOf(e.text).lure_shape_signals.length > 0)
      .map((e) => e.id);
    assert.deepEqual(firedOnGenuine.sort(), KNOWN_FALSE_POSITIVES.slice().sort(),
      "the set of genuine documents this rule fires on has changed");
  });

  await t.test("the engine publishes the signal on exactly those seven", () => {
    const published = CORPUS
      .filter((e) => trustOf(e.text).lure_shape_signals.length > 0)
      .map((e) => e.id);
    assert.deepEqual(published.sort(), FIRES_ON.slice().sort());
    assert.deepEqual(trustOf(CORPUS.find((e) => e.id === FIRES_ON[0]).text).lure_shape_signals,
      [LURE_SHAPE_SIGNAL]);
  });

  await t.test("each of the four parts is load bearing", () => {
    // A lure-shaped text, then the same text with each guard satisfied in turn.
    // If removing a part does not change the answer, that part is decoration.
    const lure = "Your council tax refund of £180.40 is waiting.\nClaim it at refund-council-gov.example.com before Friday.";
    assert.equal(hasLureShape(lure), true, "the base case is not lure shaped");
    assert.equal(hasLureShape(lure.replace(/refund-council-gov\.example\.com/, "our office")), false,
      "the link is not load bearing");
    assert.equal(hasLureShape(lure.replace(/£180\.40/, "the amount")), false,
      "the amount is not load bearing");
    assert.equal(hasLureShape(lure + "\nReference: CT-4471028"), false,
      "the reference guard is not load bearing");
    assert.equal(hasLureShape(lure + "\nCall us on 0300 200 3300"), false,
      "the telephone guard is not load bearing");
  });
});

test("advisory means advisory", async (t) => {
  await t.test("the invoice that used to trip this rule no longer does", () => {
    // The regression guard for the phone fix, from this rule's side. The
    // invoice still has every other ingredient, so the only thing keeping it
    // out is that +44 113 496 2200 is now a phone number.
    const invoice = CORPUS.find((e) => e.id === "intl_sole_trader_invoice");
    assert.ok(hasLink(invoice.text) && hasCurrencyAmount(invoice.text),
      "the invoice lost its link or its total, so this no longer tests the fix");
    assert.equal(hasTelephoneNumber(invoice.text), true,
      "the +44 number is invisible again, which is the defect this fixed");
    assert.deepEqual(trustOf(invoice.text).lure_shape_signals, []);
  });

  await t.test("the structural rule is never the reason anything is refused", () => {
    // Stated as cause rather than as outcome. scam_dvla_vehicle_tax IS
    // verification_only, and was before this rule existed, because Q1 gave the
    // decisive tier the card security code. Asserting "none of the seven is
    // verification_only" would be asserting something false and would have to
    // be weakened every time the decisive tier catches one more of them.
    //
    // Every route to "low" reads scam_signals or reads distrust_signals twice,
    // so if a document is low or refused, one of those two must be present.
    // The structural rule can make neither true.
    CORPUS.forEach((entry) => {
      const trust = trustOf(entry.text);
      const refusedForSuspicion = trust.processing_mode === "verification_only" ||
        trust.trust_assessment === "low";
      if (!refusedForSuspicion) return;
      const explained = trust.scam_signals.length > 0 || trust.distrust_signals.length > 1;
      assert.ok(explained,
        entry.id + " is refused for suspicion with no decisive cause, so the structural " +
        "rule caused it: " + JSON.stringify(trust.lure_shape_signals));
    });
  });

  await t.test("the one document it moves, moves by exactly one step", () => {
    // scam_council_refund_link_only was the only corpus document with two
    // authentic signals and no distrust signal among the seven, so it was the
    // only one being told it looked like a normal document. It is a scam.
    const trust = trustOf(CORPUS.find((e) => e.id === "scam_council_refund_link_only").text);
    assert.equal(trust.trust_assessment, "medium");
    assert.equal(trust.processing_mode, "caution");
  });

  await t.test("it cannot reach low trust even beside a phrase signal", () => {
    // The constructed worst case the corpus does not contain: a lure-shaped
    // text that ALSO carries one phrase-based distrust signal. One phrase is
    // not enough for "low" on its own, and the structural signal must not be
    // the one that tips it. If lureShapeSignals were merged into
    // distrustSignals this test would fail.
    const both = "Dear customer\nYour refund of £240.00 is ready.\nClaim at refund-hmrc.example.com today.";
    const trust = trustOf(both);
    assert.deepEqual(trust.lure_shape_signals, [LURE_SHAPE_SIGNAL], "the fixture is not lure shaped");
    assert.ok(trust.distrust_signals.length >= 1, "the fixture carries no phrase signal");
    assert.notEqual(trust.trust_assessment, "low");
    assert.notEqual(trust.processing_mode, "verification_only");
  });

  await t.test("it never changes the card count", () => {
    // Every corpus document, not only the seven: a rule that reads text can
    // reach anything, and the claim is about all of them.
    CORPUS.forEach((entry) => {
      const result = runClearStepsEngine({ extractedText: entry.text, fileMeta: META })
        .api_output.structured_result;
      assert.equal(result.cards.length, 6, entry.id + " lost or gained a card");
    });
  });

  await t.test("it never nulls a deadline", () => {
    // NOT ASSERTED AGAINST THE CORPUS. None of the seven carries a deadline, so
    // every corpus document would pass this whatever the rule did. A first
    // draft asserted it that way; the guard it carried is what caught that, and
    // a second draft used a short invented letter whose deadline the engine
    // does not read at all, which would have passed for the wrong reason too.
    //
    // So: council_tax, which the engine already reads a deadline from, with its
    // account number and phone number removed and a payment link added. That is
    // lure shaped and carries a deadline, and the control is the same text with
    // the link replaced by an address, which is not lure shaped.
    const lure = [
      "Hounslow Borough Council",
      "Council Tax Bill",
      "Property: 14 Sutton Court Road, Hounslow",
      "Bill date: 12 March 2026",
      "Amount to pay: £1,381.50",
      "First instalment due by 1 April 2026.",
      "Pay online at hounslow-counciltax-pay.example.com",
      "If you do not pay by the date shown, you may lose the right to pay by instalments",
      "and the full balance for the year will become due."
    ].join("\n");
    const control = lure.replace("Pay online at hounslow-counciltax-pay.example.com",
      "Pay online at the council office");

    const fired = runClearStepsEngine({ extractedText: lure, fileMeta: META });
    const notFired = runClearStepsEngine({ extractedText: control, fileMeta: META });

    assert.deepEqual(fired.structured_output.trust_internal.lure_shape_signals,
      [LURE_SHAPE_SIGNAL], "the constructed case is not lure shaped, so it tests nothing");
    assert.deepEqual(notFired.structured_output.trust_internal.lure_shape_signals,
      [], "the control is also lure shaped, so the comparison tests nothing");

    assert.equal(fired.api_output.structured_result.summary.deadline_iso, "2026-04-01",
      "the deadline did not survive the structural signal");
    assert.equal(fired.api_output.structured_result.summary.deadline_iso,
      notFired.api_output.structured_result.summary.deadline_iso,
      "the rule firing changed the deadline");
  });
});
