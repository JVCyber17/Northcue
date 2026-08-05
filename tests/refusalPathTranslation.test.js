// NO REFUSAL-PATH STRING CAN RENDER UNTRANSLATED.
//
// A reader refused in their own language must be refused in their own
// language. This test runs every refusal-shaped corpus document through the
// engine, collects every string the client actually renders on that path,
// and asks the REAL client translator for each one in all nine languages.
//
// THE ONE EXCEPTION, deliberate and recorded in NATIVE_REVIEW.md under
// "Expected, not a defect": a sentence quoted VERBATIM from the document
// itself stays in the document's language, because Northcue quotes letters
// and never rewrites them. The exception is mechanical, doc.text.includes,
// so nothing can hide behind it that the letter does not actually say.
//
// WHY THIS EXISTS. The CVV needle shipped on 1 August 2026 with its signal
// label but without bank entries, so the one scam explanation that fires on
// non-English documents rendered in English in all nine languages, on the
// panel whose whole job is explaining why the document was flagged. The
// standing rule (every reader-visible string gets an all-language bank entry
// and a NATIVE_REVIEW.md flag) had no test on this path; now it does.
//
// THE RENDER SITES MIRRORED HERE, from public/app.js: cards (title,
// short_answer / simple_explanation, steps, and key_points via the detail
// modal), the check panel's safe_next_step and banner.text, and the why
// chips (scam_signals and severity_signals). banner.title and the summary
// fields are never rendered. If a new render site is added in app.js, add
// its field here in the same commit.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const CORPUS_FACTS = require(path.join(__dirname, "..", "tests", "fixtures", "corpus-facts.json"));

const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "refusal-translation" };
// Languages come from config so a newly added language is covered by this
// contract automatically, never silently exempt.
const LANGS = require(path.join(__dirname, "..", "public", "i18n", "config.js")).languages
  .map((entry) => entry.code)
  .filter((code) => code !== "en");

// The real client translator, loaded exactly as the browser loads it.
global.window = global;
require(path.join(__dirname, "..", "public", "i18n", "templates-en.js"));
LANGS.forEach((l) => require(path.join(__dirname, "..", "public", "i18n", "templates-" + l + ".js")));
require(path.join(__dirname, "..", "public", "i18n", "templateBank.js"));
const Bank = global.NorthcueTemplateBank;

// Every refusal shape the corpus carries: suspected scams in five languages,
// link-only lures, a non-document, and heavy OCR damage.
const REFUSAL_SHAPED = ["scam_phishing", "polish_phishing", "scam_hmrc_refund_es",
  "scam_bank_security_fr", "smish_parcel_link_only_pl", "scam_crypto_investment_pl",
  "scam_energy_refund_pt", "smish_parcel_link_only", "scam_council_refund_link_only",
  "scam_dvla_vehicle_tax", "non_document_recipe", "ocr_heavy_damage"];

function renderedStrings(run) {
  const out = [];
  const sr = run.api_output.structured_result || {};
  (sr.cards || []).forEach((c) => {
    out.push(c.title, c.simple_explanation || c.short_answer);
    (c.steps || []).forEach((s) => out.push(s));
    (c.key_points || []).forEach((s) => out.push(s));
  });
  const t = run.api_output.trust || {};
  if (t.safe_next_step) out.push(t.safe_next_step);
  const banner = run.api_output.banner || {};
  if (banner.text) out.push(banner.text);
  [].concat(t.scam_signals || [], t.severity_signals || []).forEach((s) => out.push(s));
  return Array.from(new Set(out.filter((x) => typeof x === "string" && x.trim())));
}

test("every refusal-path string translates in all nine languages or is the letter's own words", async (t) => {
  for (const id of REFUSAL_SHAPED) {
    await t.test(id, () => {
      const doc = CORPUS.find((d) => d.id === id);
      assert.ok(doc, "premise: " + id + " is in the corpus");
      const run = runClearStepsEngine({
        extractedText: doc.text, fileMeta: FILE_META, facts: CORPUS_FACTS[id] || null
      });
      const failures = [];
      renderedStrings(run).forEach((s) => {
        if (doc.text.includes(s)) return; // verbatim quote, stays in the letter's language
        LANGS.forEach((lang) => {
          if (!Bank.translateEngineSentence(s, lang).translated) {
            failures.push(lang + ": " + s);
          }
        });
      });
      assert.deepEqual(failures, [],
        "refusal-path strings a reader would see in English:\n" + failures.join("\n"));
    });
  }
});
