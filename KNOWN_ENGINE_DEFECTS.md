# Known engine defects

Defects found by audit, verified against the real engine, and not yet fixed.
Two subsystems so far: **classification** (what the engine decides a document
is) and **deadline extraction** (which date, if any, it presents as an
obligation).

> **This is a defect list, not a specification.** Nothing here describes
> intended behaviour. Do not write a test that asserts any of it, because a test
> asserting current-but-wrong behaviour teaches the next reader that it is
> wanted. Fixed items get tests; open items get this file.

---

# Classification defects

Northcue's classification layer decides what a document *is*: its category, its
type, whether it is trusted, and which processing mode it takes. Every
classifier in it is a **flat OR over substring matches**. There is no scoring
and no counterweight anywhere, so one matching substring decides the outcome.
`detectDocumentCategory` compounds this: it opens with four unconditional early
returns (`isUnsupported`, `isTemplate`, `isOutgoing`, `scamSignals.length > 0`),
each of which fires *before any real category test runs*. The category is not
overridden, it is never computed.

An adversarial audit on **31 July 2026** attacked this layer with wording that
genuinely appears on UK official correspondence, across six issuing-authority
domains: enforcement and debt collection, courts and tribunals, housing, council
tax and utilities and motoring, DWP and HMRC and Home Office, and NHS and
employment and education and insurance.

**72 single phrases were verified to flip a classification field on a genuine
letter. 36 of them cost a parsed deadline or amount. 14 were rated critical.**

This file records what remains. It exists so nothing found in that audit is
lost, and so a future session can tell a known defect from a new regression.

## Reproducing any of it

```bash
node scripts/engine-baseline/run.js --check
```

The audit used a probe that inserts a phrase into a genuine corpus document and
prints every classification field that moved. It is not committed; it is about
40 lines around `runClearStepsEngine`, comparing `structured_output.trust_internal`
and `api_output.structured_result` before and after inserting a line at index 1.

## Closed on 31 July 2026

| Fix | What it closed | Phrasings |
|---|---|---|
| **W1** `verification_only` no longer deletes a parsed date | the *cost* of every scam misclassification, not the misclassification itself | affects all 36 data-losing cases |
| **F1** `looksTemplate` rewritten | any square, curly or angle bracket marking a letter a blank form | 6 |
| **F2** `looksOutgoing` narrowed to first-person authorship | salutations and service-of-notice wording marking a letter as reader-written | 7 |

Guarded by `tests/classificationRobustness.test.js`.

**W1 is a mitigation, not a fix.** The date is now shown to the reader on card 4
as *stated* rather than deleted. `main_date`, `deadline` and `possible_deadline`
still go null on every document below, because the engine must not assert an
obligation from a document it has decided not to trust. The misclassifications
themselves are all still live.

---

## Open, ranked by harm

### 1. `detectScamSignals` pressure and action needles — 24 verified phrasings

`src/services/clearStepsEngine.js`, `detectScamSignals`. One hit forces three
decisions with no counterweight: `document_category` → `possible_scam`,
`trust_assessment` → `low`, `document_type` → `possible_scam`.

**Nine of the twenty entries misfire on genuine correspondence:**

| Entry | Genuine phrasing that trips it |
|---|---|
| `act now` | "Failure to **act now** will result in further fees being added." |
| `final warning` | "This is a **final warning** before a penalty notice is issued for unauthorised absence." |
| `confirm your account` | "Please **confirm your account** number when you contact us." |
| `click this link` | "**Click this link** to confirm or change your appointment online." (NHS) |
| `share your password` | "HMRC will never ask you to **share your password** or your bank details." |
| `enter your pin` | "You can pay at any Post Office by debit card, you will need to **enter your PIN**." |
| `account will be frozen` | "If a third party debt order is granted your bank **account will be frozen**." |
| `verify your identity within` | "You must **verify your identity within** 30 days or we cannot process your claim." |
| `bank transfer today` | "If you pay by **bank transfer today**, please quote your account number." |

The `share your password` case is the sharpest: **standard anti-fraud advice
printed on genuine HMRC letters marks the letter as a scam.** On `gov_hmrc` that
inserted line moves 9 fields, including `main_date` "31 July 2026" → `null`.

Current output on `bailiff_enforcement` + "FINAL WARNING BEFORE ENFORCEMENT ACTION":

- card 1 "Marston Holdings Enforcement Agents appears to have sent an official notice mentioning £1,247.00." → **"This may be a suspicious message about money or details."**
- card 6 → **"Do not use links or numbers in the document until checked."**, which steers the reader away from the 0333 number that is the only way to stop an agent attending
- `severity_level` stays `urgent` and `is_high_stakes` stays `true` throughout, so the engine calls the same document urgent and untrustworthy at once

Eleven entries stayed clean across all thirty documents: `gift card`, `crypto`,
`full password`, `confirm your password`, `enter your password`,
`confirm your pin`, `card number, pin`, `card number and pin`,
`pin and full password`, `account will be suspended within`.

**Proposed fix (F3, not approved).** Split the list into a decisive tier
(credential asks, which stay as they are) and an advisory tier (the nine above,
which add a signal but cannot change category, trust or mode).

**F3 is blocked, and the blocker is evidence, not risk appetite.** Rewriting
`scam_phishing` to remove every needle that also misfires on genuine letters
produces an **identical** outcome — `possible_scam`, `low`, `verification_only`
— carried by the three credential needles alone. So no high-volume-on-genuine
needle is load bearing *on the evidence available*. But the corpus contains
**exactly one** scam document. The false-positive side is proven across thirty
genuine letters; the false-negative side is proven against one adversary. There
is also a real gap: a link-only smish that never asks for a credential in text
is currently caught *only* by `click this link` and `act now`.

**Do not demote any needle until the scam corpus is comparable in size.**

### 2. `detectDistrustSignals` pairs — 7 verified phrasings

`pickTrustAssessment` returns `low` at `distrustSignals.length > 1`, and the list
holds `dear customer`, `limited time`, `urgent payment required` and
`unusual sender`. Two ordinary lines on a genuine bill are enough:

```
"Dear Customer, this is a limited time offer to move to a fixed tariff."
on energy_bill:
  trust_assessment  high -> low
  processing_mode   normal -> verification_only
  main_date         "28 May 2026" -> null
```

`URGENT PAYMENT REQUIRED` over `Dear Customer` is the standard top-of-page block
on debt-collection stationery where the agency holds no matched name.

**`dear customer` votes both ways.** It adds a distrust signal, and via
`lower.includes("dear")` it also adds an *authentic* signal. Any list where one
token is evidence for and against is not measuring anything.

**Proposed fix (F4, not approved).** Require `authenticSignals.length < 2` before
two distrust signals can force `low`. **Strengthen `detectAuthenticSignals`
first**: it currently counts "contains the word reference", "contains a date",
"is a PDF" and "contains the word dear", all of which a competent phishing
letter clears trivially. Using it as a counterweight in its present state would
weaken scam detection for no real gain.

### 3. `detectDocumentCategory` unbounded substrings and row order — 16 verified phrasings

The `checks` list matches with bare `includes()` and no word boundaries, and the
first matching row wins.

| Phrase | Wrong result | Cause |
|---|---|---|
| "**Creditor**: Hounslow Borough Council" | `government` → `bank_or_loan` | `"credit"` matches inside "creditor" |
| "This debt relates to a tax **credit**s overpayment." | → `bank_or_loan` | same row outranks `benefits` |
| "The Fines Officer can arrange an **appointment** to discuss how you will pay." | court fine → `appointment` | row order |
| "This debt relates to council tax **arrears**." | → `bill_or_payment` | row order |
| "Please return the completed form to the **Human Resources** Department." | → `government` via `"department"` | unbounded needle |

Housing already uses `/\brent\b/` for exactly this reason. The other 40-odd
needles do not.

**Proposed fix (F6, not approved).** Word-bound every needle and reorder the
rows, one row at a time. Substantial baseline movement, mostly corrections.

---

## Defects present at baseline, with no insertion at all

These need no adversarial phrase. They are in the shipped output today.

**B-1. CLOSED 31 July 2026.** `bailiff_enforcement` had no deadline. Source
text: "You must contact us on 0333 320 122 by 3 September 2026." Output:
`main_date: null`, card 4 "No clear due date. These dates appear in the
document: 20 August 2026, 3 July 2026, 3 September 2026. Check what they refer
to." The most urgent document in the corpus presented its contact deadline as
one of three undifferentiated dates.

Closed by Tier 3 of the deadline vocabulary, the discontiguous label: an
obligation head carrying a first person plural object, a bounded lazy gap of at
most 44 characters holding the contact method, and the temporal "by". Card 4
now reads "Due by 3 September 2026." and `main_date` carries it. One corpus
document moved, none lost or changed a deadline, zero protected fields.
Guarded in `tests/deadlineVocabulary.test.js`.

**B-2. `legal_solicitor` is mislabelled "Bill or payment notice".** A document
headed LETTER BEFORE ACTION classifies as `bill_or_payment`, because
`outstanding balance` fires on the top-priority row and `isCourtClaim` lists
`letter before claim` but not `letter before action`. `detectSeriousDocumentSignals`
**does** list `letter before action`, so the engine knows it is high stakes and
simultaneously labels it a bill. The two lists disagree with each other.

**B-3. `benefits_dwp` classifies as `bank_or_loan`,** because "Universal Credit"
contains "credit". The label is rescued only by the `isWelfareBenefitsLetter`
override. Remove that override and a DWP award letter reads as a lender letter.

**B-4. `gov_hmrc` is labelled "Unknown document"** while its own card 1 says
"This appears to be a formal letter about tax or HMRC." The engine recognises the
topic in the card text and still cannot name the document type.

**B-5. Misclassification used to raise stated confidence.** Before F2,
`water_bill` + "Dear Sir or Madam" moved `trust_assessment` medium → **high** and
`confidence` medium → **high** while card 1 became "This looks like a document
sent by you." `looksOutgoing` bypassed `pickTrustAssessment` entirely and the
inserted "Dear" *added* an authentic signal. F2 closes this particular route.
The underlying shape, that `detectAuthenticSignals` rewards the word "dear",
is unchanged.

**B-6. Severity and trust contradict each other openly.** Under any scam-needle
insertion on `bailiff_enforcement`, `severity_level` stays `urgent` and
`is_high_stakes` stays `true` while `document_category` is `possible_scam` and
card 2 reads "Check authenticity before taking any action."
`tests/severityContradiction.test.js` does not cover this combination.

**B-7. The high-stakes consequence line is gated on trust.** `buildBanner` and
`inferHelpfulNote` both read `is_high_stakes && trust_assessment !== "low"`, so
any trust downgrade from any scam needle or any two distrust needles silently
deletes the consequence sentence.

**B-8. The literal string `today` is emitted as a date.** `eviction_possession`
under a scam-needle insertion: card 4 lists "12 September 2026, today". The
source has "Rent arrears as at today:" as a field label.

**B-9. The scam corpus is one document.** `scam_phishing` is the only adversarial
document among thirty. This is a blocker on F3 and a standing weakness in the
harness.

---

---

# Deadline extraction defects

Added **31 July 2026** after a sweep of contact, response and attendance
obligation phrasings across four issuing-authority domains.

Three tiers have shipped. Tier 1: date labels bind forwards only, require
nothing but punctuation between label and date, and test 3 covers the whole
label span. Tier 2: five literals for the class that states a date in a field
rather than a sentence ("Compliance date:", "Date for compliance:", "Response
date:", "act by", "you must act by"), each word bounded because three of the
five matched inside longer words. Tier 3: discontiguous labels, which closed
B-1. Tier 4, new literals beyond these, is still open.

Everything below is open unless it says otherwise.

Guarded parts are in `tests/coLocation.test.js`. Nothing below is guarded, for
the same reason as above: a test asserting current-but-wrong behaviour reads as
a specification.

**D-1. The bare `before` in `extractDeadline`'s fallback promotes mentions.**
`src/services/clearStepsEngine.js`, the `deadlineContext` regex, ends
`|cleared\s+before|before)`. The bare token promotes any date within 35
characters after the word "before", with no verb requirement and no obligation
test. Verified, all pure mentions, all promoted to `deadline` today:

```
"Any payments made before 3 July 2026 are not included in this balance."  -> 3 July 2026
"Your tenancy began before 1 April 2024."                                 -> 1 April 2024
"Please arrive fifteen minutes before your appointment on 1 July 2026."   -> 1 July 2026
```

This is the inverse of the defect Phase B was opened to fix: not a deadline the
engine cannot see, but a rule broad enough to turn a background date into a
headline one. It is why no bare preposition should ever be added to
`DATE_GOVERNS`: any `before` entry must be verb-anchored.

**D-2. `backwardLookingContext` is unreachable for co-located dates.** The guard
exists to reject `was due`, `were due`, `became due` and `overdue since`.
Co-location runs first and returns before it, so:

```
co.selectDeadline("Your last payment was due on 3 July 2026 and has not been received.")
  -> { value: "3 July 2026", label: "due on" }
```

A past-tense receipt becomes a future deadline, and an existing safety rule is
bypassed rather than absent.

**D-3. `benefits_dwp` can never show a deadline.**
`buildBenefitsReadingAidExtraction` hardcodes `deadline: null` and
`signals.primaryDate = null` for every welfare letter. That was deliberate,
because benefits letters list several dates and the engine could not tell which
was the deadline. It now means **no change to `coLocation.js` can ever surface a
DWP deadline**, including phrasings co-location binds perfectly. Any future
deadline work must decide whether that path is still the right answer now that
binding exists.

**D-4. Card text and `possible_deadline` are computed from different sources on
the reading-aid path.** Eight corpus documents sit on that path. Card 4's
sentence comes from `buildReadableDateMessage`; `possible_deadline` and
`main_date` come from `signals.primaryDate`. They agree today by accident.
`insurance_letter` shows the failure shape: if `selectDeadline` starts firing on
it, the card would read "These may be important dates: 1 July 2026" while the
field beneath became "1 August 2026". **Review card text coherence, not only
`main_date`, on any change to this layer.**

**D-5. `insurance_letter` reports the letter date as its deadline.**
`main_date` is **1 July 2026**, which the document labels "Date of this notice".
The real obligation is on line 7: "unless you tell us otherwise before
1 August 2026". Not fixed by the Tier 1 rules and not fixed by any currently
proposed vocabulary, because the only shape that would reach it is a bare
`before`, which D-1 rules out.

**D-6. `housing_letter` emits a relative period where a date belongs.**
`deadline` is the string `"within 14 days"`, from the reading-aid path, and card
4 reads "These may be important dates: within 14 days."

**D-7. `ocr_enforcement` has zero parseable dates.** `LONG_DATE` in
`coLocation.js` requires whitespace between the day and the month, so
`3September 2026` and `20August 2026` are invisible:

```
co.findDates("You must c0ntact us by 3September 2026.")  ->  []
```

The most urgent OCR document in the corpus can surface no date at all, and no
vocabulary or proximity change can reach it. A tolerant variant
(`\b\d{1,2}\s*(?:jan|feb|...)`) is a change to date *finding* rather than to
co-location, and is probably a larger win than any remaining tier.

**D-8. `unclaimedDates[0]` is still the first-date-in-document-order guess** that
co-location was built to remove. It supplies `main_date` for `education_letter`,
`employment_letter`, `insurance_letter` and others. Those answers are correct
only while each of those letters contains exactly one body date.

**D-1 and D-2. CLOSED 31 July 2026**, together with a third defect found while
fixing them. Recorded here rather than deleted, because all three were invisible
to the rendered baseline and the reason matters more than the fix.

*D-1, the bare `before`.* It was NOT an unbounded-substring defect: the token
was already word bounded and `beforehand` never matched it. It was a defect of
meaning. `before X` marks a boundary in either direction and states no
obligation, so the pattern matched correctly and meant the wrong thing. Deleting
it was simulated and rejected, because four genuine obligations reach the engine
through that token and co-location binds none of them. It is now anchored to an
obligation verb within a bounded gap, which separates the two sets 13 of 13.

*D-2, the unreachable guard.* Two defects, not one. The guard sat in
`extractDeadline` after co-location had already returned, AND a second keyword
pass immediately below it repeated the same loop with the guard omitted, so even
where it fired it was overruled three lines later. The second pass is deleted
and the guard now also runs inside `selectDeadline`, skipping the value rather
than abandoning the search so a later date on the same letter is still found.

*The competes half of the word-boundary rule, found while fixing the above.*
`WORD_BOUNDED` held only the five entries Tier 2 added, so every older entry was
still a bare substring. **`less` matched inside `unless` on `legal_solicitor`
and `insurance_letter` in the shipped corpus.** The two kinds fail in opposite
directions, which is why they were separated:

- a **governs** over-match ASSERTS a wrong answer, the D-1 shape
- a **competes** over-match makes co-location DECLINE, losing a right answer

A decline is the safe direction, which is why the competes entries were left
alone at first. That judgement was incomplete.
`isClaimedByCompetingDateLabel` reads the same label hits and tests proximity
rather than adjacency, so it counts a label on the line ABOVE a date. A false
competes match there **suppresses a genuine deadline on the reading-aid path**:

```
"A periodic charge applies to the trip account."
"Please return the signed consent form by 3 September 2026."
  isClaimedByCompetingDateLabel("3 September 2026")  ->  true   via "period"
  card 4  "These dates appear in the document: 3 September 2026."
```

That is a school trip consent deadline reported as a date of unknown meaning,
caused by the word "periodic" on the line above it. Every entry is now matched
as a whole word. `school_periodic` in the corpus is that document.

Note for a future session: the same proximity-not-adjacency asymmetry means the
between-case cannot arise for dates at all, because Tier 1b already rejects
anything with letters between a date label and its date. All date-side harm from
this class runs through `isClaimedByCompetingDateLabel`.

**Four corpus documents were added with these fixes**, because the keyword
fallback supplied the shipped deadline for no corpus document at all and the
rules were therefore invisible to `--check`: `arrears_before_clause`,
`failed_direct_debit`, `arrears_past_and_future`, `school_periodic`.

**D-9. Both readings of a numeric date are accepted as a deadline, and neither
is chosen.** `isPlausibleNumericDate` in `src/services/clearStepsEngine.js`
returns true when EITHER a day-first or a month-first reading is in range:

```js
return (a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
       (a >= 1 && a <= 12 && b >= 1 && b <= 31);
```

That is deliberate for finding a date and unresolved for meaning one. Verified
against the engine on 31 July 2026, both promoted to `deadline`:

```
"Please pay by 03/06/2026."   -> deadline "03/06/2026"    3 June or 6 March
"Please pay by 06/03/2026."   -> deadline "06/03/2026"    6 March or 3 June
```

The two readings are 95 days apart and, against that date, land on opposite
sides of today. The shape appears on documents produced by US-configured
billing systems, which UK organisations do use.

Echoing the string is defensible: the reader can compare it against the paper.
Anything that computes from it is not, and that is the harm this records.

**D-10. Years with two readings, or none, are accepted as deadlines.** Same
verification run, all three promoted:

```
"Please pay by 28 May 26."    -> deadline "28 May 26"     2026 or 1926
"Please pay by 5 April 99."   -> deadline "5 April 99"    1999 or 2099
"Please pay by 1 April 226."  -> deadline "1 April 226"
```

`LONG_DATE` in `coLocation.js` ends `\d{2,4}`, so a two or three digit year is
accepted with no century rule and no sanity bound. A four digit year far from
now ("1 April 9999") is accepted too.

**What P1 did and did not do about D-9 and D-10.** `summary.deadline_iso`, added
31 July 2026, refuses every example above: the month must be named rather than
numbered, the year must be four digits, and the day must exist in that month.
So nothing that reasons about dates can inherit either defect through that
field.

**The acceptance itself is unfixed.** `extraction.deadline`, `summary.main_date`
and card 4 still carry all five strings above and still present them as the
document's deadline. P1 gates the arithmetic, not the extraction. Fixing the
extraction means deciding what the cards should do with an ambiguous date, and
declining to show one at all is a worse answer than showing it, because the
reader holding the letter can resolve it and Northcue cannot. The likely fix is
to keep showing it and mark it unresolvable, which is a card-wording change and
therefore a separate piece of work.

**The reader-facing half CLOSED 31 July 2026.** Card 4 no longer asserts an
unresolvable date without saying so. The answer keeps quoting the paper, because
the person holding the letter can resolve what the engine cannot and deleting
the date would take away the only thing they can check it against. The key point
is REPLACED, not added to, and names the part that could not be settled:

```
ambiguous order   "The day and the month could be either way round.
                   Check the original document: 03/06/2026."
incomplete year   "The year is not written in full.
                   Check the original document: 28 May 26."
```

`unresolvableReason` in `src/utils/deadlineIso.js` decides which, on the VALUE
alone. It reports ambiguity only when both numbers could be the day:
`25/06/2026` has a single reading, so claiming ambiguity there would be a false
alarm even though `toIsoDate` still declines it. Order outranks a short year
when a value has both. Everything else returns null and keeps the ordinary key
point, including an unknown month word and a day that does not exist in its
month, because no short sentence improves on those.

Guarded by a generative sweep in `tests/deadlineIso.test.js`: 100 date shapes
built from five days, five months and four years go through the whole engine,
and any that reaches card 4 with an unresolvable value under an unqualified
"Due by" fails. A companion test asserts the sweep actually reaches at least 20
unresolvable dates, so it cannot pass by finding none.

**The extraction is still unfixed, and that is now the whole of D-9 and D-10.**
`extraction.deadline` and `summary.main_date` still carry `"03/06/2026"`,
`"28 May 26"`, `"5 April 99"` and `"1 April 226"` as deadlines.
`isPlausibleNumericDate` still accepts both readings without choosing, and
`LONG_DATE` still ends `\d{2,4}` with no century rule. What changed is that the
reader is now told, and that nothing computes from any of them. Tightening the
patterns themselves means deciding what to do with a date the engine can no
longer see at all, which is a different question from what to say about one it
can see and cannot settle.

---

---

# Contact details, appeal routes and payment routes

Inspected **1 August 2026**. Class A shipped; class B declined.

## Class A, contact numbers. SHIPPED.

`extractContactDetails` matched email only and populated **0 of 36** corpus
documents, so the field was unpopulated rather than unread. `appeal_rights` and
`support_options` were hardcoded `[]` at all seven return sites and had never
been written to at all.

`contact_number` now carries the one number a document says to ring, bound to
the purpose printed beside it, on twelve documents. Guarded by
`tests/contactNumber.test.js`.

Two things worth keeping:

**A strict UK phone pattern drops the number that matters most.**
`bailiff_enforcement` prints `0333 320 122`, ten digits where a real 0333 number
has eleven. The enforcement notice B-1 existed for carries the one number a well
formed pattern rejects. Hence a loose shape with a strict leading zero, which is
what rejects account numbers, the HMRC UTR, National Insurance numbers and
hyphenated bank accounts.

**The garbled gate is load bearing, not belt and braces.** Label tolerance means
`c0ntact us on` binds, so `trust.garbled_by_ocr` is the only thing between a
number read off unreliable text and the reader.

## Class B, stated routes. INSPECTED AND DECLINED.

Appeal windows, payment arrangements and disagreement routes. **18 of 36
documents carry at least one route sentence.** Not built, and the reason is not
that quotation is unsafe.

**Interpretation is out, decisively.** One needle produces four incompatible
meanings, all live in the corpus:

| Sentence | What it actually is |
|---|---|
| `water_bill` "You can spread payments over the year by setting up a Direct Debit." | a genuine offer |
| `council_tax` "If you do not pay by the date shown, you may lose the right to pay by instalments" | a warning the route may be REMOVED |
| `failed_direct_debit` "Your payment was due by direct debit on 3 July 2026 and was returned unpaid" | a failure notice |
| `broadband_bill` "This will be taken by Direct Debit on 2 May 2026." | automatic collection, not an option |

A rule keying on *instalment* or *direct debit* presents all four as an offered
arrangement. On `council_tax` that inverts the sentence.

**Quotation is accurate, and it was tested rather than assumed.** The engine's
own `extractSentenceAround` was run over all eleven corpus route sentences and
eight adversarial ones. **Nineteen of nineteen quoted correctly**, including
`benefits_dwp`'s appeal right, which wraps across two lines, and every trap:

```
"There is no right of appeal against this decision."      an interpreting rule inverts this
"You had the right to appeal within 21 days of 1 Feb."    already expired, past tense
"Your landlord may appeal the licensing decision..."      not the reader's right
"If you are not the person named above you may ask..."    conditional on who is reading
"...within 28 days of the date this notice was served"    anchored to service, not the letter date
```

**It fails on LENGTH, and that is why it is declined.**

```
"If you are aggrieved by this notice you may appeal to the First tier Tribunal under
 section 204 of the Housing Act 1996 within 21 days of the date on which this notice
 was served upon you, and you should be aware that the tribunal may confirm,"
                                                                          cut at 243 chars
```

The 200/250 character cap truncates mid-list, losing "quash or vary the notice"
and the costs warning. **A truncated statutory sentence is a wrong statement**,
and statutory appeal sentences are the long ones. Declining above the limit
would mean saying nothing on the documents where a stated route matters most,
and something on the routine ones where it matters least. That reads as
coverage.

Also unresolved: a bulleted list collapses three routes into one run-on
sentence, and selection between several route sentences is undetermined, since
nothing in a letter ranks them.

**THE PRECONDITION FOR REVISITING IS THE CORPUS, NOT A RULE CHANGE. There is no
appeal window in it at all.** Not one document says "you may appeal within N
days". A rule about appeal rights validated on zero examples of one should not
ship. Add documents first: a plain window, one anchored to service, one anchored
to an event, one conditional on a category of reader, one already expired, and
one stating there is no right of appeal.

---

# AI stripper

## The phone rules were never decided for rules output

Found while building class A, and recorded because the history explains a
behaviour nobody would guess from the code.

`sanitizeAiTextField` has five rules. Two of them remove phone numbers: whole
sentence replacement when a call-context word is present, and in-place
substitution otherwise. Between them they are absolute. No wording ships a
number to a card.

**18 June 2026 (`317720a`)** introduced them, for AI output, and says so:
"removes pay directives, UK phone numbers, and named debt charity references
**from all AI output fields**... after every response". The reason is in the
code: gpt-4.1-mini does not reliably honour prompt-level "do not" instructions.

**30 June 2026 (`595e13e`)** extended the stripper to rules output, to catch
"You must pay immediately." on an action card, lifted verbatim from a document
by the rules engine and surfacing because the AI was skipped. Part C runs "the
proven pay/credential stripper" on every path.

**The phone rules came with it** because `stripAiViolations` applies all five
and offered no way to take a subset. Nobody decided that a number the engine
read off the page should be withheld. It was a side effect of a fix about
payment commands, and it was live for a month: `bailiff_enforcement`'s card 3
key point "You must contact us on 0333 320 122 by 3 September 2026." never
reached a reader.

Closed 1 August 2026 by a sentence-level exemption, byte-identical to that
document's own rules output, phone rules only. Rules 1, 2 and 4 are unchanged on
both paths, so `595e13e`'s protection is intact. Guarded by
`tests/stripperExemption.test.js`.

**A number-level allowlist was considered and rejected.** The model is shown the
rules output in its own prompt, so it can see the genuine number, and an
allowlist of numbers would pass "Call 020 8583 4242 immediately or bailiffs will
attend" where every word except the number was invented.

## OPEN: the AI asserts an anchor the letter does not state

Found in the second AI capture, 1 August 2026, on `legal_solicitor`. It survives
every guard added that day, and it is the clearest remaining case of the AI
stating something the engine deliberately does not.

```
the letter    "Unless payment is received within 14 days, legal action may be
               commenced without further notice to you."      dated 11 July 2026
engine card 4 "No clear due date was found. The letter is dated 11 July 2026."
AI card 4     "Payment is due within 14 days of 11 July 2026."
```

The letter states a period and no anchor. "Within 14 days" on a letter before
action is anchored to service, not to the date printed at the top, which is why
`extractDeadline` declines and `deadline_iso` is null. The AI supplies the
anchor.

**Why no guard catches it.** Every guard added that day looks for a value that
should not be there:

- the date rule compares date strings, and no new date string appears. "11 July
  2026" is printed on the letter and "within 14 days" is a period, not a date.
  The first version of this output wrote "25 July 2026", which the rule does
  catch; the model then stopped calculating and started asserting instead.
- `possible_deadline` and `main_date` are forced from the engine, so both are
  null. The claim lives only in the prose.
- the command family needs an obligation addressed to the reader. "Payment is
  due within..." addresses nobody.
- nothing about the sentence is factually absent from the page. Both halves are
  there; it is the RELATION between them that is invented.

**The shape of the defect.** It is not a wrong value, it is an unstated
inference presented as a statement. No pattern over the output can see it,
because the output contains only things that are on the page. Catching it would
mean checking a claim about the relationship between two facts, which is a
comprehension task rather than a validation one.

**The durable answer is that the AI does not author sentences.** Every guard so
far narrows what it may author: facts are engine-owned, dates must be on the
page, titles are pinned, commands are rejected. Each closed a real hole and each
was found by capture rather than by reasoning. This one cannot be closed the
same way. The options are to accept prose-level inference on documents where the
engine has declined to state a deadline, to gate the AI off documents whose
deadline is null, or to move the AI from authoring to selecting among sentences
the engine wrote.

Recorded rather than fixed because a guard that could catch it does not exist,
and inventing one that half-works would read as coverage.

## OPEN: rule 4 doubles its replacement

`_AI_DEBT_ORG_RE` substitutes each named debt charity independently, so a
sentence naming two produces a duplicate:

```
"You can get free help from StepChange or Citizens Advice."
  -> "You can get free help from a trusted advice service or a trusted advice service."
```

Reader-visible on any document naming two advice services, on both paths. No
corpus document does, which is why it has gone unnoticed. The fix is to collapse
a run of adjacent replacements into one, not to remove entries from the list.

## OPEN, and not a stripper problem: a model sentence with no trigger

`sanitizeAiTextField` splits into sentences and judges each alone, so a model
may append a sentence carrying no number, no pay command and no credential ask,
and nothing in the stripper touches it. "Do not delay." passes today and always
has. Whether a model may add such a sentence belongs to the prompt and to
`validateStructuredResult`, not here. Recorded so it is not mistaken for a
regression in the exemption.


# AI validator and reliability

Added **1 August 2026**, from D2. Both entries were invisible until
`sanitizeStructuredResultWithVerdict` (`9fe4c66`) made the AI metadata report
rejections instead of recording them as completions. Before that commit every
run below read `ai_status: "completed"`, `ai_used: true`, `ai_error_code: null`.

## OPEN: the command family rejects a safe check sentence

`UNSAFE_ADVICE_PATTERNS`' command family fires on a sentence that is not a
command:

```
blank_template, 1 of 3 rounds
  "Check if you need to complete and return the form."
```

That is a check, which is the exact form the prompt asks the model to write
instead of a command. The pattern matches `you need to complete` inside it.

**Why the lookbehind misses it.** The exception was built for ATTRIBUTION, and
only for attribution:

```
(?<!\b(?:says|stating|states|said|according to)\b[^.!?]{0,24})
```

It allows an obligation when the sentence assigns it to the document, so "The
notice states that you must contact them" passes and a bare "You must contact
them" does not. `Check if` is neither. It is a different kind of exemption: the
obligation is not asserted at all, it is made CONDITIONAL and handed to the
reader as something to verify. No part of the pattern models that, so a sentence
doing the right thing is rejected alongside the ones doing the wrong thing.

Four of the five rejections measured across three rounds are correct. This is
the fifth. The cost is a whole AI result discarded on a document where nothing
was wrong with it.

**Not fixed here**, because widening a safety lookbehind needs its own approval
and its own mutation test. The obvious widening, allowing a leading `check
if / check whether`, is narrow enough to be safe but broad enough to want
evidence: any exemption anchored to sentence-initial words can be reached by a
model that learns to open every sentence with them.

## The wait is spent where the answer is least likely to be used

Measured over 108 live calls on 1 August 2026, three rounds, round robin over
the 36 document corpus. 84 reached the provider, 24 were gated first.

**The AI reaches readers in inverse proportion to what is at stake.**

| severity | eligible calls | reached the reader | sanitiser rejected |
| --- | --- | --- | --- |
| urgent | 12 | **7, 58%** | 5, 42% |
| high | 6 | 4, 67% | 2, 33% |
| medium | 6 | 6, 100% | 0 |
| low | 60 | 56, 93% | 3, 5% |

**58% on urgent against 93% on calm.** The four documents rejected on the
command family are `eviction_possession` (3 of 3 rounds), `bailiff_enforcement`
(2 of 3), `housing_letter` (2 of 3) and `blank_template` (1 of 3, the false
positive above). `legal_solicitor` is rejected by the date rule on 2 of 3, for
"25 july 2026", which is 11 July plus fourteen days and the arithmetic twin of
the anchor defect recorded above.

**The same asymmetry in the reader's time.**

```
total wait across the 84 eligible calls   1295s
spent on answers nobody received           191s   14.7%
        on urgent and high documents       125s of 305s   41.1%

mean duration, accepted   15,132ms
mean duration, rejected   16,578ms
```

**Two fifths of the waiting time on a high-stakes document is spent on an
answer that is thrown away**, and the discarded runs are slightly slower than
the accepted ones, so the reader who gets nothing waits longest.

Nothing about the document predicts the wait. Across 84 calls the correlation
between latency and document length is r = 0.089, and between latency and input
tokens r = 0.055. The same document varies by up to 9.5 seconds between rounds
at temperature 0, because roughly two thirds of the variance is provider
throughput, which ranged 50.7 to 114.8 output tokens per second. Padding a real
bill from 439 to 8000 characters, the outbound cap, changed the latency not at
all.

Recorded rather than acted on. The timeout is not the lever: at the measured
distribution, lowering it from 25s to 20s loses 5 completions in 83 and saves
162ms of mean wait. The levers are output size and provider tier.


# Non English documents

Added **1 August 2026** from D3 tier 1, as findings rather than fixes. Four
documents were added to the corpus to hold them: `polish_rent_arrears`,
`spanish_water_final_notice`, `french_hospital_appointment`, `polish_phishing`.
They are not translations of existing entries. Each has its own sender,
reference, amounts, dates and structure, and money is deliberately printed in UK
format on all four so that language is the only variable.

**Nothing here is caused by the AI layer.** Every figure below is the
deterministic engine, on the path a non English interface already serves today.

## The safety layer does not read the document

The same phishing letter, clause for clause, in English and in Polish:

```
scam_phishing (English)   processing_mode verification_only   scam signals 6
polish_phishing           processing_mode caution            scam signals 0
```

`detectScamSignals` is a list of English phrases. A Polish letter asking for a
card number, a PIN and a full bank password inside 24 hours raises nothing, so
`verification_only` never fires and the refusal path never runs. The reader is
shown ordinary cue cards for a phishing message.

The same shape on an arrears letter:

```
arrears_before_clause (English)   severity urgent   deadline 3 September 2026   consequence true
polish_rent_arrears               severity low      deadline null               consequence false
```

The Polish letter says the association will apply to the county court for a
possession order and that this could lead to losing the home. The engine reads
none of it, because `SERIOUS_SIGNALS`, `RISK_PHRASES` and the deadline
vocabulary are all English.

## Two of the four are refused outright as non documents

`polish_rent_arrears` and `spanish_water_final_notice` come back
`is_probable_non_document: true`, `processing_mode: unsupported`, and the reader
is told:

```
card 1  "This does not look like an official letter or bill."
card 2  "Northcue could not find the things an official letter usually has,
         like a sender, a reference, or a date."
```

Both letters have a sender on line one, a reference on line three and a date on
line five.

`detectProbableNonDocument` returns true when all four of its checks fail, and
all four are English:

| check | why it fails |
| --- | --- |
| `hasSender` | `guessDetailedSender` and `guessSender` both decline |
| `hasReference` | the keyword list is `reference\|ref\|account number\|...`, and the letters say `Numer konta najemcy` and `Número de cuenta` |
| `hasFormalDate` | matches `dd/mm/yyyy`, `date:` or an English month name, and the letters print `6 sierpnia 2026` and `18 de mayo de 2026` |
| `hasOfficialPhrasing` | 25 English words, none of which appear |

**The other two escaped this only by being misclassified.** The check is
skipped when `documentCategory !== "unknown"`, and the French appointment letter
was classified `education` while the Polish phishing letter was classified
`government`. Neither was recognised. Both were let through by a different
mistake.

## What is findable and thrown away

`findAmounts` is a currency symbol followed by digits, so it is already language
independent, and `tests/valueFinding.test.js` now asserts it finds
`£1,245.60`, `£142.30`, `£312.44` and `£482.30` in these four documents. Two of
those documents still report `money_amounts` as **empty** from the engine,
because the non document decision is taken first and the extraction is never
reached. The same is true of `extractContactNumber`, whose pattern is digits
rather than English.

## Why this is recorded and not fixed

Every line of it is D3's argument. Fixing `detectProbableNonDocument` by adding
Polish, Spanish and French keyword lists would be the wrong repair: it scales as
languages times vocabularies, and it would still leave severity, scam detection
and deadline extraction English only. The measured answer is an extraction layer
that reads the document in its own language and hands the engine facts, which is
what D3 tier 1 has now built and wired to nowhere.

**Tier 3 cannot ship without deciding what happens to these two documents.**
They are gated as `unsupported`, which is one of the gates the fact extractor
sits behind, so today they would not reach it either.


# OCR and value-finding defects

Added **31 July 2026** after an audit of every site that pattern-matches raw
text, across 75 verified findings. Two fixes shipped: `MONEY` now matches an
amount whole or not at all, and `LONG_DATE` tolerates a lost separator with a
run-on guard. No tolerance shipped. Everything below is open.

**O-1. `extractContactDetails` presents an unvalidated email as contactable.**
The email regex extracts a match and never checks it. OCR damage inside an
address produces a plausible but wrong string, and the engine offers it to the
reader as the way to contact the sender. On a document where the alternative is
a bailiff attending, sending a reply to a mistyped address is a silent failure:
the reader believes they have responded. The same function should treat a
damaged address the way the amount pattern now treats a damaged amount, by
declining rather than asserting a corrupted value.

**O-2. `extractActions` promotes a raw garbled sentence to the reader.** When
its safe-action literal alternation fails to match, the fallback lifts a
sentence out of the document verbatim. On damaged input that sentence is the
damage. Live today on `ocr_enforcement`, card 3:

```
"Am0unt outstanding: £1,247.00 You must c0ntact us on 0333 320 122 by
 3September 2026."
```

That is the answer to "What do I need to do?" on the most urgent document in the
corpus, and card 1 in the same run correctly says the text quality is too low to
read amounts and dates reliably. The two contradict each other, and the action
card is the one a reader acts on.

> **Correction, 31 July 2026, to evidence recorded earlier in this file.**
> An earlier sweep reported **zero** collisions when confusable folding was
> tested against generated UK reference strings, and that number was used to
> argue label tolerance was safe. **It was wrong.** It had been run against a
> narrow list of short entries with a one-way digit fold, not against the real
> vocabulary. Re-running it properly over all 82 label entries and 150,000
> generated references gives **54 false matches**, all from two short entries:
> `less` folds out of `Reference: MZMZ-43713556` and `fee` out of
> `Policy number: SF33485198`. That is why tolerance is restricted to entries of
> five characters or more, which keeps all 25 corpus recoveries and takes the
> collisions to zero. **Do not inherit the zero figure.** Any future tolerance
> proposal must re-run the evidence against the full vocabulary it intends to
> change.

**O-9. CLOSED 31 July 2026.** The consequence sentence is now gated on
`garbled_by_ocr` explicitly: the branch states `has_consequence: false` and
`consequence_sentence: null` rather than leaving the keys absent. Verified by
substituting the "tidied up" form the clean branch uses, which makes card 5 on a
garbled enforcement notice quote "The document states that if you do not pay,
the debt will be passed to a debt collection agency..." The test catches that
with two failures. Guarded in `tests/actionCard.test.js`.

The original entry is kept below because the shape of the defect is worth
remembering: it was correct behaviour with no guard, and nothing would have
failed when someone removed it.

**O-9 as originally recorded. The risk sentence is protected from garbled text
by omission, not by a guard.** `extractRiskSentence` lifts a consequence sentence out of the document
and card 5 quotes it verbatim, which is correct and deliberate on a clean
letter. On a garbled document it would quote an undamaged risk phrase sitting
inside damaged text, in the same confident register that made O-2 harmful.

It does not happen today, and the reason is worth stating precisely because the
inspection first attributed it to luck, which was wrong. The `garbled_by_ocr`
branch of `buildExtraction` returns an object that **never sets
`has_consequence`**, so `extraction.has_consequence` is `undefined`, so card 5
cannot take the consequence arm at all on that path. Verified by appending an
undamaged risk sentence to `ocr_enforcement`: `has_consequence` stays
`undefined` and card 5 keeps the "What should I check?" form.

**The fix for O-2 does not cover this**, and was not meant to: it filters
`actions`, and the risk path does not go through `actions`. The protection is
one added field away from disappearing. Anyone completing that branch's return
object for tidiness would reintroduce the defect with no test failing, because
no test asserts that card 5 declines to quote on a garbled document.

The durable fix is the same shape as O-2's: gate the consequence sentence on
`garbled_by_ocr` explicitly, so the behaviour is stated rather than inherited
from a missing key.

**O-3. The two long-date patterns now disagree on four shapes, up from two.**
`coLocation.LONG_DATE` and `extractVisibleDates` are independent copies. Before
the separator fix they disagreed on ordinals and month-first order; they now
also disagree on lost separators, because only one copy was changed:

| input | `coLocation.LONG_DATE` | `extractVisibleDates` |
|---|---|---|
| `1 April 2026` | found | found |
| `1April 2026` | **found** | not found |
| `20August 2026` | **found** | not found |
| `1st April 2026` | not found | **found** |
| `April 1, 2026` | not found | **found** |

Widening the gap was a deliberate consequence of keeping the fix to one commit,
not an oversight. The right resolution is one shared definition, as was done for
`MONEY` in the same session.

**This divergence is not a separate defect from O-5, it is its cause.** Traced
31 July 2026: on `ocr_council_tax`, `extractVisibleDates` does not find
`1April 2026`, so `dateParts` is empty and `buildReadableDateMessage` returns
"No clear date was found." `coLocation.selectDeadline` does find it, so
`primaryDate` is set and the key point and `possible_deadline` both name it.
One fact, two patterns, opposite answers, both rendered on the same card.

**Two independent copies of one rule with different behaviour is a recurring
class in this codebase**, and the same shape as the caller-to-bank gaps behind
the trust panel and AI gate defects: the copies agree while both are simple,
drift the moment one is corrected, and nothing fails until a reader sees the
result. Whenever a pattern or vocabulary exists twice, the fix is one
definition and one caller, not two kept in step by hand.

**O-4. A recovered date is carried verbatim, so card text can show the damage.**
`ocr_council_tax` now yields `1April 2026` and that exact string reaches the
reader. The value is correct and the letter on paper reads "1 April 2026", so
verbatim-from-OCR is not the same as verbatim-from-paper here. Normalising
whitespace on display would fix it, and would be a change to card text rather
than to extraction.

**O-5. D-4 above is now live on `ocr_council_tax`.** Card 4's sentence reads
"No clear date was found. Check the original document." while its key point
reads "Check this date on the original document: 1April 2026." and
`possible_deadline` is set. The sentence comes from `buildReadableDateMessage`
and the field from `signals.primaryDate`; they agreed only while both were null.
**This is the most urgent item in this section**, because it is a visible
self-contradiction of exactly the kind the severity-contradiction work removed
elsewhere.

**O-6. Damage to a competing label makes the engine more confident, not less.**
`AMOUNT_COMPETES` entries exist to make `governingLabel` decline. `in credit`,
`total charge` and `previous balance` are guards, so OCR damage to them removes
a refusal rather than a claim, and an in-credit statement can read as a demand.
Tolerance would help here, which is the inverse of the usual argument.

**O-7. Damage to `GREETING` flips an appointment date to the letter date.**
Verified: `D3ar Patient` on `appointment_nhs` moves `selectContentDate` from
1 July 2026 to 5 June 2026, the letter date. One damaged character re-opens the
defect the greeting-zone rule was built to close.

**O-8. `detectSeriousDocumentSignals` is defeated by damage to a single
phrase.** It is the only thing that raises a Notice of Enforcement to the urgent
tier, and it matches literals. Damage to "notice of enforcement" or "bailiff"
drops the stakes floor, and with it the banner, the severity sentence and the
card warnings.

**Fix 4, the damaged sender. RESOLVED 31 July 2026, by wording rather than by
extraction.** Card 1 hedged amounts and dates while stating the sender's name
flatly, and the name is read from the same damaged text.

Label tolerance does not help here and its absence is not a gap in it: tolerance
matches damaged input against a **known vocabulary**, and a name is not in any
vocabulary, so there is nothing to recover it to. The three options were to show
the name anyway, decline it, or show it and say it may be damaged. The third was
taken: on an enforcement notice, knowing who is chasing you is worth more than a
tidy card, and a reader can match a damaged name to the paper more easily than a
missing one. `tpl.summary.garbled_sender` now reads "…too low to read the
sender's name, amounts or dates reliably". `tpl.summary.garbled` is unchanged,
because it names no sender.

**O-10. Card 1 on a garbled document is at the height limit in the longest
languages.** In Polish the widened caution takes it from 14 lines to 15 and the
panel from 798px to 830px, so on an 812px viewport it now scrolls where it
previously just fitted. Nothing is clipped and there is no horizontal overflow;
the card simply scrolls. Card 1 was already at that limit before the change, and
this is one line closer to it rather than the cause. The durable answer is
probably to shorten the garbled summary rather than to keep trimming what it
says.

**U-1. Fields the engine extracts and nothing reads.** Audited 31 July 2026 by
testing whether each value ever reaches text the reader sees, rather than by
grepping, since grep counts writes as reads.

| Field | Documents holding a value | Reaching the reader |
|---|---|---|
| `contact_details` | **0** | 0 |
| `appeal_rights`, `support_options`, `evidence_spans` | **0** | 0 |
| `document_type_label` | 30 | **0** |
| `authentic_signals` | 30 | **0** |
| `reference_numbers` | 9 | 1 |
| `review_reason` | 30 | 6 |
| engine `risk` line | 30 | 4 |

`serious_document_signals` was the seventh and is now read by card 2.

Two corrections to the older diagnosis. **`contact_details` is not unread, it is
unpopulated**: `extractContactDetails` matches email addresses only, and no
corpus letter contains one, so wiring it up would show nothing. **`appeal_rights`,
`support_options` and `evidence_spans` are hardcoded `[]` on every path** and are
placeholders rather than extracted facts.

**Do not surface `review_reason` or `authentic_signals`.** `review_reason` has
only two distinct values across all thirty documents, both generic, one of them
the reassurance recorded as latent site 9. `authentic_signals` describes the
UPLOAD rather than the letter: "Uploaded as PDF format.", "Contains reference
details.", "Contains formal letter structure."

**U-2. `reference_numbers` on card 6: approved in principle, deferred on layout
headroom.** Card 6 already tells the reader to keep the reference number ready
without showing it, which is the obvious placement. Three gates are required and
were specified before deferral:

1. **Suppress on `garbled_by_ocr`.** Verified that a damaged reference is
   extracted and would be offered verbatim: damaging the digits of
   `ocr_enforcement` yields `["Reference: EN-77l2O934"]`. A reader who quotes
   that gets nowhere and believes they have done the right thing. **A damaged
   reference is worse than none.**
2. **Suppress on `verification_only`.** `scam_phishing` holds
   `["Reference: SEC-99120"]`, and Northcue must never help a reader quote a
   scam's own reference back to it.
3. **Require a digit, and take only the first survivor.** That removes
   `"reference above"` from `bailiff_enforcement` and `"reference agencies"`
   from `bank_loan_letter`, which are 2 of the 9 held values and are pure noise
   from the phrase "credit reference agencies".

Deferred because card 6 has the least headroom of the candidates: measured at
375px in Romanian it goes from **634px to 761px** with the reference line, 51px
from the 812px viewport, and O-10 already records card 1 exceeding that limit in
the longest languages. Expected movement: 5 documents.

**U-3. The reference regex misses a common UK format.**
`/\bref(?:erence)?[:\s-]*[a-z0-9-]{4,}\b/gi` requires four characters after the
label, and `legal_solicitor`'s `"Our ref: HG/DR/22981"` fails because the run
after `ref: ` is `HG`, two characters, before the slash stops the match. Slashed
and spaced reference formats are ordinary on solicitor and council letters, so
the field both misses real references and captures noise. Worth fixing before
U-2 ships, or U-2 will surface nothing on the documents that most often carry a
reference.

## OCR work not approved

- **Tier 3 SHIPPED 31 July 2026** as `58a2981`: character-class tolerance for
  the four label vocabularies and `GREETING`, restricted to entries of five
  characters or more. Verified evidence, replacing the incorrect figures this
  bullet previously carried: **25 correct recoveries across the corpus, zero
  corpus false matches, and zero collisions across 150,000 generated UK
  reference strings at the five-character threshold**. Without the threshold the
  same run gives 54 collisions. See the correction note at the head of this
  section.
- **Not proposed at all: tolerance in any classification vocabulary.** Those
  lists hold two-to-four character entries matched against the whole document
  with no anchor. `gp` becomes `[g9]p`, which matches "a standing charge of 9p
  per day" on essentially every UK energy bill and would push it into the
  medical category. `nhs` becomes `nh[s5]`, which matches the reference
  `NH5-2291`. A false scam or category signal costs the reader their deadline;
  a false value candidate is merely offered to co-location, which usually
  rejects it.
- **Not proposed: any edit-distance or fuzzy matching.** It is a categorically
  wider tolerance than confusable folding and none of the evidence gathered
  covers it.

---

## Deadline work not yet approved

Tiers 2 to 4 of the Phase B proposal, in the order they should be considered:

- **Tier 2**, five adjacent literals (`compliance date`, `date for compliance`,
  `response date`, `act by`, `you must act by`). No agentive, instrumental or
  past-tense reading exists for any.
- **Tier 3**, bounded-gap patterns replacing the class A literals, so
  `contact us [on 0333 320 122] by` can bind at all. The gap bound must be 44
  and the quantifiers must be **lazy**: a greedy gap runs past the date to the
  next `by` on the following line, the label then ends after the value, and
  forward-only proximity correctly rejects it, leaving the flagship null.
- **Tier 4**, eight new literals, each with a verified mention control.

Tier 1 shipping first was the precondition: every `<verb> by` entry in tiers 3
and 4 carries the instrumental hazard, and the adjacency rule is the single
guard that neutralises all of them at once.

Expected effect of tiers 2 to 4 on top of Tier 1: **two documents gain a
deadline** (`bailiff_enforcement` 3 September 2026, `bank_loan_letter`
7 July 2026), nothing changes value, nothing is lost.

---

## OPEN: no scam rule can reach a document the non-document gate refuses

This is the defect Q2 did not fix, and Q2 should be read as treating a symptom
of it.

Three corpus documents are scams that Northcue refuses as non-documents:
`smish_parcel_link_only_pl`, `scam_crypto_investment_pl` and
`scam_energy_refund_pt`. Each is a short message with a link and none of the
structure a letter has, so the gate is not wrong about what they are not. The
problem is the order.

**The mechanism is the reverse of the obvious one, and the difference decides
what a fix may look like.** Detection is not skipped. `detectScamSignals` runs
on the raw text before anything else, and finds nothing, because its needles are
English and these three are Polish and Portuguese. Finding nothing is precisely
what routes them into the gate:

```
detectScamSignals            -> []            English needles, non-English text
detectDocumentCategory       -> "unknown"     because scamSignals is empty
detectProbableNonDocument    -> true          because the category is "unknown"
pickProcessingMode           -> "unsupported"
buildExtraction              -> buildNonDocumentExtraction, cards replaced
```

Two consequences, and they point in opposite directions.

**A raised scam signal is not discarded, it is impossible to hold at the same
time.** `detectDocumentCategory` returns `possible_scam` the moment
`scamSignals` is non-empty, and `detectProbableNonDocument` returns false unless
the category is `unknown`. The two states are mutually exclusive by
construction, not merely ordered. Verified by appending the two words "gift
card" to `smish_parcel_link_only_pl`: `is_probable_non_document` flips to false,
`processing_mode` to `verification_only`, and card 1 becomes "This may be a
suspicious message about money or details." So a needle that matched these
documents WOULD reach the reader. The reason none does is language, not
ordering.

**But everything computed from the extraction is gone.** Amounts, references,
contact numbers and all six cards are replaced by the fixed refusal, and the
fact extractor never runs because it is gated on `processing_mode`. Any rule
that reads what was extracted rather than the raw text cannot see these three,
and the non-English reading that D3 exists to provide is exactly what is
withheld from the documents that need it most.

**What this means for Q3.** Q3's structural rule reads raw text and raises a
distrust signal, so it does reach them, and it will move `trust_assessment` on
a refused document while leaving the cards and the mode untouched. That is a
protected field moving on a document whose reader-visible output does not
change, which is worth stating plainly rather than discovering in a diff.

**What Q2 did instead.** It changed four sentences so a refused upload carrying
a link is no longer invited to send the message again. That is worth having on
its own, and it is not detection: `is_probable_non_document`, `scam_signals`,
`severity_level` and `processing_mode` are byte-identical across all 54
documents. It makes the wording correct while the ordering stays wrong.

**What an actual fix would have to decide.** Whether a document can be both
refused and suspicious at once. Today `unsupported` and `verification_only` are
alternatives in `pickProcessingMode`, and a probable non-document takes
`unsupported` unconditionally. Letting a scam signal win over the non-document
gate would move `processing_mode` on documents that are correctly refused, and
letting both be true needs a card layer that can say "this is not an official
letter AND it looks like a lure", which does not exist. Neither is a wording
change, and neither should be attempted as one.

**Not closed by Q3.** Q3 raises a distrust signal on these three, which is more
than nothing, but a distrust signal cannot restore an extraction that was never
performed. The reader still sees the fixed refusal. Q3 is worth having on its
own terms; it does not close this item.

## OPEN: what the structural lure rule is actually supported by

`src/utils/lureShape.js` fires on a link, an amount, no reference and no
telephone number. Measured on 2 August 2026 it catches seven of the ten corpus
scams and none of the 44 genuine documents. **That number is much weaker
evidence than it appears, and this section exists so nobody promotes the rule on
the strength of it.**

**Only one genuine document exercises the rule at all.** Of the 44 genuine
documents, three carry a link:

| document | link | amount | what excludes it |
| --- | --- | --- | --- |
| `genuine_bank_fraud_advice` | yes | **no** | never reaches the discriminating half |
| `genuine_nhs_booking_link` | yes | **no** | never reaches the discriminating half |
| `genuine_post_office_card_payment` | yes | yes | carries both a reference and a phone number |

So the separation between lure and letter is demonstrated against a single
example. Two of the three are excluded by not mentioning money, which is not the
rule discriminating, it is the rule not being asked. **The shape most likely to
produce a false positive is the least represented shape in the corpus**, and
the corpus was written by the same hand that wrote the rule, so adding more of
them proves nothing about the world.

**The known false positive shape: a sole trader emailing an invoice.** A
plumber, a tutor, a childminder. It has a link to a payment page and it has a
total, and it carries no reference code because the sender has no account
system. Built and run rather than asserted: an invoice for £486.00 with a
payment link fires the rule when the sender signs off with only an email
address, and does NOT fire when they give a mobile as `07700 900412`. That
document is genuine, is asking for real money, and Northcue's users include
people under financial stress being invoiced by small traders, so it is not
hypothetical.

**And the phone guard is narrower than it looks, which widens this a long way.**
`hasTelephoneNumber` is `\b0\d[\d\s]{7,12}\d\b`: a UK number in national format.
Measured:

| written as | recognised |
| --- | --- |
| `020 8583 4242`, `07700 900412`, `07700900412` | yes |
| `+44 7700 900412`, `+447700900412` | **no** |
| `+48 601 234 567`, `+353 85 123 4567` | **no** |

So a genuine document that prints its contact number in international format
has no telephone number as far as this rule is concerned. That is the format
used by exactly the people Northcue is built for: the letter from abroad, the
bank that writes `+44`, the tradesperson who saved their number from a foreign
handset. The corpus contains no document in that shape either, so the 7-for-0
result never tested it. **This is the single biggest reason the rule must stay
advisory**, and it is worth fixing on its own: the same function is one of the
five structural signals the non-document gate counts, so an internationally
formatted letter is also one signal short of being recognised as a document.

**Which is why it is advisory, and why advisory is enforced rather than
intended.** `pickTrustAssessment` takes `lureShapeSignals` as a separate
argument from `distrustSignals`. Every route to `"low"` sits above the line that
reads it, so the rule cannot reach low trust, cannot produce
`verification_only`, cannot null a deadline and cannot replace a card. It can
withhold `"high"`. Merging the two lists is the obvious tidy-up and it is the
one thing that must not happen; `tests/lureShape.test.js` fails if it does.

Measured effect on the corpus: one document moves, `scam_council_refund_link
_only`, from `high`/`normal` to `medium`/`caution`. It is a scam, and it had
been getting "This looks like a normal document."

**Promoting this beyond advisory requires production evidence, not more
corpus.** Specifically: how often the rule fires on real uploads, and what
proportion of those are genuine. Until that number exists, any change that lets
this rule refuse a document is a change made without knowing its false positive
rate. Writing ten more corpus scams it catches would not move that number at
all.

## OPEN: a phone number written the international way is not a phone number

`hasTelephoneNumber` and co-location's `PHONE` are the same regex,
`/\b0\d[\d\s]{7,12}\d\b/`, written in two files. It is a UK number in national
format and nothing else. Measured:

| written as | recognised |
| --- | --- |
| `020 8583 4242`, `0333 320 122`, `07700 900412`, `02085834242` | yes |
| `+44 20 8583 4242`, `+44 (0)20 8583 4242`, `+442085834242` | **no** |
| `+48 22 123 45 67`, `+34 912 345 678`, `+33 1 42 68 53 00` | **no** |
| `+351 21 123 4567`, `+40 21 123 4567`, `+353 85 123 4567` | **no** |
| `0044 20 8583 4242` | **matched, but truncated. See below.** |

Six genuine corpus documents were added on 2 August 2026 carrying numbers
written the other way, because none existed and the fix cannot be verified
without them. **All six are genuine. None is a scam.**

### Three consumers, three different failures

**1. The contact field, and one case where the reader is actively misled.**
`intl_energy_bill_plus44` is a bill Northcue reads perfectly, and its
`contact_number` is null, so card 3 silently drops "The document gives this
phone number". That is a loss, not a lie.

`intl_water_arrears_00_prefix` is the lie. It prints `0044 118 273 4567`. That
is fourteen digits, above the ten-to-eleven cap, so the candidate should be
declined whole. It is not: `PHONE` is global and the cap validates each match
rather than the candidate, so the pattern finds the ten-digit prefix
`0044 118 273`, the cap accepts it, and **card 3 tells the reader to ring a
number that is not on the letter.** The comment above `PHONE` says a candidate
outside the range is declined because "a wrong number is a call to a stranger".
This is the case where that does not happen, and it is pinned in
`tests/contactNumber.test.js` with the wrong value on purpose so the fix has
something to move.

Note the difference from the already-pinned `0800 980 8800 12` case, which
backtracks to a valid eleven-digit number that IS the number on the letter.
There the shorter match is right; here it is a fragment.

**2. The non-document gate.** `hasTelephoneNumber` is one of five structural
signals and three are needed. `intl_polish_clinic_appointment` is a real
appointment reminder with a date, a room, a time and a number to ring, and no
patient reference, because the letter is the reference. It scores two, and is
**refused outright as a non-document**: "This does not look like an official
letter or bill." The phone number is the third signal it should have.

`intl_romanian_school_meeting` is the same shape and is NOT refused, which is
worth more than the pass suggests: it survives because `15 septembrie 2026`
matches the gate's English month list through the shared `sep` stem. The same
accident rescues `septiembre` and `septembre`, and does not rescue `setembro`,
`listopada`, `wrzesień` or any non-Latin script. The gate is uneven in a way
nobody chose.

**3. Q3's lure rule.** `intl_sole_trader_invoice` is the false positive this
file predicted before the document existed: a plumber's invoice with a payment
link, a total, no reference code, and a `+44` number the engine cannot see. The
rule fires on it. It is not refused, because the rule is advisory, which is the
whole argument for having kept it advisory.

### A second collision, found while writing that document

The invoice was drafted with a mobile, `+44 7700 900412`, and cleared the lure
rule for the wrong reason: `REFERENCE_CODE`'s six-or-more-digit branch matched
`900412`, the tail of the phone number, so the number counted as a reference
code. **A mobile scores two structural signals out of one artefact**, and clears
a rule whose whole point is that a reference is present. A landline does not,
because it has no six-digit run. Not fixed here, and not the same defect, but it
sits in the same two functions.

### What a fix has to preserve

The comment on `PHONE` names the false-positive defence: the leading zero.
Verified again on 2 August against fourteen shapes (account numbers, UTR, NI
number, hyphenated accounts, sort code, policy, invoice, case, meter reading,
NHS number, amounts, dates): **none matches today.** Any widening has to leave
that true.

Not a privacy gap: `redactForAi` uses a different and wider pattern, and every
one of the twenty formats above is masked before text leaves the server.

## Recommended order for future work

~~1. **B-1**, the missing deadline on the enforcement notice.~~ Closed by
   Tier 3 of the deadline vocabulary, 31 July 2026.

~~1. **D-1 and D-2**, the two rules that promote a date stating no obligation.~~
   Closed 31 July 2026, along with the competes half of the word-boundary rule.

~~1. **The card wording for a date with no single reading.**~~ Closed
   31 July 2026. **No deadline item now has a reader-visible wrong answer.**
   D-9 and D-10 remain open as extraction defects only: the patterns still
   accept a date with two readings, and the reader is now told when they have.
2. **Expand the scam corpus** to at least four documents: a link-only courier
   smish, a Gateway credential harvest, a refund scam, a council impersonation.
   This unblocks F3 and is a prerequisite for any loosening.
3. **F3**, demote the nine pressure needles to advisory.
4. **F4**, but strengthen `detectAuthenticSignals` first.
5. **W2**, decouple the four early returns in `detectDocumentCategory` so
   category is always computed and template / outgoing / scam become independent
   flags the card layer reads.
6. **Collapse rule 4 of the AI stripper**, so a sentence naming two advice
   services does not read "a trusted advice service or a trusted advice
   service". Reader-visible on both paths, and the smallest open item here.
7. **F6**, word-bound and reorder the category rows, one row per change. The
   same hazard was found and fixed inside the co-location date vocabulary in
   Tier 2, where three of five new literals matched inside longer words; the
   older co-location entries ("less", "used", "paid", "from") are still
   unbounded and belong to this item.

Do not combine any two of these in one commit. The baseline harness diffs the
whole render, so a combined change produces a diff nobody can read.
