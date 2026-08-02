// A promise NOT to do something is not a threat to do it.
//
// Ofgem requires a domestic energy bill to carry a debt and disconnection
// safeguard, and the safeguard is a reassurance: the supplier promises never to
// disconnect without first offering a payment plan. RISK_PHRASES saw
// "disconnect" and "debt", and card 5 of a routine quarterly bill read that
// sentence back to the reader as what happens if they ignore it.
//
// HOW LITTLE THIS RESTS ON, stated here as well as in the engine. The shape
// appears in THREE sentences across all 70 corpus documents, and all three are
// reassurances. It suppresses ONE of the ten consequences the corpus states.
// That is thin, and it is the same thinness the structural lure rule has, so it
// gets the same treatment: the evidence is written down and the shape it would
// get wrong is named rather than left to be discovered.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "negated-test" };

// A letter long enough to stay off the short-input paths, with the sentence
// under test dropped in.
function letterCarrying(sentence) {
  return [
    "Northfield Energy Ltd",
    "Your electricity bill",
    "Account number: NE-77410",
    "Bill date: 19 June 2026",
    "",
    "Dear Mr Sowande",
    "",
    "Your electricity bill for the period is enclosed.",
    "Amount now due: £298.53",
    "Please pay by 4 June 2026.",
    "",
    sentence
  ].join("\n");
}

const consequenceOf = (sentence) => runClearStepsEngine({
  extractedText: letterCarrying(sentence), fileMeta: META
}).structured_output.extractor_internal.consequence_sentence;

// The three sentences in the corpus that carry the shape. Written out so that a
// document losing one shows up here rather than silently shrinking the
// evidence base this rule rests on.
const THE_THREE_REASSURANCES = [
  ["genuine_bank_fraud_advice",
    "We will never ask you to share your password, your PIN, or your full card number."],
  ["spec_energy_bill_full, the debt safeguard",
    "We will never disconnect a domestic supply for debt without first offering a payment plan " +
    "based on your ability to pay, and offering a prepayment meter where it is safe and practical to install one."],
  ["spec_energy_bill_full, the winter safeguard",
    "We will not disconnect a household during the winter months where anyone living there is " +
    "of pensionable age, disabled, chronically sick, or where there are children under the age of six."]
];

test("a negated commitment is not a consequence", async (t) => {
  await t.test("all three reassurances in the corpus are refused", () => {
    THE_THREE_REASSURANCES.forEach(([where, sentence]) => {
      assert.equal(consequenceOf(sentence), null,
        where + ": this is a promise not to act, and was being read as a threat to act");
    });
  });

  await t.test("all three are still present in the corpus", () => {
    // The evidence base, asserted. If a document is edited so the sentence goes,
    // this rule quietly starts resting on less than it says it does.
    THE_THREE_REASSURANCES.forEach(([where, sentence]) => {
      const probe = sentence.slice(0, 48);
      const found = CORPUS.some((entry) => entry.text.replace(/\n/g, " ").includes(probe));
      assert.ok(found, where + ": the sentence this rule was measured against is gone");
    });
  });

  await t.test("the shape appears exactly three times in seventy documents", () => {
    const NEGATED = /\b(?:we|the council|the authority)\s+(?:will|shall)\s+(?:never|not)\b/i;
    const hits = [];
    CORPUS.forEach((entry) => {
      entry.text.split(/(?<=[.!?])\s+|\n/).forEach((raw) => {
        const s = raw.trim();
        if (s.length >= 20 && NEGATED.test(s)) hits.push(entry.id);
      });
    });
    assert.equal(hits.length, 3,
      "the corpus no longer carries exactly three negated commitments: " + JSON.stringify(hits));
  });

  await t.test("every genuine consequence survives", () => {
    // The counterweight. Without it this rule could pass by suppressing
    // everything. All seven enforcement consequences are conditional, and a
    // condition on the reader is what turns a negation back into a warning.
    const GENUINE = [
      "If payment is not received by this date, an enforcement agent may attend your property.",
      "If the arrears are not cleared we will apply to the county court for possession of your home.",
      "Failure to pay may result in further legal action, and the account may be passed to bailiffs.",
      "Unless payment is received within 14 days, legal action may be commenced without further notice.",
      "Continued arrears may be reported to credit reference agencies and could affect your credit rating."
    ];
    GENUINE.forEach((sentence) => {
      assert.notEqual(consequenceOf(sentence), null,
        "a genuine consequence was suppressed: " + JSON.stringify(sentence.slice(0, 60)));
    });
  });

  await t.test("a negated commitment WITH a reader condition survives", () => {
    // The condition guard, tested on its own. These are negated commitments in
    // the sender's voice, exactly like the reassurances, and they are warnings
    // because the negation is conditional on what the reader does. Without
    // READER_CONDITION the rule would take these too.
    //
    // A first draft of the counterweight above used "If you do not pay, we will
    // not be able to offer a payment plan", which RISK_PHRASES never matched in
    // the first place, so it asserted something the engine had never done.
    [
      "Unless you contact us, we will not withdraw the county court claim.",
      "If you do not pay, we will not be able to prevent disconnection."
    ].forEach((sentence) => {
      assert.notEqual(consequenceOf(sentence), null, sentence);
    });
  });

  await t.test("a consequence that merely CONTAINS a negation survives", () => {
    // The rule keys on a promise IN THE SENDER'S VOICE, not on the word "not".
    // Every sentence here contains a negation, none is a sender promise, and
    // none carries a reader condition either, so only the sender-voice half of
    // NEGATED_COMMITMENT keeps them.
    //
    // Added after a mutation: widening the pattern to a bare /not/ passed
    // every other assertion in this file, because the corpus consequences all
    // happen to carry a reader condition and survive either way.
    [
      "A liability order will not be cancelled and enforcement agents may attend.",
      "The county court claim will not be withdrawn and possession may follow.",
      "Disconnection will not be delayed further and the supply may be cut off."
    ].forEach((sentence) => {
      assert.notEqual(consequenceOf(sentence), null,
        "a negation in someone else's voice is still a consequence: " + sentence);
    });
  });

  await t.test("exactly one corpus document loses its consequence", () => {
    const stating = CORPUS.filter((entry) =>
      runClearStepsEngine({ extractedText: entry.text, fileMeta: META })
        .structured_output.extractor_internal.has_consequence).map((e) => e.id);
    assert.ok(!stating.includes("spec_energy_bill_full"),
      "the energy bill should no longer state a consequence");
    assert.equal(stating.length, 9,
      "nine documents should still state one: " + JSON.stringify(stating));
  });
});

test("RECORDED GAP: a negated refusal to help is suppressed too", async (t) => {
  // NOT A PASSING ASSERTION DRESSED AS A GUARD. This shape is a genuine warning
  // and this rule gets it wrong. No corpus document carries it, so there is no
  // evidence behind a fix, and inventing one to justify a second discriminator
  // would be the mistake this repo keeps catching.
  //
  // The three reassurances all continue with a MITIGATION ("without first
  // offering...", "where anyone living there..."). This one continues with a
  // CONSEQUENCE ("and the full balance becomes due"). That is a plausible
  // discriminator resting on three examples, and it is deliberately not built.
  const KNOWN_WRONG = "We will not accept further instalments and the full balance becomes due.";

  await t.test("it is suppressed, and that is wrong", () => {
    assert.equal(consequenceOf(KNOWN_WRONG), null,
      "if this now returns a sentence, the gap has been closed and this test " +
      "should be rewritten to assert the correct behaviour rather than record " +
      "the wrong one");
  });

  await t.test("no corpus document carries the shape, which is why it is unfixed", () => {
    const found = CORPUS.filter((entry) =>
      /\bwe will not accept\b/i.test(entry.text)).map((e) => e.id);
    assert.deepEqual(found, [],
      "a document now carries this shape, so there IS evidence for a fix: " +
      JSON.stringify(found));
  });
});

test("what this fix does NOT reach", async (t) => {
  await t.test("the energy bill is still rated urgent, by a different route", () => {
    // Card 5 no longer reads the reassurance back as a consequence. The bill is
    // still severity urgent, because detectSeveritySignals is a bare keyword
    // scan over the whole document and reads "disconnection" off the same three
    // lines. Closing that is a severity change and is out of scope here.
    const run = runClearStepsEngine({
      extractedText: CORPUS.find((e) => e.id === "spec_energy_bill_full").text, fileMeta: META
    });
    assert.equal(run.structured_output.trust_internal.severity_level, "urgent",
      "if this is no longer urgent, the severity route has been closed too and " +
      "the note above is stale");
    assert.ok(run.structured_output.trust_internal.severity_signals
      .includes("Mentions disconnection risk."));
    assert.equal(run.structured_output.extractor_internal.has_consequence, false,
      "but the consequence route IS closed");
  });
});
