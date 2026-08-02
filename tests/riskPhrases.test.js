// Guards which sentences the engine will recognise as a consequence, and which
// it must never quote.
//
// RISK_PHRASES decides has_consequence, which decides whether card 5 is a
// "What could happen if I ignore it?" card quoting the letter, or a
// "What should I check?" card that quotes nothing. It was swept on 1 August
// 2026 after the AI was found reporting a consequence card 5 was silent about:
// bailiff_enforcement's letter says "an enforcement agent may attend your
// property and remove goods", and the list only knew the word "bailiff".

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const byId = (id) => CORPUS.find((entry) => entry.id === id).text;
const analyse = (text) => runClearStepsEngine({
  extractedText: text,
  fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "risk-test" }
});

// A realistic letter body, so the engine takes a full path rather than a
// short-input one.
function letter(consequence) {
  return [
    "Hounslow Borough Council", "Council Tax Recovery", "Reference: CT-90114",
    "", "Dear Occupier", "",
    "Your council tax account is in arrears.",
    "Amount to pay: £486.20",
    "You must pay the balance before 3 September 2026.",
    consequence,
    "If you cannot pay in full, contact the recovery team on 020 8583 4242."
  ].join("\n");
}

const consequenceOf = (text) => analyse(text).structured_output.extractor_internal.consequence_sentence;

test("the two word boundary bugs the sweep found", async (t) => {
  // Both entries missed the commonest form of their own word, so the letters
  // most likely to use them were the ones they could not see.
  await t.test("disconnected, not only disconnection", () => {
    assert.ok(consequenceOf(letter("If you do not pay, your supply may be disconnected.")));
  });

  await t.test("evicted, not only eviction", () => {
    assert.ok(consequenceOf(letter("If you do not pay, you may be evicted from the property.")));
  });

  await t.test("the noun forms still work", () => {
    assert.ok(consequenceOf(letter("Disconnection may follow if the balance is not cleared.")));
    assert.ok(consequenceOf(letter("This could lead to eviction and further costs.")));
  });
});

test("enforcement, possession and court wording is recognised", async (t) => {
  const SHAPES = [
    ["enforcement agent", "If you do not pay, an enforcement agent may attend your property."],
    ["remove goods", "An agent may attend and remove goods belonging to you."],
    ["take control of goods", "We may take control of your goods and sell them at auction."],
    ["goods removed", "Your goods may be removed and sold to clear the debt."],
    ["warrant of control", "A warrant of control may be issued against you."],
    ["possession order", "A possession order may be granted by the court."],
    ["warrant for possession", "A warrant for possession may be issued."],
    ["lose your home", "If the arrears continue you could lose your home."],
    ["magistrates court", "Your case may be referred to the magistrates court."],
    ["attachment of earnings", "We may apply for an attachment of earnings order."],
    ["charging order", "A charging order may be placed on your property."],
    ["summons", "You may be summonsed to attend court."]
  ];

  for (const [why, line] of SHAPES) {
    await t.test(why, () => {
      const found = consequenceOf(letter(line));
      assert.ok(found, why + ": no consequence found");
      assert.match(found, /\w/, why);
    });
  }
});

test("a phrase must land on a clause, not on the letterhead", async (t) => {
  // ORDER MATTERS: extractRiskSentence returns on the first phrase that yields
  // a sentence, so a phrase that matches a header can shadow a later one.
  await t.test("bailiff_enforcement quotes the consequence, not its own sender name", () => {
    // The sender is "Marston Holdings Enforcement Agents", so "enforcement
    // agent" matches the letterhead first. That sweeps in field labels,
    // extractSentenceAround returns "", and the search falls through.
    const found = consequenceOf(byId("bailiff_enforcement"));
    assert.equal(found,
      "If payment is not received by this date, an enforcement agent may attend your property and remove goods belonging to you.");
    assert.doesNotMatch(found, /Marston Holdings/, "the letterhead must not be quoted");
    assert.doesNotMatch(found, /Reference:/, "no field labels");
  });

  await t.test("liability order is deliberately NOT a phrase", () => {
    // On bailiff_enforcement it would match "Liability Order obtained by
    // Hounslow Borough Council on 3 July 2026", which is a past fact.
    const found = consequenceOf(byId("bailiff_enforcement"));
    assert.doesNotMatch(found, /Liability Order obtained/);
    assert.ok(!consequenceOf(letter("A liability order was obtained on 3 July 2026.")),
      "a past liability order must not be read as a consequence");
  });
});

test("a garbled document never quotes its own damaged text", async (t) => {
  // The sweep introduced this and it had to be closed in the same commit.
  // inferRisk QUOTES the document when a phrase matches, so widening the list
  // turned ocr_enforcement's risk field into "If paym3nt is not received by
  // this date an enforcement agent may attend your pr0perty...". That is O-2's
  // shape, and risk was only clean before because no phrase had matched.
  await t.test("no garbled document has document text in risk", () => {
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      if (!run.structured_output.trust_internal.garbled_by_ocr) return;
      const risk = String(run.structured_output.extractor_internal.risk);
      assert.doesNotMatch(risk, /[0-9][a-z]|[a-z][0-9]/i,
        entry.id + ": risk carries OCR damage: " + JSON.stringify(risk));
    });
  });

  await t.test("ocr_enforcement says what its severity means instead", () => {
    const run = analyse(byId("ocr_enforcement"));
    assert.equal(run.structured_output.extractor_internal.risk,
      "Ignoring this could cause serious problems quickly.");
    assert.equal(run.structured_output.extractor_internal.has_consequence, false);
    assert.equal(run.structured_output.extractor_internal.consequence_sentence, null);
  });
});

test("the corpus, after the sweep", async (t) => {
  await t.test("exactly these documents state a consequence", () => {
    const found = {};
    CORPUS.forEach((entry) => {
      const x = analyse(entry.text).structured_output.extractor_internal;
      if (x.has_consequence) found[entry.id] = true;
    });
    assert.deepEqual(Object.keys(found).sort(), [
      "arrears_before_clause", "arrears_past_and_future", "bailiff_enforcement",
      "bank_loan_letter", "court_fine", "eviction_possession",
      // Recovered by F3. A county court letter explaining what a third party
      // debt order does states a real consequence, and it was refused as a
      // scam for saying so.
      "genuine_court_account_freeze", "legal_solicitor",
      // Spec-anchored, Track 2, and BOTH ARE ROUTINE BILLS. The energy bill
      // states a consequence because Ofgem requires it to carry a debt and
      // disconnection safeguard, and the council tax demand because the
      // prescribed explanatory notes must describe liability orders and
      // enforcement agents. Neither letter is threatening the reader; both are
      // complying with a regulation. Recorded in KNOWN_ENGINE_DEFECTS.md as the
      // clearest thing Track 2 found: the more compliant the letter, the more
      // alarming Northcue makes it.
      "spec_council_tax_demand_full", "spec_energy_bill_full"
    ]);
  });

  await t.test("card 5 is the consequence card on the two that gained it", () => {
    ["bailiff_enforcement", "arrears_before_clause"].forEach((id) => {
      const card = analyse(byId(id)).api_output.structured_result.cards[4];
      assert.equal(card.title, "What could happen if I ignore it?", id);
    });
  });

  await t.test("no quoted consequence reads as an instruction to pay", () => {
    // normalizeRiskSentence exists for this. A quoted sentence is still a
    // quote, and a quote that commands is still a command.
    CORPUS.forEach((entry) => {
      const sentence = analyse(entry.text).structured_output.extractor_internal.consequence_sentence;
      if (!sentence) return;
      const words = new Set(sentence.toLowerCase().split(/[^a-z]+/).filter(Boolean));
      assert.equal(words.has("pay") && (words.has("must") || words.has("now")), false,
        entry.id + ": " + sentence);
    });
  });
});
