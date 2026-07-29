# Adding a bank sentence

The engine may only ever emit sentences that exist in the template bank, and
every new document type the engine learns adds sentences to it. This is the
whole process. It is deliberately one process; if a step here stops being
true, fix the structure rather than adding steps.

Forgetting this process is never dangerous, only untranslated: an unknown
sentence falls back to English with the shown-in-English notice by design.
But nothing fails automatically when the engine's wording changes, so the
translation gap is silent until someone follows this page.

## The process

1. Add the English sentence to `public/i18n/templates-en.js`: an `exact`
   entry (id to string) for a fixed sentence, or a `patterns` entry (id plus
   template with `{slot}` names) when the engine inserts values. Ids are
   namespaced `tpl.<area>.<name>`; follow the neighbours. Slot rule: amounts,
   dates and sender names insert verbatim so they match the reader's letter;
   Northcue's own vocabulary (type_label, category_label, topic) translates
   through `tpl.label.*` entries. A pattern needs at least four characters of
   literal text or the matcher deliberately ignores it.
2. Add the translation to every `public/i18n/templates-<code>.js`, same id,
   all nine languages. No em or en dashes in any string. Keep every `{slot}`
   present. Where the language needs a case-free join around a verbatim
   English value, use that language's colon frame (the cross-language class
   findings in REVIEW.md name the frames per language).
3. Run `npm test`. `translationParity.test.js` discovers the languages from
   config and fails until every language carries the new id with matching
   slots and no dashes; `bankLookupContract.test.js` pushes every exact
   sentence through the real matcher in every language; `severityLadder`
   catches a new tier sentence that collapses onto an existing tier. A new
   sentence that only exists in English fails the build, which is the point.
4. Render it, do not just read it: `node scripts/render-exact.js <code>` for
   exact sentences, `node scripts/render-language.js <code> patterns` for
   patterns, per language. Judge against the English printed beside each
   line: hedges kept, tier words distinct, the reader still the subject of
   any warning.
5. Native review: the sentence joins the language's outstanding list until a
   native speaker has seen it (NATIVE_REVIEW.md). A sentence on a safety
   surface (banner, scam, risk, severity signal) must not ship enabled
   without that review.

## What you never do

- Never invent a new slot kind without deciding its verbatim-or-translate
  rule; the rule lives in templateBank.js next to VOCABULARY_SLOTS.
- Never edit the matcher to make one sentence fit; fix the sentence or add a
  pattern.
- Never let a language skip a sentence for now. Parity tests keep the nine in
  lockstep; do not weaken them to get a build green.
