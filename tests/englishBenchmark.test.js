// THE ENGLISH BENCHMARK. English card quality was confirmed in production on
// 5 August 2026, ten consecutive real uploads, ten rich card sets. This test
// freezes it: any commit whose guard stack rejects or degrades what an English
// reader received that day is a RED BUILD, not a discovery a founder makes by
// uploading a bill.
//
// HOW IT WORKS, and why it is deterministic when the prose path is not. The
// fixture holds one known-good RAW model candidate per reachable corpus
// document, captured on the day quality was confirmed, each verified to serve
// through that day's full stack. This test replays every candidate through the
// LIVE guard stack: sanitise, repair, strip, validate. The model half of the
// completion rate is non-deterministic and belongs to the daily production
// check; the guard half is code in this repo, and this is its regression test.
//
// THE PRODUCTION-SCALE SHAPES ARE IN THE FIXTURE, because small documents hid
// every failure in the week of 4 August: the 1KB synthetic served 8/10 while
// the real 702KB bill failed 2 in 5. benchmark_communal_bill_scale carries the
// DD/MM/YY periods and DD/MM/YYYY issue date that cost readers all six cards;
// benchmark_communal_bill_annex is long enough to produce production-sized
// prose.
//
// REFRESHING THE FIXTURE is scripts/engine-baseline/capture-english-benchmark.js
// and is done after a DELIBERATE prompt or guard change, in its own commit,
// never to make a red build green. A guard change that fails here is doing
// exactly what this file exists to catch: reducing what an English reader
// receives.
//
// LANGUAGE WORK RUNS THIS FILE. Every guard the language track touches, the
// command family, the credential patterns, the date rules, the enum sets, is
// shared with English, which is why both incidents that looked like language
// work breaking English were shared-validator defects. npm test runs this on
// every commit, so a language commit cannot skip it.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { sanitizeStructuredResultWithVerdict } =
  require(path.join(__dirname, "..", "src", "utils", "validateStructuredResult"));
const { stripAiViolations, rulesSentenceSet } =
  require(path.join(__dirname, "..", "src", "services", "aiStructuredResultService"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const { BENCHMARK_DOCS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus-benchmark"));
const CORPUS_FACTS = require(path.join(__dirname, "..", "tests", "fixtures", "corpus-facts.json"));
const FIXTURE = require(path.join(__dirname, "fixtures", "english-benchmark-candidates.json"));

const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "benchmark" };
const DOCS = new Map(CORPUS.concat(BENCHMARK_DOCS).map((d) => [d.id, d]));
const candidates = FIXTURE.candidates || {};
const ids = Object.keys(candidates);

// The floor the benchmark may never sink below. Raised deliberately when the
// fixture is deliberately refreshed; lowered never.
const MINIMUM_PINNED_DOCUMENTS = 50;

const clone = (v) => JSON.parse(JSON.stringify(v));

function replay(id) {
  const doc = DOCS.get(id);
  const rulesRun = runClearStepsEngine({
    extractedText: doc.text, fileMeta: FILE_META, facts: CORPUS_FACTS[id] || null
  });
  const fallback = rulesRun.api_output.structured_result;
  const verdict = sanitizeStructuredResultWithVerdict(clone(candidates[id]), fallback, doc.text);
  const stripped = verdict.rejected
    ? null
    : stripAiViolations(verdict.result, rulesSentenceSet(fallback));
  return { fallback, verdict, stripped };
}

test("the fixture is present and covers the corpus", async (t) => {
  await t.test("at least " + MINIMUM_PINNED_DOCUMENTS + " pinned documents", () => {
    assert.ok(ids.length >= MINIMUM_PINNED_DOCUMENTS,
      "only " + ids.length + " candidates pinned. If the fixture was deliberately " +
      "refreshed and shrank, that is a capture failure to investigate, not a floor to lower.");
  });

  await t.test("the production-scale shapes are pinned", () => {
    ["benchmark_communal_bill_scale", "benchmark_communal_bill_annex"].forEach((id) => {
      assert.ok(candidates[id],
        id + " is missing. Small documents hid every failure in the week of " +
        "4 August 2026; the benchmark without production scale is not the benchmark.");
    });
  });

  await t.test("every pinned id still has its document", () => {
    ids.forEach((id) => assert.ok(DOCS.has(id), id + " has a candidate but no document"));
  });
});

test("every known-good English candidate still serves through the full guard stack", async (t) => {
  for (const id of ids) {
    await t.test(id, () => {
      const { verdict, stripped } = replay(id);
      assert.equal(verdict.rejected, false,
        id + " NOW REJECTS known-good English output. A guard change has reduced " +
        "what an English reader receives: " + JSON.stringify(verdict.errors));
      // The stripper may substitute sentences; it must not empty a card.
      stripped.cards.forEach((card, i) => {
        assert.ok(typeof card.simple_explanation === "string" && card.simple_explanation.trim(),
          id + " card " + (i + 1) + " served an empty answer");
      });
    });
  }
});

test("zero repairs on known-good ENGLISH output, so the guard is not quietly eating prose", async (t) => {
  // Read before it was asserted, per the bucket rule. On capture day every
  // repair across the fixture sat on the five foreign-language-source
  // documents: the model translates "4 września 2026" to "4 September 2026",
  // the English-month allowed set cannot see the Polish original, and the
  // translation looks invented. That is the known cross-language canonicalise
  // gap, owned by the language track, and the repair path is what turned those
  // five from six-card rejections into served cards missing one sentence.
  //
  // The ENGLISH freeze is therefore exact: an English-source document whose
  // known-good candidate needs ANY repair means a guard change has started
  // eating English prose, and that is a red build with the sentence named.
  const englishSource = ids.filter((id) =>
    !/[^\x00-\x7F]/.test(DOCS.get(id).text.replace(/[£€–—''""]/g, "")));

  await t.test("the English-source set is most of the fixture", () => {
    assert.ok(englishSource.length >= 45,
      "only " + englishSource.length + " English-source documents pinned");
  });

  await t.test("every English-source repair count is zero, one named gap excepted", () => {
    // THE ONE KNOWN EXCEPTION, pinned by name rather than averaged away.
    // official_letter_caseworker_number prints "The visits are booked for
    // 12 and 13 June 2026", a date LIST where "12" carries no month of its
    // own. datesIn cannot see "12 June 2026" inside that form, so the model's
    // legitimate reading is repaired out. The list-form gap is the next
    // canonicalise item; when it is fixed this exception is deleted in the
    // same commit and the assertion becomes exact.
    const KNOWN_GAP = /^official_letter_caseworker_number: .*12 June 2026/;
    const eating = [];
    englishSource.forEach((id) => {
      const repairs = replay(id).verdict.repairs;
      if (repairs.length) eating.push(id + ": " + repairs.join(" | "));
    });
    const unexplained = eating.filter((e) => !KNOWN_GAP.test(e));
    assert.deepEqual(unexplained, [],
      "the guard stack is eating known-good English prose:\n" + unexplained.join("\n"));
    assert.ok(eating.length <= 1, "the named gap grew: " + eating.join("\n"));
  });

  await t.test("the foreign-source repairs are pinned, not ignored", () => {
    // A ratchet, not a shrug: today's cross-language gap costs sentences on
    // these five documents. More repaired sentences than on capture day means
    // a regression; fewer means the canonicalise gap was closed, and this pin
    // is lowered in the same commit.
    let repaired = 0;
    ids.filter((id) => !englishSource.includes(id))
      .forEach((id) => { repaired += replay(id).verdict.repairs.length; });
    assert.ok(repaired <= 88,
      repaired + " foreign-source repairs against 88 on capture day");
  });
});

test("the enum-case shape stays served", async (t) => {
  // The sweep's find: a model returning "High" for "high" used to discard all
  // six cards. There is no document that forces this, because casing is model
  // behaviour, so it is pinned as a candidate mutation instead.
  await t.test("capitalised enums on a known-good candidate", () => {
    const id = ids.find((x) => DOCS.has(x));
    const doc = DOCS.get(id);
    const rulesRun = runClearStepsEngine({
      extractedText: doc.text, fileMeta: FILE_META, facts: CORPUS_FACTS[id] || null
    });
    const mutated = clone(candidates[id]);
    mutated.overall_confidence = "High";
    mutated.risk_level = "Medium";
    if (mutated.cards && mutated.cards[0]) mutated.cards[0].status = "Urgent";
    const verdict = sanitizeStructuredResultWithVerdict(
      mutated, rulesRun.api_output.structured_result, doc.text);
    assert.equal(verdict.rejected, false,
      "a capital letter costs an English reader six cards again: " +
      JSON.stringify(verdict.errors));
  });
});
