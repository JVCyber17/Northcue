// Guards the co-location rule: a label governs a value only when the document
// puts them close enough to have stated the relationship.
//
// Each of the three tests is exercised on its own, so a future change that
// breaks one is identifiable from the failure rather than from a single
// composite assertion going red.
//
// The defect this replaces: every extractor returned bare values with no
// offsets, so selection fell back to "the largest" (bestMoneyAmount) or "the
// first in document order" (firstOrNull). Card 1 used one and card 5 used the
// other, which is how one screen came to show £1,247.00 and £1,047.00 for the
// same enforcement notice.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "co-location-test" }
  });
}

const MONEY_IN_TEXT = /[£$€]\s?\d[\d,]*(?:\.\d{2})?/g;

test("co-location, test 1: proximity", async (t) => {
  await t.test("a label on the same line governs its value", () => {
    const chosen = co.selectAmount("Amount to pay: £1,381.50");
    assert.equal(chosen && chosen.value, "£1,381.50");
  });

  await t.test("a label on the line immediately above governs", () => {
    const chosen = co.selectAmount("Amount to pay\n£1,381.50");
    assert.equal(chosen && chosen.value, "£1,381.50");
  });

  await t.test("a label may follow its value on the same line", () => {
    // "an amount of £486.20 still to pay" is how the HMRC letter writes it.
    const chosen = co.selectAmount("Our records show an amount of £486.20 still to pay.");
    assert.equal(chosen && chosen.value, "£486.20");
  });

  await t.test("a label two lines away does not govern", () => {
    assert.equal(co.selectAmount("Amount to pay\nsome other line\n£1,381.50"), null);
  });

  await t.test("a label on the NEXT line does not reach backwards", () => {
    // The label belongs to whatever follows it, not to what came before.
    assert.equal(co.selectAmount("£1,842.00\nAmount to pay"), null);
  });
});

test("co-location, test 2: same block", async (t) => {
  await t.test("a label does not reach across a blank line", () => {
    // Header, body and footer are different zones. A label in one must not
    // govern a value in another.
    assert.equal(co.selectAmount("Amount to pay\n\n£1,381.50"), null);
  });

  await t.test("the same pair inside one block does govern", () => {
    const chosen = co.selectAmount("Amount to pay\n£1,381.50");
    assert.equal(chosen && chosen.value, "£1,381.50");
  });
});

test("co-location, test 3: no competing label between", async (t) => {
  await t.test("a competing label between the two breaks the binding", () => {
    // "the year ending 5 April 2026" must not capture the deadline that
    // belongs to "you must pay by".
    const hmrc = [
      "We have reviewed your return for the year ending 5 April 2026.",
      "You must pay by 31 July 2026."
    ].join("\n");
    const chosen = co.selectDeadline(hmrc);
    assert.equal(chosen && chosen.value, "31 July 2026");
  });

  await t.test("the nearest binding wins when several survive", () => {
    const text = "Total charge for the year: £1,842.00\nAmount to pay: £1,381.50";
    const chosen = co.selectAmount(text);
    assert.equal(chosen && chosen.value, "£1,381.50", "the labelled demand, not the largest number");
  });

  await t.test("a competing label binding the same value forces a decline", () => {
    // Two labels claim one number, one on each side, so the document states no
    // single relationship. "in credit by £83.86, so there is nothing to pay".
    assert.equal(
      co.selectAmount("Your account is in credit by £83.86, so there is nothing to pay."),
      null
    );
  });
});

test("co-location: the greeting zone rule for dates", async (t) => {
  const letter = [
    "West Middlesex University Hospital",
    "Date: 5 June 2026",
    "Dear Patient",
    "Date: Tuesday 1 July 2026"
  ].join("\n");

  await t.test("a date above the greeting is the letter date", () => {
    assert.equal(co.selectLetterDate(letter).value, "5 June 2026");
  });

  await t.test("a date below the greeting is content", () => {
    assert.equal(co.selectContentDate(letter).value, "1 July 2026");
  });

  await t.test("with no greeting there is no header zone", () => {
    const noGreeting = "Some letter\nDate: 5 June 2026";
    assert.equal(co.selectLetterDate(noGreeting), null);
  });
});

test("co-location: the four documents this was built for", async (t) => {
  const byId = (id) => CORPUS.find((entry) => entry.id === id).text;

  await t.test("council tax names the amount owed, not the largest", () => {
    const run = analyse(byId("council_tax"));
    assert.equal(run.api_output.structured_result.summary.main_amount, "£1,381.50");
    assert.doesNotMatch(run.api_output.structured_result.cards[0].simple_explanation, /1,842/,
      "the total charge before the discount must not be presented as the demand");
  });

  await t.test("HMRC names the payment deadline, not the tax year end", () => {
    const run = analyse(byId("gov_hmrc"));
    assert.equal(run.structured_output.extractor_internal.deadline, "31 July 2026");
  });

  await t.test("the in credit statement declines rather than naming a figure", () => {
    const run = analyse(byId("bill_in_credit"));
    assert.equal(run.api_output.structured_result.summary.main_amount, null,
      "a letter saying there is nothing to pay must not name an amount owed");
    assert.equal(run.structured_output.extractor_internal.deadline, null,
      "the next statement date is not a deadline");
  });

  await t.test("the appointment names the appointment, not the letter date", () => {
    const run = analyse(byId("appointment_nhs"));
    assert.match(run.api_output.structured_result.cards[0].simple_explanation, /1 July 2026/);
    assert.doesNotMatch(run.api_output.structured_result.cards[0].simple_explanation, /5 June 2026/);
  });
});

test("co-location: selection never falls back to largest or first", async (t) => {
  await t.test("an unlabelled amount is declined, not guessed", () => {
    // Three numbers, none labelled as a demand. Largest would give £900.00 and
    // first would give £100.00. The honest answer is neither.
    const text = "Some figures appear in this letter.\n£100.00\n£900.00\n£250.00";
    assert.equal(co.selectAmount(text), null);
  });

  await t.test("the decline reaches the card as the decline vocabulary", () => {
    const run = analyse([
      "Fairfield Services",
      "Statement of account",
      "Reference: FS-2201",
      "Figures on this account: £100.00 and £900.00.",
      "Please contact us if anything looks wrong."
    ].join("\n"));
    const card5 = run.api_output.structured_result.cards[4];
    assert.equal(card5.possible_payment, null, "no amount may be asserted");
    if (/does not label/.test(card5.simple_explanation)) {
      assert.match(card5.simple_explanation, /Check the original document/,
        "the decline must hand the reader back to the original");
    }
  });
});

test("co-location: card 1 and card 5 can never name different amounts", async (t) => {
  await t.test("structurally, both read one field", () => {
    // The guarantee is structural, not incidental. Both consumers read
    // extraction.selected_amount, and neither calls a selector of its own.
    const source = require("node:fs").readFileSync(
      path.join(__dirname, "..", "src", "services", "clearStepsEngine.js"), "utf8");
    assert.doesNotMatch(source, /firstOrNull\(extraction\.money_amounts\)/,
      "card 5 must not select its own amount");
    assert.doesNotMatch(source, /bestMoneyAmount\(extraction\.money_amounts\)/,
      "the summary must not select its own amount");
    assert.doesNotMatch(source, /bestMoneyAmount\(extractMoneyAmounts\(text\)\)/,
      "inferSummary must not select its own amount");
  });

  await t.test("across every corpus document, the two cards never conflict", () => {
    // The defect that started this: £1,247.00 on card 1 and £1,047.00 on card
    // 5, same screen, same document. Checked on rendered card text so it holds
    // whatever the templates do.
    const conflicts = [];
    CORPUS.forEach((entry) => {
      const cards = analyse(entry.text).api_output.structured_result.cards;
      const card1 = cards[0].simple_explanation.match(MONEY_IN_TEXT) || [];
      const card5Amount = cards[4].possible_payment;
      if (!card5Amount || !card1.length) return;
      if (!card1.includes(card5Amount)) {
        conflicts.push(entry.id + ": card1=" + JSON.stringify(card1) + " card5=" + card5Amount);
      }
    });
    assert.deepEqual(conflicts, [],
      "card 1 and card 5 named different amounts on the same screen");
  });

  await t.test("card 5's amount always equals the selected amount", () => {
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      const selected = run.structured_output.extractor_internal.selected_amount || null;
      assert.equal(run.api_output.structured_result.cards[4].possible_payment, selected,
        entry.id + ": card 5 must show the selected amount and nothing else");
      assert.equal(run.api_output.structured_result.summary.main_amount, selected,
        entry.id + ": the summary must show the selected amount and nothing else");
    });
  });

  await t.test("a fused multi letter upload declines on both cards", () => {
    // The multi letter rule outranks co-location: even a perfectly labelled
    // amount cannot be attributed when the upload holds several letters.
    const fused = CORPUS.find((entry) => entry.id === "multi_document").text;
    const run = analyse(fused);
    assert.equal(run.structured_output.extractor_internal.selected_amount, null);
    assert.equal(run.api_output.structured_result.summary.main_amount, null);
    assert.equal(run.api_output.structured_result.cards[4].possible_payment, null);
  });
});
