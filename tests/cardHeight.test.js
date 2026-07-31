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

// The two cards that still exceed the viewport, with the height measured for
// each. Listed rather than hidden: the test fails if either grows further, and
// fails if a THIRD card joins them.
const KNOWN_OVER = {
  "ocr_energy_bill|1": 823,
  "ocr_enforcement|1": 828
};

function currentCards() {
  const out = {};
  CORPUS.forEach((entry) => {
    const run = runClearStepsEngine({
      extractedText: entry.text,
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "card-height-test" }
    });
    run.api_output.structured_result.cards.forEach((card) => {
      out[entry.id + "|" + card.card_number] = {
        answerChars: card.simple_explanation.length,
        stepChars: (card.key_points || []).reduce((s, p) => s + p.length, 0),
        steps: (card.key_points || []).length
      };
    });
  });
  return out;
}

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
    const now = currentCards();
    ["ocr_energy_bill|1", "ocr_enforcement|1", "eviction_possession|1", "court_fine|1"]
      .forEach((key) => {
        assert.ok(now[key].answerChars >= LONG_ANSWER_CHARS,
          key + " answer fell to " + now[key].answerChars +
          " chars, so it regains the 59px sub-line and may overflow");
      });
  });
});
