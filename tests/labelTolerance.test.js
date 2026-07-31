// Guards OCR tolerance in the LABEL vocabularies, and its boundaries.
//
// A phone photograph substitutes digits for letters constantly. A damaged label
// is invisible to a literal match, so a document could carry a perfectly
// readable £214.63 next to a label the engine could not see, and decline.
//
// Tolerance is confined to AMOUNT_GOVERNS, AMOUNT_COMPETES, DATE_GOVERNS,
// DATE_COMPETES and GREETING. It is deliberately absent from the
// classification, scam and distrust vocabularies, and the tests at the bottom
// of this file are what stop it spreading there.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "label-tolerance-test" }
  });
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

const VOCAB = [].concat(co.AMOUNT_GOVERNS, co.AMOUNT_COMPETES, co.DATE_GOVERNS, co.DATE_COMPETES);
const CONFUSABLE = { o: "o0", i: "i1", l: "l1", e: "e3", a: "a4", s: "s5", g: "g9", b: "b6" };

test("tolerance recovers a damaged label", async (t) => {
  await t.test("the two documents this was built for gain their amounts", () => {
    assert.equal(analyse(byId("ocr_energy_bill")).api_output.structured_result.summary.main_amount,
      "£214.63", "Am0unt due");
    assert.equal(analyse(byId("ocr_enforcement")).api_output.structured_result.summary.main_amount,
      "£1,247.00", "Am0unt outstanding");
  });

  await t.test("a damaged governing label binds its value", () => {
    assert.equal(co.selectAmount("Am0unt due: £214.63").value, "£214.63");
    assert.equal(co.selectAmount("Am0unt 0utstanding: £1,247.00").value, "£1,247.00");
  });

  await t.test("the digit 1 is read as both i and l, which is why classes are needed", () => {
    // No single substitution map can do this: "instalment" wants i, "clear the
    // arrears by" wants l, and both appear as the digit 1.
    assert.ok(co.locateLabels("First 1nstalment due by 1 April", ["first instalment due by"]).length);
    assert.ok(co.locateLabels("C1ear the arrears by 12 September", ["clear the arrears by"]).length);
  });
});

test("tolerance stays 1:1, so every offset survives", async (t) => {
  await t.test("a match is exactly as long as its phrase", () => {
    CORPUS.forEach((entry) => {
      co.locateLabels(entry.text, VOCAB).forEach((hit) => {
        assert.equal(hit.end - hit.index, hit.phrase.length,
          entry.id + ": " + JSON.stringify(hit.phrase) + " matched a different length");
      });
    });
  });

  await t.test("each matched character is the phrase's letter or a confusable of it", () => {
    CORPUS.forEach((entry) => {
      co.locateLabels(entry.text, VOCAB).forEach((hit) => {
        entry.text.slice(hit.index, hit.end).toLowerCase().split("").forEach((ch, i) => {
          const want = hit.phrase[i];
          assert.ok((CONFUSABLE[want] || want).includes(ch),
            entry.id + ": " + JSON.stringify(hit.phrase) + " matched " +
            JSON.stringify(entry.text.slice(hit.index, hit.end)));
        });
      });
    });
  });

  await t.test("the document is never folded, because folding destroys values", () => {
    // Whole-document folding would recover labels and ruin what they point at.
    const fold = (s) => s.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s");
    assert.equal(fold("£214.63"), "£2l4.6e");
    assert.deepEqual(co.findAmounts(fold("Amount due: £214.63")).map((a) => a.value), [],
      "the folded form must not parse, which is why the document is left alone");
    assert.deepEqual(co.findAmounts("Am0unt due: £214.63").map((a) => a.value), ["£214.63"],
      "the original still parses, because only the label pattern is tolerant");
  });
});

test("damage must not make the engine more confident", async (t) => {
  // AMOUNT_COMPETES entries exist to make governingLabel DECLINE. Damage to a
  // guard removes a refusal rather than a claim, so without tolerance an
  // in-credit statement could read as a demand.
  await t.test("a damaged in credit guard still declines", () => {
    assert.ok(co.locateLabels("Your account is 1n cred1t by £83.86.", ["in credit"]).length,
      "the damaged guard must still be seen");
    assert.equal(co.selectAmount("Your account is 1n cred1t by £83.86, so there is nothing to pay."), null);
  });

  await t.test("a damaged total charge guard still loses to the real demand", () => {
    const chosen = co.selectAmount("T0tal charge for the year: £1,842.00\nAm0unt to pay: £1,381.50");
    assert.equal(chosen && chosen.value, "£1,381.50",
      "the discounted demand, not the pre-discount total");
  });

  await t.test("a damaged previous balance guard is still seen", () => {
    assert.ok(co.locateLabels("Prev1ous balance: £0.00", ["previous balance"]).length);
  });
});

test("the greeting zone survives a damaged greeting", async (t) => {
  // One damaged character used to move the NHS appointment back to the letter
  // date, re-opening the rule the greeting zone exists to enforce.
  await t.test("D3ar Patient keeps the appointment date", () => {
    const damaged = byId("appointment_nhs").replace("Dear Patient", "D3ar Patient");
    assert.equal(co.selectLetterDate(damaged).value, "5 June 2026");
    assert.equal(co.selectContentDate(damaged).value, "1 July 2026");
  });

  await t.test("the clean document is unchanged", () => {
    const clean = byId("appointment_nhs");
    assert.equal(co.selectLetterDate(clean).value, "5 June 2026");
    assert.equal(co.selectContentDate(clean).value, "1 July 2026");
  });
});

test("the boundaries of tolerance", async (t) => {
  await t.test("entries under five characters are matched literally", () => {
    // "less" folds out of "Reference: MZMZ-43713556" and "fee" out of
    // "Policy number: SF33485198". Neither recovers anything real, and across
    // 150,000 generated UK reference strings they were the only two entries
    // that collided at all.
    assert.deepEqual(co.locateLabels("Reference: MZMZ-43713556", ["less"]), []);
    assert.deepEqual(co.locateLabels("Policy number: SF33485198", ["fee"]), []);
    assert.ok(co.locateLabels("Less a discount of £50.00", ["less"]).length,
      "the literal must still match undamaged");
  });

  await t.test("no corpus document gains a false label match", () => {
    // Every tolerant hit across the corpus must fold back to its own phrase.
    CORPUS.forEach((entry) => {
      co.locateLabels(entry.text, VOCAB).forEach((hit) => {
        const slice = entry.text.slice(hit.index, hit.end).toLowerCase();
        const folded = slice.split("").map((ch, i) => {
          const want = hit.phrase[i];
          return (CONFUSABLE[want] || "").includes(ch) ? want : ch;
        }).join("");
        assert.equal(folded, hit.phrase, entry.id + ": " + JSON.stringify(slice));
      });
    });
  });

  await t.test("tolerance has NOT reached the classification vocabularies", () => {
    // The reason it must not: "gp" would become [g9]p and match the standing
    // charge "9p per day", which appears on essentially every UK energy bill.
    // This asserts the engine's behaviour, not just the absence of code.
    const bill = [
      "EDF Energy", "Your electricity bill", "Customer number: 220145879",
      "A daily standing charge of 9p applies to this account.",
      "Amount due: £214.63", "Please pay by 28 May 2026."
    ].join("\n");
    const trust = analyse(bill).structured_output.trust_internal;
    assert.notEqual(trust.document_category, "medical",
      "'9p per day' must never make an energy bill a medical document");
  });

  await t.test("tolerance has NOT reached the scam or distrust vocabularies", () => {
    const damaged = [
      "Hounslow Borough Council", "Council tax bill", "Reference: CT-88213",
      // Damaged forms of "final warning" and "act now". A tolerant scam
      // vocabulary would match these; a literal one must not.
      "F1nal warn1ng about your account.", "Act n0w to avoid further action.",
      "Amount to pay: £120.00", "Please pay by 1 April 2026."
    ].join("\n");
    const trust = analyse(damaged).structured_output.trust_internal;
    assert.deepEqual(trust.scam_signals, [],
      "scam detection must stay literal, so tolerance cannot manufacture a scam signal");
  });
});

test("the damaged sender is kept, and the caution covers it", async (t) => {
  // Tolerance cannot repair a sender: it matches damaged input against a known
  // vocabulary, and a name is not in any vocabulary, so there is nothing to
  // recover it to. Card 1 was hedging amounts and dates while stating the name
  // flatly, and the name is read from the same damaged text.
  await t.test("the name is still shown", () => {
    ["ocr_enforcement", "ocr_energy_bill"].forEach((id) => {
      const card = analyse(byId(id)).api_output.structured_result.cards[0];
      assert.match(card.simple_explanation, /Marst0n|Ener9y/,
        id + ": the sender must be kept, not declined");
    });
  });

  await t.test("the caution names the sender alongside amounts and dates", () => {
    ["ocr_enforcement", "ocr_energy_bill"].forEach((id) => {
      const card = analyse(byId(id)).api_output.structured_result.cards[0];
      assert.match(card.simple_explanation, /the sender's name, amounts or dates/,
        id + ": the hedge must cover the one thing the card names without it");
    });
  });

  await t.test("a garbled document with no sender keeps the narrower caution", () => {
    // tpl.summary.garbled names no sender, so widening its caution would claim
    // uncertainty about something it never states.
    const noSender = [
      "N0TICE OF ENF0RCEMENT", "Reference: EN-77120934",
      "Am0unt outstanding: £1,247.00",
      "You must c0ntact us on 0333 320 122 by 3September 2026.",
      "If paym3nt is not received an enf0rcement agent may attend your pr0perty.",
      "Further fees will be added to the am0unt outstanding on this acc0unt."
    ].join("\n");
    const run = analyse(noSender);
    if (run.structured_output.trust_internal.garbled_by_ocr) {
      const text = run.api_output.structured_result.cards[0].simple_explanation;
      if (!/appears to have sent/.test(text)) {
        assert.doesNotMatch(text, /the sender's name/,
          "a card that names no sender must not hedge one");
      }
    }
  });

  await t.test("a clean document is unaffected", () => {
    const card = analyse(byId("bailiff_enforcement")).api_output.structured_result.cards[0];
    assert.doesNotMatch(card.simple_explanation, /text quality is too low/);
  });
});
