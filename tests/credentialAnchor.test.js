// THE CREDENTIAL GUARD MUST NOT DEPEND ON WHERE THE VERB SITS.
//
// The guard had almost no coverage before this file: one assertion, on one
// sentence, in stripperExemption.test.js. It was also anchored on position,
// two patterns at the start of the sentence and one on the fixed English frame
// "you need your", which is the assumption that cannot be translated. Polish
// carries the imperative in one fixed word with the verb second; Hindi,
// Bengali, Gujarati and Panjabi put the verb last.
//
// So this file pins two things at once. That an imperative ANYWHERE in the
// clause is caught, which is what makes the guard portable. And that the
// inverse sentence is NOT caught, because "Do not share your password" is real
// safety advice a bank prints and stripping it is its own harm.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { sanitizeAiTextField } =
  require(path.join(__dirname, "..", "src", "services", "aiStructuredResultService"));

const REPLACEMENT = "Check the original document. Do not share personal or banking details.";
const neutralised = (line) => sanitizeAiTextField(line) !== line;

test("a credential ask is caught wherever the imperative sits", async (t) => {
  await t.test("at the start, which is all the old patterns could see", () => {
    [
      "Please confirm your account details immediately.",
      "Confirm your account details to avoid suspension.",
      "Enter your sort code and account number on the website.",
      "Provide your card details to complete the payment.",
      "Update your bank details using the link.",
      "Please confirm your identity."
    ].forEach((line) => assert.ok(neutralised(line), line));
  });

  await t.test("NOT at the start, which is the whole point of the change", () => {
    // Every one of these was measured passing the guard before 3 August 2026.
    [
      "To continue, please confirm your account details.",
      "Before 5 June, enter your sort code on the portal.",
      "The website asks you to provide your card details.",
      "If you have not done so, share your bank details with them."
    ].forEach((line) => assert.ok(neutralised(line), "reached the reader: " + line));
  });

  await t.test("and in the passive, where there is no imperative at all", () => {
    assert.ok(neutralised("Your account details must be confirmed within 7 days."));
  });

  await t.test("the frame the old pattern 2 existed for still works", () => {
    assert.ok(neutralised("You will need your National Insurance number."));
  });

  await t.test("the replacement is the reported form", () => {
    assert.equal(sanitizeAiTextField("To continue, please confirm your account details."),
      REPLACEMENT);
  });
});

test("the inverse sentence survives, because stripping advice is its own harm", async (t) => {
  await t.test("a bank telling the reader NOT to share", () => {
    // genuine_bank_fraud_advice carries these. An earlier draft of the
    // position-free pattern stripped both, which would have deleted the one
    // piece of genuine safety guidance on the card.
    [
      "Do not share your password, PIN, or full card number with anyone.",
      "Barclays warns you not to share your password, PIN, or full card number.",
      "Never give your bank details to a caller."
    ].forEach((line) => assert.equal(sanitizeAiTextField(line), line, "stripped: " + line));
  });

  await t.test("the guard's own replacement is not caught by the guard", () => {
    // Without the negation exception this fires on itself, which is a loop
    // rather than a defence.
    assert.equal(sanitizeAiTextField(REPLACEMENT), REPLACEMENT);
  });

  await t.test("a negation across a comma does NOT protect the ask", () => {
    // "If you have not done so, share your bank details" has a "not" within
    // range, but it belongs to "have not done so". The exception window bars
    // commas for exactly this. Asserted so a future widening of that window
    // fails here rather than silently opening a hole.
    assert.ok(neutralised("If you have not done so, share your bank details with them."));
  });
});

test("mentioning a sensitive term is still not an instruction", async (t) => {
  await t.test("the cases the guard has always had to leave alone", () => {
    [
      "Check your account number is correct.",
      "Your personal details appear at the top of the letter.",
      "The reference number is shown near your account details.",
      "Keep your money and personal details protected."
    ].forEach((line) => assert.equal(sanitizeAiTextField(line), line, "stripped: " + line));
  });

  await t.test("a third party moving a file is not a credential ask", () => {
    // "your|the" in the new pattern is what keeps this out. Measured firing on
    // it before that constraint was added.
    assert.equal(sanitizeAiTextField("The council will send your details to the tribunal."),
      "The council will send your details to the tribunal.");
  });
});
