// Guards contact_number: the one phone number the document says to ring.
//
// It reaches card 3 as the last key point, after the actions, because it is
// something the document states rather than something Northcue recommends.
//
// It only reaches the reader at all because of the stripper exemption that
// landed alongside this: aiStructuredResultService removes every phone number
// from every card unless the sentence is byte-identical to the rules output.
// See tests/stripperExemption.test.js. If that exemption is narrowed, the tests
// here still pass while the reader sees nothing, so the end-to-end assertion
// lives in that file rather than this one.
//
// The tests that matter most here are the ones that assert null.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "contact-test" }
  });
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

const selected = (text) => {
  const found = co.selectPhoneNumber(text);
  return found ? found.value : null;
};

// Long enough to keep the engine off the short-input paths.
function letter(body) {
  return [
    "Hounslow Borough Council", "Council Tax Recovery", "Reference: CT-90114",
    "", "Dear Occupier", "", "Amount to pay: £486.20"
  ].concat(body).join("\n");
}

// ---------------------------------------------------------------- the pattern

test("a UK number is matched whole, or not at all", async (t) => {
  await t.test("0333 320 122, the one a strict pattern drops", () => {
    // Ten digits where a real 0333 number has eleven. It is the corpus's most
    // urgent contact number, on the enforcement notice B-1 existed for, and a
    // well formed UK phone pattern rejects it. That is why the pattern is
    // loose on shape and strict on the leading zero instead.
    assert.equal(selected("You must contact us on 0333 320 122 by 3 September 2026."), "0333 320 122");
    assert.equal(co.selectPhoneNumber(byId("bailiff_enforcement")).value, "0333 320 122");
  });

  await t.test("the shapes the corpus actually prints", () => {
    const SHAPES = [
      ["London 020", "If you think this bill is wrong, contact us on 020 8583 4242.", "020 8583 4242"],
      ["non geographic 0333", "You can pay online or by calling 0333 200 5100.", "0333 200 5100"],
      ["freephone 0800", "You can talk to us about your account on 0800 980 8800.", "0800 980 8800"],
      ["0300 public body", "To ask about a payment plan, contact the Fines Team on 0300 790 9901.", "0300 790 9901"],
      ["0114 regional", "If you are struggling to pay, contact the rent team on 0114 273 4567.", "0114 273 4567"]
    ];
    SHAPES.forEach(([why, line, expected]) => {
      assert.equal(selected(letter([line])), expected, why);
    });
  });

  await t.test("a lone digit running on from the number declines the whole thing", () => {
    // [\d\s] is greedy, so this matches "0800 980 8800 8", one digit too many.
    // Trimming back to eleven would guess where the number ends, which is the
    // mistake MONEY made when it returned a well formed prefix of a malformed
    // amount. A number not found costs nothing; a wrong number is a call to a
    // stranger.
    assert.equal(selected(letter(["Contact us on 0800 980 8800 8 August 2026."])), null);
  });

  await t.test("a WORD after the number ends the run, so the number is kept", () => {
    // The same sentence with "on" between: the run stops at the letters and the
    // number is found whole. Worth pinning, because it is the difference
    // between the rule declining on a real hazard and declining on everything.
    assert.equal(selected(letter(["Contact us on 0800 980 8800 on 8 August."])), "0800 980 8800");
  });

  await t.test("digit counts outside ten to eleven are refused", () => {
    assert.deepEqual(co.findPhoneNumbers("Call 020 858 342.").map((h) => h.value), [], "nine digits");
    assert.deepEqual(co.findPhoneNumbers("Call 0333 320 122.").map((h) => h.value), ["0333 320 122"], "ten");
    assert.deepEqual(co.findPhoneNumbers("Call 0800 980 8800.").map((h) => h.value), ["0800 980 8800"], "eleven");
  });

  await t.test("a longer run backtracks to a valid number rather than declining", () => {
    // "0800 980 8800 12" is thirteen digits and refused, and the pattern then
    // backtracks to the eleven digit number inside it. That is a real
    // difference from the case above, where the trailing "8" leaves no valid
    // shorter match, and it is recorded rather than assumed.
    assert.deepEqual(co.findPhoneNumbers("Call 0800 980 8800 12.").map((h) => h.value),
      ["0800 980 8800"]);
  });
});

test("a number written the international way", async (t) => {
  // Added 2 August 2026. Every corpus document before that printed a UK
  // national number, so nothing had ever asked what happened to +44 or +48,
  // and a genuine Polish clinic letter was refused as a non document for want
  // of the structural signal its own phone number should have given it.
  await t.test("the plus form, for every language Northcue ships and beyond", () => {
    const FORMS = [
      ["UK", "+44 20 8583 4242"],
      ["UK mobile", "+44 7700 900412"],
      ["UK with (0)", "+44 (0)20 8583 4242"],
      ["UK unspaced", "+442085834242"],
      ["Polish", "+48 22 512 44 90"],
      ["Polish mobile", "+48 601 234 567"],
      ["Spanish", "+34 912 345 678"],
      ["French", "+33 1 42 68 53 00"],
      ["Portuguese", "+351 21 447 8802"],
      ["Romanian", "+40 264 591 220"],
      ["Irish", "+353 85 123 4567"],
      ["Indian", "+91 22 1234 5678"],
      ["Bangladeshi", "+880 2 1234 5678"],
      // No country code list, so a code Northcue ships no language for still
      // works. Deliberate: the plus is the anchor, not the code.
      ["German", "+49 30 12345678"],
      ["US", "+1 212 555 0142"]
    ];
    FORMS.forEach(([why, number]) => {
      assert.deepEqual(co.findPhoneNumbers("Please call " + number + " for help.")
        .map((h) => h.value.trim()), [number], why + ": must match WHOLE, or not at all");
    });
  });

  await t.test("the 00 form is declined whole, not truncated", () => {
    // THE REGRESSION THIS EXISTS FOR. 0044 118 273 4567 is fourteen digits, so
    // the cap should decline it. Before 0(?!0) the global pattern found the ten
    // digit prefix "0044 118 273", the cap accepted THAT, and card 3 told the
    // reader to ring a number that was not on the letter.
    assert.deepEqual(co.findPhoneNumbers("Please call 0044 118 273 4567 for help.")
      .map((h) => h.value), []);
    assert.equal(selected(letter(["If you are struggling, please call 0044 118 273 4567."])), null);
    // And the same number written the plus way IS found, so the decline above
    // is about the 00 prefix and not about the number.
    assert.equal(selected(letter(["If you are struggling, please call +44 118 273 4567."])),
      "+44 118 273 4567");
  });

  await t.test("00 is not matched, and these are why", () => {
    // Measured shapes that a 00 branch wrongly matched. Each begins with two
    // zeros and is not a phone number. Restricting to known country codes does
    // not save it: 0044 IS a country code.
    [
      "Meter serial 00 4471 028866 was replaced",
      "Your claim reference is 00 8842 0076 1234",
      "Order 0044-1182-7345 was dispatched",
      "Contract 004471028866112 runs to 2027"
    ].forEach((line) => {
      assert.deepEqual(co.findPhoneNumbers(line).map((h) => h.value), [], line);
    });
  });

  await t.test("a plus in front of something that is not a number", () => {
    // The plus is only an anchor if it does not fire on arithmetic and money.
    [
      "We received +44.20 in part payment",
      "The charge rose by +12.5 per cent this year",
      "Balance change +1,204.50 this quarter",
      "+44 is the UK dialling code"
    ].forEach((line) => {
      assert.deepEqual(co.findPhoneNumbers(line).map((h) => h.value), [], line);
    });
  });

  await t.test("the digit range is wider for international, because the code counts", () => {
    // +48 22 512 44 90 is eleven, +44 20 8583 4242 is twelve, +880 2 1234 5678
    // is thirteen, so the international cap is fifteen where the national one
    // is eleven.
    assert.deepEqual(co.findPhoneNumbers("Call +880 2 1234 5678.").map((h) => h.value),
      ["+880 2 1234 5678"], "thirteen digits is inside the international range");
    assert.deepEqual(co.findPhoneNumbers("Call +44 20 85.").map((h) => h.value), [],
      "eight digits is still too few");
    // A national number is unchanged, and still held to ten or eleven.
    assert.deepEqual(co.findPhoneNumbers("Call 020 858 342.").map((h) => h.value), [],
      "nine national digits is still refused");
  });

  await t.test("backtracking is wider here than nationally, and that is recorded", () => {
    // The existing behaviour, not new: a run too long to accept backtracks to
    // the longest acceptable prefix rather than declining, and the test above
    // named "a longer run backtracks to a valid number rather than declining"
    // pins that for the national branch on purpose.
    //
    // The international cap is fifteen, so the prefix it can fall back to is
    // longer. "+44 20 8583 4242 44 44 4444" is eighteen digits and yields the
    // fourteen digit "+44 20 8583 4242 44", which is a fragment rather than a
    // number. Asserted rather than hidden, because it is the one place the
    // wider range costs something.
    //
    // Not treated as a defect to fix here: a plus followed by an eighteen digit
    // run is not a shape any letter prints, and the purpose-label rule below is
    // a second gate before anything reaches a reader. If a real document ever
    // shows this, it belongs in the corpus first.
    assert.deepEqual(co.findPhoneNumbers("Call +44 20 8583 4242 44 44 4444.").map((h) => h.value),
      ["+44 20 8583 4242 44"]);
    // A word after the number ends the run, exactly as nationally, so the
    // ordinary case keeps the whole number.
    assert.deepEqual(co.findPhoneNumbers("Call +44 20 8583 4242 extra 99.").map((h) => h.value),
      ["+44 20 8583 4242"]);
  });
});

test("a reference number is never a phone number", async (t) => {
  // The leading zero is the whole false-positive defence. Every shape below is
  // on a corpus letter today.
  const REFERENCES = [
    ["council tax account number", "Account number: 4471028866"],
    ["energy customer number", "Customer number: 220145879"],
    ["water account number", "Account number: 8842200761"],
    ["HMRC unique taxpayer reference", "Unique Taxpayer Reference: 4471 028866"],
    ["National Insurance number", "National Insurance number: QQ 12 34 56 C"],
    ["hyphenated bank account", "Account number: 8842-0076"],
    ["enforcement reference", "Reference: EN-77120934"],
    ["policy number", "Policy number: AV-77120934"],
    ["an account number that starts with zero but is one run", "Account number: 0333320122456"]
  ];

  for (const [why, line] of REFERENCES) {
    await t.test(why, () => {
      assert.deepEqual(co.findPhoneNumbers(line).map((h) => h.value), [], line);
    });
  }

  await t.test("across the whole corpus, nothing found is a reference", () => {
    CORPUS.forEach((entry) => {
      const references = analyse(entry.text).structured_output.extractor_internal.reference_numbers || [];
      co.findPhoneNumbers(entry.text).forEach((hit) => {
        references.forEach((reference) => {
          assert.notEqual(hit.value.replace(/\s/g, ""), reference.replace(/[\s-]/g, ""),
            entry.id + ": " + hit.value + " is also the reference");
        });
      });
    });
  });
});

// ------------------------------------------------------------ purpose binding

test("a number with no stated purpose is not surfaced", async (t) => {
  const NO_PURPOSE = [
    ["a bare number on its own line", "0333 320 122"],
    ["a registered office footer", "Registered office 020 8583 4242 VAT 123 4567 89"],
    ["a number after words, not a purpose", "Our reference above relates to 020 8583 4242."],
    ["words between the purpose and the number", "Contact us on the number shown 020 8583 4242."]
  ];

  for (const [why, line] of NO_PURPOSE) {
    await t.test(why, () => {
      assert.ok(co.findPhoneNumbers(line).length > 0, why + ": premise, a number IS present");
      assert.equal(selected(letter([line])), null, why);
    });
  }

  await t.test("the two shapes that do bind", () => {
    assert.equal(selected(letter(["If you cannot attend, telephone 020 8321 5000 to rearrange."])),
      "020 8321 5000", "direct");
    assert.equal(selected(letter(["Please contact the recovery team on 020 8583 4242."])),
      "020 8583 4242", "spanning, where the gap names who");
  });
});

test("a number the document says NOT to use is refused", async (t) => {
  const REFUSED = [
    ["do not call", "Do not call 0906 111 2222, which is not our number."],
    ["do not use", "Do not use 0906 111 2222 to contact us."],
    ["never call", "Never call 0906 111 2222 about this account."],
    ["a fax line", "Our fax number is 020 8583 4243."]
  ];

  for (const [why, line] of REFUSED) {
    await t.test(why, () => {
      assert.equal(selected(letter([line])), null, line);
    });
  }
});

test("two candidates prefer the first rather than declining", async (t) => {
  // REPLACED A DECLINE RULE, on 3 August 2026, and the reason it went is worth
  // keeping. It returned null on two bound candidates because "choosing would
  // be Northcue ranking the reader's options". That holds for two numbers with
  // equal claim. It does not hold for the shape real post has.
  //
  // official_letter_caseworker_number is the case: "Phone 03000 511899" at the
  // top with the caseworker's hours, and "call the VAT helpline on
  // 0300 200 3700" in the body as a general fallback. Both bind, so the reader
  // got NEITHER, on a letter whose own instruction is "please phone me on the
  // above number".
  await t.test("a payments line and a complaints line now yields the first", () => {
    // WHAT THE CHANGE COSTS, kept as the case that argued for declining. Two
    // purposes, neither named as the one, and the first is now chosen. This is
    // the weakest instance of the new rule and it is here so the cost is
    // visible rather than implied.
    const both = letter([
      "If you think this bill is wrong, contact us on 020 8583 4242.",
      "To pay, call the payments line on 0333 200 5100."
    ]);
    assert.equal(co.findPhoneNumbers(both).length, 2, "premise: both are found");
    assert.equal(selected(both), "020 8583 4242");
  });

  await t.test("the caseworker letter, which is why the rule changed", () => {
    const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
    const text = CORPUS.find((e) => e.id === "official_letter_caseworker_number").text;
    assert.equal(co.findPhoneNumbers(text).length, 2, "premise: both are found");
    assert.equal(selected(text), "03000 511899",
      "the letter says to phone the number at the top, and that is the first bound one");
  });

  await t.test("one bound and one unbound still yields the bound one", () => {
    // Declining needs two BOUND candidates. A footer number that binds nothing
    // is not competition.
    const one = letter([
      "If you think this bill is wrong, contact us on 020 8583 4242.",
      "Registered office 0333 200 5100."
    ]);
    assert.equal(co.findPhoneNumbers(one).length, 2, "premise");
    assert.equal(selected(one), "020 8583 4242");
  });
});

// ------------------------------------------------------------------ the gates

test("the gates, through the engine", async (t) => {
  await t.test("garbled: co-location binds it and the gate is what stops it", () => {
    // The gate is load bearing rather than belt and braces. Label tolerance
    // means "c0ntact us on" DOES bind, so without the gate a number read off
    // text the engine has called unreliable would reach the field.
    const text = byId("ocr_enforcement");
    assert.equal(co.selectPhoneNumber(text).value, "0333 320 122", "premise: co-location binds it");
    const run = analyse(text);
    assert.equal(run.structured_output.trust_internal.garbled_by_ocr, true, "premise");
    assert.equal(run.structured_output.extractor_internal.contact_number, null);
  });

  await t.test("a damaged number is not found at all, which is the other half", () => {
    assert.equal(selected("You must c0ntact us on O333 32O 122 by 3September 2026."), null);
  });

  await t.test("verification_only: a suspected scam's number is refused", () => {
    const scam = byId("scam_phishing").replace(/\n/, "\nCall us now on 0800 111 2222.\n");
    const run = analyse(scam);
    assert.equal(run.structured_output.trust_internal.processing_mode, "verification_only", "premise");
    assert.equal(co.selectPhoneNumber(scam).value, "0800 111 2222", "premise: it would otherwise bind");
    assert.equal(run.structured_output.extractor_internal.contact_number, null);
  });

  await t.test("fused: a number cannot be attributed to one of several letters", () => {
    ["multi_document", "multi_document_greetings"].forEach((id) => {
      const run = analyse(byId(id));
      assert.equal(run.structured_output.extractor_internal.multi_letter_state, "fused", id);
      assert.equal(run.structured_output.extractor_internal.contact_number, null, id);
    });
  });

  await t.test("every corpus document, and the sixteen that bind", () => {
    const EXPECTED = {
      council_tax: "020 8583 4242", energy_bill: "0333 200 5100",
      appointment_nhs: "020 8321 5000", bailiff_enforcement: "0333 320 122",
      eviction_possession: "020 8890 4100", court_fine: "0300 790 9901",
      arrears_before_clause: "020 8583 4242", failed_direct_debit: "0800 980 8800",
      arrears_past_and_future: "0114 273 4567", school_periodic: "0114 273 8890",
      // FOUR ADDED 3 August 2026 with the three contact-shape documents and
      // the three gate fixes. Nothing already binding changed its number, which
      // is what says the fixes are additive rather than a re-ranking.
      //   energy_bill_contacts_panel   purpose-noun labels, gate 1
      //   communal_bill_debt_help_block  the block excluded, gate 3
      //   official_letter_caseworker_number  prefer over decline, gate 2
      //   bill_with_contacts_page      the document that started this, gate 1
      bill_with_contacts_page: '0333 202 9802',
      communal_bill_debt_help_block: '0333 321 2010',
      energy_bill_contacts_panel: '0330 808 3880',
      official_letter_caseworker_number: '03000 511899',
      // RETURNED 6 August 2026, by item A's approved fix. The twin's
      // customer services number sits behind a QUESTION-FORM label,
      // "Questions about your bill?", the real letter's shape, which the
      // verb-and-purpose-noun vocabulary did not bind: six numbers, zero
      // bound, card 3 lost the number in every language. The question-form
      // customer-purpose entries in PHONE_GOVERNS now bind it, and only it:
      // the emergency, ombudsman and advice numbers stay unbound exactly as
      // before, so this is the only number that can be chosen on the shape.
      energy_quarterly_footer_sender: "0345 201 8812",
      ambiguous_numeric_date: "0333 304 0191", short_year_date: "020 8583 4242",
      // Recovered by F3 on 1 August 2026. Each was refused as a scam, which
      // suppressed its contact number along with everything else.
      genuine_nhs_booking_link: "020 8321 5000",
      genuine_school_final_warning: "020 8583 1188",
      genuine_dwp_identity_check: "0800 328 5644",
      genuine_post_office_card_payment: "020 8583 4242",
      // FIXED 2 August 2026. This used to read "0044 118 273", the ten digit
      // prefix of the fourteen digit number the letter prints, because the
      // digit cap validated each match rather than the candidate. 0(?!0) now
      // stops the national branch entering a 00 prefix at all, so the whole
      // candidate is declined and the document is ABSENT from this set. A
      // number not found costs nothing; a wrong number is a call to a stranger.
      //
      // The 00 form is not recognised, deliberately. See the comment on PHONE:
      // matching it wrongly caught a meter serial, a claim reference, an order
      // number and a contract number.
      //
      // THE INTERNATIONAL RECOVERY. Only this one, and only because its letter
      // says "you can call us on". The Polish, Portuguese and Romanian letters
      // all carry a number the pattern now finds, and all three still return
      // null, because PHONE_GOVERNS is ["telephone","call","calling","phone",
      // "ring"] and none of them asks in English. Recorded in
      // KNOWN_ENGINE_DEFECTS.md.
      intl_energy_bill_plus44: "+44 113 496 2200"
    };
    const found = {};
    CORPUS.forEach((entry) => {
      const value = analyse(entry.text).structured_output.extractor_internal.contact_number;
      if (value) found[entry.id] = value;
    });
    assert.deepEqual(found, EXPECTED);
  });
});

// ------------------------------------------------- what may never reach it

test("only a phone number, never an address of any kind", async (t) => {
  // A rule about what may reach a reader, not about what is easy to match. An
  // email or web address on a letter is a place to send credentials.
  await t.test("an email address is not a contact number", () => {
    assert.equal(selected(letter(["Please email revenues@hounslow.gov.uk or write to us."])), null);
    assert.equal(selected(letter(["Contact us on revenues@hounslow.gov.uk."])), null);
  });

  await t.test("a web address is not a contact number", () => {
    assert.equal(selected(letter(["You can pay online at www.hounslow.gov.uk/counciltax."])), null);
    assert.equal(selected(letter(["Contact us on hounslow.gov.uk."])), null);
  });

  await t.test("the phishing domain never reaches the field, by any route", () => {
    // scam_phishing carries barclays-secure-verify.com three lines above an
    // instruction to confirm a card number, PIN and full password.
    const run = analyse(byId("scam_phishing"));
    assert.equal(run.structured_output.extractor_internal.contact_number, null);
  });

  await t.test("no corpus document's contact_number contains a letter or an at sign", () => {
    // The class-level guard. If this field ever grows to cover addresses, the
    // value stops being a number and this fails.
    //
    // Widened on 2 August 2026 from digits-and-spaces to allow the punctuation
    // an international number is written with: "+44 113 496 2200" and
    // "+44 (0)20 8583 4242". The guard that matters is unchanged and is now
    // stated directly rather than implied by the character class: a letter, an
    // at sign or a slash means an email or a web address has reached the field,
    // and that is the thing this test exists to catch.
    CORPUS.forEach((entry) => {
      const value = analyse(entry.text).structured_output.extractor_internal.contact_number;
      if (value === null) return;
      assert.doesNotMatch(value, /[A-Za-z@/]/,
        entry.id + ": contact_number must not be an address, got " + JSON.stringify(value));
      assert.match(value, /^[0-9 +().-]+$/,
        entry.id + ": contact_number must be a number, got " + JSON.stringify(value));
    });
  });
});

test("card 3 reports the number, and reports it rather than recommending it", async (t) => {
  await t.test("the twenty-one documents that bind show it as the last key point", () => {
    const shown = {};
    CORPUS.forEach((entry) => {
      const cards = analyse(entry.text).api_output.structured_result.cards;
      const points = cards[2].key_points || [];
      const line = points.find((p) => /gives this phone number/.test(p));
      if (line) shown[entry.id] = { line, last: points[points.length - 1] === line };
    });
    // Twelve until F3 recovered four genuine letters that had been refused as
    // scams, which suppressed their contact number with everything else. The
    // seventeenth is intl_water_arrears_00_prefix, and it is on this card with
    // the WRONG number: see the pin in the block above.
    //
    // TWENTY-ONE since the three gate fixes of 3 August 2026: three new
    // contact-shape documents, and bill_with_contacts_page, whose billing
    // number was invisible because a contacts panel labels by purpose noun and
    // PHONE_GOVERNS knew only verbs.
    //
    // TWENTY-TWO again on 6 August 2026: energy_quarterly_footer_sender
    // dropped to twenty-one when it took the real letter's question-form
    // contact labels, and item A's approved fix, the question-form
    // customer-purpose entries in PHONE_GOVERNS, brought it back.
    assert.equal(Object.keys(shown).length, 22, Object.keys(shown).join(", "));
    Object.entries(shown).forEach(([id, s]) => {
      assert.ok(s.last, id + ": the number must come after the actions, not among them");
    });
  });

  await t.test("it never becomes the action line", () => {
    // It is not an action. normalizeActionLine reads extraction.actions, which
    // this is deliberately not part of.
    CORPUS.forEach((entry) => {
      const result = analyse(entry.text).api_output.structured_result;
      assert.doesNotMatch(String(result.summary.main_action), /gives this phone number/, entry.id);
      assert.doesNotMatch(String(result.cards[2].action_needed), /gives this phone number/, entry.id);
    });
  });

  await t.test("the sentence says nothing about ringing it", () => {
    const line = analyse(byId("council_tax")).api_output.structured_result.cards[2].key_points
      .find((p) => /gives this phone number/.test(p));
    assert.equal(line, "The document gives this phone number: 020 8583 4242.");
    // Split on non-letters and compare words, rather than building a regex.
    //  is banned here because it is ASCII only, and a \p{L} lookaround is
    // easy to get wrong through a layer of escaping. This needs neither.
    const words = new Set(line.toLowerCase().split(/[^a-z]+/).filter(Boolean));
    ["call", "ring", "dial", "should", "must", "now", "immediately", "you", "your"]
      .forEach((banned) => {
        assert.equal(words.has(banned), false,
          "reports the number and recommends nothing, but contains " + banned);
      });
  });

  await t.test("a gated document shows no number on any card", () => {
    ["ocr_enforcement", "scam_phishing", "multi_document", "multi_document_greetings"].forEach((id) => {
      analyse(byId(id)).api_output.structured_result.cards.forEach((card) => {
        const text = [card.simple_explanation, card.read_aloud_text]
          .concat(card.key_points || []).filter(Boolean).join(" ");
        assert.doesNotMatch(text, /gives this phone number/, id + " card " + card.card_number);
      });
    });
  });
});
