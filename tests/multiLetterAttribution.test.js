// Guards the multi letter attribution rule.
//
// When an upload holds more than one letter, an amount from one letter and a
// date from another can be composed into "X appears to be asking you to pay A
// by D". Every fact in that sentence is real and the sentence is invented,
// which is the one thing Northcue promises never to do. The engine therefore
// declines to compose when it cannot attribute a fact to a single letter.
//
// These tests are written against the RENDERED cards rather than the internal
// flag, because the flag is not the promise. The promise is that no card states
// a relationship the document did not state.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { splitDocuments } = require(path.join(__dirname, "..", "src", "utils", "splitDocuments"));

// Every sentence shape in inferSummary that relates two or more extracted facts.
// If a new composed shape is added to the engine it belongs in this list.
const RELATIONAL_SHAPES = [
  /appears to be asking you to pay .+ by /i,
  /appears to be a payment request for .+, due by /i,
  /appears to be a bill from .+, dated /i,
  /appears to be from .+, mentioning .+ and a date of /i,
  /appears to be an appointment from .+ on /i,
  /appears to have sent an official notice mentioning /i
];

const CURRENCY = /[£$€]\s?\d/;

const LETTER_A = [
  "EDF Energy",
  "Your electricity bill",
  "Bill date: 4 May 2026",
  "Amount due: £214.63",
  "Please pay by 28 May 2026."
].join("\n");

const LETTER_B = [
  "Hounslow Borough Council",
  "Council Tax Bill 2026/2027",
  "Bill date: 12 March 2026",
  "Amount to pay: £1,381.50",
  "First instalment due by 1 April 2026."
].join("\n");

const FUSED_BY_GREETINGS = "Dear Ms Sharma\n" + LETTER_A + "\n\nDear Ms Sharma\n" + LETTER_B;
const SEPARATED_BY_RULE = LETTER_A + "\n---\n" + LETTER_B;

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "multi-letter-test" }
  });
}

function allCardText(run) {
  return run.api_output.structured_result.cards.flatMap((card) => [
    card.title,
    card.simple_explanation,
    card.action_needed || "",
    ...(card.key_points || [])
  ]);
}

test("multi letter attribution", async (t) => {
  await t.test("the fused shape is what the engine sees", () => {
    // The greetings heuristic detects the second letter but does not separate
    // it, so every extractor runs across both letters. This is the shape that
    // produced the fabricated sentence, and it must stay covered.
    const split = splitDocuments(FUSED_BY_GREETINGS);
    assert.equal(split.isMultiLetterInput, true, "two greetings must be detected");
    assert.equal(split.documents.length, 1, "the greetings path does not separate the letters");
  });

  await t.test("a fused multi letter upload composes no relational sentence", () => {
    const run = analyse(FUSED_BY_GREETINGS);
    allCardText(run).forEach((line) => {
      RELATIONAL_SHAPES.forEach((shape) => {
        assert.doesNotMatch(line, shape,
          "a fused multi letter upload must not state a relationship between facts: " + line);
      });
    });
  });

  await t.test("a fused multi letter upload asserts no amount and no date", () => {
    // Suppressing the composed sentence is not enough on its own: an amount on
    // the check card or a date on the deadline card is still an attribution to
    // one letter that the engine cannot make.
    const run = analyse(FUSED_BY_GREETINGS);
    const structured = run.api_output.structured_result;

    assert.equal(structured.summary.main_amount, null, "no amount may be presented as the amount");
    assert.equal(structured.summary.main_date, null, "no date may be presented as the deadline");

    structured.cards.forEach((card) => {
      assert.equal(card.possible_payment, null, "card " + card.card_number + " must carry no payment");
      assert.equal(card.possible_deadline, null, "card " + card.card_number + " must carry no deadline");
    });

    allCardText(run).forEach((line) => {
      assert.doesNotMatch(line, CURRENCY, "no card may show an amount on a fused upload: " + line);
    });
  });

  await t.test("a fused multi letter upload says so on the cards", () => {
    const run = analyse(FUSED_BY_GREETINGS);
    const text = allCardText(run).join(" ");
    assert.match(text, /more than one letter/i, "card 1 must state what was found");
    assert.match(text, /have not been matched to a single letter/i, "the reason must be stated");
    assert.match(text, /Dates cannot be matched to one letter/i, "the deadline card must decline");
    assert.match(text, /Amounts cannot be matched to one letter/i, "the check card must decline");
  });

  await t.test("a separated multi letter upload keeps the first letter's facts", () => {
    // Once the letters are separated the first letter's facts ARE attributable,
    // so suppressing them would lose real information for no safety gain.
    const run = analyse(SEPARATED_BY_RULE);
    const structured = run.api_output.structured_result;
    assert.equal(structured.summary.main_amount, "£214.63", "letter one's amount is attributable");
    assert.equal(structured.summary.main_date, "28 May 2026", "letter one's date is attributable");
    assert.doesNotMatch(structured.summary.main_amount, /1,381\.50/, "letter two's amount must not appear");
  });

  await t.test("a separated multi letter upload tells the reader the rest was not read", () => {
    const run = analyse(SEPARATED_BY_RULE);
    const text = allCardText(run).join(" ");
    assert.match(text, /Only the first letter in this upload has been read/i,
      "the reader must be told the other letters were not read");
  });

  await t.test("the refusal paths keep priority over the multi letter wording", () => {
    // A suspected scam already has an honest answer of its own. Replacing it
    // with the multi letter wording would drop a safety message.
    const scam = [
      "Dear Customer",
      "Barcllays Security Team",
      "You must verify your identity within 24 hours or your account will be frozen.",
      "Confirm your card number, PIN and full password at barclays-secure-verify.com",
      "",
      "Dear Customer",
      "Please confirm your account details immediately."
    ].join("\n");

    const split = splitDocuments(scam);
    assert.equal(split.isMultiLetterInput, true, "the fixture must be a multi letter upload");

    const run = analyse(scam);
    assert.equal(run.api_output.trust.processing_mode, "verification_only",
      "a scam upload stays on the verification path");
    const text = allCardText(run).join(" ");
    assert.match(text, /Check authenticity before taking any action/i,
      "the scam answer must survive");
    assert.doesNotMatch(text, /more than one letter/i,
      "the multi letter wording must not replace the scam answer");
  });

  await t.test("single letter uploads are untouched by the rule", () => {
    // The rule must not fire on the ordinary case, which is every other
    // document in the corpus.
    const run = analyse(LETTER_A);
    assert.equal(splitDocuments(LETTER_A).isMultiLetterInput, false);
    assert.equal(run.structured_output.extractor_internal.multi_letter_state, undefined);
    assert.match(run.api_output.structured_result.summary.one_line_summary,
      /appears to be asking you to pay/i,
      "an ordinary single letter still gets its composed summary");
  });
});
