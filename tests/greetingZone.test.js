// The greeting, and the zone it draws.
//
// WHY THIS MATTERS AT ALL. A greeting is the only thing that separates the
// header of a letter from its body, and that separation is what tells a letter
// date from an appointment date. Both are just "a date" to a pattern.
//
// THE DEFECT IT CLOSES. A Gujarati NHS outpatient letter labels its letter date
// "પત્રની તારીખ:" and its appointment "તારીખ:". The English greeting rule never
// matched "પ્રિય શ્રીમતી Patel,", so no header zone existed, every date was body,
// and the first one won. Card 4 read "The document shows 12 June 2026 as the
// date that matters" on a letter about an appointment on 14 July. The Bengali
// screening invitation did the same with 5 June against 9 July. A reader could
// miss a screening.
//
// TWO LAYERS, AND NEITHER IS SUFFICIENT ALONE. coLocation gained a structural
// greeting so the zone exists; clearStepsEngine's extractHeaderDate gained a
// fallback to selectLetterDate so the reading-aid path uses it. Prototyping
// either on its own moved nothing at all, which is worth knowing before someone
// tries to simplify one of them away.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "greeting-test" };
const anyDate = () => true;

// Every greeting shape in the corpus, by language. Written out rather than
// derived, so a language losing its only document shows up here as a test that
// no longer has anything to assert.
const GREETINGS = [
  ["Polish", "Szanowni Państwo,"],
  ["Polish, named", "Szanowna Pani Nowak,"],
  ["Polish, customer", "Szanowny Kliencie,"],
  ["Spanish", "Estimado cliente,"],
  ["French", "Madame, Monsieur,"],
  ["Portuguese, formal", "Exmo. Senhor Ferreira,"],
  ["Portuguese, customer", "Caro cliente,"],
  ["Gujarati", "પ્રિય શ્રીમતી Patel,"],
  ["Hindi", "प्रिय श्री Sharma,"],
  ["Bengali", "প্রিয় মিসেস Begum,"],
  ["Panjabi", "ਸਤਿਕਾਰਯੋਗ ਸ. Singh,"]
];

function zonesOf(text) {
  return co.findDates(text, anyDate).map((d) => d.value + "=" + d.zone);
}

test("a greeting is recognised in any script", async (t) => {
  await t.test("every greeting shape in the corpus draws a zone", () => {
    GREETINGS.forEach(([language, greeting]) => {
      const letter = [
        "Some Sender Ltd",
        "Reference: AB-4471028",
        "Letter date label: 12 June 2026",
        "",
        greeting,
        "",
        "Appointment label: 14 July 2026"
      ].join("\n");
      const zones = zonesOf(letter);
      assert.deepEqual(zones, ["12 June 2026=header", "14 July 2026=body"],
        language + ": " + JSON.stringify(greeting) + " did not draw a header zone");
    });
  });

  await t.test("all fourteen occurrences in the corpus are found", () => {
    // The measurement the rule was built on: the shape appears fourteen times
    // across seventy documents and every one is a genuine greeting.
    const found = [];
    CORPUS.forEach((entry) => {
      const lines = entry.text.split("\n");
      const index = lines.findIndex((line) => {
        const value = line.trim();
        return /,$/.test(value) && value.length < 45 && value.indexOf(":") === -1;
      });
      if (index !== -1) found.push([entry.id, lines[index].trim()]);
    });
    assert.equal(found.length, 14,
      "the corpus no longer carries fourteen structural greetings: " +
      JSON.stringify(found.map((f) => f[0])));
    // And every one of them really is a greeting, not a sentence that happens
    // to end in a comma.
    found.forEach(([id, line]) => {
      assert.ok(GREETINGS.some(([, greeting]) => greeting === line),
        id + " carries a comma-terminated line that is NOT in the known greeting " +
        "list, so either it is a new language or the rule has found a false " +
        "positive: " + JSON.stringify(line));
    });
  });

  await t.test("NO ENGLISH DOCUMENT ACQUIRES A STRUCTURAL GREETING", () => {
    // The safety property. English writes "Dear Mr Vaidya" with no trailing
    // comma, so the structural rule must never fire on an English letter, and
    // the English rule is tried first in any case. If this fails, the fix has
    // started moving documents it was never meant to touch.
    const NON_ENGLISH = new Set([
      "polish_rent_arrears", "polish_phishing", "spanish_water_final_notice",
      "french_hospital_appointment", "scam_hmrc_refund_es", "scam_bank_security_fr",
      "scam_crypto_investment_pl", "scam_energy_refund_pt",
      "intl_polish_clinic_appointment", "intl_portuguese_energy_final_notice",
      "spec_gujarati_nhs_appointment", "spec_hindi_dwp_universal_credit",
      "spec_bengali_nhs_screening", "spec_panjabi_council_rent"
    ]);
    CORPUS.forEach((entry) => {
      if (NON_ENGLISH.has(entry.id)) return;
      const hasStructural = entry.text.split("\n").some((line) => {
        const value = line.trim();
        return /,$/.test(value) && value.length < 45 && value.indexOf(":") === -1;
      });
      assert.equal(hasStructural, false,
        entry.id + " is an English document and now carries a structural greeting");
    });
  });

  await t.test("the English rule still wins where both are present", () => {
    // A letter carrying an English greeting AND a comma-terminated line must be
    // cut at "Dear", not at whichever comes first.
    const letter = [
      "Some Sender Ltd",
      "Bill date: 12 June 2026",
      "Reference, quoted below,",
      "",
      "Dear Ms Bekele",
      "",
      "Your appointment is on 14 July 2026."
    ].join("\n");
    assert.deepEqual(zonesOf(letter), ["12 June 2026=header", "14 July 2026=body"]);
  });

  await t.test("a labelled field ending in a comma is not a greeting", () => {
    // ASSERTED THROUGH findDates, NOT AGAINST A COPY OF THE PREDICATE. A first
    // draft of this test re-expressed the rule inline and therefore passed
    // whatever the implementation did: removing the colon guard entirely left
    // it green. Every case below puts the field ABOVE the real greeting, so if
    // the guard goes, the zone is cut at the field and the dates move.
    const cases = [
      ["a labelled address", "Address: 14 Sutton Court Road, Hounslow,"],
      ["a labelled amount", "Amount to pay: £1,381.50,"],
      ["a labelled supply point", "Supply address: 8 Kingsley Road, Hounslow,"]
    ];
    // THE FIELD SITS ABOVE THE LETTER DATE ON PURPOSE. Put below it and a wrong
    // cut lands between the same two dates, so the zones are identical and the
    // test proves nothing. Two drafts of this test did exactly that and stayed
    // green with the guard removed. Above it, losing the guard drags the letter
    // date into the body and the assertion fails.
    cases.forEach(([why, field]) => {
      const letter = [
        "Some Sender Ltd",
        field,
        "Letter date label: 12 June 2026",
        "",
        "Szanowni Państwo,",
        "",
        "Appointment label: 14 July 2026"
      ].join("\n");
      assert.deepEqual(zonesOf(letter), ["12 June 2026=header", "14 July 2026=body"],
        why + ": the zone was cut at " + JSON.stringify(field) + " rather than at the greeting");
    });
  });

  await t.test("a sentence too long to be a greeting is not one", () => {
    // The length bound, above the letter date for the same reason.
    const letter = [
      "Some Sender Ltd",
      "We wrote to you about this matter once before, in March, and again in April,",
      "Letter date label: 12 June 2026",
      "",
      "Szanowni Państwo,",
      "",
      "Appointment label: 14 July 2026"
    ].join("\n");
    assert.deepEqual(zonesOf(letter), ["12 June 2026=header", "14 July 2026=body"]);
  });
});

test("the two NHS letters name the appointment, not the letter date", async (t) => {
  const run = (id) => runClearStepsEngine({
    extractedText: CORPUS.find((e) => e.id === id).text, fileMeta: META
  });

  await t.test("Gujarati: 14 July, not 12 June", () => {
    const r = run("spec_gujarati_nhs_appointment");
    // deadline_iso is null here and that is not a regression. Both NHS letters
    // reach card 4 through the READING AID, which guesses its date rather than
    // adjudicating one, and a guessed date stopped being machine-comparable
    // when the aid path was gated out of deadlineIsoFor. The date the reader
    // SEES is the assertion that matters and it is unchanged.
    assert.equal(r.api_output.structured_result.summary.deadline_iso, null);
    assert.equal(r.api_output.structured_result.summary.main_date, "14 July 2026");
    assert.match(r.api_output.structured_result.cards[3].simple_explanation, /14 July 2026/);
    assert.doesNotMatch(r.api_output.structured_result.cards[3].simple_explanation, /12 June/);
  });

  await t.test("Bengali: 9 July, not 5 June", () => {
    const r = run("spec_bengali_nhs_screening");
    assert.equal(r.api_output.structured_result.summary.deadline_iso, null, "aid path, see above");
    assert.equal(r.api_output.structured_result.summary.main_date, "9 July 2026");
    assert.match(r.api_output.structured_result.cards[3].simple_explanation, /9 July 2026/);
    assert.doesNotMatch(r.api_output.structured_result.cards[3].simple_explanation, /5 June/);
  });

  await t.test("the English NHS letter is unchanged, which is the control", () => {
    const r = run("appointment_nhs");
    assert.equal(r.api_output.structured_result.summary.deadline_iso, "2026-07-01");
  });

  await t.test("BOTH LAYERS ARE LOAD BEARING", () => {
    // Neither half moves this on its own, and that is the thing most likely to
    // be lost in a later tidy-up. The zone must exist AND the reading-aid path
    // must consult it.
    const gujarati = CORPUS.find((e) => e.id === "spec_gujarati_nhs_appointment").text;
    // Layer 1: without a greeting there is no zone at all.
    assert.deepEqual(zonesOf(gujarati), ["12 June 2026=header", "14 July 2026=body"],
      "layer 1: the structural greeting must put the letter date in the header");
    // Layer 2: the header date must be the one co-location names.
    const letterDate = co.selectLetterDate(gujarati, anyDate);
    assert.equal(letterDate && letterDate.value, "12 June 2026",
      "layer 2: selectLetterDate is what extractHeaderDate falls back to");
  });
});
