# Northcue engine: where it stands

Written 2 August 2026, for someone arriving with no history. If you read one
file before touching `src/`, make it this one. `KNOWN_ENGINE_DEFECTS.md` is the
long version and holds the evidence for everything summarised here.

## What Northcue does

Someone uploads an official letter or bill. The engine turns it into six short
cue cards: what this is, what matters most, what to do, the date, the money, and
a closing note. The reader may be anxious, rushed, or reading in a second
language, so the cards are calm and short and never tell them to do anything the
letter itself does not say.

## How it works, in one pass

```
extracted text
   ↓
rules engine        classification, trust, severity, scam signals, extraction
   ↓
gate                may this document reach the AI provider at all?
   ↓
fact extractor      the AI returns STRUCTURED FACTS, never sentences
   ↓
rules engine again  the engine composes every sentence from those facts
   ↓
safety stripper     runs on every path, AI or not
   ↓
template bank       translates the engine's sentences into the reader's language
```

**The model never writes a word the reader sees.** It returns facts (an amount,
a date, a stated consequence), the engine adjudicates each one against three
hard validations, and the engine writes the sentence. This is the single most
important thing about the architecture: if the model fails, times out, returns
nonsense or returns nothing, the reader sees exactly what the rules engine
would have shown on its own. `tests/factFailurePath.test.js` proves that byte
for byte across all 63 corpus documents under four failure modes.

**Ten languages**, English plus Polish, Romanian, Gujarati, Hindi, Bengali,
Portuguese, Spanish, French and Panjabi. Translation is lookup, not generation:
the engine may only emit sentences that exist in the template bank (371 entries),
and each has a translation in all ten files. An unknown sentence falls back to
English with a visible notice rather than being guessed at.

## What it deliberately refuses to do

- **No advice.** Not legal, financial, medical, debt, benefits, immigration or
  tenancy. The cards say what the document appears to say, hedged, and tell the
  reader to check the original.
- **No guessing when a label is missing.** If no phrase in the letter says which
  figure is owed or which date is the deadline, the engine says so instead of
  picking the largest or the first. Refusing to assert is a supported state.
- **No model on the refusal path.** Whether a document is a scam, unreadable or
  not a document at all is decided by the engine alone, before anything is sent
  anywhere. A model failure can never become a refusal failure.
- **No phone number, amount or date the engine cannot attribute.** A wrong
  number is a call to a stranger; a number not found costs nothing.
- **No storage.** Raw uploads and extracted text are not kept. Only safe
  metadata. Service keys are server-side only.

## Open items, most worth doing first

1. **One letter on two pages is refused outright.** A real energy bill was
   uploaded to the live product and all six cards declined, because the sender's
   name at the top of each page reads as two letterheads. It is wider than
   multi-page: a single-page dual-fuel bill fires it on the words "Standing
   charge" appearing twice. This is the most serious open item.
2. **No scam rule can reach a document the non-document gate refuses.** Three
   corpus scams are refused as "not an official letter", which zeroes their
   extraction before any detection sees them. Their wording was fixed; the
   ordering was not. Needs a decision on whether a document can be both refused
   and suspicious at once.
3. **`PHONE_GOVERNS` is English.** A number is only shown when a phrase beside
   it says what it is for, and those phrases are English only, so a Polish or
   Romanian letter now has its number found and still cannot show it.
4. **A mobile number scores two structural signals out of one artefact**, because
   `REFERENCE_CODE`'s six-digit branch matches the tail of `07700 900412`. It
   inflates the non-document gate and wrongly clears the lure rule. A landline
   does not.
5. **The non-document gate's month list is accidentally multilingual**, matching
   `septembrie`, `septiembre` and `septembre` through a shared stem while missing
   `setembro`, `listopada` and every non-Latin script. Which letters it rescues
   was never chosen and no test holds it.
6. **The structural lure rule rests on very thin evidence.** It catches seven of
   ten corpus scams and no genuine document, but only two genuine documents
   exercise it at all. Advisory only. Promoting it needs production evidence,
   not more corpus.
7. **The AI stripper's rule 4 doubles its replacement**, so a sentence naming two
   advice services reads "a trusted advice service or a trusted advice service".
   Reader-visible, and the smallest item here.
8. **`detectDocumentCategory` returns early four times**, so template, outgoing
   and scam suppress the real category instead of sitting beside it.
9. **Some vocabulary literals are not word-bounded** and can match inside longer
   words.

Not built, deliberately: the **lookalike-domain rule**. Written up in
`KNOWN_ENGINE_DEFECTS.md` with its evidence and the reason it must not ship
until someone other than its author has tried to break it.

## Standing rules a future session must not break

**Prove it, do not assume it.** Every claim in the docs above was measured
against the corpus. If you are about to write a number, run it first.

**Run both gates on every commit, and report what moved.**

```bash
npm test && node scripts/engine-baseline/run.js --check
```

`--check` diffs the full render of all 63 documents against a frozen baseline.
It exits 1 when anything moved. If the movement is intended, run `--update` and
read the whole diff before committing it.

**Nine protected fields.** `trust_assessment`, `severity_level`,
`urgency_level`, `processing_mode`, `document_category`, `is_high_stakes`,
`scam_signals`, `is_probable_non_document`, `needs_human_review`. Any change to
these is a safety change. Report movement explicitly, per document, or state
that there was none.

**One change per commit.** The baseline diffs the whole render, so two changes
at once produce a diff nobody can read.

**Every new sentence goes in the bank in all ten languages**, and gets flagged in
`NATIVE_REVIEW.md`. The process is `docs/i18n/adding-a-bank-sentence.md` and it
is one process, not several. A sentence that exists only in English fails the
build, which is the point.

**Re-measure card heights when card text changes.** The budget is a 375x812
phone viewport, the fixture is `tests/fixtures/card-heights.json`, and there is
no browser in the test stack, so the test can only catch content growing past
what was measured. Measure in a real browser and update the fixture.

**Never use em or en dashes** in any reader-visible copy. Commas or full stops.

**Comments carry the why.** This codebase explains, in place, why a rule is
shaped the way it is and what went wrong when it was not. That is not decoration
and it is how the defect list stays honest. When you fix something, say what it
did before.

**When you get something wrong, record it where the next person will look.**
Several sections of `KNOWN_ENGINE_DEFECTS.md` exist because a rule passed its
author's own review and was wrong anyway. Those entries are the most valuable
ones in the file.
