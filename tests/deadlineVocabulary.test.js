// Guards the deadline label vocabulary: which phrases the engine accepts as
// "this date is the deadline", and, just as importantly, which text they must
// not match.
//
// The vocabulary is the one place where adding a phrase is cheap and adding a
// wrong phrase is expensive. A missing entry costs a null deadline, which the
// cards already have honest wording for. A loose entry promotes a background
// date to a headline obligation, which is the failure shape D-1 records: the
// bare "before" in extractDeadline turns "Your tenancy began before 1 April
// 2024" into a deadline. So every entry here is tested twice, once for what it
// recovers and once for what it must leave alone.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function isPlausibleNumericDate(dateStr) {
  const parts = dateStr.split(/[-\/]/);
  if (parts.length !== 3) return false;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  return (a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
         (a >= 1 && a <= 12 && b >= 1 && b <= 31);
}

function deadline(text) {
  const found = co.selectDeadline(text, isPlausibleNumericDate);
  return found ? found.value : null;
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// Long enough that the engine takes a real path rather than a short-input one.
function notice(body) {
  return [
    "Hounslow Borough Council", "Environmental Health team", "Reference: EH-4471028",
    "", "Dear Occupier", ""
  ].concat(body).concat([
    "", "If you have any questions please contact the team named above."
  ]).join("\n");
}

// --------------------------------------------------------------- tier 2

test("statutory notices state a date with no verb at all", async (t) => {
  // A compliance date is a field, not a sentence. Nothing in the vocabulary
  // before this could reach one, because every other entry needs a verb.
  const SHAPES = [
    ["colon", "Compliance date: 3 September 2026", "3 September 2026"],
    ["tabular padding", "Compliance date          3 September 2026", "3 September 2026"],
    ["dotted leader", "Compliance date .......... 3 September 2026", "3 September 2026"],
    ["reversed wording", "Date for compliance: 12 September 2026", "12 September 2026"],
    ["consultation", "Response date: 5 June 2026", "5 June 2026"],
    ["obligation verb", "You must act by 3 September 2026.", "3 September 2026"],
    ["obligation verb, short form", "Please act by 30 September 2026.", "30 September 2026"],
    ["label on the line above", "Compliance date\n3 September 2026", "3 September 2026"]
  ];

  for (const [why, line, expected] of SHAPES) {
    await t.test(why + ": " + JSON.stringify(line), () => {
      assert.equal(deadline(notice([line])), expected);
    });
  }
});

test("a tier 2 entry never matches inside a longer word", async (t) => {
  // locateLabels compiles a phrase as a bare substring, so these are real
  // matches, not hypothetical ones. Every line below states no obligation and
  // must yield no deadline.
  const HAZARDS = [
    ["act by inside contact by", "You may contact by telephone on 3 September 2026."],
    ["act by inside exact by", "The exact by-law applies from 3 September 2026."],
    ["act by inside impact by", "This will impact by a small amount from 3 September 2026."],
    ["response date inside response dated", "The response dated 3 July 2026 was received."],
    ["compliance date inside compliance dates", "Non compliance dates back to 3 July 2026."]
  ];

  for (const [why, line] of HAZARDS) {
    await t.test(why, () => {
      assert.equal(deadline(notice([line])), null,
        "matched inside a longer word: " + JSON.stringify(line));
    });
  }

  await t.test("the boundary does not cost the recovery it protects", () => {
    // The same five entries still match when they stand alone, which is what
    // makes the boundary a fix rather than a removal.
    assert.equal(deadline(notice(["Compliance date: 3 September 2026"])), "3 September 2026");
    assert.equal(deadline(notice(["Response date: 5 June 2026"])), "5 June 2026");
    assert.equal(deadline(notice(["You must act by 3 September 2026."])), "3 September 2026");
  });
});

test("tier 2 keeps every rule the vocabulary already had", async (t) => {
  await t.test("forward only: a label after its date does not bind", () => {
    // Tier 1a. "act by" at the end of a line must not reach back.
    assert.equal(deadline(notice([
      "An order was granted on 3 July 2026 and you must act by 3 September 2026."
    ])), "3 September 2026", "the date after the label, not the one before it");
  });

  await t.test("adjacency: words between the label and the date reject the bind", () => {
    // Tier 1b. Nothing but punctuation and whitespace may sit between them.
    assert.equal(deadline(notice(["You must act by contacting us on 3 September 2026."])), null);
  });

  await t.test("a competing label between the two still wins", () => {
    assert.equal(deadline(notice(["Compliance date for the year ending 5 April 2026"])), null);
  });

  await t.test("same block: a label cannot reach across a blank line", () => {
    assert.equal(deadline(notice(["Compliance date", "", "3 September 2026"])), null);
  });
});

// --------------------------------------------------------------- tier 3

test("a contact obligation binds its date across the contact method", async (t) => {
  // B-1. The most urgent document in the corpus stated its deadline as
  // "You must contact us on 0333 320 122 by 3 September 2026" and showed
  // main_date null, because the phone number sits between "contact us" and
  // "by". Card 4 listed the contact deadline as one of three undifferentiated
  // dates on a notice about an enforcement agent attending the reader's home.
  await t.test("the flagship, end to end through the engine", () => {
    const run = runClearStepsEngine({
      extractedText: byId("bailiff_enforcement"),
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "b1" }
    });
    const result = run.api_output.structured_result;
    assert.equal(run.structured_output.extractor_internal.deadline, "3 September 2026");
    assert.equal(result.summary.main_date, "3 September 2026");
    assert.equal(result.cards[3].possible_deadline, "3 September 2026");
    assert.equal(result.cards[3].simple_explanation, "Due by 3 September 2026.");
  });

  const INTERPOSED = [
    ["phone number", "You must contact us on 0333 320 122 by 3 September 2026."],
    ["freephone", "You must contact us on 0800 121 4433 by 3 September 2026."],
    ["number with extension", "Please contact us on 020 8583 2000 ext 4471 by 3 September 2026."],
    ["number shown above", "You must contact us on the number shown above by 3 September 2026."],
    ["a named team", "Please contact us in the council tax recovery team by 3 September 2026."],
    ["a reference to quote", "You must contact us quoting reference EN-77120934 by 3 September 2026."],
    ["an email address", "Please contact us at revenues@hounslow.gov.uk by 3 September 2026."],
    ["a postal address", "Please reply to us at the address shown above by 3 September 2026."],
    ["in writing", "You must respond to us in writing by 3 September 2026."],
    ["the front of the letter", "You must write to us at the address on the front of this letter by 3 September 2026."],
    ["a change of circumstances", "You must notify us of any change in your circumstances by 3 September 2026."]
  ];

  for (const [why, line] of INTERPOSED) {
    await t.test(why + ": " + JSON.stringify(line.slice(0, 46) + "..."), () => {
      assert.equal(deadline(notice([line])), "3 September 2026");
    });
  }

  await t.test("OCR damage in the head does not lose the binding", () => {
    // The same sentence as ocr_enforcement writes it, with the lost separator
    // in the date too. Co-location finds it; see the layering test below for
    // why the engine still declines to show it.
    assert.equal(deadline("You must c0ntact us on 0333 320 122 by 3September 2026."), "3September 2026");
  });
});

test("the gap is bounded, and the bound is the one that was measured", async (t) => {
  const withGap = (n) => "You must contact us on " + "x".repeat(Math.max(0, n - 5)) + " by 3 September 2026.";

  await t.test("MAX_LABEL_GAP is 44", () => {
    assert.equal(co.MAX_LABEL_GAP, 44,
      "the bound was measured across fifteen realistic contact clauses; changing it needs new measurements");
  });

  await t.test("a gap of exactly 44 binds", () => {
    assert.equal(deadline(notice([withGap(44)])), "3 September 2026");
  });

  await t.test("a gap of 45 does not", () => {
    assert.equal(deadline(notice([withGap(45)])), null,
      "an unbounded reach is what turns a nearby sentence into this sentence's deadline");
  });
});

test("the gap quantifier is lazy, and this test is what keeps it lazy", async (t) => {
  // A greedy gap reaches for the LAST "by" in range. The label then ends AFTER
  // the date, forward-only proximity rejects it, and the deadline is null.
  const TWO_BY = "You must contact us on 0333 320 122 by 3 September 2026 or pay by card.";

  await t.test("a second by on the same line does not cost the date", () => {
    assert.equal(deadline(notice([TWO_BY])), "3 September 2026");
  });

  await t.test("the greedy form really does lose it, so the test above bites", () => {
    // Built here rather than imported, so this asserts the mechanism rather
    // than trusting the description of it.
    const greedy = /\bcontact us\b[^\n]{0,44}\bby\b/i.exec(TWO_BY);
    const lazy = /\bcontact us\b[^\n]{0,44}?\bby\b/i.exec(TWO_BY);
    assert.ok(greedy[0].endsWith("pay by"), "greedy ran on to the second by: " + JSON.stringify(greedy[0]));
    assert.ok(lazy[0].endsWith("122 by"), "lazy stopped at the first: " + JSON.stringify(lazy[0]));
    const dateAt = TWO_BY.indexOf("3 September 2026");
    assert.ok(greedy.index + greedy[0].length > dateAt,
      "under greedy the date sits behind the label, which is why it is rejected");
  });

  await t.test("the flagship line itself does NOT distinguish them", () => {
    // Worth pinning, because the earlier note claimed greedy left the flagship
    // null. It does not: that line carries only one "by". Greedy fails on the
    // next realistic variant of it, not on it.
    const one = "You must contact us on 0333 320 122 by 3 September 2026.";
    assert.equal(/\bcontact us\b[^\n]{0,44}\bby\b/i.exec(one)[0],
      /\bcontact us\b[^\n]{0,44}?\bby\b/i.exec(one)[0]);
  });
});

test("widening the label does not widen what it may bind", async (t) => {
  await t.test("the adjacency test still runs on the whole label", () => {
    // The run-on guard. "by telephone on <date>" is an instrumental by, and the
    // words after it are what reject the bind. Tier 1b, still load bearing.
    assert.equal(deadline(notice([
      "You must contact us on 0333 320 122 by telephone on 3 September 2026."
    ])), null);
  });

  await t.test("a competing label hiding inside the gap rejects the bind", () => {
    // The between-test reads from label.index, so it sweeps the whole clause.
    // Before spanning labels existed that span was a few characters wide.
    assert.equal(deadline(notice([
      "You must contact us about the year ending 5 April 2026 by 3 September 2026."
    ])), null);
  });

  await t.test("a discontiguous label never spans a line", () => {
    assert.equal(deadline(notice(["You must contact us", "on 0333 320 122 by 3 September 2026."])), null);
  });

  await t.test("the head does not match inside a longer word", () => {
    assert.equal(deadline(notice(["Please review contact usage on this account by 3 September 2026."])), null);
    assert.equal(deadline(notice(["We will notify usual contacts on the account by 3 September 2026."])), null);
  });

  await t.test("the sender may not be the subject", () => {
    // Every head carries a first person plural object, so a service promise
    // cannot be read as the reader's deadline.
    [
      "We will respond to your complaint by 3 September 2026.",
      "We will reply to you by 3 September 2026.",
      "We will write to you again by 3 September 2026.",
      "We will notify you of the outcome by 3 September 2026."
    ].forEach((line) => {
      assert.equal(deadline(notice([line])), null, JSON.stringify(line));
    });
  });

  await t.test("pay is not a head, and the reason is in the vocabulary", () => {
    assert.equal(co.DATE_GOVERNS_SPANNING.includes("pay"), false,
      "pay matches inside payment and is the verb tier 1b exists to defend against");
    assert.equal(deadline(notice([
      "You agreed to pay us by direct debit on 3 July 2026."
    ])), null);
  });
});

test("tier 3 stops where the other layers say stop", async (t) => {
  await t.test("a garbled document finds the date and still declines to show it", () => {
    // ocr_enforcement carries the same sentence. Co-location binds it, and the
    // garble branch nulls it anyway, because a date read off text the engine
    // has called unreliable is not a date to assert. Two layers, and this pins
    // that the second one is what holds.
    const text = byId("ocr_enforcement");
    assert.ok(co.selectDeadline(text, isPlausibleNumericDate), "premise: co-location binds it");
    const run = runClearStepsEngine({
      extractedText: text,
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "t3" }
    });
    assert.equal(run.structured_output.trust_internal.garbled_by_ocr, true, "premise");
    assert.equal(run.structured_output.extractor_internal.deadline, null,
      "the garble branch, not co-location, is what keeps this off the card");
  });

  await t.test("exactly one corpus document gains a deadline, and none loses one", () => {
    const EXPECTED = {
      council_tax: "1 April 2026", energy_bill: "28 May 2026", water_bill: "30 June 2026",
      gov_hmrc: "31 July 2026", appointment_nhs: "1 July 2026",
      bailiff_enforcement: "3 September 2026", eviction_possession: "12 September 2026",
      court_fine: "30 September 2026", housing_letter: "within 14 days",
      employment_letter: "17 June 2026", education_letter: "5 June 2026",
      insurance_letter: "1 July 2026", multi_document_split: "28 May 2026",
      ocr_council_tax: "1April 2026", photo_snippet_short: "28 May 2026",
      arrears_before_clause: "3 September 2026",
      arrears_past_and_future: "3 September 2026", school_periodic: "3 September 2026",
      ambiguous_numeric_date: "03/06/2026", short_year_date: "28 May 26",
      // Recovered by F3.
      genuine_school_final_warning: "18 September 2026",
      genuine_post_office_card_payment: "3 September 2026",
      intl_energy_bill_plus44: "6 August 2026",
      intl_water_arrears_00_prefix: "28 August 2026",
      // Romanian, and read only because "septembrie" shares the "sep" stem the
      // English month list already matches. "15 listopada 2026" in the same
      // sentence would find nothing. Pinned so that coincidence is on the
      // record rather than mistaken for multilingual date support.
      intl_romanian_school_meeting: "15 septembrie 2026",
      // Recovered by P1, which stopped the repeated-letterhead rule fusing a
      // genuine two-page insurance renewal.
      letter_with_terms_on_back: "30 June 2026",
      spec_energy_bill_full: "4 June 2026",
      spec_council_tax_demand_full: "1 April 2026",
      spec_bilingual_en_pl_council: "1 July 2026",
      // The letter date, not the appointment date. See KNOWN_ENGINE_DEFECTS.md.
      spec_gujarati_nhs_appointment: "12 June 2026",
      spec_bengali_nhs_screening: "5 June 2026"
    };
    const found = {};
    CORPUS.forEach((entry) => {
      const run = runClearStepsEngine({
        extractedText: entry.text,
        fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "t3all" }
      });
      const value = run.structured_output.extractor_internal.deadline;
      if (value) found[entry.id] = value;
    });
    assert.deepEqual(found, EXPECTED);
  });
});

// ------------------------------------------------ word boundaries, both kinds

test("a competing label never matches inside a longer word", async (t) => {
  // The other half of the boundary rule, and it fails in the opposite direction
  // from a governs entry. A governs over-match ASSERTS a wrong answer; a
  // competes over-match makes co-location DECLINE, losing a right one.
  await t.test("a false competes hit between a label and its value used to decline", () => {
    assert.equal(co.selectAmount("Amount to pay now: £120.00").value, "£120.00", "control");
    ["Amount to pay unless waived: £120.00",
     "Amount to pay unused portion: £120.00",
     "Amount to pay prepaid card: £120.00"].forEach((line) => {
      const found = co.selectAmount(line);
      assert.equal(found && found.value, "£120.00", line);
    });
  });

  await t.test("for dates the between-case never arises, and this records why", () => {
    // Money labels may sit either side of their value with words between, so a
    // false competes hit between the two is reachable. Dates may not: Tier 1b
    // requires nothing but punctuation and whitespace between a date label and
    // its date, so anything with letters in it is already rejected, whether or
    // not those letters happen to contain a competes entry.
    assert.equal(deadline("Please pay by periodic order 3 September 2026"), null,
      "rejected by adjacency, not by the competes entry");
    assert.equal(deadline("Please pay by 3 September 2026"), "3 September 2026");
    // So the date-side harm is entirely through isClaimedByCompetingDateLabel,
    // which tests proximity rather than adjacency and therefore lets a label on
    // the line above count. school_periodic below is that case.
  });

  await t.test("the real competing labels still compete", () => {
    // The boundary must not disarm them. Each of these is a whole word and must
    // still make co-location decline.
    assert.equal(co.selectAmount("Your account is in credit by £83.86, so there is nothing to pay."), null);
    assert.equal(deadline(notice(["Compliance date for the year ending 5 April 2026"])), null);
    assert.equal(co.selectAmount("Less a discount of £50.00, amount to pay £120.00") !== null, true,
      "a whole-word 'less' is still seen; this asserts the entry survives bounding");
  });

  await t.test("the two corpus documents carrying 'unless' are unaffected", () => {
    // Both matched "less" inside "unless" before the boundaries and neither
    // changed answer, because the false hit was not positioned between a label
    // and a value. Pinned so the fix is known to be inert where it was inert.
    assert.equal(co.selectAmount(byId("legal_solicitor")).value, "£3,410.00");
    assert.equal(co.selectAmount(byId("insurance_letter")), null);
  });
});

test("school_periodic: a competes word one line above a real deadline", async (t) => {
  // isClaimedByCompetingDateLabel reads the same label hits, and a false
  // competes match on the line above a date suppressed a genuine deadline on
  // the reading-aid path. This is the live harm the competes half caused.
  const text = byId("school_periodic");
  const run = runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "corpus-d" }
  });
  const signals = run.structured_output.extractor_internal.readable_unsupported_signals;

  await t.test("the date is no longer reported as claimed by a competing label", () => {
    assert.equal(co.isClaimedByCompetingDateLabel(text, "3 September 2026", isPlausibleNumericDate), false);
  });

  await t.test("it reaches the reading-aid path, which is where the filter runs", () => {
    assert.ok(signals, "premise: this document must stay on the aid path");
  });

  await t.test("the deadline is named instead of listed", () => {
    assert.equal(signals.primaryDate, "3 September 2026");
    assert.equal(run.structured_output.extractor_internal.deadline, "3 September 2026");
    assert.match(run.api_output.structured_result.cards[3].simple_explanation,
      /shows 3 September 2026 as the date that matters/);
  });
});

test("tier 2 moves nothing that was already correct", async (t) => {
  await t.test("no new entry fires anywhere in the corpus", () => {
    const NEW = ["compliance date", "date for compliance", "response date", "act by", "you must act by"];
    const fired = [];
    CORPUS.forEach((entry) => {
      co.locateLabels(entry.text, NEW).forEach((hit) => {
        fired.push(entry.id + ": " + hit.phrase);
      });
    });
    assert.deepEqual(fired, [],
      "tier 2 was added for shapes the corpus does not contain; a hit here means the baseline moved");
  });

  await t.test("the documents that already had a deadline still have the same one", () => {
    const EXPECTED = {
      council_tax: "1 April 2026", energy_bill: "28 May 2026", water_bill: "30 June 2026",
      appointment_nhs: "1 July 2026", eviction_possession: "12 September 2026",
      court_fine: "30 September 2026", multi_document_split: "28 May 2026"
    };
    Object.entries(EXPECTED).forEach(([id, value]) => {
      const run = runClearStepsEngine({
        extractedText: byId(id),
        fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "vocab" }
      });
      assert.equal(run.structured_output.extractor_internal.deadline, value, id);
    });
  });
});
