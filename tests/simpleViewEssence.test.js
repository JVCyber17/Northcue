// THE TWO LAWS OF SIMPLE VIEW, pinned. Founder-approved 7 August 2026 and
// recorded in public/CLAUDE.md: compression is a privilege of routine post,
// and serious letters bypass compression entirely. Open in all ten
// languages since 23 August 2026, after real-user validation of the
// English lines and the founder's line-by-line verification of the
// Gujarati and Hindi sets. The frontend cannot be required under node
// (app.js touches the DOM at load), so these are source and dictionary
// pins in the repo's established style; the behavioural half is verified
// in the dev preview across languages, themes and widths.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const APP = fs.readFileSync(path.join(ROOT, "public", "app.js"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "public", "styles.css"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT, "public", "index.html"), "utf8");
const EN = fs.readFileSync(path.join(ROOT, "public", "i18n", "en.js"), "utf8");
const LANGS = require(path.join(ROOT, "public", "i18n", "config.js")).languages
  .map((entry) => entry.code).filter((code) => code !== "en");

// The founder-approved wording, byte for byte. A quiet edit fails loudly.
const APPROVED = {
  "journey.essence.whatIsThisWithSender": "{article} {typeLabel} from {sender}.",
  "journey.essence.whatIsThis": "{article} {typeLabel}.",
  "journey.essence.amountToPay": "{amount} to pay.",
  "journey.essence.amountNeutral": "{amount} appears in this letter.",
  "journey.essence.noUrgentAction": "No urgent action shown.",
  "journey.essence.nothingNeeded": "Nothing needed right now.",
  "journey.essence.dueBy": "By {date}.",
  "journey.essence.check": "Looks routine. Check the original if unsure.",
  "journey.essence.keepSafe": "Keep this letter safe.",
  "journey.seriousFullView": "This letter looks serious, so we are showing you everything."
};

test("the approved essence wording is exactly what ships", () => {
  Object.entries(APPROVED).forEach(([key, value]) => {
    assert.ok(EN.includes('"' + key + '": ' + JSON.stringify(value) + ","),
      key + " must carry the founder-approved wording verbatim");
  });
});

test("no em or en dash in any essence line", () => {
  Object.values(APPROVED).forEach((value) => {
    assert.ok(!/[–—]/.test(value), "dashes are banned in user-facing text");
  });
});

test("every language carries every essence key", () => {
  // Authored 23 August 2026 after the English lines passed real-user
  // validation; the deferral pin that stood here was removed together
  // with the DEFERRED_BY_FOUNDER carve-out in translationParity.test.js.
  // Exact parity now enforces slots and dashes; this pin holds presence.
  LANGS.forEach((code) => {
    const dictionary = require(path.join(ROOT, "public", "i18n", code + ".js"));
    Object.keys(APPROVED).forEach((key) => {
      assert.ok(typeof dictionary[key] === "string" && dictionary[key].trim() !== "",
        code + " must carry " + key);
    });
  });
});

test("the serious-letter bypass is wired as the law states", () => {
  // Severity high or urgent, or any processing mode other than normal.
  assert.match(APP, /severity_level === "high" \|\| trust\.severity_level === "urgent"/);
  assert.match(APP, /trust\.processing_mode !== "normal"/);
  // The bypass runs before the reader's choice is consulted.
  const applyBody = APP.slice(APP.indexOf("function applyDefaultSimpleView"),
    APP.indexOf("function applyDefaultSimpleView") + 600);
  assert.ok(applyBody.indexOf("seriousDocument()") < applyBody.indexOf("simpleViewChosen"),
    "the serious bypass must be checked before the reader's stored choice");
  // The toggle hides on serious documents; the calm line shows.
  assert.match(APP, /cardDetailToggle\?\.classList\.toggle\("hidden", serious\)/);
  assert.ok(HTML.includes('id="card-serious-note"'), "the bypass line exists in the markup");
});

test("the essence layer is open in every language, with no language gate", () => {
  // Opened 23 August 2026 after the founder's line-by-line verification
  // of the Gujarati and Hindi sets. essenceModeActive must consult the
  // view state and the document's seriousness only, never the language.
  const body = APP.slice(APP.indexOf("function essenceModeActive"),
    APP.indexOf("function essenceModeActive") + 300);
  assert.ok(!body.includes("getLanguage"),
    "essenceModeActive must not gate on the interface language");
  assert.match(body, /cards-simple/);
  assert.match(body, /seriousDocument\(\)/);
});

test("obligation wording is gated on the engine's own category", () => {
  const essence = APP.slice(APP.indexOf("function essenceLineFor"));
  assert.ok(essence.indexOf('document_category === "bill_or_payment"') <
    essence.indexOf("journey.essence.amountToPay"),
    "'to pay' renders only when the engine says bill_or_payment");
});

test("a stated consequence is never summarised away", () => {
  assert.match(APP, /CONSEQUENCE_CARD_TITLE\s*\?\s*null/,
    "the consequence-mode card must fall through to the engine's own line");
});

test("the safety lines survive simple view, in code and in both CSS blocks", () => {
  ["The document gives this phone number:", "Northcue is not fully trained",
    "The text quality is too low", "Only the first letter in this upload has been read"]
    .forEach((prefix) => {
      assert.ok(APP.includes(prefix), "safety prefix missing: " + prefix);
    });
  const exceptions = CSS.split("body.cards-simple .card-steps.safety-only").length - 1;
  assert.equal(exceptions, 2,
    "the safety-only display exception must exist in BOTH duplicated cards-simple blocks");
});

test("the default and the re-render are wired on both cards-ready paths", () => {
  const calls = APP.split("applyDefaultSimpleView();").length - 1;
  assert.ok(calls >= 2, "both cards-ready paths must apply the default");
  assert.match(APP, /if \(hasAnalysedDocument && latestResult && latestResult\.cards\) \{\s*\n?\s*renderCard\(\);/,
    "a mode change must re-render the current card");
});

// PHASE 4 BEHAVIOURAL PINS, the ten-language opening (23 August 2026).
// The detection rule: English anchors are read on the RAW served text,
// which is the engine's English on the floor path in every language; on
// translated model prose every detection takes its conservative branch.

test("translated model prose is detected by the served ai flag, non-English only", () => {
  const body = APP.slice(APP.indexOf("function translatedProseServed"),
    APP.indexOf("function translatedProseServed") + 400);
  assert.match(body, /getLanguage\(\) !== "en"/,
    "English sessions always keep full detection");
  assert.match(body, /debug\.ai\.ai_used/,
    "the AI path is identified by the served metadata, never guessed from text");
});

test("essence steps are classified on the raw step, never on the translated display text", () => {
  assert.match(APP, /isEssenceSafetyLine\(String\(\(card\.steps \|\| \[\]\)\[stepIndex\]\)\)/,
    "the filter must read card.steps, the raw engine English on the floor path");
  assert.ok(!/isEssenceSafetyLine\(translatedStep\.text\)/.test(APP),
    "filtering the translated display text hid bank-translated safety lines");
});

test("on translated model prose the step filter stands down and shows everything", () => {
  // A safety line must never be hidden by failing to recognise it. The
  // conservative branch shows every step rather than filtering blind.
  const filter = APP.slice(APP.indexOf("const shownSteps"), APP.indexOf("const shownSteps") + 400);
  assert.match(filter, /translatedProseServed\(\)\s*\n?\s*\?\s*translatedSteps/,
    "translated prose must take the show-everything branch");
});

test("on translated model prose card 5 always keeps its served line", () => {
  // The consequence title cannot be read on translated prose, and the
  // failure mode of guessing is calling a stated consequence routine.
  const card5 = APP.slice(APP.indexOf('card.id === "what_could_happen"'));
  assert.ok(card5.indexOf("translatedProseServed()") < card5.indexOf("CONSEQUENCE_CARD_TITLE"),
    "the conservative null must be decided before the title comparison");
});

test("card 1 sends the raw served label to the bank and fills the article for English only", () => {
  const card1 = APP.slice(APP.indexOf('card.id === "what_is_this"'),
    APP.indexOf('card.id === "what_matters_most"'));
  assert.match(card1, /translatedEngineText\(typeLabel\)\.text/,
    "the floor path translates the doctype label through the bank, raw value in");
  assert.match(card1, /english \? englishArticleFor\(typeLabel\) : ""/,
    "only English computes an article; every other language fills the slot empty");
  assert.match(card1, /replace\(\/\\s\+\/g, " "\)\.trim\(\)/,
    "the composed line is tidied so an empty article leaves no stray space");
});

test("the serious line renders in every language", () => {
  assert.match(APP, /card-serious-note"\)\.classList\.toggle\("hidden", !serious\)/,
    "the note's visibility must depend on seriousness alone, never the language");
  assert.ok(!HTML.includes("i18n-english-note"),
    "the stale English-note class is gone from the markup");
});

test("every label the engine can serve resolves in the English bank's doctype vocabulary", () => {
  // The floor path's card 1 label translation is exact-lookup: if the
  // engine rewords a served label, the lookup silently misses and the
  // reader gets the English label inside a translated line. This pins
  // the engine's two label maps to the bank, value for value.
  const ENGINE = fs.readFileSync(path.join(ROOT, "src", "services", "clearStepsEngine.js"), "utf8");
  const fn = ENGINE.slice(ENGINE.indexOf("function labelForStructuredDocumentType"),
    ENGINE.indexOf("function pickStructuredDocumentTypeConfidence"));
  const served = Array.from(fn.matchAll(/:\s*"([^"]+)"/g)).map((m) => m[1]);
  assert.ok(served.length >= 14, "the engine's label maps should be visible to this pin");
  const enBank = require(path.join(ROOT, "public", "i18n", "templates-en.js"));
  const doctypeValues = new Set(Object.keys(enBank.exact)
    .filter((id) => id.startsWith("tpl.label.doctype."))
    .map((id) => enBank.exact[id]));
  const missing = served.filter((label) => !doctypeValues.has(label));
  assert.deepEqual(missing, [], "every served label must be an exact doctype bank sentence");
  assert.ok(doctypeValues.has("Not an official document"),
    "the non-document label guards the essence null path and must stay in the bank");
});
