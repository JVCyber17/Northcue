// Guards classification against single phrases that appear on genuine UK
// official correspondence.
//
// Every classifier in the classification layer is a flat OR over substring
// matches. There is no scoring and no counterweight, so one matching substring
// decides the outcome, and detectDocumentCategory opens with four
// unconditional early returns that each fire before any real category test.
// That is how one ordinary sentence can turn a notice of enforcement into
// something the reader is told they wrote themselves, or into a suspected scam
// with its deadline deleted.
//
// Before this file, npm test contained no behavioural assertion on
// classification at all: the only gate was the 30 document baseline harness,
// which has no adversarial variants. Every phrase below was verified against
// the real engine during the audit recorded in
// KNOWN_CLASSIFICATION_DEFECTS.md at the repo root.
//
// The flips that remain unfixed live in that file, not here, because a test
// asserting current-but-wrong behaviour teaches the next session that the
// behaviour is intended.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// Inserts a line just under the letterhead, where a real banner or clause sits.
function withLine(id, line) {
  const lines = byId(id).split("\n");
  lines.splice(1, 0, line);
  return lines.join("\n");
}

function classify(text) {
  const run = runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "classification-test" }
  });
  return {
    trust: run.structured_output.trust_internal,
    extraction: run.structured_output.extractor_internal,
    structured: run.api_output.structured_result,
    cards: run.api_output.structured_result.cards
  };
}

test("W1: a document we may not trust keeps its date visible", async (t) => {
  // The verification_only branch of buildExtraction hardcoded deadline: null.
  // That is right when the scam call is right, and it meant a WRONG scam call
  // silently deleted the one fact the reader most needs. A person warned that
  // a letter might be fake needs to know how long they have to check it.
  await t.test("the stated date reaches card 4 instead of being deleted", () => {
    // "FINAL WARNING" is standard on genuine enforcement correspondence and
    // still forces verification_only. Until that is fixed, the date must at
    // least survive the misclassification.
    const run = classify(withLine("court_fine", "FINAL WARNING"));
    assert.equal(run.trust.processing_mode, "verification_only", "premise of this test has changed");
    assert.match(run.cards[3].simple_explanation, /30 September 2026/,
      "the parsed date must still be shown to the reader");
    assert.match(run.cards[3].simple_explanation, /Check this with the organisation before acting/);
  });

  await t.test("it is shown as stated, never as owed", () => {
    // The date is on screen, but nothing downstream may treat it as an
    // obligation: a scam's deadline is not a deadline.
    const run = classify(withLine("court_fine", "FINAL WARNING"));
    assert.equal(run.extraction.deadline, null, "deadline must stay null");
    assert.equal(run.structured.summary.main_date, null, "main_date must stay null");
    assert.equal(run.cards[3].possible_deadline, null, "possible_deadline must stay null");
    assert.doesNotMatch(run.cards[3].simple_explanation, /Due by/,
      "an unverified date must never be phrased as a due date");
  });

  await t.test("a document with no parseable date says nothing new", () => {
    // scam_phishing says "within 24 hours", which is not a date. The branch
    // must not invent one.
    const run = classify(byId("scam_phishing"));
    assert.equal(run.trust.processing_mode, "verification_only");
    assert.equal(run.extraction.unverified_date, null);
    assert.equal(run.cards[3].simple_explanation, "No deadline clearly stated.");
  });

  await t.test("trusted documents are untouched by this path", () => {
    // The wording must appear only where trust is withheld. Everywhere else
    // "Due by" still means due by.
    CORPUS.forEach((entry) => {
      const run = classify(entry.text);
      if (run.trust.processing_mode === "verification_only") return;
      assert.doesNotMatch(run.cards[3].simple_explanation, /Check this with the organisation/, entry.id);
    });
  });

  await t.test("the new sentence is a bank pattern in every language", () => {
    // A pattern the engine can emit but the bank does not carry renders in
    // English for every other language. adding-a-bank-sentence.md, step 2.
    const languages = require(path.join(__dirname, "..", "public", "i18n", "config.js"))
      .languages.map((entry) => entry.code);
    languages.forEach((code) => {
      const bank = require(path.join(__dirname, "..", "public", "i18n", "templates-" + code + ".js"));
      const patterns = Array.isArray(bank.patterns)
        ? Object.fromEntries(bank.patterns.map((p) => [p.id, p.template]))
        : bank.patterns;
      const template = patterns["tpl.deadline.unverified"];
      assert.ok(template, code + " is missing tpl.deadline.unverified");
      assert.match(template, /\{date\}/, code + " dropped the {date} slot");
      assert.doesNotMatch(template, /[–—]/, code + " has a dash");
    });
  });
});

test("F1: ordinary brackets are not template placeholders", async (t) => {
  // looksTemplate matched any square, curly or angle bracket. Angle brackets in
  // a UK letter are an email address; square brackets are a reference, a legal
  // citation, or a clinical reference range. Each of these flipped a genuine
  // letter to document_type template, label "Unknown document", and card 1
  // "This looks like a template with blank fields."
  const REAL_LETTER_BRACKETS = [
    ["an email address in angle brackets", "bailiff_enforcement", "Please contact us at <enforcement@marstonholdings.co.uk>"],
    ["a council email address", "council_tax", "Please email us at <counciltax@hounslow.gov.uk> if your details have changed."],
    ["a school email address", "education_letter", "Please contact the school office at <office@springwell.sch.uk> with any questions."],
    ["a bracketed reference number", "bailiff_enforcement", "Your reference [MH-2291-A] should be quoted on all correspondence."],
    ["a neutral legal citation", "court_fine", "We refer you to the judgment in Ali v Chandler [2019] EWCA Civ 677."],
    ["a clinical reference range", "medical_letter", "Your recent blood test showed haemoglobin 132 g/L [130 - 170]."]
  ];

  for (const [why, id, line] of REAL_LETTER_BRACKETS) {
    await t.test(why + " does not make it a template", () => {
      const run = classify(withLine(id, line));
      assert.notEqual(run.trust.document_type, "template", why);
      assert.notEqual(run.trust.document_category, "template", why);
      assert.doesNotMatch(run.cards[0].simple_explanation, /template with blank fields/, why);
    });
  }

  await t.test("a genuine blank form is caught, which it was not before", () => {
    // The old regex tested for bracket placeholders. The actual UK blank form
    // convention is underscore runs and dot leaders, which is why the one real
    // blank form in the corpus was classified as an ordinary letter.
    const form = [
      "APPLICATION FOR HOUSING BENEFIT",
      "Name: ____________________",
      "Address: ____________________",
      "Total weekly income: £________"
    ].join("\n");
    assert.equal(classify(form).trust.document_type, "template",
      "underscore fill lines are what a real UK blank form uses");
  });

  await t.test("prescribed form tick boxes are still a template", () => {
    // A possession notice or payment slip printed with empty boxes for the
    // sender to complete genuinely is a form.
    ["Payment method: [ ] Debit card [ ] Bank transfer [ ] Cheque",
      "Grounds for possession: [ ] Rent arrears  [ ] Anti-social behaviour"]
      .forEach((line) => {
        assert.equal(classify("Hounslow Borough Council\n" + line).trust.document_type, "template", line);
      });
  });

  await t.test("explicit placeholder wording is still caught", () => {
    ["Dear [insert name]", "Dear {name}", "[your address here]", "Please insert date here",
      "This is a template letter"]
      .forEach((line) => {
        const run = classify([
          "Hounslow Borough Council",
          line,
          "Reference: CT-2291",
          "Amount to pay: £120.00"
        ].join("\n"));
        assert.equal(run.trust.document_type, "template", line);
      });
  });

  await t.test("blank_template is the only corpus document that is a template", () => {
    // It is the one genuine blank form in the corpus, an unfilled HOUSING
    // BENEFIT application, and the old regex missed it: it was classified
    // "benefits" and labelled a real benefits letter. Correcting that is the
    // one intended baseline movement from this fix.
    const templates = CORPUS
      .filter((entry) => classify(entry.text).trust.document_type === "template")
      .map((entry) => entry.id);
    assert.deepEqual(templates, ["blank_template"]);
  });
});

test("F2: a salutation is not evidence the reader wrote the letter", async (t) => {
  // looksOutgoing claimed in its own comment to use "only signals that are
  // genuinely distinctive of user-authored correspondence". Four of its ten
  // entries were salutations or the operative verb of a served notice. An
  // enforcement agency writes "Dear Sir or Madam" precisely because it does not
  // know who is at the address, and "I hereby give notice" is what a Notice of
  // Enforcement says on its face.
  const INCOMING = [
    ["bailiff_enforcement", "Dear Sir or Madam"],
    ["bailiff_enforcement", "TO WHOM IT MAY CONCERN"],
    ["bailiff_enforcement", "I hereby give notice that I intend to take control of your goods."],
    ["court_fine", "Dear Sir/Madam"],
    ["court_fine", "To whom it may concern"],
    ["eviction_possession", "Dear Sir or Madam"],
    ["water_bill", "Dear Sir or Madam"],
    ["employment_letter", "I am writing to request your attendance at a formal capability meeting."]
  ];

  for (const [id, line] of INCOMING) {
    await t.test(JSON.stringify(line) + " on " + id + " stays incoming", () => {
      const run = classify(withLine(id, line));
      assert.notEqual(run.trust.document_type, "outgoing", line);
      assert.notEqual(run.trust.document_category, "outgoing", line);
      assert.doesNotMatch(run.cards[0].simple_explanation, /sent by you/,
        "a served notice must never be described as something the reader wrote");
    });
  }

  await t.test("first person authorship is still detected", () => {
    [
      "I am writing to complain about the service I received.",
      "I am writing to cancel my policy with effect from next month.",
      "I am writing to dispute the amount shown on my latest bill.",
      "I wish to cancel my account.",
      "I wish to complain about how my case was handled."
    ].forEach((line) => {
      const run = classify([
        "22 Alder House, Feltham",
        "Dear Sir or Madam",
        line,
        "Please confirm receipt of this letter.",
        "Yours faithfully"
      ].join("\n"));
      assert.equal(run.trust.document_type, "outgoing", line);
    });
  });

  await t.test("the corpus outgoing letter still classifies as outgoing", () => {
    // It carries both a salutation and a first person phrase, which is why
    // removing the salutation needles costs it nothing and the baseline does
    // not move.
    const run = classify(byId("outgoing_letter"));
    assert.equal(run.trust.document_type, "outgoing");
    assert.equal(run.trust.document_category, "outgoing");
  });

  await t.test("the accepted regression is priced, not hidden", () => {
    // A user's own complaint that opens with a salutation and never says what
    // they are doing now reads as incoming. This is the cost of F2 and it is
    // recorded rather than asserted away: the worst case is a "check the
    // amount and date" card on a letter the reader wrote.
    const salutationOnly = [
      "22 Alder House, Feltham",
      "Dear Sir or Madam",
      "Please cancel the account held in my name at the above address.",
      "Yours faithfully"
    ].join("\n");
    assert.notEqual(classify(salutationOnly).trust.document_type, "outgoing",
      "if this ever passes, F2's trade has changed and the comment above is stale");
  });
});

test("the classification layer keeps its nerve on a realistic enforcement notice", async (t) => {
  // A composite of the ordinary furniture a real notice of enforcement carries.
  // None of it is evidence of anything, and before this work each line on its
  // own destroyed the classification.
  await t.test("a realistic notice survives its own boilerplate", () => {
    const realistic = [
      "Marston Holdings Enforcement Agents",
      "NOTICE OF ENFORCEMENT",
      "Dear Sir or Madam",
      "I hereby give notice that I intend to take control of your goods.",
      "Your reference [MH-2291-A] should be quoted on all correspondence.",
      "Please contact us at <enforcement@marstonholdings.co.uk>",
      "Amount outstanding: £1,247.00",
      "You must contact us on 0333 320 122 by 3 September 2026."
    ].join("\n");
    const run = classify(realistic);
    assert.notEqual(run.trust.document_type, "outgoing");
    assert.notEqual(run.trust.document_type, "template");
    assert.doesNotMatch(run.cards[0].simple_explanation, /sent by you|template with blank fields/);
    assert.equal(run.trust.severity_level, "urgent", "the stakes floor must still fire");
  });
});
