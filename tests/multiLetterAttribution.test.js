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
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

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

// ---------------------------------------------------------------------------
// Separator vocabulary.
//
// Real scanners and PDF extractors do not insert a tidy horizontal rule between
// two letters. They emit pagination. The shapes below are the ones that reach
// the engine in practice, and each has to arrive at the decline to assert path
// rather than at a better composed sentence.
//
// The safety property being guarded is the ROUTE, not the detection. A shape
// that only half locates a boundary raises the flag without splitting, so the
// upload lands in the fused shape where nothing is asserted. Splitting is
// reserved for the explicit separators, where the boundary is trustworthy
// enough to attribute the first letter's facts.
// ---------------------------------------------------------------------------

const PAGINATED_SHAPES = {
  "page header, decorated": LETTER_A + "\n\n--- Page 2 ---\n\n" + LETTER_B,
  "page x of y": LETTER_A + "\n\nPage 2 of 2\n\n" + LETTER_B,
  "bare page number": LETTER_A + "\n\nPage 2\n\n" + LETTER_B,
  "form feed": LETTER_A + "\n\f\n" + LETTER_B,
  "pagination then a greeting": LETTER_A + "\n\n--- Page 2 ---\n\nDear Ms Sharma\nYour council tax is now due.",
  "repeated letterhead, no pagination":
    "Hounslow Borough Council\nCouncil Tax Bill 2026/2027\nBill date: 12 March 2026\n" +
    "Amount to pay: £1,381.50\n\nHounslow Borough Council\nHousing Benefit Review\nBill date: 2 April 2026"
};

// Single letters that contain one of the new shapes and must survive intact.
// Pagination inside one letter is the common case, not the exceptional one.
const SINGLE_LETTER_SHAPES = {
  "multi page bill with a page header":
    LETTER_A + "\n\n--- Page 2 ---\n\nYour tariff is Standard Variable.\n" +
    "Charges are shown including VAT at 5 percent.",
  "multi page bill with page x of y":
    LETTER_B + "\n\nPage 1 of 2\n\nYour instalments are payable on the first of each month.",
  "form feed between pages of one letter":
    LETTER_A + "\n\f\nYour meter reading was taken on 1 May.\nCharges include VAT.",
  // The trap this rule was shaped around: a running header that repeats the
  // sender AND a date on every page. Both halves of a letter opening are
  // present, so the order requirement is what saves it.
  "running header repeating sender and date":
    "West Middlesex University Hospital\nOutpatient Appointment\nDate: 5 June 2026\n" +
    "Dear Patient\nYou have an appointment in the Dermatology Department.\n\n" +
    "Page 2 of 2\n\nPlease arrive fifteen minutes early.",
  // Two labelled dates inside one letter, which is the NHS appointment shape
  // in the regression corpus: a letter date and an appointment date.
  "two date labels in one letter":
    "West Middlesex University Hospital\nOutpatient Appointment\nDate: 5 June 2026\n" +
    "Dear Patient\nDate: Tuesday 1 July 2026\nTime: 10:40",
  "sender named again inside prose":
    LETTER_B + "\nPlease make cheques payable to Hounslow Borough Council."
};

test("separator vocabulary", async (t) => {
  Object.entries(PAGINATED_SHAPES).forEach(([name, text]) => {
    t.test("detects two letters: " + name, () => {
      assert.equal(splitDocuments(text).isMultiLetterInput, true,
        name + " must be recognised as more than one letter");
    });

    t.test("routes to decline, not to composition: " + name, () => {
      // The requirement in full: detection exists to reach safety. A newly
      // detected shape must never end up with a better composed sentence.
      const run = analyse(text);
      assert.equal(run.structured_output.extractor_internal.multi_letter_state, "fused",
        name + " must reach the fused shape, where nothing is attributed");

      const lines = allCardText(run);
      lines.forEach((line) => {
        RELATIONAL_SHAPES.forEach((shape) => {
          assert.doesNotMatch(line, shape,
            name + " composed a relational sentence: " + line);
        });
      });
      lines.forEach((line) => {
        assert.doesNotMatch(line, CURRENCY,
          name + " asserted an amount it cannot attribute: " + line);
      });
      assert.equal(run.api_output.structured_result.summary.main_amount, null,
        name + " must not carry a main amount");
      assert.equal(run.api_output.structured_result.summary.main_date, null,
        name + " must not carry a main date");
    });
  });

  Object.entries(SINGLE_LETTER_SHAPES).forEach(([name, text]) => {
    t.test("does not split a single letter: " + name, () => {
      assert.equal(splitDocuments(text).isMultiLetterInput, false,
        name + " is one letter and must not be flagged");
      const run = analyse(text);
      assert.equal(run.structured_output.extractor_internal.multi_letter_state, undefined,
        name + " must not enter the multi letter path");
    });
  });

  await t.test("pagination alone is never a letter boundary", () => {
    // The distinction the whole rule rests on. Identical pagination, and the
    // only difference is whether a fresh letter opens after it.
    const continuation = LETTER_A + "\n\n--- Page 2 ---\n\nCharges include VAT at 5 percent.";
    const newLetter = LETTER_A + "\n\n--- Page 2 ---\n\n" + LETTER_B;
    assert.equal(splitDocuments(continuation).isMultiLetterInput, false,
      "a continuation page must not be treated as a second letter");
    assert.equal(splitDocuments(newLetter).isMultiLetterInput, true,
      "a fresh letter opening after the same marker must be detected");
  });

  await t.test("the explicit separators still split, and still attribute", () => {
    // The new shapes must not disturb the one route that is allowed to keep
    // facts: an explicit rule is a deliberate division, so the first letter is
    // attributable and its amount survives.
    const split = splitDocuments(SEPARATED_BY_RULE);
    assert.equal(split.isMultiLetterInput, true);
    assert.equal(split.documents.length, 2, "an explicit rule still separates");

    const run = analyse(SEPARATED_BY_RULE);
    assert.equal(run.structured_output.extractor_internal.multi_letter_state, "first_only");
    assert.match(allCardText(run).join(" "), /£214\.63/,
      "the first letter's own amount is attributable and is kept");
    assert.doesNotMatch(allCardText(run).join(" "), /£1,381\.50/,
      "the second letter's amount must not appear");
  });
});

// ------------------------------------------------- one letter on several pages

test("a repeated line is a running header until a letter opens at it", async (t) => {
  // P1, 2 August 2026. A real British Gas bill was uploaded to the live product
  // and all six cards declined, because "British Gas" stands alone at the top of
  // page one and again at the top of page two. hasRepeatedLetterhead had no
  // boundary test, while the pagination rule beside it had always demanded one.
  //
  // These tests are the ceiling on the loosening. The rule must still fire where
  // a letter genuinely opens, because that is the fabrication case: an amount
  // from one letter and a date from another composed into one sentence.
  const byId = (id) => CORPUS.find((entry) => entry.id === id).text;

  await t.test("the genuine single documents are read, not refused", () => {
    ["bill_with_contacts_page", "letter_with_terms_on_back",
      "statement_with_transactions_page"].forEach((id) => {
      assert.equal(splitDocuments(byId(id)).isMultiLetterInput, false,
        id + " is one letter on two pages and must not be fused");
    });
  });

  await t.test("a dual fuel bill on ONE page is read", () => {
    // Not a multi-page case at all. "Standing charge" appears once for
    // electricity and once for gas, and the old rule fused on that alone.
    const dualFuel = [
      "Octopus Energy", "", "Your energy bill", "", "Ms A Idowu",
      "Account number: 4471 0288", "Bill date: 3 June 2026", "",
      "Electricity", "Standing charge", "Charges: £64.20", "",
      "Gas", "Standing charge", "Charges: £38.90", "",
      "Total to pay: £103.10", "Please pay by 24 June 2026."
    ].join("\n");
    assert.equal(splitDocuments(dualFuel).isMultiLetterInput, false);
  });

  await t.test("a footer repeated on every page is read", () => {
    // The trigger was the council's own footer address line, which is exactly
    // seven words and so passes looksLikeLetterhead.
    const footer = ["", "Meadowbank Council, Civic Centre, Meadowbank MB1 4RT",
      "Telephone 0114 273 4567   www.meadowbank.gov.uk", ""];
    const letter = ["Meadowbank Council", "", "Council Tax reminder", "",
      "Mr A Whitfield", "Account: 8110 0244", "Bill date: 8 June 2026", "",
      "Dear Mr Whitfield", "", "Your instalment due on 1 June 2026 has not been paid."]
      .concat(footer).concat(["Amount overdue: £138.15", "Please pay by 22 June 2026."])
      .concat(footer).concat(["How to pay", "Online at www.meadowbank.gov.uk/counciltax"])
      .concat(footer).join("\n");
    assert.equal(splitDocuments(letter).isMultiLetterInput, false);
  });

  await t.test("a bilingual Welsh and English letter is read", () => {
    // Welsh public bodies are statutorily required to write bilingually, so the
    // sender's name appearing twice is the norm for a whole class of UK post.
    const bilingual = [
      "Cyngor Caerdydd / Cardiff Council", "",
      "Hysbysiad Treth Gyngor / Council Tax Notice", "", "Mr G Pritchard",
      "Cyfeirnod / Reference: CT-4471028", "Dyddiad / Date: 11 June 2026", "",
      "Mae eich taliad o £142.60 yn ddyledus ar 1 Gorffennaf 2026.",
      "Your instalment of £142.60 is due on 1 July 2026.", "",
      "Cyngor Caerdydd / Cardiff Council", "", "Ffoniwch ni / Call us: 029 2087 2087"
    ].join("\n");
    assert.equal(splitDocuments(bilingual).isMultiLetterInput, false);
  });

  await t.test("two real letters from the SAME sender still fuse", () => {
    // THE CEILING. No separator, no greeting, one sender, two letters. Only the
    // second letterhead standing above its own date says a letter opens there,
    // and it must keep saying so or P1 has reopened the fabrication class.
    const twoLetters = [
      "EDF Energy", "Your electricity bill", "Bill date: 4 May 2026",
      "Amount due: £214.63", "Please pay by 28 May 2026.", "",
      "EDF Energy", "Your gas bill", "Bill date: 4 May 2026",
      "Amount due: £98.20", "Please pay by 28 May 2026."
    ].join("\n");
    assert.equal(splitDocuments(twoLetters).isMultiLetterInput, true);
  });

  await t.test("the three genuinely multi letter corpus documents still fuse", () => {
    ["multi_document", "multi_document_greetings", "multi_document_split"].forEach((id) => {
      assert.equal(splitDocuments(byId(id)).isMultiLetterInput, true, id);
    });
  });

  await t.test("KNOWN AND UNFIXED: a running date header still fuses", () => {
    // Recorded rather than hidden. A continuation page that repeats both the
    // sender and "Bill date:" opens what looks like a letter, so P1 cannot tell
    // it from a second one. A real shape, and it needs its own evidence before
    // the rule is loosened further.
    const runningDateHeader = [
      "Thames Water", "", "Your bill", "Mr S Ali", "Bill date: 9 June 2026",
      "Amount due: £88.40", "", "Thames Water", "Bill date: 9 June 2026",
      "Helpful contacts", "Billing: 0800 316 9800"
    ].join("\n");
    assert.equal(splitDocuments(runningDateHeader).isMultiLetterInput, true,
      "if this now reads false, the known false positive is fixed and this test should say so");
  });
});
