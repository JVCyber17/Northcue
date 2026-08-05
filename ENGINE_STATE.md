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

## MEASURED AND REJECTED: facts plus templates

**The AI returns structured facts and the engine composes every sentence from
templates the bank translates.** No model-authored words reach any reader.

Why it is worth doing, and it is the largest single win left:

- **Roughly 3 seconds against 14.** The fact call is measured at about 2 to 3
  seconds; the prose call is p50 14,330ms and p90 18,424ms.
- **It unlocks all ten languages.** Facts are language-independent, so the
  language gate can open. Today the gate is shut because the output guards are
  English word lists that catch 2 of 11 languages on the command family and 1 of
  10 on the credential ask, and no model-authored sentence can be checked in a
  language the guards cannot read. Templates remove the thing that needed
  guarding.
- **The safety argument stops being a vocabulary problem.** A sentence the
  engine composed from an adjudicated fact is safe by construction, in every
  language, without a guard per language.

**IT WAS TRIED AND IT FAILED, and the reason is the whole plan.** `9607c98`
switched the model's writing off before the engine's templates existed, so
readers lost the prose and gained nothing in its place: content the engine could
find and had no sentence for simply vanished. On a 1,545 word energy bill the
floor's card 3 says "Check the payment amount and due date." twice, where the
prose names the covering period, the collection method and the amount including
VAT. **So the templates come first and the switch comes second**, and there is no
version of this where they land together.

### It was counted on 3 August 2026, and the count kills it

Blocker 2 was "measure how many templates it would actually need, not
estimated, counted". That was done: every sentence the reader-output harness
shows a reader RECEIVING in the prose condition, across the English corpus,
reduced to a covering set of slot patterns. Two independent runs, because the
prose path is non-deterministic and a set fitted to one run says nothing about
whether it converges.

**The number that ends it:**

    33 of 56 English documents served prose, per run
    1,389 sentences across the two runs

    distinct patterns, run A            583
    distinct patterns, run B            569
    pooled                              931
    NEW patterns the second run added   348

**61 percent of the second run's patterns had never been seen in the first, on
IDENTICAL DOCUMENTS.** Not a corpus-coverage problem that more documents would
close. The model's output is not a finite set, so there is no covering set to
finish, and a third run would add more.

**The covering set, and what it buys:**

    patterns seen more than once        236
    one-off patterns                    695   (75% of all patterns)
    sentences those 236 reproduce       694 of 1,389   (50%)
    sentences left uncoverable          695   (50%)

**The cost, in the units that matter, because every template is a bank sentence
in ten languages and a `NATIVE_REVIEW.md` entry:**

    covering set,  236 x 10 languages   2,360 strings
    every pattern, 931 x 10 languages   9,310 strings
    the ENTIRE existing bank today        371 entries, 3,710 strings

So the covering set alone is 64 percent of the whole translation effort built so
far, and buys HALF the prose sentences on 33 documents. The full set is 2.5
times the entire bank, to chase a target that moves every run.

**THE TAIL IS CONTENT, NOT PHRASING, and this is the part that cannot be
engineered around.** Collapsing the model's synonyms was tried: six patterns say
one thing ("Payment is due by {date}", "The payment deadline is {date}",
"Payment is requested by {date}", "Confirm the payment deadline is {date}", and
two more). Deduplicating every such family across the corpus moves coverage from
50 percent to 57 percent. **Seven points.** What remains is document-specific
fact:

    Total charge is {amount} before a 25% single person discount of {amount}.
    You may pay in 10 monthly instalments of {amount} each.
    The bill covers water and wastewater charges from {date} to {date}.
    If struggling to pay, the document suggests contacting {name} about a plan.

These are the sentences that make the prose worth having, and each is specific
to one document's structure. A template for "you may pay in 10 monthly
instalments" is a template for council tax and nothing else.

**And it does not amortise.** Adding documents one at a time and reading the
tail of the curve: the last ten documents each added a mean of 20 new patterns,
so **roughly 200 strings across ten languages per new document type, with no
sign of flattening** after 33 documents.

### What is still true, and what to do instead

The three reasons the split was attractive have not gone away: roughly 3 seconds
against 14, no model-authored words reaching a reader, and a safety argument
that stops being a vocabulary problem. What the count shows is that templates
cannot BUY those things at an acceptable price, because reaching prose parity is
open-ended.

So the language gate has to be opened the other way: **by making the output
guards work in nine more languages**, which is a bounded vocabulary problem
against an unbounded one. That is the live decision. Blocker 1, the founder
approving current English card quality, is now moot for this purpose.

**Caveat on the instrument, recorded so the number is not over-read.** The
slotter is a heuristic: it slots proper nouns by shape, so it over-slots some
ordinary capitalised words, which merges sentences and DEFLATES the count, and
under-slots lowercase names, which inflates it. Two real errors in it were found
and fixed mid-measurement, sentence-initial verbs being slotted as names and
two-digit-year dates being missed, and the headline moved by about one percent.
The 61 percent figure does not depend on any of that, because it is the same
instrument applied to both runs.

## The word-order questionnaire, answered for all five remaining languages

Answered from the 504-sample sweep before any vocabulary is written for any of
them, per the rule below. Cheap, and the discoveries are not.

### Romanian, 807 sentences, 29 distinct with a modal

  **Q1  modal position**  18 of 29 first word, 11 elsewhere. Position-free
  required, same as the other Romance three.
  **Q2  split**  median 1, max 1. Romanian uses `trebuie sa` plus a SUBJUNCTIVE,
  not an infinitive: "trebuie sa sunati", "trebuie sa raspundeti". The verb list
  must carry subjunctive forms, which is a different ending set from Spanish or
  French, and the passive "trebuie platita" carries a participle instead.
  **Q3  ambiguity**  none. 58 modal sentences, 4 future, zero overlap.

### Polish, 1,137 sentences, 30 distinct with a modal

  **Q1  modal position**  23 of 30 first word, 7 elsewhere.
  **Q2  split**  THE PROBE FOUND NO INFINITIVE AFTER THE MODAL AT ALL, and that
  is a finding rather than a failure. Polish uses several constructions that are
  not modal-plus-infinitive: `nalezy` and `trzeba` are impersonal and take an
  infinitive that the probe's `\w+c` pattern missed on diacritics, and
  `musi/powinna byc` plus a PASSIVE PARTICIPLE is common: "musi byc zaplacona",
  "powinna byc zwrocona", "musi zostac uregulowana". So Polish needs participle
  agreement, four forms per verb, and `zostac` as a passive auxiliary alongside
  `byc`. This is the most different of the nine and it was called a middle case
  earlier, which was wrong.
  **Q3  ambiguity**  none. 30 modal, 2 future, zero overlap.

### Bengali, Gujarati and Panjabi

  **Q1  modal position**  verb-final, like Hindi. The auxiliary is at the end of
  the clause by grammar, so position-free is required and a sentence-initial
  anchor is meaningless.
  **Q2  split**  compound verbs, like Hindi. The Hindi fix, a bounded gap
  between noun and light verb, transfers directly.
  **Q3  ambiguity, and THIS IS WHERE THEY DIFFER FROM EACH OTHER:**

      bn   151 auxiliary,  143 with an infinitive,   8 without   (5% ambiguous)
      gu    61 auxiliary,   46 with an infinitive,  15 without  (25% ambiguous)
      pa    49 auxiliary,   49 with an infinitive,   0 without   (0% ambiguous)

  Gujarati carries the Hindi problem worst: a quarter of its auxiliary
  occurrences are plain future. Panjabi does not carry it at all. Assuming the
  three behave alike, which the "repeat the Hindi work almost exactly" plan
  did, would have produced a Gujarati rate inflated by a quarter.

**Nothing above required a model call. The sweep data already on disk answered
all five, which is the argument for doing this first every time.**

## THE CANONICALISATION RULE: both sides of every test, through the same normalisation

A guard must never compare a canonicalised value against a raw one. Written
from the completed sweep of every membership and equality test in
validateStructuredResult.js and sanitizeAiTextField, 5 August 2026.

**FOUR DEFECTIVE INSTANCES, all one shape, three found by a reader hitting
them and one by the sweep:**

  1. **The abbreviation defect.** "22 Apr 2026" vs "22 April 2026": the model's
     expansion compared raw against the paper's abbreviation. Fixed by
     canonicalNamedDate collapsing month spelling, both sides.
  2. **The numeric-date defect.** "01/05/26" vs "1 May 2026": a slash date
     returned null from the canonicaliser and fell through to a literal string
     comparison. Cost every reader of one real 702KB bill all six cards, twice.
  3. **Engine-owned facts.** main_date and the payment fields compared raw to
     raw, so the engine's "19 June 2026" and a model's "19/06/2026" were
     different facts, and "£240.22" and "240.22" different amounts.
  4. **The enum sets.** Every ALLOWED_* set is lower-case; the candidate was
     tested raw, so "High", " high " and "Urgent" each discarded a whole
     result. The sweep's find, and the first not paid for by a reader.

**ONE CLEAN-BY-SYMMETRY CASE, which is the other half of the rule:** the
provenance exemption compares the candidate string raw against the fallback
string raw at the same path. Neither side is normalised, so byte-identity is
the deliberate semantics and it is correct. The rule is SAME normalisation on
both sides, which includes none on both sides. It is not "normalise
everything": card_id, schema_version and the provenance comparison are exact
on purpose, and loosening them would let a mislabelled card or a relocated
engine string through.

**THE TELLS, from how these four were actually found:**
  - a membership test whose set is built by one function and probed by another
  - a comparison that lower-cases, trims or canonicalises exactly one operand
  - a fix applied to one layer and not searched for in the others: instances
    2, 3 and 4 were all reachable from instance 1 by grep on the day it was
    fixed, and instead each cost its own round

When one instance of this shape is found, sweep every comparison in the file
the same day. The fourth instance was found that way in minutes; the second
and third each cost a production incident.

## THE BUCKET RULE: harness failure buckets are READ, not counted

Recorded 5 August 2026, after a production failure sat in the harness output
for three consecutive runs and was reported as a number.

The reader-output harness groups rejections into buckets and prints a count.
Asked whether the guard work had made things worse, I reported this:

    before the guard work   13 guard-rejected
    after step 1            12
    after step 2            10
    after step 3            11

and concluded the rate had fallen, so the guard work was not implicated. **The
rate was never the question.** Inside the "something else" bucket, in every one
of those runs, were these lines:

    ambiguous_numeric_date   date 3 june 2026 appears in neither the document
                             nor the engine output
    ambiguous_numeric_date   date 6 may 2026  appears in neither ...
    short_year_date          the same shape

Two corpus documents NAMED FOR EXACTLY THIS FAILURE were reproducing the
production defect on every run, and I printed the size of the set they were in
rather than the set. The production diagnosis then took two wrong hypotheses,
a database column and three days, to reach a fact that was already on disk.

**SO: an aggregate that moved is not an answer. Open the bucket and read the
lines.** A falling count can hide a constant defect, and a defect that appears
in every run is the easiest kind to find and the easiest kind to skim past.

Concretely, for any harness run used to answer a question:
  - print every distinct reason, not the count per bucket
  - read the document IDs, because a corpus document named for a shape that is
    failing on that shape is the whole answer
  - never report movement in a total as evidence about a cause

## THE PRODUCTION RULE: a local run proves nothing about what production serves

Recorded 4 August 2026, after a reported English degradation was investigated
against `document_sessions` and the production data contradicted the premise.

**WHAT A LOCAL MEASUREMENT CAN PROVE.** That a guard fires or does not on a
given sentence. That the engine floor is what it is. That a change moves the
corpus. All of that is deterministic and local runs settle it completely.

**WHAT IT CANNOT PROVE, AND THIS LIST IS THE POINT.**

  - **That production is reaching the provider at all.** The key, the network,
    the timeout and the deploy all live somewhere a local run never touches.
    Every measurement in this programme since the prose restore has run against
    a local key.
  - **What production's traffic actually looks like.** Measured: 794 of 1,000
    sessions in fourteen days arrived in same-second batches of three or more,
    which is script traffic, not readers. Any rate computed over the raw table
    is dominated by it.
  - **What real readers upload.** Of the 206 non-batched sessions, 172 were
    `unreadable_document` at `input_quality: poor`, with a median PDF size of
    **58 bytes**. That is scanner and bot traffic hitting the endpoint. The
    corpus contains nothing like it and cannot.
  - **Which guard rejected a result.** `validation_errors` is captured in
    `debug.ai` and is NOT a column in `document_sessions`, so a production
    rejection is recorded as `sanitizer_rejected` and nothing more. The guard
    cannot be named after the fact. This is the single largest instrumentation
    gap and it is why the 4 August investigation could not finish.

**SO: any claim of the form "production is doing X" must be answered from
`document_sessions`, not from a corpus run.** The reader-output harness measures
the ceiling a document COULD reach; it does not measure what any reader got.

## THE DENOMINATOR RULE: never derive a recall figure from the pattern under test

A first pass at the Spanish, French and Portuguese vocabularies reported **100%
recall, zero over-fires, all three.** The number was worthless. The truth set
was built with a loose version of the SAME pattern, so any sentence whose verb
the stem list lacked was never in the denominator and could not be counted as a
miss.

    "Le paiement doit être effectué avant le 31 juillet 2026."

was invisible, because the French stem list has no `effectu`. Against a
pattern-INDEPENDENT truth set, a modal plus any verb-shaped word, the Spanish
denominator is **54 sentences and not the 21 the circular version reported.**

**SO: build the truth set from a property the pattern does not use, print every
member, and let it be audited.** The Hindi figures do not carry this defect,
because their truth set is "infinitive plus obligation auxiliary", which is
independent of the stem list. That is why the Hindi numbers stand and the
Romance ones were withdrawn.

The tell is cheap to check: if tightening the pattern makes the denominator
shrink, the denominator is derived from the pattern. That is exactly what
happened when the subordinate-clause exception was added, and it is how the
circularity was noticed at all.

## THE WORD-ORDER RULE: check it before writing vocabulary, not after

**Two guards have now failed the same way, and both were found by measurement
after the vocabulary was written rather than before.**

    step 2, the credential guard
        anchored on `^(?:please\s+)?(?:confirm|enter|...)`, a SENTENCE-INITIAL
        imperative. Polish carries the imperative in one fixed word with the
        verb second. Hindi, Bengali, Gujarati and Panjabi put the verb last.
        The anchor was in the wrong place, and translating the word list would
        have bought nothing.

    the Hindi command family
        required a stem and its infinitive ADJACENT, because English "you must
        pay" is adjacent. A Hindi compound verb is a noun plus a light verb and
        the two separate: "भुगतान 3 सितंबर 2026 तक करना होगा". Twelve of
        fourteen misses across 1,399 sentences were that one assumption.

Neither was a vocabulary gap. Both were an English SENTENCE STRUCTURE ported
into a language that does not share it, hidden inside a pattern that looked
like it only carried words. A reader checking a word list would not have caught
either, because neither is visible in the list.

**SO, FOR EVERY REMAINING LANGUAGE, THIS IS ANSWERED IN WRITING BEFORE ANY
VOCABULARY IS WRITTEN.** Three questions, and they are cheap because the
measurement override supplies the evidence:

  1. **Where does the imperative sit?** Initial, second, final, or a fixed
     particle. If it is not where English puts it, no anchor may assume a
     position at all.
  2. **Can the verb be split from its object or its auxiliary?** Compound
     verbs, separable prefixes, clitics. If yes, every pattern needs a bounded
     gap and the bound has to be measured, not guessed.
  3. **Is the obligation marker ambiguous with something else?** Hindi होगा is
     both the obligation auxiliary and the plain future, which inflated the
     first Hindi measurement from 6.9% to 8.8% until an infinitive was
     required. German werden and Dutch zullen have the same shape.

Answer all three from real model output before a single phrase is listed. The
override makes that a half-hour per language; discovering it afterwards cost
two rebuilds here.

## Spanish, French and Portuguese: word order answered, vocabulary NOT built

The three word-order questions are answered, from the 504-sample sweep, and
they are the durable part of this. The vocabulary is not built, and the reason
is a measurement error worth keeping.

### The answers, measured over 1,251 es, 958 fr and 1,312 pt sentences

**Q1, where does the modal sit? NOT reliably sentence-initial**, which is the
part of "these three share English word order" that was wrong:

    es   30 of 62 first word,  32 elsewhere
    fr   25 of 41 first word,  16 elsewhere
    pt   31 of 64 first word,  33 elsewhere

A `^` anchor would miss roughly half in all three. Position-free is required
here exactly as it was for the credential guard in step 2.

**Q2, can the verb be split from the modal? Yes, and by more than English.** The
modal takes an infinitive or a participle with an optional passive auxiliary
between: "Le montant de £214.63 doit être payé avant le 28 mai 2026." Measured
gap from modal to verb: es median 1, p90 26, max 36; fr median 2, max 6; pt
median 1, max 1. The same defect as the Hindi compound verb, milder.

**Q3, is the obligation marker ambiguous? No, and this is the real difference
from Hindi.** Zero sentences in any of the three carry both a modal and a future
marker. debe/será, doit/sera, deve/será are distinct words, where Hindi होगा is
both. No correction is needed to these three rates.

### Why the vocabulary is not built: a circular measurement

A first pass reported 100% recall for all three with zero over-fires. **That
number was wrong and the error is instructive.** The truth set was built with a
loose version of the SAME pattern, so any sentence whose verb the stem list
lacked was never in the denominator and could not count as a miss.

"Le paiement doit être effectué avant le 31 juillet 2026." was invisible,
because the French stem list has no `effectu`. Measured against a
pattern-INDEPENDENT truth set, a modal plus any verb-shaped word, the Spanish
denominator is **54 sentences, not the 21 the circular version reported.**

**THE RULE THAT FOLLOWS, and it belongs beside the word-order rule below: a
recall denominator must never be derived from the pattern under test.** Build
the truth set from a property the pattern does not use, print it, and let it
be audited. The Hindi figures do not have this defect, because their truth set
is "infinitive plus obligation auxiliary", which is independent of the stem
list.

Also found and not yet resolved: a subordinate-clause exception is needed in
all three, because the four bank over-fires were all an obligation inside a
"whether / that" clause. That is the SAME false positive the English guard
already has, reproduced faithfully rather than introduced. Adding it fixed the
over-fires and simultaneously shrank the circular denominator, which is how the
circularity was noticed.

**What remains: build the three stem lists against the independent denominator,
which is roughly 54 + 30 + 35 sentences to satisfy, and re-measure. The word
order work above does not need repeating.**

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
