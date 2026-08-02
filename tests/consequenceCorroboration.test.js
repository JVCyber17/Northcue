// A KIND IS A CLAIM, AND A CLAIM NEEDS CORROBORATION.
//
// The fact extractor returns a consequence as a quoted SENTENCE plus a KIND.
// The adjudicator verified the sentence appeared verbatim in the document, and
// nothing verified the kind. The engine then composed its card sentence and its
// severity floor from the kind, discarding the sentence.
//
// WHAT THAT COST. A Gujarati NHS appointment letter says
//
//   "જો તમે જાણ કર્યા વિના ન આવો, તો તમને યાદીમાંથી દૂર કરવામાં આવી શકે છે."
//   if you do not attend without telling us, you may be removed from the LIST
//
// The extractor labelled it remove_goods. The engine rendered the label:
//
//   "The document says goods may be taken to cover what is owed."
//
// on a hospital appointment letter, with severity low -> urgent and urgency
// none -> immediate. A fabricated bailiff threat, stated calmly, on a health
// document, in a language the reviewer reads. The quote was right. Only the
// label was wrong, and only the label was used.
//
// WHY NO TEST CAUGHT IT. tests/fixtures/corpus-facts.json stopped at 40
// documents while the corpus grew to 70, so every consumer ran the uncovered 30
// factless. This document was one of them. It was production-reachable the
// whole time: production calls the live extractor, not the fixture.
//
// THESE TESTS USE CONSTRUCTED FACTS ON PURPOSE, so the rule is pinned to the
// adjudicator rather than to whatever a captured fixture happens to contain.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const facts = require(path.join(__dirname, "..", "src", "utils", "factCandidates"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "corroboration" };

// An appointment letter. No money anywhere in it, which is the whole point.
const NHS_LETTER = [
  "Northbridge Hospital NHS Foundation Trust",
  "Dermatology Department",
  "Patient reference: NB-4471028",
  "",
  "Dear Mrs Patel",
  "",
  "Your appointment has been arranged.",
  "Date: 14 July 2026",
  "Time: 10:30",
  "",
  "If you do not attend without telling us, you may be removed from the list."
].join("\n");

const REMOVED_FROM_LIST = "If you do not attend without telling us, you may be removed from the list.";

// The same shape on a document that DOES state a debt.
const ARREARS_LETTER = [
  "Meadowbank Borough Council",
  "Council Tax Recovery",
  "Reference: MB-44712",
  "",
  "Dear Mr Vaidya",
  "",
  "Amount outstanding: £1,247.00",
  "",
  "If you do not pay, goods may be removed from your home to cover the debt."
].join("\n");

const GOODS_REMOVED = "If you do not pay, goods may be removed from your home to cover the debt.";

const consequenceFacts = (sentence, kind) => ({
  document_language: "en",
  amounts: [],
  dates: [],
  consequence: { kind, conditional: true, sentence }
});

test("a debt-enforcement kind needs the document to state a debt", async (t) => {
  await t.test("remove_goods on a letter with no money is not corroborated", () => {
    const candidate = facts.consequenceCandidate({
      facts: consequenceFacts(REMOVED_FROM_LIST, "remove_goods"),
      sourceText: NHS_LETTER
    });
    assert.ok(candidate, "the candidate survives, because the QUOTE is genuine");
    assert.equal(candidate.corroborated, false, "but the label is refused");
    assert.equal(candidate.sentence, REMOVED_FROM_LIST,
      "and the document's own sentence is kept, because it is a real consequence");
  });

  await t.test("enforcement_agent on a letter with no money is not corroborated", () => {
    const candidate = facts.consequenceCandidate({
      facts: consequenceFacts(REMOVED_FROM_LIST, "enforcement_agent"),
      sourceText: NHS_LETTER
    });
    assert.equal(candidate.corroborated, false);
  });

  await t.test("the same kind on a letter that states a debt IS corroborated", () => {
    // The counterweight. Without it this passes by refusing every kind, which
    // would cost every genuine enforcement letter its composed sentence and its
    // severity floor.
    const candidate = facts.consequenceCandidate({
      facts: consequenceFacts(GOODS_REMOVED, "remove_goods"),
      sourceText: ARREARS_LETTER
    });
    assert.equal(candidate.corroborated, true);
  });

  await t.test("the five high-floor kinds are NOT gated, and that is deliberate", () => {
    // Narrow on purpose. Requiring English vocabulary in the sentence would
    // close these too, and was measured: it drops a Polish eviction warning, a
    // Spanish final notice and a Portuguese disconnection notice from high to
    // low. Under-alarming three real letters to fix one wrong one is not a
    // trade this makes. The residual is recorded in KNOWN_ENGINE_DEFECTS.md.
    ["possession", "eviction", "court_action", "disconnection", "prosecution"].forEach((kind) => {
      const candidate = facts.consequenceCandidate({
        facts: consequenceFacts(REMOVED_FROM_LIST, kind),
        sourceText: NHS_LETTER
      });
      assert.equal(candidate.corroborated, true,
        kind + " is a high-floor kind and is deliberately not gated by this rule");
    });
  });

  await t.test("money in any of the ten languages corroborates", () => {
    // The rule is structural, not lexical, so it reaches every language the
    // English consequence vocabulary cannot.
    const polish = [
      "Brightside Housing Association",
      "Numer konta najemcy: BH-44712",
      "",
      "Szanowni Państwo,",
      "",
      "Zaległość na dzień dzisiejszy: £1,245.60",
      "",
      GOODS_REMOVED
    ].join("\n");
    const candidate = facts.consequenceCandidate({
      facts: consequenceFacts(GOODS_REMOVED, "remove_goods"),
      sourceText: polish
    });
    assert.equal(candidate.corroborated, true, "£1,245.60 is money in any language");
  });
});

test("an uncorroborated kind reaches neither the card nor the severity floor", async (t) => {
  const run = (text, factsObject) => runClearStepsEngine({
    extractedText: text, fileMeta: META, facts: factsObject
  });

  await t.test("the appointment letter states no bailiff and is not urgent", () => {
    const out = run(NHS_LETTER, consequenceFacts(REMOVED_FROM_LIST, "remove_goods"));
    const extraction = out.structured_output.extractor_internal;
    const trust = out.structured_output.trust_internal;

    assert.ok(!/goods may be taken|enforcement agent/i.test(String(extraction.consequence_sentence)),
      "the composed bailiff sentence must not appear: " +
      JSON.stringify(extraction.consequence_sentence));
    assert.equal(extraction.consequence_sentence, REMOVED_FROM_LIST,
      "the document's own sentence is what the reader gets");
    assert.notEqual(trust.severity_level, "urgent",
      "an appointment letter with no money must not be floored to urgent");
    assert.notEqual(trust.urgency_level, "immediate");
  });

  await t.test("the English arrears letter keeps its floor, and quotes itself", () => {
    // The composed template does NOT appear here, and that is correct rather
    // than a miss: the engine's own English reading found the sentence first,
    // and a quote from the document outranks a template composed from a label.
    // The floor is what the corroborated kind contributes on this path.
    const out = run(ARREARS_LETTER, consequenceFacts(GOODS_REMOVED, "remove_goods"));
    assert.equal(out.structured_output.extractor_internal.consequence_sentence, GOODS_REMOVED,
      "the document's own words, not the template");
    assert.equal(out.structured_output.trust_internal.severity_level, "urgent",
      "a corroborated kind still sets its floor");
  });

  await t.test("a corroborated kind DOES compose where the English reading is blind", () => {
    // The template exists for the documents the engine cannot read. A Polish
    // arrears letter states its consequence in Polish, RISK_PHRASES sees
    // nothing, and the composed sentence is the only English the reader gets.
    // This is the path the Gujarati defect travelled, so it needs a test that
    // proves the path still works when the kind IS supported.
    const polishArrears = [
      "Brightside Housing Association",
      "Numer konta najemcy: BH-44712",
      "",
      "Szanowni Państwo,",
      "",
      "Zaległość na dzień dzisiejszy: £1,245.60",
      "",
      "Jeżeli zaległość nie zostanie uregulowana, zajmiemy rzeczy na pokrycie długu."
    ].join("\n");
    const sentence = "Jeżeli zaległość nie zostanie uregulowana, zajmiemy rzeczy na pokrycie długu.";
    const out = run(polishArrears, consequenceFacts(sentence, "remove_goods"));
    assert.match(String(out.structured_output.extractor_internal.consequence_sentence),
      /goods may be taken to cover what is owed/i,
      "the composed sentence is what makes a Polish consequence readable at all");
    assert.equal(out.structured_output.trust_internal.severity_level, "urgent");
  });
});
