// THE LANGUAGE-NEUTRAL STRUCTURAL TIER, pinned. Before 5 August 2026 every
// route to a scam signal was an English substring, so polish_phishing raised
// zero signals against six for its English twin and served calm caution
// cards captioned as an official HMRC notice. The three structural detectors
// (a short deadline measured in hours; that window plus a link; that pair
// plus a payment amount) read structure, not vocabulary, so they read every
// language at once.
//
// EACH IS ADVISORY, DELIBERATELY: no single structural fact refuses anyone.
// Three together cross the existing advisory threshold and become decisive
// through the counterweight. This file pins the measured firing set so a
// document joining or leaving it is a deliberate test change, exactly as
// tests/lureShape.test.js pins the lure rule.
//
// Sender mismatch is deliberately NOT part of this tier. It is the
// lookalike-domain rule by another name, recorded in KNOWN_ENGINE_DEFECTS.md
// as not to ship until someone other than its author has tried to break it.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "neutral-structural-test" };

const SHORT_WINDOW_LABEL = "Sets a very short deadline measured in hours.";
const NEUTRAL_LABELS = [
  SHORT_WINDOW_LABEL,
  "Combines a link with a very short deadline.",
  "Asks for a payment through a link under a very short deadline."
];

// Measured across all 73 documents on 5 August 2026: eight of the ten scams,
// every one of the six non-English scams among them, and zero genuine
// documents. Named rather than derived, so drift is a visible edit.
const FIRES = {
  scam_phishing: 2, polish_phishing: 3, smish_parcel_link_only: 3,
  smish_parcel_link_only_pl: 3, scam_hmrc_refund_es: 3,
  scam_bank_security_fr: 2, scam_crypto_investment_pl: 2, scam_energy_refund_pt: 3
};

function trustOf(id) {
  const entry = CORPUS.find((e) => e.id === id);
  assert.ok(entry, id + " is in the corpus");
  return runClearStepsEngine({ extractedText: entry.text, fileMeta: META }).api_output.trust;
}

test("the neutral structural tier fires where it was measured to fire", async (t) => {
  await t.test("the firing set is exactly the measured eight", () => {
    const fired = {};
    CORPUS.forEach((entry) => {
      const trust = runClearStepsEngine({ extractedText: entry.text, fileMeta: META }).api_output.trust;
      const n = (trust.advisory_scam_signals || [])
        .filter((s) => NEUTRAL_LABELS.includes(s)).length;
      if (n > 0) fired[entry.id] = n;
    });
    assert.deepEqual(fired, FIRES,
      "the neutral tier's firing set drifted; every change here is a reader-visible change");
  });

  await t.test("the letter the tier was built for is refused as a suspected scam", () => {
    const trust = trustOf("polish_phishing");
    assert.equal(trust.processing_mode, "verification_only");
    // Three neutral structural facts, and since P2 the three Polish decisive
    // needles on top: full password, card and PIN together, the suspension
    // threat. Six ways to be caught where on 4 August there were zero.
    assert.equal((trust.scam_signals || []).length, 6);
  });

  await t.test("structure never refuses alone: two facts stay advisory", () => {
    // The French CVV letter carries two neutral facts and no third; its
    // refusal comes from the decisive cvv needle, and its scam_signals list
    // must NOT contain the neutral labels, which sit below the threshold.
    const trust = trustOf("scam_bank_security_fr");
    assert.equal(trust.processing_mode, "verification_only");
    assert.deepEqual(
      (trust.scam_signals || []).filter((s) => NEUTRAL_LABELS.includes(s)), []);
  });

  await t.test("the bank's own anti-fraud advice letter stays calm", () => {
    const trust = trustOf("genuine_bank_fraud_advice");
    assert.equal((trust.advisory_scam_signals || [])
      .filter((s) => NEUTRAL_LABELS.includes(s)).length, 0);
    assert.notEqual(trust.processing_mode, "verification_only");
  });

  await t.test("a genuine 24-hours-a-day helpline letter is not a pressure window", () => {
    // CONSTRUCTED, and it found a real ceiling before production could: this
    // letter carries a window, a link and a balance, all three structural
    // facts, and was refused until the availability exception existed. A
    // window immediately followed by a day-continuation is availability, not
    // pressure, so it must raise NO neutral signal at all.
    const text = "Customer services\n\nOur phone lines are open 24 hours a day.\n" +
      "Manage your account at account.example.com/manage\n" +
      "Your balance is £42.10 and there is nothing you need to do.";
    const run = runClearStepsEngine({ extractedText: text, fileMeta: META });
    const trust = run.api_output.trust;
    assert.deepEqual((trust.advisory_scam_signals || [])
      .filter((s) => NEUTRAL_LABELS.includes(s)), [],
      "an availability statement raised a pressure signal");
    assert.notEqual(trust.processing_mode, "verification_only",
      "a genuine helpline letter was refused as a scam");
  });
});
