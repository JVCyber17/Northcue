# Engine diagnosis: why rules-built cards read generic (30 July 2026)

Read-and-report session. Nothing in the engine, the templates, the bank or any
safety logic was changed. The only file added is this one.

## The question asked

For non-English users the AI phrasing step is skipped, so they receive
rules-engine-only cards, and those cards read generic. The question was whether
the information exists inside the engine but never reaches the card.

## The short answer

**Mostly yes, and the problem is worse and wider than "non-English readers get
blander wording".** Three findings reframe it:

1. **Most of the gap is presentation.** The engine extracts and then never
   displays: the document type label it assigned at high confidence, the
   reference number, contact details, the letter date, the real deadline when it
   sits in `visible_dates`, its own risk sentence, its own serious-document
   signals, and its own path-specific review reasons. Several extractor fields
   have zero read sites anywhere in the codebase.

2. **Some cards are not merely generic, they are wrong.** Two different amount
   selectors run on the same document, so card 1 and card 5 disagree. The honest
   English baseline prints "Check the amount (£0.00)" on a £214.63 energy bill,
   £1,047.00 instead of £1,247.00 on an enforcement notice, and asks a
   single-person-discount household to pay £1,842.00 when the bill says
   £1,381.50. This is a correctness defect that exists in English today.

3. **The AI is not the reliable comparison the complaint assumes.** On the five
   test documents it completed three times, was skipped by design once, and
   failed once. The failure is deterministic and self-inflicted: on any
   `severity_level === "urgent"` document the engine attaches its own warning
   "This looks important. Do not ignore it.", the sanitiser copies that warning
   into the AI candidate, and the unsafe-advice validator then rejects the whole
   AI result for containing "ignore it". **The AI path is structurally
   unavailable on exactly the urgent documents where card quality matters most,
   in English as well.**

So the founder's complaint is real, reproducible, and only partly about
language. Fixing the language path alone would leave English readers with the
same generic cards on bailiff letters.

## How this was measured

A read-only harness in the session scratchpad required the shipped
`runClearStepsEngine` and `applyAiStructuredResult` as published modules and
recorded what they returned. It never modified engine code. Five realistic UK
documents were each run four ways:

- **Variant A**: English, AI pass enabled, real OpenAI call.
- **Variant B**: the raw engine rules cards.
- **Variant B2**: the same rules cards after `sanitiseRulesStructuredResult`,
  which runs on every path. **This is the honest baseline**, because the
  deployed non-English path always passes through it. Where A and B2 differ
  below, B2 is what a reader actually gets.
- **Variant C**: B2 rendered through the real template bank in Polish.

The engine's own `structured_output.trust_internal` and
`extractor_internal` were dumped verbatim, so the "what did the engine know"
question is answered from the engine's own internal state, not inferred.

Documents: a council tax notice, an energy bill, a bailiff enforcement notice, a
scam letter, and a lower-confidence official (housing) letter.

---

## Where the card content is assembled

The browser renders `structured_result.cards`, **not** the six-card array the
renderer layer builds. `public/app.js:3678` reads
`result?.structured_result?.cards` and returns those when present, and the
engine always produces exactly six, so the legacy array at
`clearStepsEngine.js:59` is dead for display. It survives only as a lookup feed.

The chain:

| Step | Function | Line | Contribution |
| --- | --- | --- | --- |
| 1 | `runClearStepsEngine` | 22 | Orchestrates. Only `split.documents[0]` is analysed, so extra letters in one upload are dropped. |
| 2 | `evaluateTrustAndSeverityLayer` | 90 | Classification only, no card text. Produces the switchboard every later branch reads. |
| 3 | `runExtractorLayer` | 221 | The only place facts are pulled from text. Seven mutually exclusive returns. |
| 4 | `runRendererLayer` | 354 | Builds the legacy six cards. Dead for display. |
| 5 | `buildStructuredResult` | 626 | Wraps meta, summary block, warnings. |
| 6 | `buildStructuredCards` | 674 | **Produces what the reader sees.** |

`buildStructuredCards` reuses the legacy cards only for cards 1, 2, 4 and 6 via
`oldCardById`. **Cards 3 and 5 are rebuilt from scratch and ignore the legacy
card entirely**, which is why the legacy card 5 (the one that carries
`extraction.risk`) never reaches anyone. Every card title is a hard-coded string
literal except card 5's, which is the single adaptive title in the system.

### Template selection

`runExtractorLayer` picks one of seven branches, first match wins:

1. **Unsupported, non-document** (line 225): all fixed strings, no fact used.
2. **Unsupported, poor or short** (line 228): all fixed; `money_amounts`,
   `reference_numbers`, `contact_details` forced to `[]` at lines 239 to 241
   even when the text contains them.
3. **Unsupported but readable** (line 228 false branch): the reading-aid path.
4. **Verification only** (line 251): six fixed strings. `deadline` forced null.
5. **Welfare benefits** (line 279): real obligations kept, but the primary date
   is forced null at line 527 and `deadline: null` at 537, so a benefits letter
   with one unambiguous deadline can never show it.
6. **Readable unsupported aid** (line 283): taken whenever
   `isFullySupportedDocument` (line 846) is false. The supported list is narrow:
   council tax, energy or utility bills, category `government`, category
   `bill_or_payment`, or a confirmed appointment. **Housing, legal or court,
   medical, employment, education, insurance and bank or loan all fall into the
   aid path** and receive hedged wording plus a line telling the reader Northcue
   is not fully trained for the type.
7. **Garbled by OCR** (line 303): `deadline` forced null, confidence forced low.
8. **Normal** (line 331): the only branch that sets `visible_dates`,
   `header_date`, `has_consequence` and `consequence_sentence`.

Card 1's headline comes from `inferSummary` (line 1897), which gathers sender,
the **largest** money amount and a deadline, then walks a per-category cascade of
sentence templates. The `government` category deliberately drops the date, which
is why the bailiff card 1 carries an amount and no date.

---

## The engine's internal extraction, raw

Condensed from `extractor_internal` and `trust_internal`. Full dumps were
produced by the harness; the load-bearing fields are reproduced verbatim.

### Council tax notice
```
trust:  category=bill_or_payment  type=official_incoming  mode=caution
        severity=low  trust=medium  confidence=medium  quality=good
        sender_guess="Council"  severity_signals=[]
structured meta: document_type="council_tax_notice"
        document_type_label="Council tax notice"  document_type_confidence="high"
        summary.main_amount="£1,842.00"  summary.main_date="1 April 2026"
extractor:
  summary:            "Hounslow Borough Council appears to be asking you to pay £1,842.00 by 1 April 2026."
  most_important_point:"This document appears to require an action from you. See what you need to do."
  actions:            ["Check the payment amount and due date.",
                       "Contact the sender using trusted contact details."]
  deadline:           "1 April 2026"
  header_date:        "12 March 2026"
  visible_dates:      ["1 April 2026"]
  money_amounts:      ["£1,842.00","£460.50","£1,381.50","£138.15"]
  reference_numbers:  []
  contact_details:    []
  has_consequence:    false      consequence_sentence: null
  risk:               "No risk clearly stated."
  helpful_note:       "Keep this with your records in case you need it later."
  appeal_rights: []  support_options: []  evidence_spans: []
```

### Energy bill
```
trust:  category=bill_or_payment  mode=normal  severity=low  trust=high
        confidence=high  quality=good  sender_guess=null  severity_signals=[]
extractor:
  summary:            "EDF Energy appears to be asking you to pay £214.63 by 28 May 2026."
  deadline:           "28 May 2026"       header_date: "4 May 2026"
  visible_dates:      ["1 February 2026","30 April 2026","28 May 2026"]
  money_amounts:      ["£0.00","£214.63"]
  reference_numbers:  ["reference: EB-4471028"]
  contact_details:    []
  has_consequence:    false      consequence_sentence: null
  helpful_note:       "Keep the reference number ready."
```

### Bailiff enforcement notice
```
trust:  category=government  mode=normal  severity=urgent  urgency=immediate
        trust=high  confidence=high  quality=good  sender_guess="Council"
        is_high_stakes=true  high_stakes_tier="urgent"
        serious_document_signals=["notice of enforcement","enforcement agent"]
        severity_signals=[]
        safe_next_step="Check the action card now and act using trusted details."
extractor:
  summary:            "Marston Holdings Enforcement Agents appears to have sent an official notice mentioning £1,247.00."
  most_important_point:"This is urgent. You may need to act today."
  actions:            ["Contact the sender using trusted contact details.",
                       "Amount outstanding: £1,247.00 You must contact us on 0333 320 122 by 3 September 2026."]
  deadline:           null
  header_date:        null
  visible_dates:      ["20 August 2026","3 July 2026","3 September 2026"]
  money_amounts:      ["£1,047.00","£75.00","£1,247.00","£235.00"]
  reference_numbers:  ["Reference: EN-77120934","reference above"]
  contact_details:    []
  has_consequence:    false      consequence_sentence: null
  risk:               "Ignoring this could cause serious problems quickly."
  helpful_note:       "Keep the reference number ready."
```

### Scam letter
```
trust:  category=possible_scam  type=possible_scam  mode=verification_only
        severity=low  trust=low  confidence=medium  quality=good
        scam_signals=[6 signals, all detected]
extractor (verification_only branch, six fixed strings):
  summary:            "This may be a suspicious message about money or details."
  most_important_point:"Check authenticity before taking any action."
  deadline:           null       (forced)
  money_amounts:      []
  reference_numbers:  ["Reference: SEC-99120"]
  risk:               "You could lose money or share private data."
  visible_dates / header_date / has_consequence: field absent on this path
```

### Lower confidence official (housing) letter
```
trust:  category=housing  mode=normal  severity=low  trust=high  confidence=high
extractor (readable unsupported aid path, readable_unsupported_signals present):
  summary:            "This appears to be a housing letter from London Borough of Hounslow."
  deadline:           "within 14 days"
  money_amounts: []   reference_numbers: []   contact_details: []
  has_consequence / visible_dates / header_date: field absent on this path
  helpful_note:       "Northcue is not fully trained for this document type yet."
```

---

## The three-way comparison, verbatim

Variant A is English with AI. Variant B2 is the honest English baseline with the
AI gated off. Variant C is B2 in Polish. Where A and B2 are identical the AI did
not run.

### Council tax notice

AI metadata: `completed`, 13,206 ms.

| Card | A (AI) | B2 (baseline) |
| --- | --- | --- |
| 1 | "Hounslow Borough Council asks you to pay £1,381.50 for council tax." Key points: "This is a council tax bill for 2026/2027 from Hounslow Borough Council." / "Total charge is £1,842.00 with a 25% single person discount (£460.50)." / "The amount to pay is £1,381.50, payable in instalments." | "Hounslow Borough Council appears to be asking you to pay £1,842.00 by 1 April 2026." Key point: "This document appears to require an action from you. See what you need to do." |
| 2 | "Your first council tax instalment of £138.15 is due on 1 April 2026." Key points: instalment schedule; "Missing the due date may affect your instalment payment option." | "This document appears to require an action from you. See what you need to do." No key points. |
| 3 | "Check the payment amount and instalment schedule carefully." Key points name £1,381.50, £138.15, and the dispute route. | "Check the payment amount and due date." Key points: same line repeated, then "Contact the sender using trusted contact details." |
| 4 | "First instalment is due by 1 April 2026." Key points: "The first payment of £138.15 is due on 1 April 2026." / "Paying after this date may lose your right to pay by instalments." | "Due by 1 April 2026." Key point: "Check this date on the original document: 1 April 2026." |
| 5 | "Check the amount (£1,381.50) and instalment details on the original bill." Four key points including "Missing the due date may cancel instalment option and require full payment." | "Check the amount (£1,842.00) and the date (1 April 2026) on the original document." Key points: "Date: 1 April 2026." / "Amount shown: £1,842.00." |
| 6 | "Keep this bill for your records and check details before acting." | "Keep this with your records in case you need it later." |

Polish (C) is a faithful rendering of B2: card 1 reads "Hounslow Borough Council
wydaje się prosić o zapłatę £1,842.00 do 1 April 2026." The translation layer is
not the problem; it is faithfully translating a card that names the wrong amount.

### Energy bill

AI metadata: `completed`, 15,198 ms.

| Card | A (AI) | B2 (baseline) |
| --- | --- | --- |
| 1 | "EDF Energy requests £214.63 for electricity by 28 May 2026." Key points: bill type, amount, period covered, bill date. | "EDF Energy appears to be asking you to pay £214.63 by 28 May 2026." Key point: the generic action line. |
| 2 | "You owe £214.63 for electricity used from February to April 2026." Four key points. | "This document appears to require an action from you. See what you need to do." No key points. |
| 3 | "Check the amount due and the payment deadline." Key points include "If struggling to pay, contact EDF Energy to discuss a payment plan." | "Check the payment amount and due date." Plus "Contact the sender using trusted contact details." |
| 4 | "Payment is due by 28 May 2026." | "Due by 28 May 2026." Key point: "Check this date on the original document: 28 May 2026." |
| 5 | "Check the amount (£214.63) and the due date (28 May 2026) on the bill." | **"Check the amount (£0.00) and the date (28 May 2026) on the original document."** Key point: **"Amount shown: £0.00."** payment field: **£0.00** |
| 6 | "This is a standard electricity bill from EDF Energy." | "This looks like a normal formal letter." |

### Bailiff enforcement notice

AI metadata: **`fallback`, `invalid_structured_result`**, validation error
`unsafe advice matched /(?<!if i )(?<!if you )\bignore it\b/i`, 18,869 ms. An
earlier run of the same document failed differently, with `ai_timeout` at
25,019 ms. **A and B2 are therefore identical: English readers get the rules
cards on this document.**

| Card | A and B2 (identical) |
| --- | --- |
| 1 | "Marston Holdings Enforcement Agents appears to have sent an official notice mentioning £1,247.00." Key point: "This is urgent. You may need to act today." |
| 2 | "This is urgent. You may need to act today." No key points. |
| 3 | "Contact the sender using trusted contact details." Key points: the same line, then "Use contact details from the original document." |
| 4 | **"No clear due date. These dates appear in the document: 20 August 2026, 3 July 2026, 3 September 2026. Check what they refer to."** |
| 5 | Title **"What should I check?"**. "Check the amount (**£1,047.00**) and any dates on the original document." Key point: "Amount shown: £1,047.00." |
| 6 | **"This looks like a normal formal letter."** Key point: "Check the action card now and act using trusted details." |

Card 1 says £1,247.00 and card 5 says £1,047.00 on the same screen. Card 6 calls
a notice of enforcement a normal formal letter, on a document the trust layer has
already marked urgent and high stakes.

### Scam letter

AI metadata: `skipped`, `verification_only_state`, 0 ms. **A and B2 are
byte-identical, by design.** There is no English versus translated gap for this
document class at all, and never will be while the scam gate stands.

| Card | A and B2 (identical) |
| --- | --- |
| 1 | "This may be a suspicious message about money or details." Key point: "Check authenticity before taking any action." |
| 2 | "Check authenticity before taking any action." |
| 3 | "Verify the organisation on its official website." Key points: the three fixed verification lines. |
| 4 | "No deadline clearly stated." |
| 5 | "Check key details on the original document." Key point: "Use official contact details before acting." |
| 6 | "Do not use links or numbers in the document until checked." |

The six detected scam signals, the extracted reference `SEC-99120`, and the
engine's own risk line "You could lose money or share private data." appear on no
card. The signals do surface separately in the Document check panel.

### Lower confidence official (housing) letter

AI metadata: `completed`, 12,625 ms.

| Card | A (AI) | B2 (baseline) |
| --- | --- | --- |
| 1 | "A housing letter from London Borough of Hounslow requesting information." Three key points. | "This appears to be a housing letter from London Borough of Hounslow." Key points: "This may include a deadline about housing or rent. Check the original before acting." / "Northcue is not fully trained for this type yet, so use it as a reading aid and check the original document." |
| 2 | "You need to provide further information to update your tenancy records." | "This appears to be from London Borough of Hounslow. Check the original document to confirm." (a who-sent-it answer under a what-matters-most title) |
| 3 | "Respond to the housing team with the requested information." | "Check the original document to see whether a response or action is needed." |
| 4 | "You should respond within 14 days of the letter date." Key point: "The letter is dated 9 June 2026." deadline: "within 14 days of 9 June 2026" | "These may be important dates: within 14 days. Check what they refer to." deadline: "within 14 days" |
| 5 | "Check the response deadline and contact details on the letter." | "Check the date (within 14 days) and any amounts on the original document." |
| 6 | "Use this letter as a guide and contact the housing team if unsure." | "Northcue is not fully trained for this document type yet. Use this as a reading aid, not advice." |

---

## Fact extracted, did it reach the card, and if not why

Consolidated across the five documents. "Engine knew" means the value is present
in the engine's own internal state.

| Fact | Engine knew | Reached card | Why not |
| --- | --- | --- | --- |
| Document type label ("Council tax notice", high confidence) | Yes, `structured_result.document_type_label` | **No** | `buildStructuredCards` never references it. `document_type_label` has **zero** occurrences in `public/app.js`. Computed, transmitted, never displayed. |
| Reference number (`EN-77120934`, `EB-4471028`, `SEC-99120`) | Yes, `reference_numbers` | **No** | **Zero read sites in the entire codebase.** Written at lines 240, 264, 312, 343, 440, 472, 541 and read nowhere. Card 6 can say "Keep the reference number ready" without ever showing it. |
| Contact details | Rarely | **No** | **Zero read sites.** `extractContactDetails` (line 2245) matches **email addresses only**, so UK phone numbers are never captured on any path. |
| Letter date (`12 March 2026`) | Yes, `header_date` | **No** | One read site, `buildNoDeadlineMessage` (line 1149), reachable only when there is **no** deadline and no visible dates. When a deadline exists the known letter date is discarded. |
| Real deadline `3 September 2026` (bailiff) | Partly: present in `visible_dates`, absent from `deadline` | **No** | `extractDeadline`'s context vocabulary (line 2101) is payment-centric and has no "contact by", "respond by" or "reply by". The date is listed as one of three undifferentiated dates instead of being named as the deadline. |
| Stated consequence (enforcement agents may attend and remove goods) | **No**, `has_consequence` false | **No** | `extractRiskSentence` walks a closed 12-entry list (line 1322) containing `bailiff` but **not** "enforcement agent". Card 5 therefore drops from "What could happen if I ignore it?" to the generic "What should I check?". |
| Stated consequence (council tax: losing the right to pay by instalments) | **No** | **No** | Same closed list. No phrase matches. |
| Serious document signals ("notice of enforcement", "enforcement agent") | Yes, `trust.serious_document_signals` | **No** | Written at line 210, read nowhere. `is_high_stakes` and `high_stakes_tier` are read only by `buildBanner` (line 1414). The signals shape severity and never reach a card. |
| Engine's own risk line ("You could lose money or share private data.") | Yes, `extraction.risk` | **No** | Two read sites, both dead. The legacy card 5 that uses it is discarded because `buildStructuredCards` card 5 never consults `oldCardById`; and the `extraction.consequence_sentence \|\| extraction.risk` fallback at line 730 is **unreachable**, because `has_consequence` is defined as `Boolean(consequenceSentence)`, so the true branch guarantees the left operand is truthy. |
| Extractor's own helpful note ("Keep the reference number ready.") | Yes | **Overwritten** | `inferHelpfulNote` (line 2059) returns a constant on five of six branches. The note is honoured only when `trust_assessment === "medium"`. On the bailiff (trust high) it becomes "This looks like a normal formal letter." |
| Path-specific review reasons (for example "OCR garbling detected. Amounts and dates may be unreliable.") | Yes, `extraction.review_reason` | **No** | Zero read sites for the extractor copy; every consumer reads the trust-layer copy instead. Four distinct explanations are computed and thrown away. |
| Amount actually owed (£1,381.50; £214.63; £1,247.00) | Yes, in `money_amounts` | **Wrong value shown** | Two selectors disagree. `bestMoneyAmount` (line 1256) returns the **largest**; `firstOrNull` (line 1252) returns the **first in document order**. Card 1 uses one, card 5 the other. |
| Amount roles (total, discount, instalment, fee, previous balance) | **No** | **No** | `extractMoneyAmounts` returns bare currency strings with no labels. The engine holds four numbers and knows the meaning of none. |
| Severity signals for card 2 key points | Empty | **No** | Card 2's key points are `trust.severity_signals` (line 701), which was `[]` on all five documents including the urgent bailiff notice, so card 2 carried no document-specific information anywhere in the set. |
| `appeal_rights`, `support_options`, `evidence_spans` | **Never** | **No** | Hard-coded `[]` at all seven construction sites. No extractor function exists. This is why "contact us to discuss a payment plan" is lost. |
| Confidence | Yes | **No** | `overall_confidence` and `confidence_level` have **zero** occurrences in `public/app.js`, and no branch changes wording based on them. |

---

## The genuine extraction gap: what only the AI knows

Of 27 substantive AI contributions examined, 13 were genuine extraction gaps and
14 were presentation gaps where the engine already held the fact. The real gaps
cluster into five kinds:

1. **Amount roles and the relationships between amounts.** "Total charge is
   £1,842.00 with a 25% single person discount (£460.50)" and "10 monthly
   instalments of £138.15". The engine holds every number and no label.
2. **Consequences whose wording is outside the twelve hard-coded phrases.**
   "Paying after this date may lose your right to pay by instalments."
3. **Support and dispute routes.** "If struggling to pay, contact EDF Energy to
   discuss a payment plan"; "contact us on 020 8583 4242 if you think this bill
   is wrong". `support_options` and `appeal_rights` are permanently empty and no
   phone number is ever captured.
4. **Anchoring a relative deadline.** "within 14 days **of 9 June 2026**". This
   is the one AI-only fact of genuinely high reader value in the set.
5. **Non-monetary quantities.** "842 kWh". Low reader value, but a clean example
   of something no engine field can hold.

Everything else the AI appeared to add, including naming the document type,
naming the sender on more than one card, showing the right amount, and stating
the deadline, is information the engine already has.

The AI is also not uniformly additive. On the energy bill it dropped the
reference number the engine holds, and on the housing letter it produced a
derived date no engine field can corroborate.

### AI reliability, measured

| Document | Status | Detail |
| --- | --- | --- |
| Council tax | completed | 13.2 s |
| Energy bill | completed | 15.2 s |
| Housing letter | completed | 12.6 s |
| Bailiff | **fallback** | `invalid_structured_result`, 18.9 s; earlier run `ai_timeout` at 25.0 s |
| Scam | **skipped** | `verification_only_state`, by design |

The failure pattern is inversely correlated with stakes. Two causes:

- **The self-rejection bug.** `buildStructuredCardWarning` (line 809) returns
  "This looks important. Do not ignore it." for every `urgent` document.
  `sanitizeCard` defaults a missing card warning to `fallback.warning`
  (`validateStructuredResult.js:225`). `validateNoUnsafeAdvice` (line 179)
  stringifies the **whole** candidate and tests
  `/(?<!if i )(?<!if you )\bignore it\b/i`, which matches "not ignore it". The
  lookbehinds only exempt the adaptive card 5 title, so the engine's own safety
  string rejects the AI result. Expect this to reject the AI pass across the
  whole urgent class, reproducibly.
- **Latency headroom.** Successful runs took 12.6 to 15.2 s against a 25 s
  timeout, and the bailiff burned 18.9 s before falling back. A slower API day
  converts completions into fallbacks.

---

## Presentation versus extraction, by document type

My assessment, informed by the per-document traces and weighted by what a
frightened reader actually needs back.

| Document type | Presentation | Extraction | Reasoning |
| --- | --- | --- | --- |
| Energy or utility bill | **80%** | 20% | Every fact that matters is held. The single worst defect, "Amount shown: £0.00", is a selector bug. Only the payment-plan support line and the consumption figure are genuinely missing. |
| Bailiff or enforcement | **70%** | 30% | The deadline is in `visible_dates`, the right amount is in `money_amounts`, the reference is extracted, and the trust layer already knows it is an urgent enforcement document. Only the consequence sentence needs new extraction, and even that is a phrase-list miss rather than an architectural limit. |
| Scam or phishing | **70%** | 30% | Six signals, a reference number and a real risk line are all held and unshown. But this class is capped by the deliberate verification-only design, and no AI benefit exists for English readers either, so the practical gap is a design question, not a defect. |
| Council tax | **55%** | 45% | I differ from the per-document trace, which said 40/60. The largest single harm, charging the reader £460.50 too much on card 1, is pure selection. The discount relationship, the instalment schedule, the band and the tax year are real extraction gaps. |
| Lower confidence official (housing, legal, medical, employment, education, insurance, bank) | **50%** | 50% | The sender and the relative deadline are held. But this whole class is routed to the reading-aid path, where `has_consequence`, `visible_dates` and `header_date` are never even assigned, so half the gap is structural. |

**Overall: roughly 65 to 70 percent of the founder-visible gap is presentation**,
reachable by displaying what the engine already holds and fixing three selection
bugs. The remainder needs new extraction, and almost all of that is rules work,
not model work. Only date anchoring and plain-language relation of two facts
genuinely argue for an AI.

---

## Options, with effort estimates

No implementation. Ordered by value per unit of effort. All estimates assume one
focused backend session each and include tests; existing tests assert card
**shape**, not amount values, so selection fixes carry low test churn.

### Tier 1: correctness, do these first

| # | Change | Effort | Effect |
| --- | --- | --- | --- |
| 1 | **Fix the AI self-rejection.** Exclude the `warning` field from the unsafe-advice scan, or exempt the engine's own warning constants, or stop defaulting `card.warning` to the fallback before validation. | **S**, under half a session | Restores the AI path for the entire urgent class in English. Highest value single change. |
| 2 | **One amount selector, chosen by role.** Replace the `bestMoneyAmount` versus `firstOrNull` split with a single function that prefers an amount adjacent to an "amount to pay", "amount due", "amount outstanding" or "total to pay" label, and never returns £0.00 when a non-zero amount exists. | **M**, one session | Removes all three wrong-amount defects at once. Fixes English and every language simultaneously. |
| 3 | **Widen the deadline context vocabulary** to include "contact us by", "respond by", "reply by", "call us by", and promote a `visible_dates` entry when exactly one date follows an obligation verb. | **S to M** | Gives bailiff and enforcement letters their deadline card back. |

### Tier 2: display what is already extracted

| # | Change | Effort | Effect |
| --- | --- | --- | --- |
| 4 | **Show the reference number and the document type label.** Both are extracted, both have zero read sites. Add them as key points on cards 1 and 6. | **S** | Immediate, visible specificity on every document with a reference. Needs new bank sentences for the nine languages. |
| 5 | **Stop `inferHelpfulNote` discarding the extractor note.** Prefer the extractor's observation when present, fall back to the constants. | **S** | Ends "This looks like a normal formal letter." on enforcement notices. |
| 6 | **Give card 2 real key points.** It currently renders `trust.severity_signals`, empty on all five documents, and duplicates card 1's key point. Feed it the deadline, the amount and the document type instead. | **S to M** | Card 2 is currently the emptiest card in the product. |
| 7 | **Surface `serious_document_signals` and the engine's own `risk` line** on card 5 when no consequence sentence was found, instead of the generic check template. | **M** | Turns the weakest card on the most serious documents into a real one. Requires care to stay inside the advice boundary. |

### Tier 3: new extraction

| # | Change | Effort | Effect |
| --- | --- | --- | --- |
| 8 | **Labelled amount extraction.** Capture each amount with the label that precedes it, so total, discount, instalment, fee and previous balance are distinguishable. | **L**, two to three sessions | Unlocks the council tax and instalment cases properly, and makes option 2 exact rather than heuristic. |
| 9 | **Widen consequence detection** from the closed 12-phrase list to a pattern-plus-phrase approach ("if you do not X, Y", "failure to X will Y") with the existing hedging. | **M to L** | Restores the adaptive card 5 on the documents that most need it. |
| 10 | **Populate `support_options` and `appeal_rights`**, and capture phone numbers in `contact_details`. | **M** | Recovers hardship and dispute routes, which matter most to the anxious reader the product is for. |
| 11 | **Anchor relative deadlines** to the letter date, which is already extracted as `header_date`. | **S to M** | "within 14 days" becomes "within 14 days of 9 June 2026" without an AI. |
| 12 | **Narrow the reading-aid path.** Housing, legal, medical and the rest currently bypass `has_consequence`, `visible_dates` and `header_date` entirely. | **L** | Structural. Would need its own safety review, since the hedged wording is deliberate. |

### Options not recommended

- **Translating AI output.** It would inherit the AI's unreliability on exactly
  the urgent documents, add per-request cost and latency in nine languages, and
  send non-English document text to the provider, which the current gate
  deliberately prevents.
- **Running the AI in English and translating the result.** Same objections, plus
  the reviewed template bank would no longer cover what is shown, which would end
  the guarantee that every non-English string has been through review.

The strategic point: options 1 to 7 improve English and all nine languages at
once, need no model, and no new safety surface. They are the cheapest route to
closing most of the gap the founder is describing.

## What was not investigated

- Whether the AI's own output is consistently better on documents where it does
  run, beyond the five sampled here.
- OCR and photo inputs. Every document here was clean text, so the
  `garbled_by_ocr` and `input_quality` gates were never exercised on real
  scanned input, and those gates suppress the deadline and the AI pass entirely.
- The welfare benefits path, which forces the deadline to null and was not in
  the sample.
- Multi-letter uploads, where only the first document is analysed.

## Provenance

Five documents, four variants each, run against the shipped engine and AI
service as published modules. The engine's internal state is quoted from its own
`trust_internal` and `extractor_internal` output. Every code claim in this file
was verified by reading the cited line. The harness lives in the session
scratchpad and was deliberately not added to the repository, so this diagnosis
adds exactly one file and changes nothing else.
