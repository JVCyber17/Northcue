// Guards the regexes that find amounts and dates in raw text.
//
// These run before co-location. Co-location decides which value a document
// MEANS; these decide what counts as a value at all. A defect here cannot be
// caught downstream, because a wrong value that parses cleanly is
// indistinguishable from a right one by the time any label is bound to it.
//
// The defect this file was opened for: MONEY had two optional tails, so it
// matched the longest well formed PREFIX of a malformed amount instead of
// rejecting it. "£1247.00" became "£124". That is not OCR damage, it is what
// plenty of UK billing systems print, and the engine asserted the wrong number
// with input_quality "good" and confidence "high".

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "value-finding-test" }
  });
}

function amounts(text) {
  return co.findAmounts(text).map((value) => value.value);
}

test("money: a malformed amount declines rather than truncating", async (t) => {
  // Every shape here previously produced a confident wrong number. Truncation
  // is the dangerous failure: declining loses an amount, asserting a prefix
  // tells an anxious reader a bailiff wants £124 when the notice says £1,247.
  const TRUNCATIONS = [
    ["£1.247.00", "£1.24", "a thousands comma read as a full stop, the commonest OCR loss on a phone photo"],
    ["£1,2O7.00", "£1", "a letter for a digit inside the number"],
    ["£1,24l.00", "£1", "the same, with l for 1"],
    ["£21A.63", "£21", "a letter mid-amount"],
    ["£1,04720", "£1,047", "a run on with no decimal point"]
  ];

  for (const [shape, wasAsserted, why] of TRUNCATIONS) {
    await t.test(shape + " declines (" + why + ")", () => {
      assert.deepEqual(amounts("Amount outstanding: " + shape), [],
        "must not assert " + wasAsserted + " from " + shape);
    });
  }

  await t.test("a letter for the FIRST digit already declined and still does", () => {
    assert.deepEqual(amounts("Amount due: £l,247.00"), []);
  });
});

test("money: unseparated thousands are read whole, not truncated", async (t) => {
  // The headline case, and not OCR damage at all.
  await t.test("£1247.00 is a single amount", () => {
    assert.deepEqual(amounts("Amount outstanding: £1247.00"), ["£1247.00"]);
  });

  await t.test("end to end, the enforcement notice states the real figure", () => {
    const text = CORPUS.find((entry) => entry.id === "bailiff_enforcement").text
      .replace(/£1,247\.00/g, "£1247.00");
    const run = analyse(text);
    assert.equal(run.api_output.structured_result.summary.main_amount, "£1247.00");
    assert.doesNotMatch(run.api_output.structured_result.cards[0].simple_explanation, /£124\b/,
      "card 1 must never state a truncated amount");
  });

  await t.test("larger unseparated amounts too", () => {
    assert.deepEqual(amounts("Total: £12470.55"), ["£12470.55"]);
    assert.deepEqual(amounts("Total: £124700"), ["£124700"]);
  });
});

test("dates: a lost space between day and month no longer hides the date", async (t) => {
  // OCR drops this space routinely and both OCR documents in the corpus show
  // it. Requiring \s+ meant they produced ZERO parseable dates, so no amount of
  // vocabulary or co-location work could reach them: there was nothing to bind.
  const RECOVERED = ["20August 2026", "3September 2026", "4May 2026", "28May 2026"];
  for (const shape of RECOVERED) {
    await t.test(shape + " is found", () => {
      assert.deepEqual(co.findDates(shape).map((v) => v.value), [shape]);
    });
  }

  await t.test("both separators are optional, not just the first", () => {
    assert.deepEqual(co.findDates("12September2026").map((v) => v.value), ["12September2026"]);
  });

  await t.test("ordinary spaced dates are unaffected", () => {
    ["12 September 2026", "1 April 2026", "28 May 2026", "5 June 2026", "31 July 2026"]
      .forEach((shape) => {
        assert.deepEqual(co.findDates(shape).map((v) => v.value), [shape], shape);
      });
  });
});

test("dates: the run-on guard, which is the whole safety of that change", async (t) => {
  // \b alone is not enough once the separator is optional. There is no word
  // boundary inside "04720", so without the lookbehind the pattern would start
  // at "20" and read a date out of the middle of an amount.
  const RUN_ONS = [
    ["£1,04720 August 2026", "a date carved out of an amount"],
    ["£1,047.20 August 2026", "the same across a decimal point"],
    ["Total 1247 August 2026", "a bare four figure number before a month"],
    ["Ref 8842001 May 2026", "a reference number before a month"],
    ["20261 April 2026", "a year run into a day"]
  ];

  for (const [shape, why] of RUN_ONS) {
    await t.test(why + ": " + shape, () => {
      assert.deepEqual(co.findDates(shape).map((v) => v.value), [],
        "a date must never be carved out of a longer number");
    });
  }

  await t.test("a genuine date after an amount on the same line still reads", () => {
    // The guard rejects a digit immediately before the day, not a digit
    // anywhere earlier on the line.
    assert.deepEqual(
      co.findDates("Amount to pay: £1,381.50 by 1 April 2026").map((v) => v.value),
      ["1 April 2026"]);
  });
});

test("money: every amount in the corpus is still found in full", async (t) => {
  // 31 distinct amounts across 30 documents. Tightening a value pattern risks
  // losing genuine values, so this is the counterweight to the decline tests.
  const EXPECTED = [
    "£0.00", "£1,047.00", "£1,247.00", "£1,381.50", "£1,842.00", "£138.15",
    "£142.60", "£180.00", "£185.00", "£2,480.00", "£214.63", "£235.00",
    "£287.50", "£3,410.00", "£3.00", "£3.20", "£324.18", "£41.99", "£418.60",
    "£45.19", "£460.50", "£486.20", "£66.00", "£660.00", "£68.40", "£726.00",
    "£74.20", "£742.19", "£75.00", "£83.86", "£96.14"
  ];

  await t.test("the corpus yields exactly the expected set", () => {
    const found = new Set();
    CORPUS.forEach((entry) => amounts(entry.text).forEach((value) => found.add(value)));
    assert.deepEqual([...found].sort(), [...EXPECTED].sort());
  });

  await t.test("trailing sentence punctuation is excluded, not swallowed", () => {
    // "£83.86, so there is nothing to pay" and "£138.15." must yield the
    // amount without the comma or stop, and must not be rejected by the new
    // right boundary.
    assert.deepEqual(amounts("in credit by £83.86, so there is nothing to pay"), ["£83.86"]);
    assert.deepEqual(amounts("The balance is £138.15."), ["£138.15"]);
  });

  await t.test("the engine and co-location agree on what an amount is", () => {
    // extractMoneyAmounts used to carry a byte-identical copy of the pattern
    // and could drift. It now delegates.
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      const engineAmounts = run.structured_output.extractor_internal.money_amounts;
      if (!Array.isArray(engineAmounts) || !engineAmounts.length) return;
      engineAmounts.forEach((value) => {
        assert.ok(amounts(entry.text).includes(value),
          entry.id + ": the engine found " + value + " and co-location did not");
      });
    });
  });
});
