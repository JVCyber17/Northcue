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

## What it can and cannot do per language

**Read this before believing anything else in this file about languages. It
changed twice in the week of 2 August 2026.** Measured against the corpus:

| | English | the other nine |
| --- | --- | --- |
| find a date, an amount, a phone number | yes | **yes**, all nine |
| bind one of them to a label that says what it is | yes | **no** |
| show the phone number it found | yes | **no** |
| read a stated consequence | yes | **no** |

**The engine can now FIND a value in every language and cannot ATTRIBUTE one in
any language but English.** Every date reaching a card on a non-English letter
comes from the reading aid's guess, the first date no competing label has
claimed, never from co-location. Of the eleven genuine non-English or bilingual
corpus documents, exactly one binds a label, through its English half.

Before 2 August, five of the six genuine non-English Latin-script letters
produced **no date at all** and card 4 read "No clear date was found." while the
letter plainly gave one. That is the improvement. It is still a long way from
good, and item 1 below is why.

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

1. **Co-location has no vocabulary and no direction outside English.** The
   boundary and the adjacency test were fixed on 2 August, so the machinery is
   ready and all 119 label entries are still ASCII, so nothing uses it. Direction
   belongs to the construction rather than the language, and a prototype got two
   of four realistic Hindi shapes wrong: the sender-subject and past-tense guards
   are both English. Needs native review it does not have.
2. **No scam rule can reach a document the non-document gate refuses.** Three
   corpus scams are refused as "not an official letter", which zeroes their
   extraction before any detection sees them. Their wording was fixed; the
   ordering was not. Needs a decision on whether a document can be both refused
   and suspicious at once.
3. **Four of ten languages have one corpus document each**, and one document
   cannot test a rule. Gujarati, Hindi, Bengali and Panjabi, against 371
   translated sentences apiece. Every non-English document now produces dates;
   none produces a LABELLED amount and none produces a consequence. This is why
   the direction work above is unscheduled rather than merely unfinished. See
   `CORPUS_STRATEGY.md`.
4. **`PHONE_GOVERNS` is English.** A number is only shown when a phrase beside
   it says what it is for, and those phrases are English only, so all nine
   languages now have their number found and still cannot show it.
5. **A dotted reference reads as a date.** `version 1.2.2026` and two siblings.
   Nothing in the string separates it from `24.06.2026`; the discriminator is an
   English word and the value finder must not carry one. Closed by a competing
   label when a real document shows the shape, not by a narrower pattern.
6. **The range rule declines instead of choosing.** The Spanish water notice
   lists its deadline among three dates rather than naming it, because
   re-selecting would also name a payment receipt on an English bill. Closed by
   per-language competing labels, which is item 1.
7. **A mobile number scores two structural signals out of one artefact**, because
   `REFERENCE_CODE`'s six-digit branch matches the tail of `07700 900412`. It
   inflates the non-document gate and wrongly clears the lure rule.
8. **The non-document gate's month list is accidentally multilingual**, matching
   `septembrie`, `septiembre` and `septembre` through a shared stem while missing
   `setembro`, `listopada` and every non-Latin script. This is the gate's OWN
   list, not `findDates`, which now carries all nine languages properly.
9. **The structural lure rule rests on very thin evidence.** Seven of ten corpus
   scams and no genuine document, but only two genuine documents exercise it.
   Advisory only. Promoting it needs production evidence, not more corpus.
10. **The AI stripper's rule 4 doubles its replacement**, so a sentence naming two
   advice services reads "a trusted advice service or a trusted advice service".
11. **`detectDocumentCategory` returns early four times**, so template, outgoing
   and scam suppress the real category instead of sitting beside it.
12. **Some vocabulary literals are not word-bounded** and can match inside longer
   words. The engine's classification vocabulary, not co-location's labels,
   which are bounded.

Recently closed: the multi-page refusal that started this (one letter on two
pages read as two), the extraction gap (`scripts/corpus-pdf/` now lays documents
out and reads them back), the demand phrasings a bill actually uses, the value
finder that could only see an English date, the ASCII word boundary in the label
matcher and the adjacency test, and a value suppressed after its own sentence
had been composed from it, which bit twice: a benefits letter naming a date its
own field denied, and a fused upload naming one letter's reference number.

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

**`--check` MEASURES THE FLOOR. THE READER SEES THE CEILING.** It runs
`runClearStepsEngine` and stops there. The AI phrasing pass applies afterwards,
in the route, so the baseline has never contained one word of model prose. It is
the right guard for the engine and it is not evidence about a reader.

So: **any change to the AI path or to the card builders reports reader-visible
output, not baseline movement.**

```bash
node scripts/reader-output/run.js --english
node scripts/reader-output/run.js --only <id>     # all six cards, verbatim
```

Two conditions, one variable: the floor, which is what a reader falls back to
whenever the model is refused, and the prose, live. Facts are held constant from
`tests/fixtures/corpus-facts.json` so only the phrasing pass differs.

**Three decisions in this programme were made on the wrong measurement**, which
is why this is a rule rather than a suggestion:

1. `9607c98` switched the phrasing pass off and reported "no change across 40".
   True of the baseline. True of nothing a reader ever saw.
2. Its cost was then stated as "23 readers lose the model's phrasing and gain
   nothing", derived from how often FACTS moved the engine's own output, which
   is a fact about the floor and not about what was lost from the ceiling.
3. `c140289` deleted the validator because nothing called it, which was true
   only because the caller had been switched off, and made the switch unsafe to
   reverse.

**AND THE PROSE PATH IS NON-DETERMINISTIC, so one run measures a RATE and never
a document.** Two runs of the same 53 English documents on identical code, an
hour apart:

- **eight documents changed outcome.** `bailiff_enforcement`,
  `genuine_bank_fraud_advice` and `intl_energy_bill_plus44` went from refused to
  served; `multi_document_greetings`, `genuine_court_account_freeze` and
  `spec_council_tax_demand_full` went the other way. Two more were the lure gate
  landing, which was the only intended change.
- **one document was refused twice for different reasons.**
  `intl_sole_trader_invoice` failed on an invented date in the first run and on
  the postal-address pattern in the second.
- the timeouts moved entirely: the two that hit the ceiling in the first run
  both completed in the second, and three different documents timed out instead.

So: **any finding about a NAMED document on the prose path needs repeat runs
before it is treated as a property of that document.** The rate is stable at
roughly six refusals in fifty-three; which six is not. A report that names
documents from a single run, as an earlier one in this programme did, is
describing that run and not the engine.

The floor is deterministic and `--check` still guards it. Everything above the
floor is a distribution.

`tests/fixtures/corpus-facts.json` must cover every corpus document. Regenerate
it whenever the corpus grows:

```bash
node scripts/corpus-facts/capture.js
```

It went from 40 documents to 70 with nobody noticing, and every consumer ran the
uncovered 30 factless while reporting a number as if it had not.

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
