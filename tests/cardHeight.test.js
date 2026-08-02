// Guards how tall a cue card can get.
//
// This is the check that was missing, and its absence is why the problem
// recurred: --check guards engine output, npm test guards logic, and neither
// had ever looked at a pixel. Card 1 grew past the viewport in Polish, U-2 was
// deferred on 51px of headroom in Romanian, and both were discovered by hand,
// separately, after the fact.
//
// HOW THIS WORKS, AND WHAT IT CANNOT DO. There is no browser in the test stack
// and adding one is a heavy dependency for this. So tests/fixtures/card-heights
// .json records the tallest each card rendered across all ten languages at
// 375x812 in a real browser, together with the character counts that produced
// that height. This test cannot re-measure pixels. What it CAN do, and what
// actually catches the recurrence, is fail when a card's content grows beyond
// the content that was measured.
//
// I tried fitting a height model instead and rejected it: on the real data it
// was wrong by up to 211px, which on an 812px budget would both miss real
// overflows and fire falsely. Recorded measurement plus a content budget is
// honest about what it knows; a bad model would not be.
//
// TO RE-MEASURE after a deliberate layout or copy change: serve the app, set
// the viewport to 375x812, render every corpus card in every language, record
// the tallest per card, and rewrite the fixture. The procedure is in the
// commit that introduced this file.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const FIXTURE = require(path.join(__dirname, "fixtures", "card-heights.json"));

// Cards measured within this of the viewport have no room to absorb growth, so
// their content is held to what was measured. Chosen to cover every card that
// is over or has been over: the tallest compliant card is 796px.
const TIGHT_PX = 120;

// No card exceeds the viewport. It was two, both card 1 on a garbled document,
// until that answer was split into answer plus key point. The list stays so the
// test can say plainly when one comes back rather than quietly tolerating it.
// THREE CARDS ARE OVER THE VIEWPORT, and all three arrived with the first
// full-length documents on 2 August 2026. Every one is a long sentence lifted
// verbatim out of a statutory notes block:
//
//   the Ofgem debt and disconnection safeguard, on card 5 of the energy bill
//   the prescribed "making an appeal does not allow you to stop paying" note,
//     on card 3 of the council tax demand
//   the prescribed liability order and enforcement agent note, on card 5
//
// All three are measured in Polish, which is the longest of the ten languages.
// A reader on a 375x812 phone cannot see the whole card.
//
// NAMED, NOT ACCEPTED. Recorded in KNOWN_ENGINE_DEFECTS.md. The cause is the
// same one behind two other findings from the same documents: the engine lifts
// whole sentences from prescribed notes that are not about this reader.
const KNOWN_OVER = {
  "spec_energy_bill_full|5": 888,
  "spec_council_tax_demand_full|3": 882,
  "spec_council_tax_demand_full|5": 921
};

// D3 tier 2 gave the engine a second reading of the same document: the one it
// produces on its own, and the one it produces when the fact extractor answered.
// A reader on the English path sees the second, and this harness could only see
// the first, so a card that grows only when facts arrive was invisible here.
//
// tests/fixtures/corpus-facts.json is the real captured extractor output for
// every corpus document, so the second reading is reproducible offline. Cards
// that differ between the two readings are measured separately, keyed
// "<id>+facts|<n>". Cards that do not differ are not duplicated.
const CORPUS_FACTS = require(path.join(__dirname, "fixtures", "corpus-facts.json"));
const { providerSkipReason } = require(path.join(__dirname, "..", "src", "services", "aiStructuredResultService"));

function cardsOf(text, facts, id) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "card-height-test" },
    facts
  }).api_output.structured_result.cards;
}

function measurementsOf(card) {
  return {
    answerChars: card.simple_explanation.length,
    stepChars: (card.key_points || []).reduce((s, p) => s + p.length, 0),
    steps: (card.key_points || []).length
  };
}

function currentCards() {
  const out = {};
  CORPUS.forEach((entry) => {
    const own = cardsOf(entry.text, null, entry.id);
    own.forEach((card) => { out[entry.id + "|" + card.card_number] = measurementsOf(card); });

    // Only where production would actually have facts. The fixture holds a
    // captured extraction for all forty documents because it was captured
    // offline, but providerSkipReason stops the extractor on a gated one, so
    // measuring a card it can never render would be measuring nothing.
    //
    // EXCEPT missing_api_key, which is not a property of the document.
    //
    // That one reason made this test depend on whether a secret happened to be
    // exported in the shell: with a key the twelve "+facts" cards were built
    // and matched the fixture, without one they vanished and the fixture
    // looked stale. It passed on the machine that wrote it and failed
    // everywhere else, which is worse than not existing, because it was
    // reported as green. A test may not read a credential to decide what to
    // assert. Every other skip reason is the engine judging the document and
    // is still honoured.
    const facts = CORPUS_FACTS[entry.id];
    if (!facts) return;
    const run = runClearStepsEngine({
      extractedText: entry.text,
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "card-height-test" }
    });
    const skip = providerSkipReason({ rulesRun: run, language: "en" });
    if (skip && skip !== "missing_api_key") return;
    const withFacts = cardsOf(entry.text, facts, entry.id);
    withFacts.forEach((card, index) => {
      const before = own[index];
      const same = card.title === before.title &&
        card.simple_explanation === before.simple_explanation &&
        JSON.stringify(card.key_points) === JSON.stringify(before.key_points);
      if (same) return;
      out[entry.id + "+facts|" + card.card_number] = measurementsOf(card);
    });
  });
  return out;
}

test("card height: the cards carrying a client rendered line", async (t) => {
  // Card 4 can gain a line the ENGINE never emits: the passed-deadline sentence
  // is computed in the browser from deadline_iso against the device clock, so
  // currentCards() below cannot see it and answerChars and stepChars never
  // count it.
  //
  // Those cards were measured WITH the line whether or not their date has
  // passed yet, so the recorded px is an upper bound that does not go stale
  // when a future deadline becomes a past one. Without that, court_fine would
  // silently gain 36px on 1 October 2026 and no test would notice.
  const marked = Object.entries(FIXTURE.cards).filter(([, m]) => m.includesPassedLine);

  await t.test("every card that can gain the line is marked", () => {
    // A card can gain it when the engine gives it a deadline_iso AND its card 4
    // sentence is one of the two the fully supported path writes.
    const { deadlineIsoFor } = require(path.join(__dirname, "..", "src", "utils", "deadlineIso"));
    require(path.join(__dirname, "..", "public", "i18n", "templates-en"));
    const bank = require(path.join(__dirname, "..", "public", "i18n", "templateBank"));
    const CAN_CARRY = new Set(["tpl.deadline.due", "tpl.deadline.appointment"]);

    const expected = [];
    CORPUS.forEach((entry) => {
      const run = runClearStepsEngine({
        extractedText: entry.text,
        fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "height-passed" }
      });
      const result = run.api_output.structured_result;
      if (!result.summary.deadline_iso) return;
      if (!CAN_CARRY.has(bank.templateIdFor(result.cards[3].simple_explanation))) return;
      expected.push(entry.id + "|4");
    });

    assert.deepEqual(marked.map(([key]) => key).sort(), expected.sort(),
      "a card gained or lost the ability to show the passed line without being re-measured");
  });

  await t.test("none of them is over the viewport with the line", () => {
    marked.forEach(([key, m]) => {
      assert.ok(m.px <= FIXTURE.viewport, key + " is " + m.px + "px in " + m.lang);
    });
  });
});

test("card height: the fixture still describes the engine", async (t) => {
  const now = currentCards();

  await t.test("every card the engine produces has been measured", () => {
    // A new document or a seventh card would otherwise ship unmeasured.
    const missing = Object.keys(now).filter((key) => !FIXTURE.cards[key]);
    assert.deepEqual(missing, [],
      "these cards have no recorded height. Re-measure and update the fixture.");
  });

  await t.test("the fixture describes no card the engine no longer produces", () => {
    const stale = Object.keys(FIXTURE.cards).filter((key) => !now[key]);
    assert.deepEqual(stale, []);
  });

  await t.test("what this harness measures does not depend on a key being set", () => {
    // The bug this pins: currentCards() asked providerSkipReason, which asks
    // whether OPENAI_API_KEY is set, so the twelve "+facts" cards existed on a
    // machine with a key and did not on a machine without one. Both readings
    // must be the same set, because a document's cards are a property of the
    // document.
    const original = process.env.OPENAI_API_KEY;
    try {
      process.env.OPENAI_API_KEY = "test-key";
      const withKey = Object.keys(currentCards()).sort();
      delete process.env.OPENAI_API_KEY;
      const withoutKey = Object.keys(currentCards()).sort();
      assert.deepEqual(withoutKey, withKey,
        "this harness reads a credential to decide what to assert");
    } finally {
      if (original === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = original;
    }
  });
});

test("card height: content may not grow where there is no room", async (t) => {
  const now = currentCards();

  await t.test("no tight card carries more text than when it was measured", () => {
    const grown = [];
    Object.entries(FIXTURE.cards).forEach(([key, measured]) => {
      if (measured.px < FIXTURE.viewport - TIGHT_PX) return;
      const current = now[key];
      if (current.answerChars > measured.answerChars) {
        grown.push(key + " answer " + measured.answerChars + " -> " + current.answerChars +
          " (measured " + measured.px + "px in " + measured.lang + ")");
      }
      if (current.stepChars > measured.stepChars) {
        grown.push(key + " key points " + measured.stepChars + " -> " + current.stepChars +
          " (measured " + measured.px + "px in " + measured.lang + ")");
      }
      if (current.steps > measured.steps) {
        grown.push(key + " key point count " + measured.steps + " -> " + current.steps);
      }
    });
    assert.deepEqual(grown, [],
      "a card with little headroom gained content. Re-measure at 375x812 before shipping this.");
  });

  await t.test("the cards over the viewport are exactly the two known ones", () => {
    const over = Object.entries(FIXTURE.cards)
      .filter(([, m]) => m.px > FIXTURE.viewport)
      .map(([key]) => key)
      .sort();
    assert.deepEqual(over, Object.keys(KNOWN_OVER).sort(),
      "the set of cards taller than the viewport changed");
  });

  await t.test("neither known-over card has grown", () => {
    Object.keys(KNOWN_OVER).forEach((key) => {
      assert.equal(FIXTURE.cards[key].px, KNOWN_OVER[key],
        key + " was re-measured at a different height without this list being updated");
    });
  });
});

test("card height: the sub-line rule the layout depends on", async (t) => {
  // renderCard hides the generic sub-line once the answer reaches this length,
  // which is worth 59px on exactly the cards that need it. If the engine's
  // longest answers drop below the threshold the saving silently disappears.
  const LONG_ANSWER_CHARS = 100;

  await t.test("app.js still uses the threshold this fixture was measured with", () => {
    const source = require("node:fs").readFileSync(
      path.join(__dirname, "..", "public", "app.js"), "utf8");
    assert.match(source, /const LONG_ANSWER_CHARS = 100;/,
      "the sub-line threshold changed; re-measure the fixture");
    assert.match(source, /classList\.toggle\("hidden", translatedAnswer\.text\.length >= LONG_ANSWER_CHARS\)/,
      "the sub-line is no longer hidden on long answers");
  });

  await t.test("the cards that rely on the saving still exceed the threshold", () => {
    // The two garbled card 1s were on this list until their answer was split
    // into answer plus key point for height. They are now short enough to
    // regain the sub-line, and they fit anyway, so the saving is no longer
    // what keeps them inside the viewport. These two still depend on it.
    const now = currentCards();
    ["eviction_possession|1", "court_fine|1"].forEach((key) => {
      assert.ok(now[key].answerChars >= LONG_ANSWER_CHARS,
        key + " answer fell to " + now[key].answerChars +
        " chars, so it regains the 59px sub-line and may overflow");
    });
  });
});
