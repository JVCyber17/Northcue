// THE PROTECTED DECLINE ON THE AI PATHS, pinned through a stubbed provider.
//
// Founder's check of 24 September 2026: when the rules card 3 is the honest
// decline ("No clear next step found. Please check the full letter."), no
// model reply on the English phrasing path or the translation path may turn
// it back into reassurance. The stub below plays a hostile provider that
// rewrites card 3 as "no action is needed" in English and in Gujarati; the
// reader must still see the decline, or the rules cards.
//
// Stub style follows tests/translateAfterEnglish.test.js: fetch is replaced
// BEFORE the service loads, calls are told apart by their system prompts,
// and the envelope is the Responses API's { output_text }.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const config = require(path.join(ROOT, "public", "i18n", "config.js"));

const DECLINE_EN = "No clear next step found. Please check the full letter.";
const DECLINE_GU = require(path.join(ROOT, "public", "i18n", "templates-gu.js"))
  .exact["tpl.action.none_found"];
const REASSURE_EN = "No action is needed.";
const REASSURE_GU = "હમણાં કંઈ કરવાની જરૂર નથી."; // "nothing needs doing right now"

function tamperCard3(structuredResult, line) {
  const card = structuredResult.cards.find((c) => c.card_id === "what_do_i_need_to_do");
  card.simple_explanation = line;
  if (typeof card.read_aloud_text === "string") card.read_aloud_text = line;
  if (Array.isArray(card.key_points) && card.key_points.length) {
    card.key_points = card.key_points.map(() => line);
  }
  return structuredResult;
}

// The second hostile shape (founder, 24 September 2026): reassurance in
// OTHER cards. The phrasing reply appends "You do not need to do anything."
// to card 1's explanation and plants "There is nothing you need to do." as
// a card 1 key point; the translation reply is then FAITHFUL (a marker
// transform), so anything the English sweep missed would arrive marked in
// the served Gujarati.
const REASSURE_APPEND = "You do not need to do anything.";
const REASSURE_POINT = "There is nothing you need to do.";
const MARKER = "અનુવાદ "; // "translation " marker, as in translateAfterEnglish.test.js
let tamperMode = "card3"; // card3 | otherCards

function tamperOtherCards(structuredResult) {
  const first = structuredResult.cards[0];
  first.simple_explanation = String(first.simple_explanation || "") + " " + REASSURE_APPEND;
  if (!Array.isArray(first.key_points)) first.key_points = [];
  first.key_points.push(REASSURE_POINT);
  return structuredResult;
}

function markerTranslate(source) {
  const clone = JSON.parse(JSON.stringify(source));
  clone.cards.forEach((card) => {
    ["title", "simple_explanation", "read_aloud_text"].forEach((field) => {
      if (typeof card[field] === "string" && card[field]) card[field] = MARKER + card[field];
    });
    if (Array.isArray(card.key_points)) {
      card.key_points = card.key_points.map((point) => MARKER + point);
    }
  });
  return clone;
}

const captured = [];
const realFetch = global.fetch;
global.fetch = async (url, options) => {
  if (!String(url).includes("openai")) return realFetch(url, options);
  const body = JSON.parse(options.body);
  captured.push(body);
  const system = body.input.find((m) => m.role === "system").content;
  const user = body.input.find((m) => m.role === "user").content;

  if (system.startsWith("You translate Northcue cue cards")) {
    const source = JSON.parse(user);
    if (tamperMode === "otherCards") {
      // Faithful marker translation: proves what reached this call.
      return {
        ok: true, status: 200,
        json: async () => ({ output_text: JSON.stringify(markerTranslate(source)) }),
        text: async () => ""
      };
    }
    // Hostile translation: everything faithful except card 3, which comes
    // back as Gujarati reassurance. Shape and digit parity hold, and the
    // sentence is of the measured KEEP class for the gu vocabulary guard,
    // so only the protected-decline enforcement can stop it.
    const translated = tamperCard3(JSON.parse(JSON.stringify(source)), REASSURE_GU);
    return {
      ok: true, status: 200,
      json: async () => ({ output_text: JSON.stringify(translated) }),
      text: async () => ""
    };
  }

  // Hostile phrasing: return the fallback cards (parsed out of the prompt,
  // so shape and values validate) with the tamper for the current mode.
  const marker = "Fallback structured_result:\n";
  const start = user.indexOf(marker) + marker.length;
  const end = user.indexOf("\n\nDocument text");
  const fallback = JSON.parse(user.slice(start, end));
  const copy = JSON.parse(JSON.stringify(fallback));
  const candidate = tamperMode === "otherCards"
    ? tamperOtherCards(copy)
    : tamperCard3(copy, REASSURE_EN);
  return {
    ok: true, status: 200,
    json: async () => ({ output_text: JSON.stringify(candidate) }),
    text: async () => ""
  };
};

const ai = require(path.join(ROOT, "src", "services", "aiStructuredResultService"));
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));

// The cut-off enforcement letter: serious, normal mode, no obligation found,
// so the rules card 3 is the decline (pinned in noFalseReassurance.test.js).
const CUT_OFF_LETTER = [
  "Redbrook Enforcement Services",
  "Notice of Enforcement",
  "Reference: EN/2026/50412",
  "",
  "Dear Mr Patel,",
  "",
  "This notice concerns the outstanding balance recorded against your account.",
  "An enforcement agent or bailiff may visit the address above if the matter",
  "is not resolved. The next stage of enforcement is set out below, together",
  "with the steps you"
].join("\n");

async function runFor(language) {
  captured.length = 0;
  const rulesRun = runClearStepsEngine({
    extractedText: CUT_OFF_LETTER,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "decline-pin-" + language }
  });
  const fallbackCard = rulesRun.api_output.structured_result.cards.find(
    (c) => c.card_id === "what_do_i_need_to_do");
  assert.ok(String(fallbackCard.simple_explanation).startsWith(DECLINE_EN),
    "precondition: the rules card 3 carries the decline");
  const applied = await ai.applySafetyPassAndRecordAiStatus({
    rulesRun, extractedText: CUT_OFF_LETTER, language
  });
  return applied.api_output;
}

function servedCard3(output) {
  return output.structured_result.cards.find((c) => c.card_id === "what_do_i_need_to_do");
}

test("no provider reply can soften the decline", async (t) => {
  const savedKey = process.env.OPENAI_API_KEY;
  const savedArchitecture = config.launch.proseArchitecture;
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
  config.launch.proseArchitecture = "translate";

  try {
    await t.test("English phrasing path: reassurance in other cards is removed", async () => {
      tamperMode = "otherCards";
      const output = await runFor("en");
      const first = output.structured_result.cards[0];
      assert.ok(!String(first.simple_explanation).includes(REASSURE_APPEND),
        "the appended reassurance sentence must be swept from card 1, got: " + first.simple_explanation);
      assert.ok(String(first.simple_explanation).trim() !== "",
        "the swept explanation is never left blank");
      assert.ok(!(first.key_points || []).some((point) => String(point).includes(REASSURE_POINT)),
        "the planted reassurance key point must be swept");
      assert.ok(!JSON.stringify(output.structured_result).includes(REASSURE_APPEND) &&
        !JSON.stringify(output.structured_result).includes(REASSURE_POINT),
        "no served field anywhere may carry the reassurance");
    });

    await t.test("Gujarati: the reassurance never reaches the translation call", async () => {
      tamperMode = "otherCards";
      const output = await runFor("gu");
      assert.equal(captured.length, 2, "two provider calls");
      const translationInput = captured[1].input.find((m) => m.role === "user").content;
      assert.ok(!translationInput.includes(REASSURE_APPEND) && !translationInput.includes(REASSURE_POINT),
        "the translation call must receive the swept English cards");
      const served = JSON.stringify(output.structured_result);
      assert.ok(!served.includes(REASSURE_APPEND) && !served.includes(REASSURE_POINT),
        "no served Gujarati field may carry the reassurance, marked or not");
      assert.equal(servedCard3(output).simple_explanation, DECLINE_GU,
        "card 3 remains the bank's Gujarati decline");
    });

    await t.test("English phrasing path: the rules decline card is served", async () => {
      tamperMode = "card3";
      const output = await runFor("en");
      assert.equal(captured.length, 1, "an English reader makes one provider call");
      const card = servedCard3(output);
      assert.ok(String(card.simple_explanation).startsWith(DECLINE_EN),
        "served card 3 must carry the decline, got: " + card.simple_explanation);
      assert.ok(!JSON.stringify(card).includes(REASSURE_EN),
        "no field of served card 3 may carry the model's reassurance");
      assert.ok(!output.display_text.includes(REASSURE_EN),
        "display text follows the protected card");
      assert.ok(!output.tts_script.includes(REASSURE_EN),
        "read-aloud follows the protected card");
    });

    await t.test("Gujarati translation path: the bank decline is served", async () => {
      tamperMode = "card3";
      const output = await runFor("gu");
      assert.equal(captured.length, 2, "a launched reader makes two provider calls");
      const card = servedCard3(output);
      assert.equal(card.simple_explanation, DECLINE_GU,
        "served card 3 must be the bank's Gujarati decline");
      assert.ok(!JSON.stringify(card).includes(REASSURE_GU),
        "no field of served card 3 may carry the model's Gujarati reassurance");
      assert.ok(!JSON.stringify(card).includes(REASSURE_EN),
        "nor the English reassurance");
      assert.ok(output.display_text.includes(DECLINE_GU),
        "display text carries the Gujarati decline");
    });
  } finally {
    process.env.OPENAI_API_KEY = savedKey;
    config.launch.proseArchitecture = savedArchitecture;
  }
});
