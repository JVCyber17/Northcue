// The adjudication. Facts are candidates and the engine decides.
//
// Every case below came out of measuring the live extractor on all forty corpus
// documents, so each one is a thing that actually happened rather than a thing
// that might. The three hard validations are asserted at the field, and the
// three wrong deadlines are asserted to be rejected BY THE ENGINE'S OWN GUARDS
// rather than by a rule written for facts.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const candidates = require(path.join(__dirname, "..", "src", "utils", "factCandidates"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const byId = (id) => CORPUS.find((e) => e.id === id).text;
const analyse = (text, facts) => runClearStepsEngine({
  extractedText: text, fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "fc" }, facts
});
const dates = (value, role) => ({ dates: [{ value, role: role || "deadline" }] });

// ─── V3, the engine's own guards ─────────────────────────────────────────────

test("the three deadlines the model got wrong are rejected by engine guards", async (t) => {
  await t.test("failed_direct_debit: a past, failed payment", () => {
    // "Your payment WAS DUE by direct debit on 3 July 2026 and was returned
    // unpaid by your bank." BACKWARD_LOOKING has existed since the deadline
    // work and catches this without a new rule.
    const text = byId("failed_direct_debit");
    assert.equal(candidates.survivesEngineDeadlineGuards(text, "3 July 2026"), false);
    assert.equal(analyse(text, dates("3 July 2026")).structured_output.extractor_internal.deadline, null);
  });

  await t.test("broadband_bill: a collection date, not a deadline", () => {
    // "This will be taken by Direct Debit on 2 May 2026." The reader owes
    // nothing that day. Rejected by DATE_COMPETES, the engine's own list of
    // labels that mean this date is something else.
    const text = byId("broadband_bill");
    assert.equal(candidates.survivesEngineDeadlineGuards(text, "2 May 2026"), false);
    assert.equal(analyse(text, dates("2 May 2026")).structured_output.extractor_internal.deadline, null);
  });

  await t.test("multi_document: two letters, two deadlines, no attribution", () => {
    // Two survivors is not an answer, and applyMultiLetterAttribution nulls it
    // again afterwards. Both rules are the engine's.
    const text = byId("multi_document");
    const facts = { dates: [
      { value: "28 May 2026", role: "deadline" },
      { value: "1 April 2026", role: "deadline" }
    ] };
    assert.equal(analyse(text, facts).structured_output.extractor_internal.deadline, null);
  });
});

test("the deadlines the model got right are accepted", async (t) => {
  await t.test("bank_loan_letter, which the engine's vocabulary missed by one word", () => {
    // DATE_GOVERNS has "bring your account up to date by"; the letter says
    // "bring THE account up to date by 7 July 2026".
    const text = byId("bank_loan_letter");
    assert.equal(analyse(text, null).structured_output.extractor_internal.deadline, null);
    assert.equal(analyse(text, dates("7 July 2026")).structured_output.extractor_internal.deadline, "7 July 2026");
  });

  await t.test("a non English deadline survives, because the guards are not the vocabulary", () => {
    assert.equal(candidates.survivesEngineDeadlineGuards(byId("polish_rent_arrears"), "4 września 2026"), true);
    assert.equal(candidates.survivesEngineDeadlineGuards(byId("spanish_water_final_notice"), "15 de junio de 2026"), true);
  });
});

// ─── V1 and V2 ───────────────────────────────────────────────────────────────

test("a value the document does not contain is refused", async (t) => {
  const text = byId("council_tax");

  await t.test("an invented deadline", () => {
    assert.equal(candidates.deadlineCandidate({
      facts: dates("9 September 2099"), sourceText: text, engineDeadline: null
    }), null);
  });

  await t.test("an invented amount", () => {
    assert.equal(candidates.amountCandidate({
      facts: { amounts: [{ value: "£99,999.99", role: "total_due" }] },
      sourceText: text, engineUnlabelled: true
    }), null);
  });

  await t.test("an invented consequence sentence", () => {
    assert.equal(candidates.consequenceCandidate({
      facts: { consequence: { kind: "eviction", conditional: true, sentence: "Something that is not on the page." } },
      sourceText: text, engineHasConsequence: false
    }), null);
  });

  await t.test("a sentence spanning a line break in the source still counts", () => {
    const source = "If you do not pay we may\napply to the court.";
    assert.equal(candidates.appearsVerbatim(
      source.replace(/\s+/g, " ").trim().toLowerCase(),
      "If you do not pay we may apply to the court."), true);
  });
});

test("a period in a deadline role is refused, which is residual 3 at the field", async (t) => {
  await t.test("legal_solicitor's \"14 days\" is on the page and is still not a date", () => {
    const text = byId("legal_solicitor");
    assert.ok(text.includes("14 days"), "the fixture must contain the period");
    assert.equal(candidates.deadlineCandidate({
      facts: dates("14 days"), sourceText: text, engineDeadline: null
    }), null);
  });

  await t.test("periods in every language the extractor met", () => {
    [["within 14 days of the date of this letter", byId("housing_letter")],
     ["within 24 hours", byId("scam_phishing")],
     ["24 godzin", byId("polish_phishing")]].forEach(([period, text]) => {
      assert.equal(candidates.deadlineCandidate({
        facts: dates(period), sourceText: text, engineDeadline: null
      }), null, period);
    });
  });
});

// ─── precedence ──────────────────────────────────────────────────────────────

test("facts never override the engine", async (t) => {
  await t.test("an engine deadline stands, whatever the facts say", () => {
    const text = byId("council_tax");
    const engineAnswer = analyse(text, null).structured_output.extractor_internal.deadline;
    assert.equal(engineAnswer, "1 April 2026");
    assert.equal(analyse(text, dates("12 March 2026")).structured_output.extractor_internal.deadline, engineAnswer);
  });

  await t.test("a role beats a GUESS and only a guess", () => {
    // selectAmount bound an amount on this document, so unlabelled_amount is
    // false and the fact must not be consulted.
    const bound = analyse(byId("council_tax"), null).structured_output.extractor_internal;
    assert.equal(bound.unlabelled_amount, false);
    assert.equal(candidates.amountCandidate({
      facts: { amounts: [{ value: "£1,842.00", role: "total_due" }] },
      sourceText: byId("council_tax"), engineUnlabelled: false
    }), null);
  });

  await t.test("an engine consequence SENTENCE stands, and the kind is still read", () => {
    // The two are separate questions. The engine's own reading wins the
    // sentence; the kind is reported anyway, because the severity floor needs
    // it on exactly these documents. Fusing them was why the floor fired on
    // nothing: the eight documents the floor most wants to read are the eight
    // where RISK_PHRASES already matched.
    const text = byId("bailiff_enforcement");
    const own = analyse(text, null).structured_output.extractor_internal.consequence_sentence;
    assert.ok(own);
    const withFacts = analyse(text, {
      consequence: { kind: "remove_goods", conditional: true, sentence: "an enforcement agent may attend your property and remove goods belonging to you" }
    }).structured_output.extractor_internal;
    assert.equal(withFacts.consequence_sentence, own, "the engine keeps its own words");
    assert.equal(withFacts.consequence_kind, "remove_goods", "and the kind is still available to the floor");
  });
});

// ─── the scam-shaped kind ────────────────────────────────────────────────────

test("a scam's own threat is never quoted back", async (t) => {
  await t.test("account_suspension is refused even when it is verbatim", () => {
    // Measured: polish_phishing gained a card 5 quoting the phishing message's
    // own threat, because the scam detector is blind to Polish and RISK_PHRASES
    // is English. Both walls were past; this is the third.
    const text = byId("polish_phishing");
    const sentence = "Brak potwierdzenia danych w podanym terminie spowoduje zablokowanie konta.";
    assert.ok(text.includes(sentence), "the fixture must contain the threat");
    assert.equal(candidates.consequenceCandidate({
      facts: { consequence: { kind: "account_suspension", conditional: false, sentence } },
      sourceText: text, engineHasConsequence: false
    }), null);
    assert.equal(analyse(text, { consequence: { kind: "account_suspension", conditional: false, sentence } })
      .structured_output.extractor_internal.has_consequence, false);
  });

  await t.test("the exclusion list is named, so deleting an entry is a visible edit", () => {
    assert.deepEqual(candidates.SCAM_SHAPED_KINDS, ["account_suspension"]);
  });
});

// ─── the engine's gates dominate ─────────────────────────────────────────────

test("a gated document ignores facts entirely", async (t) => {
  // Facts are read at ONE point, on the fully supported path, after every gate
  // has had its chance to return. These four take an earlier return.
  const GATED = ["scam_phishing", "non_document_recipe", "ocr_heavy_damage", "ocr_enforcement"];
  const facts = Object.assign(dates("1 April 2026"), {
    consequence: { kind: "eviction", conditional: true, sentence: "x" }
  });

  for (const id of GATED) {
    await t.test(id, () => {
      const without = analyse(byId(id), null).structured_output.extractor_internal;
      const with_ = analyse(byId(id), facts).structured_output.extractor_internal;
      assert.deepEqual(with_, without, id + " read facts it should never have seen");
    });
  }
});
