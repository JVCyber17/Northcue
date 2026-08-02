# How Northcue gets documents worth testing against

Written 2 August 2026, after a real British Gas bill was uploaded to the live
product and all six cards declined.

## Why this file exists

The engine had 60 regression documents and a passing suite. The first genuine
real-world document ever fed to the live product broke it, on a five-line
function that across all 60 documents uniquely caught nothing.

That is not bad luck. It is what happens when every document in a corpus was
written to test a rule. Measured, on the corpus as it stood:

- median document **62 words**, longest **171**. A real UK energy bill is
  1,800 to 4,000 words across 2 to 6 pages. Documents at 300+ words: **zero**.
- **no document had ever been through the extractor.** All of them are
  hand-written `text:` strings passed straight to the engine. The bug that broke
  production lives in what `extractTextFromPdf` produces.
- 20 documents yield a deadline. The sentence carrying it is "Please pay by
  DATE" or "You must pay by DATE" almost every time. **In none of the 20 does an
  amount sit between the verb and the date** — which is how a real bill writes
  it. Four ordinary demand phrasings, written fresh, produce no deadline at all.
- six genuine non-English documents across nine languages. **Gujarati, Hindi,
  Bengali and Panjabi have none.** All twelve non-English documents produce no
  amount, no date and no consequence.

**The corpus tested the engine against our idea of a letter.**

## The admission rule, changed

Today a document earns its place by testing a rule. That is precisely why 63
documents missed a bug in a five-line function.

**A document may also earn its place by being ordinary.** A boring, correct,
2,000-word energy bill that exercises no rule in particular is exactly what was
missing and exactly what broke. When adding to the corpus, "this does not test
anything new" is no longer a reason to leave it out.

## Track 1: extract, do not hand-write

**Status: in progress.** The cheapest change and the one that closes the class
that actually broke.

Corpus documents are generated as real multi-page PDFs, with headers, footers,
columns and tables, and run through the real `extractTextFromPdf`. The stored
fixture is the **extracted** text, not the authored text.

Everything about extraction that a hand-written string cannot express is then in
scope: how pages are joined, where line breaks land, what happens to a column,
what a footer looks like after extraction, whether an amount survives a line
break. The production bug was `parts.join("\n\n")` emitting no page marker. No
hand-written fixture can contain that fact.

## Track 2: anchor to published specifications

**Status: the next thing to build.**

The content of UK official post is largely mandated, so the specification is
public even when the letters are not. Build from the mandated field list and the
structure is real even though every value is invented.

| document type | what fixes its content |
| --- | --- |
| energy bill | Ofgem billing rules: required fields, tariff and usage presentation |
| council tax demand | prescribed demand notice regulations |
| rent increase | statutory Section 13 notice form |
| possession notice | statutory Section 21 / Section 8 forms |
| HMRC and DWP letters | published specimen correspondence |
| NHS appointments | trust-published templates |

This is the difference between a letter as we imagine it and a letter as the
regulator requires it. It needs nobody's private post, and it is auditable: the
reason a field is present is a citation rather than a guess.

## Track 3: the advice sector

Citizens Advice, StepChange, Shelter and Macmillan publish redacted example
letters in their public guidance, written by real senders to real people and
redacted by people whose job is redaction.

This is also the most realistic route to non-English documents, because those
organisations serve exactly the communities Northcue's nine languages target.
Start with what is already public.

## Track 4: reader donation. CLOSED.

**We are not asking readers to donate their post.** Decided 2 August 2026.

Recorded so it is not reopened by accident. The privacy rule is that raw
uploaded text is not stored, and a donation pipeline is an exception to it, not
an extension of it. If the question ever returns it needs its own design and its
own decision, and this file is not that decision.

## Track 5: one genuine document per language, before anything else ships

Four of the ten languages have **no corpus document at all**, while the template
bank carries 371 translated sentences for each of them. Gujarati, Hindi, Bengali
and Panjabi are at zero, and their communities are the stated users.

One genuine letter per language, through Track 2 or Track 3, tells us more than
another twenty English documents. What we do not know is basic: how a sender is
stated, how a reference is labelled, where the obligation sits, whether the
currency is GBP.

## What good looks like

A corpus that would have caught the British Gas bug before a reader did. In
practice that means:

- documents at real length, not summary length
- fixtures that came out of the extractor, not out of an editor
- phrasings taken from real letters, not from the rules we already wrote
- at least one ordinary, genuine, boring document per language and per type
- and, when a rule is written, a document that the rule gets WRONG kept
  alongside the ones it gets right

The last one matters most. Several sections of `KNOWN_ENGINE_DEFECTS.md` exist
because a rule passed its author's own review. A corpus made only of documents a
rule handles is a corpus that agrees with its author.
