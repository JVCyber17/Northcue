// The value finder, in the ten languages Northcue serves.
//
// WHY THIS IS THE FIRST PIECE OF THE MULTILINGUAL WORK AND NOT THE THIRD. A
// label can only bind a value the finder produced. Co-location, the deadline
// vocabulary, the header-date zone rule and card 4 all sit on findDates, so a
// date it cannot see is invisible to every one of them, and no amount of label
// work reaches it. Measured before this change:
//
//   pt, es, hi, gu, bn, pa    0 of 12 month names
//   pl                        1 of 12       only "marca"
//   fr                        5 of 12
//   ro                        7 of 12       by accident, "sep" matches
//                                           "septembrie"
//
// FIVE OF THE SIX GENUINE NON-ENGLISH LETTERS IN THE CORPUS PRODUCED NO DATE AT
// ALL. The Spanish water notice says "El pago debe realizarse antes del 15 de
// junio de 2026" and card 4 read "No clear date was found."
//
// NO ENGLISH DOCUMENT MOVES, and that is by construction, not by luck: the
// English month rule is kept byte for byte and the localised names are a second
// alternative beside it. Measured across all 70 documents, 13 date values
// gained and 0 lost.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const monthNames = require(path.join(__dirname, "..", "src", "utils", "monthNames"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "localised-dates" };
const analyse = (text) => runClearStepsEngine({ extractedText: text, fileMeta: META });
const byId = (id) => CORPUS.find((entry) => entry.id === id).text;
const found = (text) => co.findDates(text, () => true).map((value) => value.value);

test("a date is found in every language, written the way that language writes it", async (t) => {
  // One ordinary date per language, and the whole string must match. A partial
  // match is the failure mode MONEY had: "£1247.00" became "£124" and the
  // engine told a reader a bailiff wanted a tenth of what the notice said.
  const ORDINARY = [
    ["en  plain", "24 June 2026"],
    ["en  ordinal", "24th June 2026"],
    ["en  separator lost to OCR", "1April 2026"],
    ["en  two digit year", "28 May 26"],
    ["pl  genitive", "6 sierpnia 2026"],
    ["pl  the one with the diacritic", "4 września 2026"],
    ["pl  nominative, as a header field writes it", "1 sierpień 2026"],
    ["ro", "15 septembrie 2026"],
    ["ro  the one the English stem missed", "3 ianuarie 2026"],
    ["pt  with the de connector", "21 de agosto de 2026"],
    ["pt  ordinal marker", "1.º de março de 2026"],
    ["es  with the de connector", "15 de junio de 2026"],
    ["fr", "7 juillet 2026"],
    ["fr  accented", "3 février 2026"],
    ["hi", "24 जून 2026"],
    ["gu", "14 જુલાઈ 2026"],
    ["bn", "9 জুলাই 2026"],
    ["pa", "2 ਜੂਨ 2026"]
  ];
  for (const [why, value] of ORDINARY) {
    await t.test(why + ": " + value, () => {
      assert.deepEqual(found(value), [value], "must match, and match whole");
    });
  }
});

test("digits do not have to be ASCII", async (t) => {
  // \d is ASCII, so "२४ जून २०२६" was not a date. \p{Nd} is every decimal
  // digit, which is what a reader means by one.
  const NATIVE = [
    ["Devanagari", "२४ जून २०२६"],
    ["Gujarati", "૧૪ જુલાઈ ૨૦૨૬"],
    ["Bengali", "৯ জুলাই ২০২৬"],
    ["Gurmukhi", "੨ ਜੂਨ ੨੦੨੬"],
    ["Devanagari, numeric form", "२४/०६/२०२६"]
  ];
  for (const [script, value] of NATIVE) {
    await t.test(script + ": " + value, () => {
      assert.deepEqual(found(value), [value]);
    });
  }

  await t.test("and the numeric validator can read them", () => {
    // The pattern found "२४/०६/२०२६" and parseInt then returned NaN, so the
    // validator threw it away again. Both halves are needed.
    assert.equal(co.toAsciiDigits("२४/०६/२०२६"), "24/06/2026");
    assert.equal(co.toAsciiDigits("૧૪ જુલાઈ ૨૦૨૬"), "14 જુલાઈ 2026");
    assert.equal(co.toAsciiDigits("24 June 2026"), "24 June 2026");
  });

  await t.test("a native-digit date is shown and never resolved", () => {
    // Nothing downstream can parse one, so deadline_iso stays null and card 4
    // quotes the date from the paper. That is the honest outcome, and it is
    // strictly better than not seeing the date at all.
    const deadlineIso = require(path.join(__dirname, "..", "src", "utils", "deadlineIso"));
    assert.equal(deadlineIso.toIsoDate("२४ जून २०२६"), null);
    assert.equal(deadlineIso.unresolvableReason("२४ जून २०२६"), null,
      "and it must not claim the year is short or the order ambiguous");
  });
});

test("the dot is a date separator, and what that costs", async (t) => {
  await t.test("Poland and Romania write 24.06.2026", () => {
    assert.deepEqual(found("24.06.2026"), ["24.06.2026"]);
    assert.deepEqual(found("01.02.2026"), ["01.02.2026"]);
  });

  await t.test("a year is two digits or four, never three", () => {
    // Without this bound "1.2.345" reads as a date. {2,4} was safe while the
    // separators were / and -, because nothing writes a reference that way.
    assert.deepEqual(found("clause 1.2.345"), []);
    assert.deepEqual(found("paragraph 3.4.5"), []);
  });

  await t.test("RECORDED GAP: a dotted reference is indistinguishable from a date", () => {
    // NOT A PASSING ASSERTION DRESSED AS A GUARD. These are wrong, and they are
    // recorded rather than fixed because nothing in the STRING separates a
    // dotted reference from a dotted date. The discriminator is the word in
    // front of it, and that word is English, so putting it in the value finder
    // would make the finder language-dependent, which is the one thing it must
    // not be.
    //
    // If a real document ever carries the shape, the place to close it is a
    // competing label, not a narrower pattern.
    const KNOWN_WRONG = ["version 1.2.2026", "Version 1.2.26", "Schedule 2.1.2026"];
    KNOWN_WRONG.forEach((value) => {
      assert.notDeepEqual(co.findDates(value).map((v) => v.value), [],
        "if this now finds nothing, the gap has been closed and this test should " +
        "be rewritten to assert the correct behaviour rather than record the wrong one");
    });
  });

  await t.test("no corpus document carries a dotted date, which is why it is unfixed", () => {
    const DOTTED = /(?<![\p{L}\p{M}\p{Nd}.,/-])\p{Nd}{1,2}\.\p{Nd}{1,2}\.\p{Nd}{2,4}(?!\p{Nd})/u;
    const carrying = CORPUS.filter((entry) => DOTTED.test(entry.text)).map((e) => e.id);
    assert.deepEqual(carrying, [],
      "a document now carries the dotted form, so there IS evidence either way: " +
      JSON.stringify(carrying));
  });
});

test("what must never be read as a date", async (t) => {
  // The finder every other rule sits on. A string that is not a date and
  // matches anyway becomes a wrong fact on card 4, and no rule downstream can
  // tell it from a right one.
  const HOSTILE = {
    "reference codes": [
      "Reference: MZMZ-43713556", "Ref BH-44712", "FV/2026/118", "HG/DR/22981",
      "Claim number 00 8842 0076 1234", "Policy SF33485198", "Case 12.06.A"
    ],
    "accounts and identifiers": [
      "Account number 4471028866", "Sort code 12-34-56", "Sort code 12.34.56",
      "IBAN GB29 NWBK 6016 1331 9268 19", "UTR 4471 028866", "NI number QQ 12 34 56 C"
    ],
    "money, UK and European format": [
      "£1,247.00", "£1.247,00", "1.234.567,89", "£12.06", "GBP 1,842.00",
      "12.06 per unit", "0.06.2026"
    ],
    "meter, serial, usage": [
      "Meter serial 00 4471 028866", "Reading 12345.6 kWh", "3.9 units per day",
      "Contract 004471028866112", "Order 0044-1182-7345"
    ],
    "time, percent, version": [
      "at 14.30", "14:30 to 16.00", "rose by 12.5 per cent", "VAT at 20.0%",
      "v1.2.3", "Release 3.10.1", "v2.10.26", "s.12(3)"
    ],
    "phones, postcodes, addresses": [
      "020.8583.4242", "0333 320 122", "+44 20 8583 4242", "SW1A 1AA", "EN3 4PQ"
    ],
    "urls and network addresses": [
      "10.0.0.1", "192.168.1.1"
    ],
    "a month word with no date around it": [
      "w maju odbyla sie rozmowa", "en mayo del ano pasado", "no mes de junho",
      "les informations completes", "mars et venus", "the mayor of London",
      "January sales", "maiores de 18 anos", "18 maiores 2026", "iunie este luna",
      "24 de 2026", "de junio de 2026", "24 junio", "junio 2026"
    ],
    "a date carved out of a longer number": [
      "£1,04720 August 2026", "£1,047.20 August 2026", "Total 1247 August 2026",
      "Ref 8842001 May 2026", "20261 April 2026"
    ],
    "a bare month and year": [
      "May 2026", "September 2026", "Period covered May 2026 to June 2026"
    ]
  };

  for (const group of Object.keys(HOSTILE)) {
    await t.test(group, () => {
      HOSTILE[group].forEach((value) => {
        const hits = co.findDates(value,
          (raw) => runValidator(raw)).map((v) => v.value);
        assert.deepEqual(hits, [], JSON.stringify(value) + " is not a date");
      });
    });
  }
});

// The engine's own validator, reached through a document so the test exercises
// the real one rather than a copy of it.
function runValidator(raw) {
  const parts = co.toAsciiDigits(raw).split(/[-./]/);
  if (parts.length !== 3) return false;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  return (a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
         (a >= 1 && a <= 12 && b >= 1 && b <= 31);
}

test("a date written as one end of a period is not the date that matters", async (t) => {
  // DATE_COMPETES already carries "period", "covering" and "from", and those
  // are English. That was harmless while the finder was English too: a Spanish
  // billing period could not produce a date, so nothing could promote one.
  await t.test("every same-line range in the corpus, and they are all genuine", () => {
    const WITH_A_RANGE = {
      energy_bill: ["1 February 2026", "30 April 2026"],
      water_bill: ["1 March 2026", "31 May 2026"],
      ocr_energy_bill: ["1 February 2026", "30 April 2026"],
      spanish_water_final_notice: ["1 de febrero de 2026", "30 de abril de 2026"],
      bill_with_contacts_page: ["22 Jan 2026", "22 Apr 2026"],
      statement_with_transactions_page: ["1 April 2026", "30 April 2026"],
      spec_energy_bill_full: ["14 February 2026", "13 May 2026", "1 April 2025", "31 March 2026"],
      spec_council_tax_demand_full: ["1 April 2026", "31 March 2027"],
      spec_bilingual_en_pl_council: ["1 July 2026", "31 March 2027"],
      // NEW 3 August 2026 with the contact-shape documents. Both print a
      // billing period, which is exactly the shape this rule identifies.
      energy_bill_contacts_panel: ["14 February 2026", "13 May 2026"],
      communal_bill_debt_help_block: ["1 March 2026", "31 May 2026"]
    };
    const seen = {};
    CORPUS.forEach((entry) => {
      const range = co.datesInARange(entry.text);
      if (range.size) seen[entry.id] = Array.from(range);
    });
    assert.deepEqual(seen, WITH_A_RANGE,
      "every one of these is a billing or covering period. A new entry is either " +
      "a new document or a false identification, and the difference matters");
  });

  await t.test("the Spanish letter declines instead of naming its period start", () => {
    const signals = analyse(byId("spanish_water_final_notice"))
      .structured_output.extractor_internal.readable_unsupported_signals;
    assert.equal(signals.primaryDate, null);
    assert.ok(signals.dateMessage.includes("15 de junio de 2026"),
      "the real deadline is still LISTED, which claims nothing about what it means");
  });

  await t.test("it disqualifies and never re-selects", () => {
    // Skipping to the next candidate would name 15 June on the Spanish letter,
    // which is exactly right, and would also name "Payment received 04 Feb
    // 2026" on bill_with_contacts_page, which is a receipt. One right answer
    // bought with one new wrong assertion is not a trade this makes.
    const text = byId("bill_with_contacts_page");
    assert.ok(co.datesInARange(text).has("22 Jan 2026"), "premise: the period start");
    assert.ok(/Payment received 04 Feb 2026/.test(text),
      "premise: the date that would be promoted next is a receipt");
  });

  await t.test("a range needs a short connector and nothing else", () => {
    const notARange = [
      "Pay 1 July 2026. 3 August 2026 is when we write again.",
      "Pay by 1 July 2026 or, if you have already paid, 3 August 2026 applies.",
      "Reading on 1 July 2026 was 41882 and on 3 August 2026 was 42611"
    ];
    notARange.forEach((line) => {
      assert.equal(co.datesInARange(line).size, 0, line);
    });
    assert.equal(co.datesInARange("Period: 1 July 2026 to 31 March 2027").size, 2);
    assert.equal(co.datesInARange("Okres: 1 lipca 2026 do 31 marca 2027").size, 2);
  });
});

test("the month list itself", async (t) => {
  await t.test("nine languages, twelve months each at minimum", () => {
    const codes = Object.keys(monthNames.MONTH_NAMES);
    assert.equal(codes.length, 9, "one list per non-English language: " + codes.join(", "));
    codes.forEach((code) => {
      assert.ok(monthNames.MONTH_NAMES[code].length >= 12,
        code + " has fewer than twelve month names");
    });
  });

  await t.test("every name is reachable through findDates", () => {
    // A name in the list that the pattern cannot reach is worse than no name:
    // it reads as coverage. Spanish and Portuguese take the connector, which is
    // how those two languages write every date.
    const CONNECTOR = { es: true, pt: true };
    Object.keys(monthNames.MONTH_NAMES).forEach((code) => {
      monthNames.MONTH_NAMES[code].forEach((name) => {
        const value = CONNECTOR[code] ? "24 de " + name + " de 2026" : "24 " + name + " 2026";
        assert.deepEqual(found(value), [value],
          code + " month name unreachable: " + JSON.stringify(name));
      });
    });
  });

  await t.test("longest first, so a short name cannot shadow a longer one", () => {
    // "mar" would otherwise truncate "marca" and "março".
    assert.deepEqual(found("24 marca 2026"), ["24 marca 2026"]);
    assert.deepEqual(found("24 de março de 2026"), ["24 de março de 2026"]);
    assert.deepEqual(found("24 septembrie 2026"), ["24 septembrie 2026"]);
    assert.deepEqual(found("24 de septiembre de 2026"), ["24 de septiembre de 2026"]);
  });
});

// A letter that reaches the fully supported path, so these assertions exercise
// the ENGINE rather than co-location on its own.
function councilLetter(body) {
  return [
    "Meadowbank Borough Council",
    "Council Tax Team",
    "Reference: MB-44712",
    "",
    "Dear Mr Vaidya",
    "",
    body,
    "",
    "If you have already paid, please ignore this notice."
  ].join("\n");
}
const engineDeadline = (body) => runClearStepsEngine({
  extractedText: councilLetter(body), fileMeta: META
}).structured_output.extractor_internal.deadline;

test("the engine's own numeric validator, not a copy of it", async (t) => {
  // ADDED AFTER A MUTATION. Every assertion above about the dot and about
  // native digits went through co.findDates with a locally written validator,
  // so breaking isPlausibleNumericDate in the engine changed nothing any test
  // could see. Two mutations survived on that: splitting on [-/] instead of
  // [-./], and dropping toAsciiDigits. Both are caught here.
  await t.test("a dotted date survives the engine's validator", () => {
    assert.equal(engineDeadline("You must pay the balance by 24.06.2026."), "24.06.2026",
      "the validator splits on [-./]; without the dot it returns one part and rejects");
  });

  await t.test("a native-digit date survives the engine's validator", () => {
    assert.equal(engineDeadline("You must pay the balance by २४/०६/२०२६."), "२४/०६/२०२६",
      "parseInt returns NaN on a Devanagari digit, so the pattern finds it and " +
      "the validator throws it away again unless toAsciiDigits runs first");
  });

  await t.test("and a native-digit long date, which takes no validator at all", () => {
    assert.equal(engineDeadline("You must pay the balance by २४ जून २०२६."), "२४ जून २०२६");
  });
});

test("one definition, still", async (t) => {
  await t.test("the engine's scans read co-location's patterns", () => {
    // extractDeadline and extractAppointmentDate each carried their own copy,
    // and both were already behind: no ordinals, no optional separator. With
    // nine more languages in one copy and not the others, card 4 would list a
    // date the deadline scan had never heard of.
    const sources = co.DATE_PATTERN_SOURCES;
    ["long", "monthFirst", "numeric"].forEach((kind) => {
      assert.ok(sources[kind] && sources[kind].source, kind + " must be exported");
      assert.doesNotThrow(() => new RegExp(sources[kind].source, sources[kind].flags));
    });
  });

  await t.test("the keyword scan reads a localised date too", () => {
    // ADDED AFTER A MUTATION. Restoring the engine's own older long pattern
    // broke nothing any test could see, because every localised deadline in the
    // corpus is bound by co-location or promoted by the reading aid, and
    // neither route touches this loop.
    //
    // "Failure to pay ... by" is the shape that isolates it: co-location
    // declines, because "to pay" is an AMOUNT label and no date label reaches
    // the date, so the only route left is the engine's own scan.
    const line = "Failure to pay the outstanding amount by 6 sierpnia 2026 will lead to further action.";
    assert.equal(co.selectDeadline(councilLetter(line), () => true), null,
      "premise: co-location must decline, or this tests the wrong path");
    assert.equal(engineDeadline(line), "6 sierpnia 2026",
      "the engine's keyword scan must read the same date definition co-location does");
  });

  await t.test("every date the engine lists, co-location found", () => {
    CORPUS.forEach((entry) => {
      const listed = analyse(entry.text).structured_output.extractor_internal.visible_dates || [];
      const seen = co.findDates(entry.text).map((v) => v.value);
      listed.forEach((date) => {
        assert.ok(seen.includes(date),
          entry.id + ": the engine listed " + date + " and co-location did not find it");
      });
    });
  });
});
