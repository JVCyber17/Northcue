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

**B-1. `bailiff_enforcement` has no deadline.** Source text: "You must contact us
on 0333 320 122 by 3 September 2026." Output: `main_date: null`, card 4 "No clear
due date. These dates appear in the document: 20 August 2026, 3 July 2026,
3 September 2026. Check what they refer to." The most urgent document in the
corpus presents its contact deadline as one of three undifferentiated dates.
**This is a deadline-extraction defect, not a classification one, and it is
arguably the highest-harm single item in the whole audit.**

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
obligation phrasings across four issuing-authority domains. Tier 1 of that
work shipped: date labels now bind forwards only, require nothing but
punctuation between label and date, and test 3 covers the whole label span.
The vocabulary itself was not changed, so everything below is open.

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

## Recommended order for future work

1. **B-1**, the missing deadline on the enforcement notice. Highest harm, and it
   is not a classification change at all.
2. **Expand the scam corpus** to at least four documents: a link-only courier
   smish, a Gateway credential harvest, a refund scam, a council impersonation.
   This unblocks F3 and is a prerequisite for any loosening.
3. **F3**, demote the nine pressure needles to advisory.
4. **F4**, but strengthen `detectAuthenticSignals` first.
5. **W2**, decouple the four early returns in `detectDocumentCategory` so
   category is always computed and template / outgoing / scam become independent
   flags the card layer reads.
6. **F6**, word-bound and reorder the category rows, one row per change.

Do not combine any two of these in one commit. The baseline harness diffs the
whole render, so a combined change produces a diff nobody can read.
