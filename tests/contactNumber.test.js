// Guards contact_number: the one phone number the document says to ring.
//
// NOTHING RENDERS IT, and the last test in this file is what keeps that true.
// A phone number reaching a card is already a settled question answered no:
// aiStructuredResultService's stripper replaces any card sentence carrying a
// phone-shaped number and a call-context word with "Use contact details from
// the original document.", and it runs over rules output too. It fires on the
// shipped product today, on bailiff_enforcement's card 3. So this field exists
// so the extraction is decided and tested in one place, and surfacing it is a
// separate decision about that rule.
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

test("two candidates decline rather than choose", async (t) => {
  await t.test("a payments line and a complaints line", () => {
    // The letter states two purposes and names neither as the one. Choosing
    // would be Northcue ranking the reader's options.
    const both = letter([
      "If you think this bill is wrong, contact us on 020 8583 4242.",
      "To pay, call the payments line on 0333 200 5100."
    ]);
    assert.equal(co.findPhoneNumbers(both).length, 2, "premise: both are found");
    assert.equal(selected(both), null);
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

  await t.test("every corpus document, and the twelve that bind", () => {
    const EXPECTED = {
      council_tax: "020 8583 4242", energy_bill: "0333 200 5100",
      appointment_nhs: "020 8321 5000", bailiff_enforcement: "0333 320 122",
      eviction_possession: "020 8890 4100", court_fine: "0300 790 9901",
      arrears_before_clause: "020 8583 4242", failed_direct_debit: "0800 980 8800",
      arrears_past_and_future: "0114 273 4567", school_periodic: "0114 273 8890",
      ambiguous_numeric_date: "0333 304 0191", short_year_date: "020 8583 4242"
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
    // value stops being digits and spaces and this fails.
    CORPUS.forEach((entry) => {
      const value = analyse(entry.text).structured_output.extractor_internal.contact_number;
      if (value === null) return;
      assert.match(value, /^[0-9 ]+$/,
        entry.id + ": contact_number must be digits and spaces only, got " + JSON.stringify(value));
    });
  });
});

test("nothing renders it", async (t) => {
  await t.test("no card on any corpus document contains the contact number", () => {
    // The field is extraction only. Surfacing it needs the stripper rule
    // changed deliberately, which is its own decision.
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      const value = run.structured_output.extractor_internal.contact_number;
      if (!value) return;
      run.api_output.structured_result.cards.forEach((card) => {
        const text = [card.title, card.simple_explanation, card.read_aloud_text, card.action_needed]
          .concat(card.key_points || []).filter(Boolean).join(" ");
        assert.ok(!text.includes("The document gives this phone number"),
          entry.id + " card " + card.card_number + " renders the contact number");
      });
    });
  });

  await t.test("the field is absent from the structured result entirely", () => {
    const result = analyse(byId("council_tax")).api_output.structured_result;
    assert.equal(result.summary.contact_number, undefined);
    assert.equal(analyse(byId("council_tax")).structured_output.extractor_internal.contact_number,
      "020 8583 4242", "but it IS on the extractor, which is the point of landing it");
  });
});
