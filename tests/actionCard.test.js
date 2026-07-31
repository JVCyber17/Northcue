// Guards what card 3 is allowed to say.
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
