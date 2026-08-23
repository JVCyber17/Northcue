// THE LAW OF SIMPLE VIEW, pinned. Founder's design decision of 23 August
// 2026, recorded in public/CLAUDE.md: simple view is the universal default
// for every document at every severity, the toggle to full details is
// always visible, and severity is preserved through WEIGHT, not volume.
// The serious bypass that stood before it is removed. Open in all ten
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
// SHIPPED keys exist in all ten languages; NEW keys are English only until
// the founder reviews the serious-simple renders (the paired carve-out is
// DEFERRED_BY_FOUNDER in translationParity.test.js; remove both together).
const APPROVED_SHIPPED = {
  "journey.essence.whatIsThisWithSender": "{article} {typeLabel} from {sender}.",
  "journey.essence.whatIsThis": "{article} {typeLabel}.",
  "journey.essence.amountToPay": "{amount} to pay.",
  "journey.essence.amountNeutral": "{amount} appears in this letter.",
  "journey.essence.noUrgentAction": "No urgent action shown.",
  "journey.essence.nothingNeeded": "Nothing needed right now.",
  "journey.essence.dueBy": "By {date}.",
  "journey.essence.check": "Looks routine. Check the original if unsure.",
  "journey.essence.keepSafe": "Keep this letter safe."
};
const APPROVED_NEW = {
  "journey.essence.amountDemanded": "{amount} demanded.",
  "journey.essence.deadlineMatters": "This deadline matters.",
  "journey.seriousSimpleNote": "This letter looks serious. Full details are one tap away."
};
const APPROVED = { ...APPROVED_SHIPPED, ...APPROVED_NEW };

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

test("every language carries every shipped essence key, and the bypass key is gone", () => {
  LANGS.forEach((code) => {
    const dictionary = require(path.join(ROOT, "public", "i18n", code + ".js"));
    Object.keys(APPROVED_SHIPPED).forEach((key) => {
      assert.ok(typeof dictionary[key] === "string" && dictionary[key].trim() !== "",
        code + " must carry " + key);
    });
    assert.ok(!("journey.seriousFullView" in dictionary),
      code + " must not carry the retired bypass key");
  });
  assert.ok(!EN.includes("journey.seriousFullView"),
    "the retired bypass key must not survive in English either");
});

test("the weight-law keys deliberately do not exist in the nine other languages yet", () => {
  // The founder's order: the serious-simple English renders are reviewed
  // first; the nine authorings follow through the bank discipline. This
  // pin stops a machine translation slipping in early; it is REMOVED
  // together with the parity carve-out when that phase begins.
  LANGS.forEach((code) => {
    const dictionary = require(path.join(ROOT, "public", "i18n", code + ".js"));
    Object.keys(APPROVED_NEW).forEach((key) => {
      assert.ok(!(key in dictionary),
        code + " must not carry " + key + " before the founder's review");
    });
  });
});

test("simple view is the universal default; there is no bypass", () => {
  const applyBody = APP.slice(APP.indexOf("function applyDefaultSimpleView"),
    APP.indexOf("function applyDefaultSimpleView") + 400);
  assert.ok(!applyBody.includes("seriousDocument"),
    "the default must not consult seriousness; the bypass is removed");
  assert.match(applyBody, /simpleViewChosen/,
    "the reader's stored choice still wins over the default");
  assert.match(applyBody, /setSimpleView\(true, \{ save: false \}\)/,
    "the default is simple, never saved over the reader's choice");
});

test("the toggle to full details is always visible", () => {
  assert.ok(!/cardDetailToggle\?\.classList\.toggle\("hidden"/.test(APP),
    "nothing may hide the simple/full toggle; there is always somewhere to go");
});

test("the serious line renders on serious documents while simple view is active", () => {
  // Severity high or urgent, or any processing mode other than normal.
  assert.match(APP, /severity_level === "high" \|\| trust\.severity_level === "urgent"/);
  assert.match(APP, /trust\.processing_mode !== "normal"/);
  const note = APP.slice(APP.indexOf("const seriousNoteShown"),
    APP.indexOf("const seriousNoteShown") + 300);
  assert.match(note, /seriousDocument\(\)/);
  assert.match(note, /cards-simple/);
  assert.match(APP, /card-serious-note"\)\.classList\.toggle\("hidden", !seriousNoteShown\)/,
    "the note shows exactly when a serious document renders in simple view");
  assert.ok(HTML.includes('data-i18n="journey.seriousSimpleNote"'),
    "the markup carries the weight-law line");
  assert.ok(!HTML.includes("i18n-english-note"),
    "the stale English-note class is gone from the markup");
});

test("the essence layer is open in every language and every severity", () => {
  const body = APP.slice(APP.indexOf("function essenceModeActive"),
    APP.indexOf("function essenceModeActive") + 200);
  assert.ok(!body.includes("getLanguage"),
    "essenceModeActive must not gate on the interface language");
  assert.ok(!body.includes("seriousDocument"),
    "essenceModeActive must not gate on severity; the tiers decide the frames");
  assert.match(body, /cards-simple/);
});

test("the severity tiers are decided from the served judgement, verbatim first", () => {
  const tierBody = APP.slice(APP.indexOf("function essenceSeverityTier"),
    APP.indexOf("function essenceSeverityTier") + 400);
  assert.ok(tierBody.indexOf('"verbatim"') < tierBody.indexOf('"serious"'),
    "caution and refused modes outrank severity: their engine lines are untouchable");
  const essence = APP.slice(APP.indexOf("function essenceLineFor"),
    APP.indexOf("function essenceLineFor") + 700);
  assert.match(essence, /tier === "verbatim"\) return null/,
    "a verbatim document keeps its engine line on every card, before any card branch");
});

test("the weighted amount frame is gated on served enforcement judgement", () => {
  const gate = APP.slice(APP.indexOf("function enforcementDemandServed"),
    APP.indexOf("function enforcementDemandServed") + 500);
  assert.match(gate, /legal_or_court/);
  assert.ok(APP.includes("This mentions enforcement action or bailiffs."),
    "the protected enforcement key point is the raw-text marker");
  const card2 = APP.slice(APP.indexOf('card.id === "what_matters_most"'),
    APP.indexOf('card.id === "what_do_i_need_to_do"'));
  assert.ok(card2.indexOf("enforcementDemandServed()") < card2.indexOf("journey.essence.amountToPay"),
    "'demanded' is decided before the shipped frames");
  assert.match(card2, /tier === "serious" && enforcementDemandServed\(\)/,
    "'demanded' renders only on a serious document with enforcement judgement");
});

test("serious card 3 keeps the engine's action line; serious card 5 is the verbatim consequence law", () => {
  const card3 = APP.slice(APP.indexOf('card.id === "what_do_i_need_to_do"'),
    APP.indexOf('card.id === "when_is_it_due"'));
  assert.ok(card3.indexOf('tier === "serious"') < card3.indexOf("nothingNeeded"),
    "on a serious document the engine's action line stands, decided first");
  const card5 = APP.slice(APP.indexOf('card.id === "what_could_happen"'),
    APP.indexOf('card.id === "helpful_note"'));
  assert.ok(card5.indexOf('tier === "serious"') < card5.indexOf("translatedProseServed"),
    "the serious tier stands down before any other card 5 decision");
  assert.match(APP, /CONSEQUENCE_CARD_TITLE\s*\?\s*null/,
    "the routine consequence-mode card still falls through to the engine's own line");
});

test("the serious date carries its weight sentence", () => {
  const card4 = APP.slice(APP.indexOf('card.id === "when_is_it_due"'),
    APP.indexOf('card.id === "what_could_happen"'));
  assert.match(card4, /journey\.essence\.dueBy", \{ date \}\) \+ " " \+ t\("journey\.essence\.deadlineMatters"/,
    "on a serious document the date line is the shipped frame plus the weight sentence");
});

test("the blueprint: each anchor lives only at its home card", () => {
  // Sender on card 1, amount on card 2, date on card 4, and no essence
  // line restates another card's anchor. Verbatim engine lines are exempt
  // by construction: they are not essence keys.
  const HOME = {
    "{sender}": ["journey.essence.whatIsThisWithSender"],
    "{amount}": ["journey.essence.amountToPay", "journey.essence.amountNeutral", "journey.essence.amountDemanded"],
    "{date}": ["journey.essence.dueBy"]
  };
  Object.entries(APPROVED).forEach(([key, value]) => {
    Object.entries(HOME).forEach(([slot, homes]) => {
      if (value.includes(slot)) {
        assert.ok(homes.includes(key),
          key + " restates " + slot + ", which belongs to " + homes.join("/"));
      }
    });
  });
});

test("obligation wording is gated on the engine's own category", () => {
  const essence = APP.slice(APP.indexOf("function essenceLineFor"));
  assert.ok(essence.indexOf('document_category === "bill_or_payment"') <
    essence.indexOf("journey.essence.amountToPay"),
    "'to pay' renders only when the engine says bill_or_payment");
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

// THE TEN-LANGUAGE DETECTION RULE (23 August 2026): English anchors are
// read on the RAW served text, which is the engine's English on the floor
// path in every language; on translated model prose every detection takes
// its conservative branch.

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

test("on translated model prose routine card 5 always keeps its served line", () => {
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
