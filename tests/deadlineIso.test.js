// Guards deadline_iso: the deadline as a calendar day a machine can compare
// against today, or null.
//
// Nothing renders this field. It exists so the decision about WHETHER a date
// may be reasoned about is made once, by the layer that knows what the document
// is, rather than by whatever later reads main_date and assumes a string is a
// date. So the tests that matter most here are the ones that assert null.
//
// EVERY GATE IS TESTED ON ITS OWN. A corpus document exercises one gate at a
// time by accident, and several gates overlap on the documents that happen to
// exercise them: the scam path already nulls the deadline, so the
// verification_only gate cannot be observed end to end at all. Testing
// deadlineIsoFor directly on named facts is what makes a change that opens one
// gate show up as a failing test naming that gate.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { deadlineIsoFor, toIsoDate, isRelativeTimeframe, unresolvableReason } =
  require(path.join(__dirname, "..", "src", "utils", "deadlineIso"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { sanitizeStructuredResult } = require(path.join(__dirname, "..", "src", "utils", "validateStructuredResult"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "iso-test" }
  });
}

// Everything open, so a single named fact is what each gate test changes.
const OPEN = {
  garbledByOcr: false,
  processingMode: "normal",
  multiLetterState: null,
  deadline: "3 September 2026"
};

// ------------------------------------------------------------ the gates

test("each gate closes on its own", async (t) => {
  await t.test("with every gate open the date converts", () => {
    assert.equal(deadlineIsoFor(OPEN), "2026-09-03", "premise for every test below");
  });

  await t.test("gate 1, garbled: a damaged document yields no arithmetic", () => {
    assert.equal(deadlineIsoFor({ ...OPEN, garbledByOcr: true }), null);
  });

  await t.test("gate 2, verification only: a suspected scam yields none", () => {
    assert.equal(deadlineIsoFor({ ...OPEN, processingMode: "verification_only" }), null);
  });

  await t.test("gate 2 does not close on the other modes", () => {
    ["normal", "caution", "unsupported"].forEach((mode) => {
      assert.equal(deadlineIsoFor({ ...OPEN, processingMode: mode }), "2026-09-03", mode);
    });
  });

  await t.test("gate 3, fused: dates from more than one letter yield none", () => {
    assert.equal(deadlineIsoFor({ ...OPEN, multiLetterState: "fused" }), null);
  });

  await t.test("gate 3 does not close on first_only", () => {
    // first_only reads one letter and says so. The date belongs to that letter.
    assert.equal(deadlineIsoFor({ ...OPEN, multiLetterState: "first_only" }), "2026-09-03");
  });

  await t.test("gate 4, relative period: a period is not a date", () => {
    ["within 14 days", "within 1 month", "today", "tomorrow", "next week", "next month"]
      .forEach((value) => {
        assert.equal(deadlineIsoFor({ ...OPEN, deadline: value }), null, value);
      });
  });

  await t.test("gate 5, one reading only: anything ambiguous yields none", () => {
    ["03/06/2026", "28 May 26", "1 April 226"].forEach((value) => {
      assert.equal(deadlineIsoFor({ ...OPEN, deadline: value }), null, value);
    });
  });

  await t.test("a missing deadline is simply null, not an error", () => {
    [null, undefined, "", "   "].forEach((value) => {
      assert.equal(deadlineIsoFor({ ...OPEN, deadline: value }), null, JSON.stringify(value));
    });
  });
});

// ----------------------------------------------------------- the parsing

test("the month must be named, never numbered", async (t) => {
  // isPlausibleNumericDate accepts BOTH readings of a numeric date and chooses
  // neither, deliberately. Echoing the string back is honest, because the
  // reader can check it against the paper. Computing from it is not: 3 June and
  // 6 March are 95 days apart.
  await t.test("both readings of a numeric date are refused", () => {
    ["03/06/2026", "06/03/2026", "12/11/26", "1/2/26", "03-06-2026"].forEach((value) => {
      assert.equal(toIsoDate(value), null, value);
    });
  });

  await t.test("a named month in either order converts", () => {
    assert.equal(toIsoDate("3 September 2026"), "2026-09-03");
    assert.equal(toIsoDate("September 3, 2026"), "2026-09-03");
    assert.equal(toIsoDate("Sept 3 2026"), "2026-09-03");
  });

  await t.test("an ordinal converts", () => {
    assert.equal(toIsoDate("1st April 2026"), "2026-04-01");
    assert.equal(toIsoDate("22nd December 2026"), "2026-12-22");
    assert.equal(toIsoDate("April 1st, 2026"), "2026-04-01");
  });

  await t.test("every month name and abbreviation the extractor can produce", () => {
    const EXPECTED = {
      January: "01", Jan: "01", February: "02", Feb: "02", March: "03", Mar: "03",
      April: "04", Apr: "04", May: "05", June: "06", Jun: "06", July: "07", Jul: "07",
      August: "08", Aug: "08", September: "09", Sept: "09", Sep: "09",
      October: "10", Oct: "10", November: "11", Nov: "11", December: "12", Dec: "12"
    };
    Object.entries(EXPECTED).forEach(([name, month]) => {
      assert.equal(toIsoDate("5 " + name + " 2026"), "2026-" + month + "-05", name);
    });
  });

  await t.test("a word that merely starts like a month is refused", () => {
    // The extractor's pattern is (?:jan|feb|...)[a-z]*, so it matches these.
    // Parsing must not.
    ["1 Mayor 2026", "1 Janx 2026", "1 Marchioness 2026", "1 Augment 2026"]
      .forEach((value) => assert.equal(toIsoDate(value), null, value));
  });
});

test("a year with two readings, or none, is refused", async (t) => {
  await t.test("a two digit year", () => {
    // 1926 or 2026, and 1999 or 2099. The engine accepts both today.
    assert.equal(toIsoDate("28 May 26"), null);
    assert.equal(toIsoDate("5 April 99"), null);
  });

  await t.test("a three digit year", () => {
    assert.equal(toIsoDate("1 April 226"), null);
  });

  await t.test("four digits convert, including one far from now", () => {
    assert.equal(toIsoDate("1 April 1999"), "1999-04-01");
    assert.equal(toIsoDate("1 April 2026"), "2026-04-01");
  });
});

test("a day that does not exist in that month is refused", async (t) => {
  await t.test("31 February and 31 September roll forward without this", () => {
    assert.equal(toIsoDate("31 February 2026"), null);
    assert.equal(toIsoDate("31 September 2026"), null);
    assert.equal(toIsoDate("30 February 2026"), null);
  });

  await t.test("29 February is refused in a common year and kept in a leap year", () => {
    assert.equal(toIsoDate("29 February 2026"), null);
    assert.equal(toIsoDate("29 February 2028"), "2028-02-29");
  });

  await t.test("the ends of a month convert", () => {
    assert.equal(toIsoDate("31 January 2026"), "2026-01-31");
    assert.equal(toIsoDate("30 April 2026"), "2026-04-30");
  });
});

test("the value is matched end to end, never picked out of a longer string", async (t) => {
  // Anchoring is what stops a sentence being parsed as though it were a date.
  await t.test("a date inside a sentence is refused", () => {
    ["Due by 3 September 2026.", "3 September 2026 at the latest", "on 3 September 2026"]
      .forEach((value) => assert.equal(toIsoDate(value), null, value));
  });

  await t.test("surrounding whitespace alone is tolerated", () => {
    assert.equal(toIsoDate("  3 September 2026  "), "2026-09-03");
  });

  await t.test("a relative period is recognised as one", () => {
    assert.equal(isRelativeTimeframe("within 14 days"), true);
    assert.equal(isRelativeTimeframe("today"), true);
    assert.equal(isRelativeTimeframe("3 September 2026"), false);
    assert.equal(isRelativeTimeframe("within 14 days of service"), false,
      "only a whole value, so a longer clause is judged by the parser instead");
  });
});

test("the output is a calendar day, not an instant", () => {
  // No time and no zone. A deadline printed on paper is a day, and a zone here
  // would bake in a decision that belongs wherever "today" is decided.
  assert.match(toIsoDate("3 September 2026"), /^\d{4}-\d{2}-\d{2}$/);
});

// ------------------------------------------------------- through the engine

test("the corpus, end to end", async (t) => {
  const iso = {};
  CORPUS.forEach((entry) => {
    iso[entry.id] = analyse(entry.text).api_output.structured_result.summary.deadline_iso;
  });

  await t.test("exactly the documents whose date has one reading carry one", () => {
    const EXPECTED = {
      // NEW 3 August 2026 with the contact-shape documents. Only the energy
      // bill resolves: the communal bill is on the reading aid, and the
      // caseworker letter states visit dates rather than a deadline.
      energy_bill_contacts_panel: "2026-06-04",
      // TEN READING-AID DOCUMENTS LEFT THIS MAP on 3 August 2026, deliberately.
      // deadlineIsoFor now refuses that path: it GUESSES its date, taking the
      // first no competing label has claimed, and deadline_iso exists to be
      // reasoned about. They still state their date to the reader.
      //
      // Nine of the ten had the RIGHT date and lose a passed-deadline warning
      // with this. tests/deadlinePassed.test.js names all nine and asserts both
      // halves: the date is still stated, and it is no longer offered for
      // reasoning. The fix for them is to make the aid path adjudicate, not to
      // let a guess back through a gate labelled certainty.
      council_tax: "2026-04-01", energy_bill: "2026-05-28", water_bill: "2026-06-30", appointment_nhs: "2026-07-01",
      bailiff_enforcement: "2026-09-03", eviction_possession: "2026-09-12",
      court_fine: "2026-09-30",
      multi_document_split: "2026-05-28",
      arrears_before_clause: "2026-09-03", arrears_past_and_future: "2026-09-03",
      // Recovered by F3: refused as scams, so their dates were nulled with the
      // rest of the reading.
      genuine_post_office_card_payment: "2026-09-03",
      // The two international-number letters that carry an English deadline
      // sentence. Both read correctly: the phone defect costs them their
      // contact number, not their date, and pinning that here is what says so.
      intl_energy_bill_plus44: "2026-08-06",
      intl_water_arrears_00_prefix: "2026-08-28",
      // NEW WITH P1, 2 August 2026, and the point of P1. This letter was fused
      // by the repeated-letterhead rule and every fact was thrown away. It now
      // yields its renewal date. Card 4 hedges it as "the date that matters"
      // rather than "Due by", which is right: the letter says "You do not need
      // to do anything", and card 3 says exactly that.
      // Spec-anchored, Track 2.
      spec_energy_bill_full: "2026-06-04",
      spec_council_tax_demand_full: "2026-04-01",
      spec_bilingual_en_pl_council: "2026-07-01",
      // FIXED 2 August 2026. These two were pinned at 2026-06-12 and 2026-06-05,
      // the LETTER dates, because the greeting zone and extractHeaderDate were
      // both English and the first date in the document won. They now name the
      // APPOINTMENT, which is a month later and is the only date that matters
      // to a patient.
    };
    const found = {};
    Object.entries(iso).forEach(([id, value]) => { if (value) found[id] = value; });
    assert.deepEqual(found, EXPECTED);
  });

  await t.test("the garble gate reads the field, not the branch", () => {
    // THE case this gate exists for. ocr_council_tax is garbled AND on the
    // reading-aid path, because buildExtraction tests the aid path first, so
    // the garble branch never runs on it. It shows a date the engine has itself
    // judged too damaged to trust. A gate written as "not the garbled branch"
    // would let this through.
    const run = analyse(byId("ocr_council_tax"));
    assert.equal(run.structured_output.trust_internal.garbled_by_ocr, true, "premise");
    assert.ok(run.structured_output.extractor_internal.readable_unsupported_signals,
      "premise: the aid path claimed it, so the garble branch did not run");
    assert.equal(run.api_output.structured_result.summary.main_date, "1 April 2026",
      "premise: the date IS shown to the reader");
    assert.equal(run.api_output.structured_result.summary.deadline_iso, null,
      "and it is still refused for arithmetic");
  });

  await t.test("a period where a date belongs is refused", () => {
    const run = analyse(byId("housing_letter"));
    assert.equal(run.api_output.structured_result.summary.main_date, "within 14 days", "premise, D-6");
    assert.equal(run.api_output.structured_result.summary.deadline_iso, null);
  });

  await t.test("a fused upload is refused", () => {
    ["multi_document", "multi_document_greetings"].forEach((id) => {
      const run = analyse(byId(id));
      assert.equal(run.structured_output.extractor_internal.multi_letter_state, "fused", id);
      assert.equal(run.api_output.structured_result.summary.deadline_iso, null, id);
    });
  });

  await t.test("every garbled document is refused", () => {
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      if (!run.structured_output.trust_internal.garbled_by_ocr) return;
      assert.equal(run.api_output.structured_result.summary.deadline_iso, null, entry.id);
    });
  });

  await t.test("every value is a real ISO day", () => {
    Object.entries(iso).forEach(([id, value]) => {
      if (value === null) return;
      assert.match(value, /^\d{4}-\d{2}-\d{2}$/, id);
      assert.equal(new Date(value + "T00:00:00Z").toISOString().slice(0, 10), value, id);
    });
  });
});

test("a date with no single reading says which part is unsettled", async (t) => {
  // These assertions REPLACE the ones that pinned the defect. D-9 and D-10 are
  // now closed on the reader-facing side: the value is still shown verbatim,
  // because the person holding the letter can resolve what the engine cannot,
  // and the key point names the part that could not be settled instead of
  // saying only "check this date".
  const CASES = [
    ["ambiguous_numeric_date", "03/06/2026", "3 June or 6 March, 95 days apart",
      "The day and the month could be either way round. Check the original document: 03/06/2026."],
    ["short_year_date", "28 May 26", "2026 or 1926",
      "The year is not written in full. Check the original document: 28 May 26."]
  ];

  for (const [id, shown, why, caveat] of CASES) {
    await t.test(id + ": " + shown + " could be " + why, () => {
      const result = analyse(byId(id)).api_output.structured_result;
      assert.equal(result.summary.main_date, shown, "still shown verbatim");
      assert.equal(result.summary.deadline_iso, null, "still refused for arithmetic");
      assert.equal(result.cards[3].simple_explanation, "Due by " + shown + ".",
        "the answer quotes the paper, which is what the reader checks against");
      assert.deepEqual(result.cards[3].key_points, [caveat]);
    });
  }

  await t.test("the caveat replaces the ordinary key point rather than joining it", () => {
    // Both sentences end by pointing at the original document, so keeping both
    // would say it twice and cost a line at phone width.
    CASES.forEach(([id]) => {
      const points = analyse(byId(id)).api_output.structured_result.cards[3].key_points;
      assert.equal(points.length, 1, id);
      assert.doesNotMatch(points[0], /Check this date on the original document/, id);
    });
  });

  await t.test("a resolvable date keeps the ordinary key point", () => {
    assert.deepEqual(analyse(byId("council_tax")).api_output.structured_result.cards[3].key_points,
      ["Check this date on the original document: 1 April 2026."]);
  });

  await t.test("neither is gated for a reason about the document", () => {
    // If either became garbled or verification_only the null would stop being
    // evidence about the VALUE, and these documents would stop testing D-9 and
    // D-10 at all.
    CASES.forEach(([id]) => {
      const trust = analyse(byId(id)).structured_output.trust_internal;
      assert.equal(trust.garbled_by_ocr, false, id);
      assert.notEqual(trust.processing_mode, "verification_only", id);
    });
  });
});

test("which part is unsettled, decided on the value alone", async (t) => {
  await t.test("both numbers could be the day", () => {
    ["03/06/2026", "06/03/2026", "12/11/26", "1/2/26", "03-06-2026"].forEach((value) => {
      assert.equal(unresolvableReason(value), "ambiguous_order", value);
    });
  });

  await t.test("a numeric date with only one reading claims no ambiguity", () => {
    // 25 cannot be a month. Saying "could be either way round" here would be a
    // false alarm, and toIsoDate still declines it for its own reason.
    assert.equal(unresolvableReason("25/06/2026"), null);
    assert.equal(toIsoDate("25/06/2026"), null, "premise: still not converted");
  });

  await t.test("a short year is reported as a short year", () => {
    ["28 May 26", "5 April 99", "1 April 226", "May 28 26"].forEach((value) => {
      assert.equal(unresolvableReason(value), "incomplete_year", value);
    });
  });

  await t.test("order outranks year when a value has both", () => {
    // The two readings of 12/11 are 335 days apart; a wrong century is not a
    // date anyone acts on by mistake.
    assert.equal(unresolvableReason("12/11/26"), "ambiguous_order");
  });

  await t.test("everything else is null, including the other ways a date declines", () => {
    ["3 September 2026", "September 3, 2026", "1st April 2026",
     "1 Mayor 2026", "31 February 2026", "within 14 days", "today",
     "", "   ", null, undefined].forEach((value) => {
      assert.equal(unresolvableReason(value), null, JSON.stringify(value));
    });
  });
});

test("a card may never assert a deadline it cannot resolve without saying so", async (t) => {
  // The guard against this class reappearing on a date shape nobody has thought
  // of yet. It is generative rather than a list: every shape below goes through
  // the whole engine, and any that ends up with an unresolvable date under an
  // unqualified "Due by" fails here.
  const DAYS = ["1", "03", "12", "25", "28"];
  const MONTHS = ["06", "11", "May", "September", "Mayor"];
  const YEARS = ["26", "99", "226", "2026"];
  const SHAPES = [];
  DAYS.forEach((d) => MONTHS.forEach((m) => YEARS.forEach((y) => {
    SHAPES.push(/^\d+$/.test(m) ? d + "/" + m + "/" + y : d + " " + m + " " + y);
  })));

  const letter = (line) => [
    "Hounslow Borough Council", "Council Tax Recovery", "Reference: CT-90114",
    "", "Dear Occupier", "", "Amount to pay: £486.20", line,
    "", "Contact the recovery team on 020 8583 4242."
  ].join("\n");

  await t.test(SHAPES.length + " generated date shapes, none asserted unqualified", () => {
    const offenders = [];
    SHAPES.forEach((shape) => {
      const result = analyse(letter("Please pay by " + shape + ".")).api_output.structured_result;
      const shown = result.summary.main_date;
      if (!shown) return;
      const reason = unresolvableReason(shown);
      if (!reason) return;
      const points = (result.cards[3].key_points || []).join(" ");
      const named = reason === "ambiguous_order"
        ? /could be either way round/.test(points)
        : /not written in full/.test(points);
      if (!named) offenders.push(shape + " -> " + JSON.stringify(result.cards[3]));
    });
    assert.deepEqual(offenders, [],
      "a card asserted a deadline whose value has no single reading, without naming why");
  });

  await t.test("the sweep is actually reaching unresolvable dates", () => {
    // Without this the test above passes trivially if the engine stops finding
    // any of these shapes at all.
    const reached = SHAPES.filter((shape) => {
      const shown = analyse(letter("Please pay by " + shape + ".")).api_output.structured_result.summary.main_date;
      return shown && unresolvableReason(shown);
    });
    assert.ok(reached.length >= 20,
      "only " + reached.length + " of " + SHAPES.length + " shapes reached the card");
  });

  await t.test("and across the corpus", () => {
    CORPUS.forEach((entry) => {
      const result = analyse(entry.text).api_output.structured_result;
      const shown = result.summary.main_date;
      if (!shown || !unresolvableReason(shown)) return;
      assert.match((result.cards[3].key_points || []).join(" "),
        /could be either way round|not written in full/, entry.id);
    });
  });
});

test("nothing renders it", async (t) => {
  await t.test("no card text carries an ISO date on any corpus document", () => {
    CORPUS.forEach((entry) => {
      const result = analyse(entry.text).api_output.structured_result;
      if (!result.summary.deadline_iso) return;
      result.cards.forEach((card) => {
        const text = [card.title, card.simple_explanation, card.read_aloud_text]
          .concat(card.key_points || []).join(" ");
        assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}/,
          entry.id + " card " + card.card_number + " renders an ISO date: " + text);
      });
    });
  });

  await t.test("main_date still reads exactly as the paper writes it", () => {
    // The whole point of a separate field: the reader's date is untouched.
    assert.equal(analyse(byId("council_tax")).api_output.structured_result.summary.main_date,
      "1 April 2026");
    assert.equal(analyse(byId("bailiff_enforcement")).api_output.structured_result.summary.main_date,
      "3 September 2026");
  });
});

test("the AI pass cannot drop it or set it", async (t) => {
  // sanitizeStructuredResult rebuilds the summary from a fixed key list, so a
  // field not named there does not survive the AI pass at all: present on every
  // non-English document, where the language gate skips the provider, and
  // silently absent on English ones. That is the silent-drop shape
  // jsonFieldParity.test.js guards on the request side.
  const fallback = analyse(byId("council_tax")).api_output.structured_result;

  await t.test("premise: the rules output carries one", () => {
    assert.equal(fallback.summary.deadline_iso, "2026-04-01");
  });

  await t.test("it survives a candidate that omits it", () => {
    const candidate = JSON.parse(JSON.stringify(fallback));
    delete candidate.summary.deadline_iso;
    const out = sanitizeStructuredResult(candidate, fallback);
    assert.equal(out.summary.deadline_iso, "2026-04-01");
  });

  await t.test("a candidate cannot set it to a date of its own", () => {
    // It is a rules judgement made behind five gates that read trust and
    // extraction state the model never sees. The model cannot re-derive it and
    // must not be able to assert it.
    const candidate = JSON.parse(JSON.stringify(fallback));
    candidate.summary.deadline_iso = "2026-12-25";
    const out = sanitizeStructuredResult(candidate, fallback);
    assert.equal(out.summary.deadline_iso, "2026-04-01");
  });

  await t.test("a candidate cannot invent one where the gates refused", () => {
    const garbled = analyse(byId("ocr_council_tax")).api_output.structured_result;
    assert.equal(garbled.summary.deadline_iso, null, "premise");
    const candidate = JSON.parse(JSON.stringify(garbled));
    candidate.summary.deadline_iso = "2026-04-01";
    assert.equal(sanitizeStructuredResult(candidate, garbled).summary.deadline_iso, null);
  });
});

// ---------------------------------------------------------------------------
// The same calendar day, written two ways.
//
// validateDatesComeFromTheEngine compared date strings literally, so a document
// printing "Bill date: 22 Apr 2026" and a model writing "22 April 2026" looked
// like an invention and the whole response was thrown away. Measured on the
// restored prose path, that abbreviation mismatch was the single most common
// non-guard reason a reader saw the floor instead of the prose, and it cost
// them all six cards over a month name.
//
// canonicalNamedDate collapses the month spelling and NOTHING else, because the
// caller deliberately rejects an ISO reformat: those fields quote the paper.
// ---------------------------------------------------------------------------

test("canonicalNamedDate collapses a month spelling and nothing else", async (t) => {
  const { canonicalNamedDate } = require(path.join(__dirname, "..", "src", "utils", "deadlineIso"));

  await t.test("an abbreviation and its full form are the same day", () => {
    assert.equal(canonicalNamedDate("22 Apr 2026"), canonicalNamedDate("22 April 2026"));
    assert.equal(canonicalNamedDate("22 Jan 2026"), canonicalNamedDate("22 January 2026"));
    assert.equal(canonicalNamedDate("3 Sept 2026"), canonicalNamedDate("3 September 2026"));
  });

  await t.test("month-first and day-first agree", () => {
    assert.equal(canonicalNamedDate("Sept 3, 2026"), canonicalNamedDate("3 September 2026"));
  });

  await t.test("ISO returns null, so it is still compared literally", () => {
    // This is what keeps the deliberate ISO rejection alive. If this ever
    // returns a value, "2026-09-03" starts matching "3 September 2026" and a
    // guard is lost silently.
    assert.equal(canonicalNamedDate("2026-09-03"), null);
  });

  await t.test("a SLASH date now canonicalises, and ISO still does not", () => {
    // CHANGED 5 AUGUST 2026, after a communal bill printing "01/05/26" was
    // rejected twice in production because the model wrote "1 May 2026".
    //
    // The two are not the same case and the asymmetry is the point: a slash
    // date is PRINTED ON THE LETTER, so expanding it is reading. An ISO string
    // is printed nowhere, so producing one is inventing.
    assert.equal(canonicalNamedDate("01/05/26"), "1 may 2026");
    assert.equal(canonicalNamedDate("31/05/26"), "31 may 2026");
    assert.equal(canonicalNamedDate("1/5/2026"), "1 may 2026");
    assert.equal(canonicalNamedDate("03/06/2026"), "3 june 2026");
    assert.equal(canonicalNamedDate("01/05/26"), canonicalNamedDate("1 May 2026"),
      "the exact pair production rejected");
  });

  await t.test("an impossible slash date returns null rather than guessing", () => {
    assert.equal(canonicalNamedDate("32/05/26"), null, "no such day");
    assert.equal(canonicalNamedDate("01/13/26"), null, "no such month");
  });

  await t.test("a two digit year returns null, and a non-month returns null", () => {
    assert.equal(canonicalNamedDate("28 May 26"), null, "two readings a century apart");
    assert.equal(canonicalNamedDate("1 Mayor 2026"), null, "parses shape-wise, is not a month");
  });
});

test("the invented-date guard, after the abbreviation fix", async (t) => {
  // REWRITTEN 5 AUGUST 2026, when the guard was demoted from reject to repair.
  // "Refused" now means the SENTENCE is removed from served output, not that
  // the whole result is discarded. The protection is the same, asserted on
  // what a reader receives; the blast radius is one sentence, not six cards.
  const { sanitizeStructuredResultWithVerdict } =
    require(path.join(__dirname, "..", "src", "utils", "validateStructuredResult"));
  const { runClearStepsEngine } =
    require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
  const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

  const source = CORPUS.find((entry) => entry.id === "bill_with_contacts_page").text;
  const fallback = runClearStepsEngine({
    extractedText: source,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "dates" }
  }).api_output.structured_result;

  const withSentence = (sentence) => {
    const candidate = JSON.parse(JSON.stringify(fallback));
    candidate.cards[0].simple_explanation = sentence;
    return sanitizeStructuredResultWithVerdict(candidate, fallback, source);
  };
  const servedAnswer = (verdict) => verdict.result.cards[0].simple_explanation;

  await t.test("expanding the document's own abbreviation is not an invention", () => {
    const spelled = "This is an electricity bill dated 22 April 2026.";
    const verdict = withSentence(spelled);
    assert.equal(verdict.rejected, false);
    assert.equal(servedAnswer(verdict), spelled, "the expansion was repaired away");
    const range = "The bill covers usage from 22 January 2026 to 22 April 2026.";
    assert.equal(servedAnswer(withSentence(range)), range,
      "both dates are printed on the letter in abbreviated form");
  });

  await t.test("an ISO reformat is still refused, per sentence", () => {
    const verdict = withSentence("The bill is dated 2026-04-22.");
    assert.equal(verdict.rejected, false, "one sentence must not cost six cards");
    assert.ok(!servedAnswer(verdict).includes("2026-04-22"),
      "the paper says 22 Apr 2026 and an ISO string is not what the paper says");
    assert.ok(verdict.repairs.some((r) => /2026-04-22/.test(r)), "the repair is logged");
  });

  await t.test("a calculated date is still refused, per sentence", () => {
    // The case the guard exists for: a date on neither the paper nor the
    // engine's output, arrived at by adding days to something.
    const verdict = withSentence("Payment is due by 25 July 2026.");
    assert.equal(verdict.rejected, false);
    assert.ok(!servedAnswer(verdict).includes("25 July 2026"));
    assert.equal(servedAnswer(verdict), fallback.cards[0].simple_explanation,
      "an emptied answer takes the engine's own answer, never a guess");
  });
});
