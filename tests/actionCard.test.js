// Guards what cards 3 and 5 are allowed to say: the two slots where a sentence
// lifted out of the document can reach the reader.
//
// extractActions has two mechanisms. Four literal probes push lines Northcue
// WROTE, and six obligation patterns lift a sentence out of the DOCUMENT and
// push it verbatim. The relationship between them was the defect: the composed
// probes are gated on long fragile vocabulary, the raw path on "you must", two
// short words damage rarely touches. So OCR removed the safe answer and left
// the unsafe one, and card 3 on ocr_enforcement read
//
//   "Am0unt outstanding: £1,247.00 You must c0ntact us on 0333 320 122 by
//    3September 2026."
//
// in the engine's normal confident register, on an enforcement notice, four
// lines of code away from a branch that had just nulled the deadline on the
// same document for being unreliable.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "action-card-test" }
  });
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// The same signature estimateOcrGarbling uses: a digit sandwiched between
// letters, or a digit immediately before an uppercase letter.
function garbledTokens(text) {
  return String(text || "").split(/\s+/)
    .map((token) => token.replace(/^[^a-zA-Z0-9£]+|[^a-zA-Z0-9]+$/g, ""))
    .filter((token) => token.length >= 4)
    .filter((token) => /[a-zA-Z][0-9][a-zA-Z]/.test(token) || /[0-9][A-Z]/.test(token));
}

test("fix 1: a garbled document never shows a sentence lifted from itself", async (t) => {
  await t.test("card 3 declines instead of quoting the damage", () => {
    const run = analyse(byId("ocr_enforcement"));
    assert.equal(run.structured_output.trust_internal.garbled_by_ocr, true, "premise");
    const card = run.api_output.structured_result.cards[2];
    assert.equal(card.simple_explanation,
      "Check the original document to see whether a response or action is needed.");
    assert.deepEqual(garbledTokens(card.simple_explanation), []);
  });

  await t.test("no action slot on any garbled document carries damaged source text", () => {
    // Stated as the property rather than as one document, so a new garbled
    // fixture is covered without editing this test.
    const offenders = [];
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      if (!run.structured_output.trust_internal.garbled_by_ocr) return;
      const source = new Set(garbledTokens(entry.text));
      const structured = run.api_output.structured_result;
      const slots = [
        ["card 3 explanation", structured.cards[2].simple_explanation],
        ["card 3 action_needed", structured.cards[2].action_needed],
        ["card 3 key points", (structured.cards[2].key_points || []).join(" ")],
        ["summary.main_action", structured.summary.main_action]
      ];
      slots.forEach(([slot, value]) => {
        garbledTokens(value).forEach((token) => {
          if (source.has(token)) offenders.push(entry.id + " " + slot + ": " + token);
        });
      });
    });
    assert.deepEqual(offenders, []);
  });

  await t.test("a composed line that survived the damage is kept", () => {
    // The decline is the fallback, not the answer. When a safe probe still
    // matched, the reader gets the real action.
    // Built from the real garbled document so input_quality stays "borderline".
    // A short synthetic fixture scores "poor", which takes the unsupported path
    // and never reaches the branch under test.
    const text = byId("ocr_enforcement") + "\nPlease contact us about this notice.";
    const run = analyse(text);
    assert.equal(run.structured_output.trust_internal.garbled_by_ocr, true, "premise");
    assert.equal(run.api_output.structured_result.cards[2].simple_explanation,
      "Contact the sender using trusted contact details.");
  });

  await t.test("the decline uses vocabulary that already exists", () => {
    // adding-a-bank-sentence.md: an engine sentence not in the bank renders in
    // English for every other language. These two were already banked.
    const languages = require(path.join(__dirname, "..", "public", "i18n", "config.js"))
      .languages.map((entry) => entry.code);
    languages.forEach((code) => {
      const bank = require(path.join(__dirname, "..", "public", "i18n", "templates-" + code + ".js"));
      assert.ok(bank.exact["tpl.readable.action_check"], code + " lacks the action decline");
      assert.ok(bank.exact["tpl.lowQuality.action"], code + " lacks the clearer copy line");
    });
  });
});

// The composed lines Northcue writes, lifted from the engine source so this
// test cannot drift from the set the engine actually uses.
function composedActions() {
  const source = require("node:fs").readFileSync(
    path.join(__dirname, "..", "src", "services", "clearStepsEngine.js"), "utf8");
  const block = source.match(/const COMPOSED_ACTIONS = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(block, "COMPOSED_ACTIONS was not found in the engine");
  // None of these lines contains a quote or a backslash, so a plain
  // quoted-run match is enough and needs no escaping.
  return new Set((block[1].match(/"[^"]*"/g) || []).map((quoted) => JSON.parse(quoted)));
}

test("fix 2: a composed line always outranks a sentence from the document", async (t) => {
  const COMPOSED = composedActions();

  await t.test("across every corpus document", () => {
    // normalizeActionLine takes actions[0] as the card 3 headline, so this is
    // the property that keeps a raw sentence out of the instruction slot.
    const offenders = [];
    CORPUS.forEach((entry) => {
      const actions = analyse(entry.text).structured_output.extractor_internal.actions || [];
      if (!actions.some((action) => COMPOSED.has(action))) return;
      if (!COMPOSED.has(actions[0])) {
        offenders.push(entry.id + ": headline is raw text: " + JSON.stringify(actions[0]));
      }
    });
    assert.deepEqual(offenders, []);
  });

  await t.test("a raw sentence may still be a key point", () => {
    // The rule demotes raw text, it does not delete it. On the clean
    // enforcement notice the document's own sentence is still carried.
    const actions = analyse(byId("bailiff_enforcement")).structured_output.extractor_internal.actions;
    assert.ok(COMPOSED.has(actions[0]), "the headline must be composed");
    assert.ok(actions.slice(1).some((action) => !COMPOSED.has(action)),
      "the document's own sentence must still be available as a key point");
  });

  await t.test("the guarantee holds when the document states the obligation first", () => {
    // Moving the obligation sentence above the line that triggers the composed
    // probe must not change which one leads.
    const text = [
      "Hounslow Borough Council",
      "Council tax reminder",
      "Reference: CT-88213",
      "You must tell us if anyone over 18 moves into the property.",
      "Amount to pay: £120.00",
      "Please contact us if you cannot pay by 1 April 2026."
    ].join("\n");
    const actions = analyse(text).structured_output.extractor_internal.actions;
    assert.ok(COMPOSED.has(actions[0]),
      "headline was " + JSON.stringify(actions[0]));
  });

  await t.test("with no composed line there is nothing to outrank", () => {
    // Stated so the limit of this rule is explicit rather than assumed. A clean
    // document whose only signal is an obligation still leads with that
    // sentence, which is correct: it is the only thing the engine knows.
    const text = [
      "Springwell Primary School",
      "Reference: SW/2026/1180",
      "Date: 12 May 2026",
      "Dear Parent or Carer",
      "We are writing about the school records we hold for your child.",
      "You must tell us if your home address changes during the school year."
    ].join("\n");
    const actions = analyse(text).structured_output.extractor_internal.actions;
    if (!actions.some((action) => COMPOSED.has(action))) {
      assert.ok(!COMPOSED.has(actions[0]), "premise: no composed line fired here");
    }
  });
});

test("fix 3: a lifted sentence starts at its own line", async (t) => {
  // extractSentenceAround walked back through the text BEFORE the match, so a
  // match at the start of its line could never see that line's own start. The
  // walk landed one line early and swept the previous line in, on clean
  // documents as well as damaged ones.
  const EXPECTED = {
    bailiff_enforcement: "You must contact us on 0333 320 122 by 3 September 2026.",
    eviction_possession: "You must clear the arrears by 12 September 2026.",
    benefits_dwp: "You must report any change in your circumstances within one month."
  };

  for (const [id, sentence] of Object.entries(EXPECTED)) {
    await t.test(id + " carries its own sentence and nothing above it", () => {
      const actions = analyse(byId(id)).structured_output.extractor_internal.actions;
      assert.ok(actions.includes(sentence),
        id + " actions were " + JSON.stringify(actions));
      assert.ok(sentence.startsWith("You must"),
        "the sentence must begin where the document begins it");
    });
  }

  await t.test("no lifted sentence carries a field label from the line above", () => {
    // The old output began "Amount outstanding: £1,247.00 You must contact us".
    // The existing guard rejects two or more "Label: value" markers, so exactly
    // one slipped through.
    const offenders = [];
    CORPUS.forEach((entry) => {
      const actions = analyse(entry.text).structured_output.extractor_internal.actions || [];
      actions.forEach((action) => {
        const obligation = action.search(/\b(?:You must|You are required to|You need to)\b/);
        if (obligation > 0) offenders.push(entry.id + ": " + JSON.stringify(action));
      });
    });
    assert.deepEqual(offenders, []);
  });

  await t.test("a genuine leading clause is still kept", () => {
    // The walk-back exists to preserve conditional openings. Narrowing it must
    // not lose them.
    const text = [
      "Hounslow Borough Council",
      "Council tax reminder",
      "Reference: CT-88213",
      "If anyone over 18 moves into the property, you must tell us within 21 days.",
      "Amount to pay: £120.00"
    ].join("\n");
    const actions = analyse(text).structured_output.extractor_internal.actions;
    assert.ok(actions.some((action) => action.startsWith("If anyone over 18")),
      "actions were " + JSON.stringify(actions));
  });
});

test("O-9: card 5 never quotes a document we have called unreliable", async (t) => {
  // Card 5 quotes the document's own consequence sentence verbatim when
  // has_consequence is true. That is right on a clean letter and wrong on a
  // garbled one, for the same reason the action card was.
  //
  // Until this guard existed the behaviour was correct only because the
  // garbled branch happened not to set the key. Anyone completing that return
  // object for tidiness would have reintroduced the defect with nothing
  // failing, which is what this test exists to stop.
  const DAMAGED_WITH_RISK = byId("ocr_enforcement") +
    "\nIf you do not pay, the debt will be passed to a debt collection agency and may affect your credit rating.";

  await t.test("the risk phrase is undamaged, so the guard is what stops it", () => {
    // Without this the test could pass because the phrase failed to match,
    // which would prove nothing.
    assert.match(DAMAGED_WITH_RISK, /debt collection agency/);
    assert.match(DAMAGED_WITH_RISK, /credit rating/);
  });

  await t.test("has_consequence is stated as false, not left undefined", () => {
    const extraction = analyse(DAMAGED_WITH_RISK).structured_output.extractor_internal;
    assert.equal(extraction.has_consequence, false, "must be stated, not absent");
    assert.equal(extraction.consequence_sentence, null);
  });

  await t.test("card 5 keeps the check form and quotes nothing", () => {
    const card = analyse(DAMAGED_WITH_RISK).api_output.structured_result.cards[4];
    assert.equal(card.title, "What should I check?");
    assert.doesNotMatch(card.simple_explanation, /debt collection agency|credit rating/,
      "card 5 must not quote a sentence out of a garbled document");
  });

  await t.test("across every garbled corpus document", () => {
    const offenders = [];
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      if (!run.structured_output.trust_internal.garbled_by_ocr) return;
      const extraction = run.structured_output.extractor_internal;
      if (extraction.has_consequence) offenders.push(entry.id + ": has_consequence is truthy");
      const card = run.api_output.structured_result.cards[4];
      if (card.title === "What could happen if I ignore it?") {
        offenders.push(entry.id + ": card 5 took the consequence form");
      }
    });
    assert.deepEqual(offenders, []);
  });

  await t.test("a clean document still quotes its consequence, which is the point", () => {
    // The guard must be about damage, not about consequences. Removing the
    // quote everywhere would be a regression, not a fix.
    const run = analyse(byId("court_fine"));
    assert.equal(run.structured_output.trust_internal.garbled_by_ocr, false, "premise");
    const card = run.api_output.structured_result.cards[4];
    assert.equal(card.title, "What could happen if I ignore it?");
    assert.match(card.simple_explanation, /bailiffs for enforcement/);
  });
});
