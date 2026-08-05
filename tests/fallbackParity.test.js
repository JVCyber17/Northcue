// FALLBACK PARITY, ALL NINE LANGUAGES, PINNED. On AI failure, timeout or
// repair, a reader in any language receives the ENGINE fallback, and this
// test holds that surface to the bank: every sentence the client renders
// from every corpus document's fallback either translates in every
// configured language or is the letter's own words.
//
// MEASURED 5 August 2026 before this was pinned: 1,062 surface sentences
// across all 73 documents, 98% bank-translated IDENTICALLY in all nine
// languages, zero per-language wiring gaps (no language file missing an
// entry another has), and every residual sentence one thing: the letter's
// own consequence sentence quoted verbatim into card 5, which is the
// recorded quote-in-original-language design (NATIVE_REVIEW.md, "Expected,
// not a defect: card 5 quotes the letter in English"). Three of the twenty
// are non-English letters quoted in their own language, which is the same
// design doing the right thing in the other direction.
//
// THE QUOTE EXCEPTION IS MECHANICAL AND WHITESPACE-NORMALISED, because the
// engine joins lines when it quotes: "bec0me due" from the OCR document is
// the quote surviving verbatim, garble and all, which is exactly what
// proves it is a quote.
//
// This is tests/refusalPathTranslation.test.js generalised from the twelve
// refusal-shaped documents to the whole corpus. An engine sentence added
// without bank coverage fails here, in every language at once, which is
// how the CVV lesson stops repeating.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const CORPUS_FACTS = require(path.join(__dirname, "..", "tests", "fixtures", "corpus-facts.json"));

const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "fallback-parity" };

// Languages come from config so a newly added language is covered by this
// contract automatically, never silently exempt.
const LANGS = require(path.join(__dirname, "..", "public", "i18n", "config.js")).languages
  .map((entry) => entry.code)
  .filter((code) => code !== "en");

global.window = global;
require(path.join(__dirname, "..", "public", "i18n", "templates-en.js"));
LANGS.forEach((l) => require(path.join(__dirname, "..", "public", "i18n", "templates-" + l + ".js")));
require(path.join(__dirname, "..", "public", "i18n", "templateBank.js"));
const Bank = global.NorthcueTemplateBank;

const norm = (s) => String(s).replace(/\s+/g, " ").trim();

// The rendered fallback surface, per the render sites in public/app.js:
// cards (title, short_answer, steps), the check panel's safe_next_step and
// banner text, the why chips. key_points and the summary fields are never
// rendered. If a new render site is added in app.js, add its field here in
// the same commit.
function surface(run) {
  const out = [];
  const sr = run.api_output.structured_result || {};
  (sr.cards || []).forEach((c) => {
    out.push(c.title, c.simple_explanation || c.short_answer);
    (c.steps || []).forEach((s) => out.push(s));
  });
  const t = run.api_output.trust || {};
  if (t.safe_next_step) out.push(t.safe_next_step);
  const banner = run.api_output.banner || {};
  if (banner.text) out.push(banner.text);
  [].concat(t.scam_signals || [], t.severity_signals || []).forEach((s) => out.push(s));
  return Array.from(new Set(out.filter((x) => typeof x === "string" && x.trim())));
}

test("every fallback sentence translates in every language or is the letter's own words", async (t) => {
  // One test over the whole corpus rather than one per document, because the
  // engine runs are the cost and the failure message names everything.
  await t.test("all documents, all languages", () => {
    const failures = [];
    CORPUS.forEach((doc) => {
      const run = runClearStepsEngine({
        extractedText: doc.text, fileMeta: FILE_META, facts: CORPUS_FACTS[doc.id] || null
      });
      const docNorm = norm(doc.text);
      surface(run).forEach((s) => {
        if (docNorm.includes(norm(s))) return; // the letter's own words
        LANGS.forEach((lang) => {
          if (!Bank.translateEngineSentence(s, lang).translated) {
            failures.push(doc.id + " [" + lang + "] " + s.slice(0, 90));
          }
        });
      });
    });
    assert.deepEqual(failures, [],
      "fallback sentences a reader would see in English:\n" + failures.join("\n"));
  });
});
