// STOP FALSE REASSURANCE, pinned. Founder's decision of 24 September 2026:
// the reassuring "No action needed right now." renders ONLY when the document
// itself clearly says no action is needed. Every other no-action state gets
// the honest decline "No clear next step found. Please check the full letter."
// and the simple view must never soften that decline to "Nothing needed right
// now." The frontend cannot be required under node (app.js touches the DOM at
// load), so the view half is source and dictionary pins in the repo's
// established style (see tests/simpleViewEssence.test.js).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { runClearStepsEngine } = require("../src/services/clearStepsEngine");

const ROOT = path.join(__dirname, "..");
const APP = fs.readFileSync(path.join(ROOT, "public", "app.js"), "utf8");
const ALL_LANGS = require(path.join(ROOT, "public", "i18n", "config.js")).languages
  .map((entry) => entry.code);

const NO_ACTION_LINE = "No action needed right now.";
const DECLINE_LINE = "No clear next step found. Please check the full letter.";
const SOFTENED_LINE = "Nothing needed right now.";

function runEngine(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto" }
  }).api_output;
}

function actionCards(output) {
  const compact = output.cards.find((card) => card.id === "what_do_i_need_to_do");
  const structured = output.structured_result.cards.find(
    (card) => card.card_id === "what_do_i_need_to_do"
  );
  assert.ok(compact, "compact action card is present");
  assert.ok(structured, "structured action card is present");
  return { compact, structured };
}

// The simple view softens exactly one sentence, through exactly one regex in
// app.js. Pin the regex source, then hold both halves of its contract: it
// matches the engine's reassuring line and can never match the decline, so
// "Nothing needed right now." is unreachable for the decline in any language
// (the softened line is a dictionary lookup keyed off this one test).
const SOFTEN_REGEX_SOURCE = '/^No action needed right now\\./.test(rawAction)';
const SOFTEN_REGEX = /^No action needed right now\./;

test("the simple-view softening regex is pinned and cannot match the decline", () => {
  assert.ok(APP.includes(SOFTEN_REGEX_SOURCE),
    "app.js must gate the softened line on the exact engine no-action sentence");
  assert.equal(SOFTEN_REGEX.test(NO_ACTION_LINE), true,
    "the reassuring line still softens");
  assert.equal(SOFTEN_REGEX.test(DECLINE_LINE), false,
    "the decline must never soften to 'Nothing needed right now.'");
});

// THE DECLINE STANDS IN SIMPLE VIEW (founder, 24 September 2026): when card 3
// carries the decline, the essence layer returns null so the decline itself
// renders, bank-translated in the reader's language, never "No urgent action
// shown." Pinned at source: the stand-down sits inside the card 3 branch,
// before the softened/hedged selection, and covers both prose paths (raw
// English regex, and the bank's own rendering for the served AI translation).
test("simple view shows the decline itself, not the hedged line", () => {
  // The shared detector: raw English regex for the floor path, bank
  // equality for the served AI translation. Every consumer routes here.
  const helperStart = APP.indexOf("function isDeclineLine(");
  assert.ok(helperStart > -1, "the shared isDeclineLine helper exists");
  const helper = APP.slice(helperStart, APP.indexOf("function servedActionAnswer("));
  assert.ok(helper.includes("/^No clear next step found\\./.test(raw)"),
    "the helper matches the raw engine English");
  assert.ok(helper.includes("raw === translatedEngineText(ESSENCE_DECLINE_LINE).text"),
    "the helper matches the bank's own rendering for the AI path");

  const branchStart = APP.indexOf('if (card.id === "what_do_i_need_to_do")');
  assert.ok(branchStart > -1, "the card 3 essence branch exists");
  const branch = APP.slice(branchStart, APP.indexOf('if (card.id === "when_is_it_due")', branchStart));
  const standDown = branch.indexOf("if (isDeclineLine(rawAction))");
  const softenPick = branch.indexOf('t("journey.essence.nothingNeeded")');
  assert.ok(standDown > -1, "the decline stand-down must exist in the card 3 branch");
  assert.ok(standDown < softenPick,
    "the stand-down must run before any softened or hedged line is chosen");
  assert.ok(APP.includes('const ESSENCE_DECLINE_LINE = ' + JSON.stringify(DECLINE_LINE) + ";"),
    "app.js must carry the decline constant verbatim");
});

// THE CHECK PANEL AND THE FULL VIEW FOLLOW THE DECLINE (founder, 24
// September 2026): the Document check hero shows the decline itself and
// never the no-rush softener; the urgency answer for a decline document
// is the existing hedged "Worth attention", never "No rush" (urgent, high
// and medium answers untouched); the full view drops the "small steps"
// hint and any bullet that repeats the decline.
test("the Document check hero leads with the decline and never softens it", () => {
  const fnStart = APP.indexOf("function checkNextStepText(");
  const fn = APP.slice(fnStart, APP.indexOf("function isRoutineCheck(", fnStart));
  assert.ok(fn.includes("const declineLeads = declineServed();"),
    "the hero must consult the decline state");
  assert.ok(fn.includes("? servedActionAnswer()"),
    "the hero base must be the served decline answer when it leads");
  assert.ok(fn.includes("!declineLeads && isRoutineCheck(trust, genuine)"),
    "the no-rush prefix must be unreachable when the decline leads");
});

test("the urgency answer for a decline document is the hedged one", () => {
  const fnStart = APP.indexOf("function checkUrgencyIndicator(");
  const fn = APP.slice(fnStart, APP.indexOf("function checkGenuineIndicator(", fnStart));
  const urgent = fn.indexOf('"urgent"');
  const high = fn.indexOf('"high"');
  const medium = fn.indexOf('"medium"');
  const declineSwap = fn.indexOf('if (declineServed()) return { text: t("check.urgencyMedium")');
  const lowReturn = fn.indexOf('t("check.urgencyLow")');
  assert.ok(urgent > -1 && high > -1 && medium > -1,
    "the higher urgency answers remain in place");
  assert.ok(declineSwap > -1, "the decline swap must exist");
  assert.ok(medium < declineSwap && declineSwap < lowReturn,
    "the swap must sit after the higher answers and before the no-rush answer");
});

test("the full view drops the small-steps hint and the decline bullet", () => {
  assert.ok(APP.includes('return isDeclineLine(String(card.short_answer || "")) ? "" : t("journey.explainWhatToDo");'),
    "the small-steps hint must be suppressed on the decline");
  assert.ok(APP.includes("!explanation.textContent || translatedAnswer.text.length >= LONG_ANSWER_CHARS"),
    "an empty hint must stay hidden");
  assert.ok(APP.includes("card.steps.filter((step) => !isDeclineLine(String(step)))"),
    "a step that repeats the decline must be filtered from the rendered list");
  assert.ok(APP.includes("isEssenceSafetyLine(String(rawSteps[stepIndex]))"),
    "the essence safety filter must classify the same filtered list it renders");
});

// CONDITIONAL WORDING NEVER REASSURES (founder, 24 September 2026): a
// no-action statement inside a conditional sentence is a promise about a
// world the reader may not be in, so it must not open the reassuring line.
const CONDITIONAL_LETTERS = [
  ["payment condition", [
    "Riverside Water Services",
    "Annual Review Statement",
    "Reference: RW/2026/1180",
    "",
    "Dear Customer,",
    "",
    "This statement sets out the annual review of your account.",
    "If you pay the full amount by 30 September, no further action is required.",
    "We will write to you again after the review period closes."
  ]],
  ["disagreement condition", [
    "Northgate Borough Housing Team",
    "Decision Notice",
    "Reference: NB/2026/4471",
    "",
    "Dear Ms Okafor,",
    "",
    "We have completed our review of your application.",
    "The decision is set out in the enclosed schedule.",
    "No further action is needed unless you disagree with this decision."
  ]],
  ["once-paid condition", [
    "Fenwick Property Management",
    "Account Statement",
    "Reference: FP/2026/2093",
    "",
    "Dear Resident,",
    "",
    "This statement confirms the position on your account for the year.",
    "Once you have paid, no action is needed.",
    "We thank you for your continued tenancy."
  ]],
  ["already-paid condition", [
    "Hollybrook Energy",
    "Account Update",
    "Reference: HB/2026/8841",
    "",
    "Dear Customer,",
    "",
    "This update sets out the position on your energy account.",
    "No action is required if you have already paid.",
    "Your next statement will follow in the usual way."
  ]]
];

// Which honest line renders depends on the letter's routing: the confident
// path serves the decline, the reading-aid paths serve their own check
// lines. The law under test is only that NONE of them is the reassuring
// sentence, in either card layer.
const HONEST_NO_REASSURANCE_LINES = new Set([
  DECLINE_LINE,
  "Check the original document to see whether a response or action is needed.",
  "Check the original document, or with the sender, whether you need to respond or send anything."
]);

test("a conditional no-action statement never opens the reassuring line", () => {
  CONDITIONAL_LETTERS.forEach(([name, lines]) => {
    const output = runEngine(lines.join("\n"));
    const { compact, structured } = actionCards(output);
    assert.equal(SOFTEN_REGEX.test(compact.short_answer), false,
      name + ": the reassuring line must not render, got: " + compact.short_answer);
    assert.ok(HONEST_NO_REASSURANCE_LINES.has(compact.short_answer),
      name + ": an honest decline or check line stands, got: " + compact.short_answer);
    assert.ok(!SOFTEN_REGEX.test(String(structured.simple_explanation)),
      name + ": the structured layer must not reassure either");
  });
});

test("a serious letter cut off before its instructions is never reassured", () => {
  const output = runEngine([
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
  ].join("\n"));

  assert.ok(["high", "urgent"].includes(output.trust.severity_level),
    "the cut-off enforcement letter must rate serious, got " + output.trust.severity_level);
  assert.equal(output.trust.processing_mode, "normal",
    "the fixture must stay on the normal path so the action default is what is under test");

  const { compact, structured } = actionCards(output);
  assert.equal(compact.short_answer, DECLINE_LINE,
    "compact card 3 must carry the honest decline");
  assert.ok(String(structured.simple_explanation).includes(DECLINE_LINE),
    "structured card 3 must carry the honest decline");
  [compact.short_answer, structured.simple_explanation,
    ...(compact.steps || []), ...(structured.key_points || [])].forEach((line) => {
    assert.equal(SOFTEN_REGEX.test(String(line)), false,
      "no served card 3 line may be the reassuring sentence: " + line);
    assert.ok(!String(line).includes(SOFTENED_LINE),
      "the softened line never comes from the engine");
  });
});

test("a letter that clearly says no action is needed keeps the reassuring line", () => {
  const output = runEngine([
    "Northfield Council",
    "Confirmation of Direct Debit",
    "Reference: DD/2026/77091",
    "",
    "Dear Resident,",
    "",
    "This letter confirms that your direct debit for council tax has been set up.",
    "Payments of £95.00 will be collected on the 1st of each month.",
    "No further action is needed on your part.",
    "Please keep this letter for your records."
  ].join("\n"));

  const { compact, structured } = actionCards(output);
  assert.equal(compact.short_answer, NO_ACTION_LINE,
    "a clear no-action statement keeps the engine's reassuring line");
  assert.ok(String(structured.simple_explanation).includes(NO_ACTION_LINE),
    "the structured layer agrees");
  assert.equal(SOFTEN_REGEX.test(compact.short_answer), true,
    "the simple view may still soften this one, and only this one");
});

test("the decline is in the template bank in all ten languages", () => {
  const english = fs.readFileSync(path.join(ROOT, "public", "i18n", "templates-en.js"), "utf8");
  assert.ok(english.includes('"tpl.action.none_found": ' + JSON.stringify(DECLINE_LINE) + ","),
    "templates-en.js must carry the decline verbatim under tpl.action.none_found");
  ALL_LANGS.forEach((code) => {
    const bank = fs.readFileSync(path.join(ROOT, "public", "i18n", "templates-" + code + ".js"), "utf8");
    const match = bank.match(/"tpl\.action\.none_found":\s*"([^"]+)"/);
    assert.ok(match && match[1].trim() !== "",
      "templates-" + code + ".js must carry tpl.action.none_found");
    assert.ok(!/[–—]/.test(match[1]),
      "no em or en dash in the " + code + " decline sentence");
  });
});

// TRUST PANEL WORDING, pinned. Founder's decision of 24 September 2026: the
// panel reports what was checked, never authentication. English byte for
// byte; the nine translations hold presence, non-emptiness and the dash law
// until their native review (NATIVE_REVIEW.md).
const TRUST_KEYS = ["check.genuineQuestion", "check.genuineHigh", "check.genuineHighReview"];
const APPROVED_TRUST_EN = {
  "check.genuineQuestion": "Any warning signs?",
  "check.genuineHigh": "No warning signs found",
  "check.genuineHighReview": "No warning signs found, worth a quick check"
};
const KEPT_TRUST_EN = {
  "check.genuineLow": "We're not sure, please take care",
  "check.genuineMediumClean": "Nothing unusual spotted",
  "check.genuineDefault": "Probably genuine, worth a check"
};

test("the trust panel never claims to authenticate, in any language", () => {
  const EN = fs.readFileSync(path.join(ROOT, "public", "i18n", "en.js"), "utf8");
  Object.entries(APPROVED_TRUST_EN).forEach(([key, value]) => {
    assert.ok(EN.includes('"' + key + '": ' + JSON.stringify(value) + ","),
      key + " must carry the approved wording verbatim");
  });
  Object.entries(KEPT_TRUST_EN).forEach(([key, value]) => {
    assert.ok(EN.includes('"' + key + '": ' + JSON.stringify(value) + ","),
      key + " (a kept state) must remain byte-identical");
  });
  assert.ok(!EN.includes('"Looks genuine"') && !EN.includes('"Is it genuine?"'),
    "the retired authentication wording must not survive in English");

  ALL_LANGS.forEach((code) => {
    const dictionary = require(path.join(ROOT, "public", "i18n", code + ".js"));
    TRUST_KEYS.forEach((key) => {
      const value = dictionary[key];
      assert.ok(typeof value === "string" && value.trim() !== "",
        code + " must carry " + key);
      assert.ok(!/[–—]/.test(value),
        "no em or en dash in " + code + " " + key);
    });
  });
});
