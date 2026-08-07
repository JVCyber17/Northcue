# Verification pack ingest, the technical half

The reader documents in this directory are BLIND: they never say which
sentences the guard fires on. The answer keys live in
`tests/fixtures/verification-keys/<lang>.json` and are never shown to a
reviewer. This file defines what happens when a completed pack comes back.

## Provenance

Every Part 1 sentence is measured output: the 504-sample sweep produced under
the measurement-only language override (`scripts/reader-output/language-probe.js`),
the reviewed template banks, or, for the seven Hindi credential rows, the
constructed sentences pinned in `tests/hindiGuardVocabulary.test.js`, which are
constructed because the one Hindi corpus document never asks for a credential.
The packs were generated on 5 August 2026 from the committed guard configs in
the nine `tests/*GuardVocabulary.test.js` files, which remain the source of
truth. A regenerated pack must be derived from those files, never edited by
hand, and the key must be regenerated with it.

## The completed fixture

A returned pack is transcribed, by whoever receives it, into
`tests/fixtures/native-review-<lang>.json`:

```json
{
  "reviewer": "name or initials",
  "date": "2026-08-12",
  "marks":   { "gu-01": "A", "gu-02": "B", "gu-03": "C" },
  "starred": ["gu-17"],
  "elicited": ["their five Part 2 translations, in order"],
  "wordlist": { "removed": ["..."], "added": ["..."] }
}
```

Marks are keyed by the ids in the answer key, which are positional: row N in
the pack is `<lang>-NN` in the key.

## What each combination produces

The comparison is mark against `guard_fires` in the key, one row at a time.

| reviewer says | guard | outcome |
|---|---|---|
| A, an order | fires | AGREEMENT. The sentence is pinned (or stays pinned) in the language's vocabulary test with the reviewer and date in its gloss. |
| A, an order | does not fire, verb IS in the English 21 | RECALL GAP. The missing stem or noun is added, the sentence is pinned MUST_FIRE, in that language's own commit, English benchmark green. |
| A, an order | does not fire, verb is NOT in the English 21 | THE MIRROR BOUNDARY, a disagreement with ENGLISH, not with this guard. Recorded beside the notify decision in ENGINE_STATE.md; the sentence is pinned OUT_OF_SCOPE_BY_DESIGN with the reviewer's mark noted. The guard does not change, because catching it would strip sentences an English reader keeps. |
| B, not an order | fires | OVER-FIRE, the worst outcome and gate-blocking for this language. The guard gains an exception, the sentence is pinned as a keep, and the file header records who found it. The language does not open with an unresolved row in this state. |
| B, not an order | does not fire | AGREEMENT. Verified keep. |
| C, unsure | does not fire | Kept, which is the never-stricter default. Listed in the vocabulary file header as reviewed-unsure. |
| C, unsure | fires | NOT GOOD ENOUGH TO STRIP. An unsure mark on a sentence the guard removes goes to a second reviewer before the language opens. |

A star on any row is a tone finding, independent of the mark: bank-sourced
rows route into the NATIVE_REVIEW.md process; sweep-sourced rows are recorded
in the vocabulary file header.

## Part 2, the elicitations

The five translations are run against the guard verbatim. Each one that fires
is an agreement in the reviewer's own words. Each one that does not fire is a
measured recall gap exactly like an A-plus-no-fire row: stem derived, sentence
pinned MUST_FIRE. These five are the highest-value rows in the pack because
nothing about them came from the model.

## Part 3, the word lists

A crossed-out word is removed unless a measured sweep sentence depends on it;
that conflict is a named decision in the commit, never a silent keep. An added
word becomes a stem or noun with a pinned sentence covering it, taken from the
reviewer's Part 2 translations where possible.

## The mechanical gate

When a language's fixture lands, a test is added asserting: the fixture
exists and names a reviewer; every key id has a mark; there are zero
unresolved fire-plus-B rows and zero unresolved fire-plus-C rows; and the
five elicitations each either fire or are recorded at the mirror boundary.
That test is the machine meaning of "verified": the language gate does not
open for a language whose test does not exist and pass. REVIEW_REQUIRED tags
in the vocabulary files stop being comments at that point, because the
fixture's existence is what discharges them.

## Pack-generation note, 7 August 2026

The Panjabi pack's row 21 was `tpl.error.feedback_rating_required`, an
interface validation string from the bank's error namespace, sampled into
a judgement pack alongside card sentences. Interface strings are not
document commands and their presence skews a reviewer's picture of what
readers see on cards. **Future pack generation excludes the `tpl.error.*`
namespace.** The row itself was resolved as recorded: the string renders
only in the feedback panel, never as card content.
