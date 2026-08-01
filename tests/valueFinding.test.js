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

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
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

test("dates: one definition, shared by co-location and the engine", async (t) => {
  // extractVisibleDates carried an independent copy of these patterns. The two
  // drifted the moment one was corrected: after the separator fix they
  // disagreed on four shapes, and that disagreement is what put "No clear date
  // was found." on the same card as "Check this date: 1April 2026."
  await t.test("the union finds every shape either copy used to find", () => {
    const SHAPES = [
      ["1 April 2026", "plain day first"],
      ["1April 2026", "day first, separator lost to OCR"],
      ["1st April 2026", "ordinal, previously only the engine's copy"],
      ["April 1, 2026", "month first, previously only the engine's copy"],
      ["April 1 2026", "month first without the comma"],
      ["Apr 1st, 2026", "abbreviated month with an ordinal"],
      ["01/04/2026", "numeric"]
    ];
    SHAPES.forEach(([shape, why]) => {
      assert.deepEqual(co.findDates(shape, () => true).map((v) => v.value), [shape], why);
    });
  });

  await t.test("month first keeps mandatory separators, and must", () => {
    // With \s* it reads "May 2026" as day 20 of May in year 26. A bare month
    // and year is one of the commonest things a letter writes.
    ["May 2026", "September 2026", "Period covered May 2026 to June 2026"]
      .forEach((shape) => {
        assert.deepEqual(co.findDates(shape, () => true).map((v) => v.value), [], shape);
      });
  });

  await t.test("the run-on guard survives the widening", () => {
    ["£1,04720 August 2026", "£1,047.20 August 2026", "Total 1247 August 2026",
      "Ref 8842001 May 2026", "20261 April 2026"]
      .forEach((shape) => {
        assert.deepEqual(co.findDates(shape, () => true).map((v) => v.value), [], shape);
      });
  });

  await t.test("the engine and co-location cannot disagree about a date", () => {
    // The structural guarantee. Both now read one definition, so every date the
    // engine lists must be one co-location found.
    CORPUS.forEach((entry) => {
      const listed = analyse(entry.text).structured_output.extractor_internal.visible_dates || [];
      const found = co.findDates(entry.text).map((v) => v.value);
      listed.forEach((date) => {
        assert.ok(found.includes(date),
          entry.id + ": the engine listed " + date + " and co-location did not find it");
      });
    });
  });
});

test("no card may contradict its own date field, on either path", async (t) => {
  // The defect this closes: card 4's sentence said "No clear date was found."
  // while its key point and possible_deadline both named 1April 2026, because
  // the sentence was computed from one date pattern and the field from another.
  const SAYS_NONE = /no clear (?:due )?date|no deadline clearly stated|no clear date/i;

  await t.test("across every corpus document", () => {
    const offenders = [];
    CORPUS.forEach((entry) => {
      const structured = analyse(entry.text).api_output.structured_result;
      const card = structured.cards[3];
      if (card.possible_deadline) {
        if (SAYS_NONE.test(card.simple_explanation)) {
          offenders.push(entry.id + ": text says no date, field says " + card.possible_deadline);
        } else if (!card.simple_explanation.includes(card.possible_deadline)) {
          offenders.push(entry.id + ": text omits the field's date " + card.possible_deadline);
        }
      }
      (card.key_points || []).forEach((point) => {
        const named = point.match(/\d{1,2}\s*[A-Za-z]+\s*\d{4}/);
        if (named && !card.simple_explanation.includes(named[0])) {
          offenders.push(entry.id + ": key point names " + named[0] + " but the sentence does not");
        }
      });
      if (structured.summary.main_date !== (card.possible_deadline || null)) {
        offenders.push(entry.id + ": main_date and possible_deadline differ");
      }
    });
    assert.deepEqual(offenders, []);
  });

  await t.test("the guard would catch a reintroduction", () => {
    assert.match("No clear date was found. Check the original document.", SAYS_NONE);
    assert.ok(CORPUS.length >= 30);
  });

  await t.test("the aid path names the judged date without asserting the obligation", () => {
    // The reading aid exists because Northcue is not fully trained for the
    // category, and card 1 carries the caveat. Card 4 names the date the engine
    // picked, and deliberately does NOT use the supported path's "Due by X."
    const card = analyse(byId("gov_hmrc")).api_output.structured_result.cards[3];
    assert.equal(card.simple_explanation,
      "The document shows 31 July 2026 as the date that matters. Check the original document.");
    assert.doesNotMatch(card.simple_explanation, /Due by/,
      "the aid path must not claim a deadline with supported path confidence");
  });

  await t.test("a relative timeframe falls through to the list form", () => {
    // primaryDate can hold "within 14 days", because dateParts carries
    // timeframes too, and "The document shows within 14 days as the date that
    // matters" is not a sentence.
    const card = analyse(byId("housing_letter")).api_output.structured_result.cards[3];
    assert.doesNotMatch(card.simple_explanation, /as the date that matters/);
    assert.match(card.simple_explanation, /within 14 days/);
  });

  await t.test("several dates with no judgement are still just listed", () => {
    const card = analyse(byId("bill_in_credit")).api_output.structured_result.cards[3];
    assert.match(card.simple_explanation, /These dates appear in the document/);
    assert.equal(card.possible_deadline, null);
  });
});

test("display normalisation cannot affect matching", async (t) => {
  // The optional separator recovers "1April 2026", which is the right value,
  // but the paper in the reader's hand says "1 April 2026". Normalisation
  // serves the screen-matches-paper rule rather than breaking it, and it must
  // happen at render only.
  await t.test("the reader sees the spaced form", () => {
    const run = analyse(byId("ocr_council_tax"));
    const card = run.api_output.structured_result.cards[3];
    assert.match(card.simple_explanation, /1 April 2026/);
    assert.doesNotMatch(card.simple_explanation, /1April 2026/);
    assert.equal(card.possible_deadline, "1 April 2026");
    assert.equal(run.api_output.structured_result.summary.main_date, "1 April 2026");
  });

  await t.test("extraction keeps the verbatim value", () => {
    const run = analyse(byId("ocr_council_tax"));
    assert.equal(run.structured_output.extractor_internal.deadline, "1April 2026",
      "extractor_internal must record what the document actually said");
  });

  await t.test("every matcher still runs on the original string", () => {
    // The guarantee, asserted rather than argued. If normalisation had leaked
    // upstream, co-location would be matching a string the document does not
    // contain, and these would disagree.
    const raw = byId("ocr_council_tax");
    assert.equal(co.selectDeadline(raw, () => true).value, "1April 2026",
      "co-location must still see the raw value");
    assert.ok(co.findDates(raw).some((d) => d.value === "1April 2026"),
      "findDates must still see the raw value");
    const labels = co.locateLabels(raw, co.DATE_GOVERNS);
    labels.forEach((label) => {
      // Label matching is tolerant of digit-for-letter damage, so the slice is
      // what the DOCUMENT says and phrase is the canonical form. They are not
      // equal, and must be the same LENGTH: that is the 1:1 property offsets
      // depend on.
      const slice = raw.slice(label.index, label.end);
      assert.equal(slice.length, label.phrase.length,
        "a tolerant label match must stay 1:1 in length, or every offset after it shifts");
      // Character by character, because the digit 1 stands for both i and l and
      // no single fold can express that. Each character is either the phrase's
      // own letter or a permitted confusable of it.
      const CONFUSABLE = { o: "o0", i: "i1", l: "l1", e: "e3", a: "a4", s: "s5", g: "g9", b: "b6" };
      slice.toLowerCase().split("").forEach((ch, i) => {
        const want = label.phrase[i];
        const allowed = CONFUSABLE[want] || want;
        assert.ok(allowed.includes(ch),
          "at offset " + i + " of " + JSON.stringify(label.phrase) +
          " the document has " + JSON.stringify(ch) + ", which is not " + want + " or a confusable of it");
      });
    });
  });

  await t.test("offsets are unchanged, because normalisation happens after them", () => {
    // formatDateForDisplay lengthens a string, so if it ran before matching
    // every offset after it would shift. It runs after, so nothing moves.
    assert.notEqual(co.formatDateForDisplay("1April 2026").length, "1April 2026".length);
    const raw = byId("ocr_council_tax");
    co.findDates(raw).forEach((date) => {
      assert.equal(raw.slice(date.index, date.index + date.value.length), date.value,
        "a date's offset must still address its own raw text");
    });
  });

  await t.test("it leaves anything that is not a long date alone", () => {
    ["within 14 days", "01/04/2026", "April 1, 2026", "1 April 2026", "", null]
      .forEach((value) => {
        assert.equal(co.formatDateForDisplay(value), value == null ? "" : value, JSON.stringify(value));
      });
  });

  await t.test("an undamaged corpus document is untouched by it", () => {
    const run = analyse(byId("council_tax"));
    assert.equal(run.api_output.structured_result.summary.main_date, "1 April 2026");
    assert.equal(run.structured_output.extractor_internal.deadline, "1 April 2026");
  });
});

test("money: every amount in the corpus is still found in full", async (t) => {
  // Every distinct amount across the corpus. Tightening a value pattern risks
  // losing genuine values, so this is the counterweight to the decline tests.
  // The last five are from the four non English documents added on 1 August
  // 2026, and they make a point worth keeping: an amount is £ and digits, so
  // the pattern finds every one of them regardless of the language around it.
  // Two of those documents still report money_amounts as EMPTY from the engine,
  // because detectProbableNonDocument decides they are not documents and the
  // extraction is never reached. The money was findable. It was discarded.
  const EXPECTED = [
    "£0.00", "£1,047.00", "£1,247.00", "£1,381.50", "£1,842.00", "£138.15",
    "£142.60", "£164.90", "£180.00", "£185.00", "£2,480.00", "£214.63", "£235.00",
    "£287.50", "£3,410.00", "£312.40", "£3.00", "£3.20", "£324.18", "£41.99", "£418.60",
    "£45.19", "£460.50", "£486.20", "£66.00", "£660.00", "£68.40", "£726.00",
    "£74.20", "£742.19", "£75.00", "£83.86", "£96.14",
    "£1,245.60", "£142.30", "£312.44", "£482.30",
    // From the scam corpus added 1 August 2026. The small ones matter: a £2.99
    // redelivery fee is the commonest smish figure in the UK precisely because
    // it is small enough not to be questioned.
    "£184.60", "£2.99", "£80.00"
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
