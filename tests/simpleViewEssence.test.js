// THE TWO LAWS OF SIMPLE VIEW, pinned. Founder-approved 7 August 2026 and
// recorded in public/CLAUDE.md: compression is a privilege of routine post,
// and serious letters bypass compression entirely. The frontend cannot be
// required under node (app.js touches the DOM at load), so these are source
// and dictionary pins in the repo's established style; the behavioural half
// is verified in the dev preview and screenshotted for the founder's user
// validation.

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

test("the nine other languages deliberately do not carry essence keys yet", () => {
  // The founder's resequencing order: authoring happens only after real
  // users validate the English lines. This pin stops a machine translation
  // slipping in early; it is REMOVED deliberately when that phase begins.
  LANGS.forEach((code) => {
    const dictionary = fs.readFileSync(path.join(ROOT, "public", "i18n", code + ".js"), "utf8");
    assert.ok(!dictionary.includes("journey.essence."),
      code + " must not carry essence keys before the founder's validation");
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

test("the essence layer is gated to English until the languages are authored", () => {
  assert.match(APP, /NorthcueI18n\.getLanguage\(\) === "en" &&\s*\n?\s*document\.body\.classList\.contains\("cards-simple"\)/);
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
