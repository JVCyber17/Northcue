// Guards the class of defect where a card reassures a reader whose document the
// engine has already rated serious.
//
// The shape: trust and severity are computed from disjoint inputs, so a genuine
// bailiff letter is trust=high AND severity=urgent at the same time. Any
// function that answers "is this document worrying?" by reading a trust field,
// a confidence field, a category, or an empty signals array will get the wrong
// answer on exactly the documents where being wrong matters most.
//
// buildBanner was immunised against this in an earlier audit by placing an
// is_high_stakes branch above its trust branches. inferHelpfulNote was missed,
// and shipped "This looks like a normal formal letter." on a notice of
// enforcement. buildStructuredCardWarning was missed too, and dropped the
// urgent warning from the deadline card on the same two documents.
//
// One test per site, so a future change that breaks one is identifiable from
// the failure rather than from a single composite assertion going red.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const englishBank = require(path.join(__dirname, "..", "public", "i18n", "templates-en.js"));

const APP_JS = path.join(__dirname, "..", "public", "app.js");

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "severity-contradiction-test" }
  });
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// Sentences that tell a reader there is nothing much to worry about. None of
// them may appear on a document the engine has rated high stakes or urgent.
// This list is the denylist, not the whole safety property: it catches the
// phrasings that have actually shipped, and grows when a new one is written.
const REASSURANCES = [
  /normal formal letter/i,
  /keep this with your records/i,
  /looks like a normal document/i,
  /this looks like information only/i,
  /looks like a document sent by you/i,
  /looks like an outgoing document/i,
  /template with blank fields/i,
  /no major trust issue found/i
];

function seriousDocuments() {
  return CORPUS.map((entry) => {
    const run = analyse(entry.text);
    return {
      id: entry.id,
      trust: run.structured_output.trust_internal,
      cards: run.api_output.structured_result.cards,
      displayCards: run.api_output.cards
    };
  }).filter((row) => row.trust.is_high_stakes || ["high", "urgent"].includes(row.trust.severity_level));
}

test("site 1: inferHelpfulNote must not call a serious letter normal", async (t) => {
  await t.test("no high stakes document gets a reassuring card 6", () => {
    const offenders = [];
    seriousDocuments().forEach((row) => {
      const card6 = row.cards[5].simple_explanation;
      if (REASSURANCES.some((pattern) => pattern.test(card6))) {
        offenders.push(row.id + ": " + card6);
      }
    });
    assert.deepEqual(offenders, [],
      "card 6 reassured the reader on a document the engine rated serious");
  });

  await t.test("the enforcement notice gets the high stakes note", () => {
    // The defect verbatim: trust=high and severity=urgent on the same run, and
    // the trust branch answered first.
    const run = analyse(byId("bailiff_enforcement"));
    assert.equal(run.structured_output.trust_internal.trust_assessment, "high");
    assert.equal(run.structured_output.trust_internal.severity_level, "urgent");
    assert.match(run.api_output.structured_result.cards[5].simple_explanation,
      /^This looks like an important letter\./);
  });

  await t.test("the letter before action no longer gets filing advice", () => {
    // legal_solicitor is trust=medium, so it fell through to the extractor's
    // own note, which is itself severity blind and said "Keep this with your
    // records in case you need it later." on a 14 day legal action threat.
    const run = analyse(byId("legal_solicitor"));
    assert.equal(run.structured_output.trust_internal.trust_assessment, "medium");
    assert.equal(run.structured_output.trust_internal.severity_level, "high");
    assert.doesNotMatch(run.api_output.structured_result.cards[5].simple_explanation,
      /keep this with your records/i);
  });

  await t.test("low trust still outranks high stakes, so scam wording survives", () => {
    // The guard carries trust_assessment !== "low" for this reason. A document
    // that is both suspicious and serious must keep the scam wording, because
    // "check the original document" is the wrong instruction for a scam.
    const scamAndSerious = [
      "FINAL WARNING",
      "Notice of enforcement. Bailiff action will follow.",
      "Pay immediately using gift card codes to avoid enforcement.",
      "Send the codes to this number today."
    ].join("\n");
    const run = analyse(scamAndSerious);
    assert.equal(run.structured_output.trust_internal.trust_assessment, "low");
    assert.match(run.api_output.structured_result.cards[5].simple_explanation,
      /Do not use links or numbers/);
  });

  await t.test("a multi letter upload still keeps its own note", () => {
    // The multi letter decline outranks everything: nothing in the upload can
    // be attributed to one letter, so no per letter note may be asserted.
    const run = analyse(byId("multi_document"));
    assert.match(run.api_output.structured_result.cards[5].simple_explanation,
      /one letter at a time/i);
  });

  await t.test("the new sentence exists in the English bank", () => {
    // An engine sentence that is not in the bank renders in English in every
    // other language. adding-a-bank-sentence.md, step 1.
    const emitted = analyse(byId("bailiff_enforcement")).api_output.structured_result.cards[5].simple_explanation;
    const exactValues = Object.values(englishBank.exact);
    assert.ok(exactValues.includes(emitted),
      "card 6's new sentence is not an exact entry in templates-en.js");
  });
});

test("site 2: an empty severity_signals array is not evidence of calm", async (t) => {
  // The stakes floor (raiseSeverityTo) can make a document urgent without
  // adding anything to severity_signals, because the floor is driven by
  // detectSeriousDocumentSignals and the array is driven by detectSeveritySignals.
  await t.test("the two enforcement notices are urgent with no signals", () => {
    ["bailiff_enforcement", "ocr_enforcement"].forEach((id) => {
      const trust = analyse(byId(id)).structured_output.trust_internal;
      assert.equal(trust.severity_level, "urgent", id);
      assert.deepEqual(trust.severity_signals, [], id + ": the premise of this test has changed");
    });
  });

  await t.test("no card on an urgent document is left without a warning", () => {
    const offenders = [];
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      if (run.structured_output.trust_internal.severity_level !== "urgent") return;
      run.api_output.structured_result.cards.forEach((card) => {
        if (!card.warning) offenders.push(entry.id + " card " + card.card_number);
      });
    });
    assert.deepEqual(offenders, [],
      "an urgent document had a card with no warning");
  });

  await t.test("the deadline card specifically carries it", () => {
    // This is the card the defect silenced: the one card whose whole job is
    // when to act, on a notice giving a date before agents attend.
    ["bailiff_enforcement", "ocr_enforcement"].forEach((id) => {
      const cards = analyse(byId(id)).api_output.structured_result.cards;
      const deadlineCard = cards.find((card) => card.card_type === "when_does_it_matter");
      assert.equal(deadlineCard.warning, "This looks important. Do not ignore it.", id);
    });
  });

  await t.test("scam wording still outranks the urgent warning", () => {
    const run = analyse(byId("scam_phishing"));
    assert.equal(run.structured_output.trust_internal.processing_mode, "verification_only");
    run.api_output.structured_result.cards.forEach((card) => {
      assert.match(card.warning, /suspicious/i);
    });
  });
});

test("site 3: the card 1 sub line must not deny card 1", async (t) => {
  // shortCardExplanation lives in public/app.js, which is not a module. Both
  // functions read only `latestResult` and `t`, so they can be lifted out and
  // given those as parameters. This tests behaviour, not the presence of a
  // guard, so rewording the condition will not silently pass.
  function loadChooser(trust) {
    const source = fs.readFileSync(APP_JS, "utf8");
    const helper = source.match(/function uploadWasHardToRead\(\)[\s\S]*?\n}/);
    const chooser = source.match(/function shortCardExplanation\(card\)[\s\S]*?\n}/);
    assert.ok(helper, "uploadWasHardToRead was not found in public/app.js");
    assert.ok(chooser, "shortCardExplanation was not found in public/app.js");
    const build = new Function("latestResult", "t",
      helper[0] + "\n" + chooser[0] + "\nreturn shortCardExplanation;");
    return build(trust === undefined ? undefined : { trust }, (key) => key);
  }

  const CLEAR = "journey.explainWhatIsThis";
  const HARD = "journey.explainWhatIsThisHardToRead";
  const card1 = { id: "what_is_this" };

  await t.test("a clean upload still says the text can be read", () => {
    assert.equal(loadChooser({ input_quality: "good", processing_mode: "normal" })(card1), CLEAR);
  });

  await t.test("caution mode on a clean upload is not a readability problem", () => {
    // processing_mode is "caution" on 14 of the 30 corpus documents, including
    // clean council tax and water bills. It conflates readability with
    // templates, outgoing mail, multi letter uploads and trust, so it is the
    // wrong field to gate this on.
    assert.equal(loadChooser({ input_quality: "good", processing_mode: "caution" })(card1), CLEAR);
  });

  await t.test("borderline and poor input quality say the text was hard to read", () => {
    assert.equal(loadChooser({ input_quality: "borderline", processing_mode: "caution" })(card1), HARD);
    assert.equal(loadChooser({ input_quality: "poor", processing_mode: "unsupported" })(card1), HARD);
  });

  await t.test("an unsupported upload never claims key points were pulled out", () => {
    assert.equal(loadChooser({ input_quality: "good", processing_mode: "unsupported" })(card1), HARD);
  });

  await t.test("missing trust falls back to the original wording", () => {
    assert.equal(loadChooser(undefined)(card1), CLEAR);
  });

  await t.test("every OCR damaged corpus document takes the hard to read branch", () => {
    // The live contradiction: card 1 said the text quality was too low to read
    // amounts or dates, and the line underneath said it could be read clearly.
    ["ocr_council_tax", "ocr_energy_bill", "ocr_enforcement", "ocr_heavy_damage", "photo_snippet_short"]
      .forEach((id) => {
        const trust = analyse(byId(id)).api_output.trust;
        assert.equal(loadChooser(trust)(card1), HARD, id);
      });
  });
});

test("site 4: a serious document never takes the reading aid path", async (t) => {
  // The aid path is entered on document_category alone. Housing and
  // legal_or_court are not on the supported whitelist, so a possession notice
  // and a court fine were routed onto a path that answers "What matters most?"
  // with a sender caveat and retitles card 5 away from the consequence
  // question, while a less serious solicitor letter kept both.
  await t.test("no high stakes document carries the aid path's signals", () => {
    const offenders = [];
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      if (!run.structured_output.trust_internal.is_high_stakes) return;
      if (run.structured_output.extractor_internal.readable_unsupported_signals) {
        offenders.push(entry.id);
      }
    });
    assert.deepEqual(offenders, [], "a serious document was read by the reading aid");
  });

  await t.test("the severity sentence reaches card 2 on both", () => {
    // inferMostImportantPoint is never called on the aid path, so the engine's
    // one severity sentence never appeared anywhere in the output.
    ["eviction_possession", "court_fine"].forEach((id) => {
      assert.equal(analyse(byId(id)).api_output.structured_result.cards[1].simple_explanation,
        "This is urgent. You may need to act today.", id);
    });
  });

  await t.test("card 5 asks the consequence question and carries the consequence", () => {
    const eviction = analyse(byId("eviction_possession")).api_output.structured_result.cards[4];
    assert.equal(eviction.title, "What could happen if I ignore it?");
    assert.match(eviction.simple_explanation, /possession of your home/);

    const fine = analyse(byId("court_fine")).api_output.structured_result.cards[4];
    assert.equal(fine.title, "What could happen if I ignore it?");
    assert.match(fine.simple_explanation, /passed to bailiffs for enforcement/);
  });

  await t.test("the human review flag and its reason survive the diversion", () => {
    // The aid path forced these, for a reason that still holds once the
    // document is diverted off it. Dropping them would have flipped a
    // possession notice from needing a human check to not needing one.
    ["eviction_possession", "court_fine"].forEach((id) => {
      const extraction = analyse(byId(id)).structured_output.extractor_internal;
      assert.equal(extraction.needs_human_review, true, id);
      assert.equal(extraction.review_reason, "This readable document type is not fully supported yet.", id);
    });
  });

  await t.test("routine letters still take the reading aid", () => {
    // The guard must divert serious documents only. housing_letter is the same
    // category as the possession notice but is not high stakes.
    const run = analyse(byId("housing_letter"));
    assert.equal(run.structured_output.trust_internal.is_high_stakes, false);
    assert.ok(run.structured_output.extractor_internal.readable_unsupported_signals,
      "an ordinary housing letter must keep the reading aid");
  });
});

test("site 5: the advice boundary caveat follows the category, not the path", async (t) => {
  const CAVEAT = /not fully trained for this type yet/;

  await t.test("housing and court letters carry it off the aid path", () => {
    ["eviction_possession", "court_fine"].forEach((id) => {
      const run = analyse(byId(id));
      assert.ok(!run.structured_output.extractor_internal.readable_unsupported_signals,
        id + ": premise, this document is off the aid path");
      const keyPoints = run.api_output.structured_result.cards[0].key_points;
      assert.ok(keyPoints.some((point) => CAVEAT.test(point)),
        id + ": card 1 lost the reading aid caveat. Key points were " + JSON.stringify(keyPoints));
    });
  });

  await t.test("documents still on the aid path keep it too", () => {
    const keyPoints = analyse(byId("housing_letter")).api_output.structured_result.cards[0].key_points;
    assert.ok(keyPoints.some((point) => CAVEAT.test(point)));
  });

  await t.test("nothing else gains it", () => {
    // The caveat must not spread to the document types the engine IS trained
    // for, or it stops meaning anything. Stated as the invariant rather than a
    // list: it appears when and only when the document is on the aid path or
    // its category is one the engine is not fully trained for.
    const wrong = [];
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      const onAidPath = Boolean(run.structured_output.extractor_internal.readable_unsupported_signals);
      const notTrainedCategory = ["housing", "legal_or_court"]
        .includes(run.structured_output.trust_internal.document_category);
      const shown = run.api_output.structured_result.cards[0].key_points.some((point) => CAVEAT.test(point));
      if (shown !== (onAidPath || notTrainedCategory)) {
        wrong.push(entry.id + ": shown=" + shown + " aid=" + onAidPath + " category=" + notTrainedCategory);
      }
    });
    assert.deepEqual(wrong, []);
  });

  await t.test("fully supported letters are unaffected", () => {
    ["council_tax", "energy_bill"].forEach((id) => {
      const keyPoints = analyse(byId(id)).api_output.structured_result.cards[0].key_points;
      assert.ok(!keyPoints.some((point) => CAVEAT.test(point)), id);
    });
  });
});

test("site 6: a possession notice states its deadline without the word pay", async (t) => {
  // The precondition for routing these documents off the aid path. The aid
  // path found 12 September through its own date selection; extractDeadline
  // did not, because the deadline label vocabulary had "pay by" and "due by"
  // but nothing a possession notice actually writes.
  await t.test("eviction_possession keeps its deadline", () => {
    const run = analyse(byId("eviction_possession"));
    assert.equal(run.structured_output.extractor_internal.deadline, "12 September 2026");
    assert.equal(run.api_output.structured_result.summary.main_date, "12 September 2026");
  });

  await t.test("card 4 calls it a deadline rather than listing it", () => {
    const card4 = analyse(byId("eviction_possession")).api_output.structured_result.cards[3];
    assert.equal(card4.simple_explanation, "Due by 12 September 2026.");
    assert.doesNotMatch(card4.simple_explanation, /\btoday\b/,
      "the junk token scraped from 'Rent arrears as at today' must not sit beside the real date");
  });

  await t.test("the new label shapes bind on their own", () => {
    assert.equal(co.selectDeadline("You must clear the arrears by 12 September 2026.").value, "12 September 2026");
    assert.equal(co.selectDeadline("You must vacate the property by 3 October 2026.").value, "3 October 2026");
    assert.equal(co.selectDeadline("The balance must be cleared by 14 November 2026.").value, "14 November 2026");
  });

  await t.test("no corpus document loses a deadline to the wider vocabulary", () => {
    // The risk of widening a governing vocabulary is a false deadline, not a
    // lost one, so both directions are checked: every document that had a
    // deadline still has the same one.
    const EXPECTED = {
      council_tax: "1 April 2026", energy_bill: "28 May 2026", water_bill: "30 June 2026",
      gov_hmrc: "31 July 2026", eviction_possession: "12 September 2026", court_fine: "30 September 2026"
    };
    Object.entries(EXPECTED).forEach(([id, date]) => {
      assert.equal(analyse(byId(id)).api_output.structured_result.summary.main_date, date, id);
    });
    // And nothing calm gained one it should not have.
    ["bill_in_credit", "medical_letter", "blank_template", "outgoing_letter"].forEach((id) => {
      assert.equal(analyse(byId(id)).api_output.structured_result.summary.main_date, null, id);
    });
  });
});

test("the class: no serious document may carry a reassurance on any card", async (t) => {
  await t.test("across every corpus document, every card, both card sets", () => {
    // Wider than the three sites: this is the property the sites were each
    // breaking. A new function that reassures on a serious document fails here
    // even if none of the site tests above touch it.
    const offenders = [];
    seriousDocuments().forEach((row) => {
      row.cards.forEach((card) => {
        const text = card.title + " " + card.simple_explanation + " " + (card.key_points || []).join(" ");
        REASSURANCES.forEach((pattern) => {
          if (pattern.test(text)) offenders.push(row.id + " card " + card.card_number + ": " + card.simple_explanation);
        });
      });
      (row.displayCards || []).forEach((card) => {
        if (REASSURANCES.some((pattern) => pattern.test(card.short_answer || ""))) {
          offenders.push(row.id + " display " + card.id + ": " + card.short_answer);
        }
      });
    });
    assert.deepEqual(offenders, [],
      "a document the engine rated serious carried reassuring card text");
  });

  await t.test("the guard would catch a reintroduction", () => {
    // Proves the denylist is live rather than vacuously passing.
    assert.ok(REASSURANCES.some((pattern) => pattern.test("This looks like a normal formal letter.")));
    assert.ok(seriousDocuments().length >= 5, "the corpus must still hold serious documents to check");
  });
});
