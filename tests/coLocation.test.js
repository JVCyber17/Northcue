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

test("tier 1a: a date label binds forwards only", async (t) => {
  // The either-side allowance on the same line was added for MONEY, so that
  // "an amount of £486.20 still to pay" binds. Dates were sharing it, and a
  // letter routinely states several dates, so a label at the end of a line
  // could reach backwards and capture an earlier one.
  await t.test("a label at the end of a line does not capture an earlier date", () => {
    // Both dates on one line, the real deadline last. This is one OCR line
    // join away from the bailiff notice, which already carries "Liability
    // Order obtained by Hounslow Borough Council on 3 July 2026" on its own
    // line.
    const chosen = co.selectDeadline(
      "A liability order was granted on 3 July 2026 and the full balance is now due by 3 September 2026.");
    assert.equal(chosen && chosen.value, "3 September 2026",
      "the label must reach forward to its own date, not backwards to the order date");
  });

  await t.test("money keeps the either-side allowance it was designed for", () => {
    const chosen = co.selectAmount("Our records show an amount of £486.20 still to pay.");
    assert.equal(chosen && chosen.value, "£486.20",
      "forward-only must not have been applied to amounts");
  });

  await t.test("a label on the line above still binds its date", () => {
    assert.equal(co.selectDeadline("Payment due by\n3 September 2026").value, "3 September 2026");
  });
});

test("tier 1b: only punctuation may sit between a date label and its date", async (t) => {
  // A "<verb> by" literal cannot tell a temporal "by" from an instrumental or
  // agentive one. Every sentence here was binding the wrong date before this
  // rule, and every one is ordinary UK correspondence.
  const INSTRUMENTAL = [
    ["pay by", "You agreed to pay by direct debit on 3 July 2026."],
    ["pay by", "You agreed to pay by instalments of £50.00 on 3 July 2026."],
    // "cleared by" was added in a1f21ff as a possession-notice shape and
    // brought this agentive reading with it.
    ["cleared by", "The arrears were cleared by a third party on 3 July 2026."],
    ["cleared by", "The balance was cleared by us on 3 July 2026."],
    ["paid in full by", "Your account was paid in full by direct debit on 3 July 2026."],
    ["contact us by", "You can contact us by telephone on 020 8321 5000 about your appointment on 1 July 2026."],
    ["contact us by", "You can contact us by phone, by post or by email about the meeting on 17 June 2026."]
  ];

  for (const [entry, sentence] of INSTRUMENTAL) {
    await t.test(entry + ": " + sentence.slice(0, 52), () => {
      assert.equal(co.selectDeadline(sentence), null,
        "an instrumental or agentive 'by' is not a deadline");
    });
  }

  await t.test("the same entries still bind a real deadline", () => {
    assert.equal(co.selectDeadline("You must pay by 3 September 2026.").value, "3 September 2026");
    assert.equal(co.selectDeadline("The balance must be cleared by 3 September 2026.").value, "3 September 2026");
    assert.equal(co.selectDeadline("You must contact us by 3 September 2026.").value, "3 September 2026");
  });

  await t.test("generous tabular padding is not a barrier", () => {
    // The rule is on CONTENT, not on a character count. A numeric bound small
    // enough to reject "by direct debit on" would reject all of these.
    assert.equal(co.selectDeadline("Pay by:  3 September 2026").value, "3 September 2026");
    assert.equal(co.selectDeadline("Deadline .......... 3 September 2026").value, "3 September 2026");
    assert.equal(co.selectDeadline("Payment due       3 September 2026").value, "3 September 2026");
  });
});

test("tier 1c: a competing label inside the label's own span is caught", async (t) => {
  await t.test("the span starts at the label, not after it", () => {
    // With today's short literals this rarely bites. It is a precondition for
    // any gap-tolerant label, which would cover a whole clause and could hide
    // a competing label inside it.
    assert.equal(
      co.passesNoCompetingLabel({ index: 0, end: 10 }, { index: 30 }, [{ index: 5 }]),
      false,
      "a competing label at index 5 sits inside the label span 0..10 and must be seen");
  });

  await t.test("a competing label outside the span is ignored", () => {
    assert.equal(
      co.passesNoCompetingLabel({ index: 20, end: 30 }, { index: 40 }, [{ index: 5 }]),
      true);
  });
});

test("tier 1: adding governing labels can never null a bound date", async (t) => {
  // The structural property that makes tiers 2 to 4 safe to consider. Extra
  // candidates can only make governingLabel's rival check LESS likely to fire,
  // so a date that binds today cannot stop binding because the vocabulary grew.
  // Verified by growing it, not by reasoning about it.
  await t.test("every corpus date that binds today still binds with a wider vocabulary", () => {
    const before = new Map();
    CORPUS.forEach((entry) => {
      const chosen = co.selectDeadline(entry.text);
      if (chosen) before.set(entry.id, chosen.value);
    });
    assert.ok(before.size >= 7, "the corpus must still hold bound dates to check");

    const EXTRA = [
      "get in touch by", "let us know by", "hear from you by", "you have until",
      "must reach us by", "must be made by", "must do so by", "up to date by",
      "compliance date", "response date", "act by"
    ];
    co.DATE_GOVERNS.push(...EXTRA);
    try {
      const lost = [];
      before.forEach((value, id) => {
        const now = co.selectDeadline(CORPUS.find((e) => e.id === id).text);
        if (!now) lost.push(id + ": " + value + " -> null");
      });
      assert.deepEqual(lost, [], "a wider vocabulary must never remove a binding");
    } finally {
      co.DATE_GOVERNS.splice(co.DATE_GOVERNS.length - EXTRA.length, EXTRA.length);
    }
  });

  await t.test("the vocabulary is restored after that test", () => {
    assert.ok(!co.DATE_GOVERNS.includes("get in touch by"),
      "the mutation above must not leak into later tests");
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
