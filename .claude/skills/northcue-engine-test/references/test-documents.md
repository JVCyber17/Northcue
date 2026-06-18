# Northcue Engine Test Documents

All documents are embedded verbatim in `scripts/run_engine_tests.js`. This file describes what each one is testing and what the correct output should look like.

---

## Group A — Original Three Documents (first engine test session)

### DOC_1 — British Gas energy bill

**What it tests:** Baseline energy bill processing. Clean, well-formed, multi-line UK utility bill with VAT breakdown and clear payment instruction.

**Known-correct assertions:**
- `document_category` = `bill_or_payment`
- Amount extracted: `£187.42`
- Deadline extracted: `24 June 2026`
- `severity_level` = `medium`
- `processing_mode` = `normal`

**Watch for:** Deadline extractor may compete between the billing period dates and the payment due date. `Please pay by 24 June 2026` is the correct one.

---

### DOC_2 — Sheffield City Council — Annual Council Tax Notice

**What it tests:** Informational annual notice with a direct debit plan. No single urgent payment demand — the document explicitly says "This is not a demand for payment." Tests whether the engine correctly reads severity as low/informational rather than urgent.

**Known-correct assertions:**
- `document_category` = `bill_or_payment`
- Amount extracted: `£2,104.00`
- `severity_level` = `low`
- `processing_mode` = `normal`

**Watch for:** The instalment dates (April 2026 – January 2027) create many date candidates. Deadline extractor should pick the first instalment (`01/04/2026`), but since the letter is informational this matters less.

**Contains obligation:** "you must tell us within 21 days" — the action card should surface this.

---

### DOC_3 — Sheffield Environmental Services — Enforcement Notice

**What it tests:** Official enforcement letter with a clear deadline and legal threat. Tests severity escalation, government category detection, and obligation extraction.

**Known-correct assertions:**
- `document_category` = `government`
- `severity_level` = `high` or `urgent`
- Deadline extracted: `26 May 2026`

**Watch for:** Document mentions the Environmental Protection Act. Risk card should surface the legal consequence (fixed penalty / prosecution).

---

## Group B — Supplementary Stress-Test Documents

### DOC_4 — Sheffield City Council Legal — Council Tax Arrears Enforcement

**What it tests:** Blunt legal tone with explicit prosecution threat. Escalation from the council tax notice (DOC_2) — this one is from Legal Services and has court costs language. Tests urgent severity, government category, and that the engine doesn't soften a real threat.

**Known-correct assertions:**
- `severity_level` = `urgent`
- Amount extracted: `£450.00`
- Deadline extracted: `16 June 2026`

**Watch for:** "Failure to pay... will result in prosecution" is unconditional language (not hedged). Risk card should reflect this.

---

### DOC_5 — British Telecom — Final Notice, Outstanding Balance

**What it tests:** Single unconditional obligation ("You must pay immediately") with an already-suspended account. Tests urgent severity on a bill document and single-obligation extraction. Now on the **full extraction path** (promoted from readable-unsupported in the whitelist expansion session).

**Known-correct assertions:**
- `document_category` = `bill_or_payment`
- `document_type` = `bill_or_payment_notice`
- `severity_level` = `urgent`
- Amount extracted: `£124.99`
- Deadline: `02 June 2026` (the letter date — "pay immediately" has no specific future due date, so the letter date is used as the deadline)
- What Is This summary: `"British Telecom appears to be asking you to pay £124.99 by 02 June 2026."`
- Action card: `steps` includes "You must pay immediately."

**Watch for:** The instruction "You must pay immediately" is the obligation. Unlike DOC_2 (informational), this should be urgent because the account is already suspended. Deadline is the letter date, not a future date — this is correct since the document says "immediately" rather than naming a specific future date.

---

### DOC_6 — Sheffield Housing Benefits Service — Housing Benefit Review

**What it tests:** Multi-obligation document with two distinct "you must" clauses in separate paragraphs. The primary test for the multi-obligation fix applied in this project (removing the `break` from `extractActions`).

**Known-correct assertions:**
- `action_card.steps.length` >= 2
- Both obligations present: address update (within 14 days) AND household confirmation (by 30 June 2026)

**Watch for:** Before the multi-obligation fix, only the first obligation appeared. If `steps.length === 1`, the fix has regressed.

---

### DOC_7 — Barclays Bank PLC Personal Lending — Notice of Arrears

**What it tests:** Mixed hedged/assertive risk language ("will result in action being taken against you, which *may* include"). Tests that `normalizeRiskSentence` preserves the inner hedge while still communicating the assertive outer clause. Now on the **full extraction path** (promoted from readable-unsupported in the whitelist expansion session). The compliance deadline required a `deadlineContext` fix — see known-gotchas.

**Known-correct assertions:**
- `document_category` = `bill_or_payment` (the Barclays letter asks for payment of an outstanding amount — `detectDocumentCategory` correctly categorises it this way; it was previously mis-asserted as `bank_or_loan` in old test script versions)
- `document_type` = `bill_or_payment_notice`
- `severity_level` = `high`
- Amount extracted: `£320.00`
- Deadline extracted: `24 June 2026` (the compliance deadline from "Failure to pay the outstanding amount by 24 June 2026", picked via the `\bto\s+pay\b` deadlineContext addition)
- What Is This summary: `"Barclays Bank PLC appears to be asking you to pay £320.00 by 24 June 2026."`
- Risk card: full consequence sentence preserved including the "which may include" hedge

**Watch for:** Risk card should not drop the "which may include" hedge, but also should not soften "will result in action" to nothing. The overdue date "01 June 2026" ("Payment was due on 01 June 2026") must NOT be extracted as the deadline — "was due on" doesn't match deadlineContext, and the backward-looking exclusion pass rejects it.

---

### DOC_8 — HMRC Phishing Letter

**What it tests:** Scam detection. Classic HMRC impersonation with fake URL (`hmrc-refund-portal.net`), urgency language ("Act now"), NI number request, and bank details request. Must route to `verification_only`.

**Known-correct assertions:**
- `processing_mode` = `verification_only`
- `trust_assessment` = `low`
- Action card must NOT contain payment instructions, link-clicking instructions, or NI number advice (see `assertNoDangerousVerificationInstructions` in unit tests)

**Watch for:** If `processing_mode` is NOT `verification_only`, the scam detection has regressed. This is the highest-stakes test case.

---

### DOC_9 — Severn Trent Water — Payment Reminder

**What it tests:** Sender detection when the department name appears before the organisation name. First meaningful line is "Customer Accounts Team" — the engine may grab this as the sender instead of "Severn Trent Water".

**Known-correct assertions:**
- `document_category` = `bill_or_payment`
- Amount extracted: `£94.50`
- Deadline extracted: `20 June 2026`

**Known limitation (see gotchas):** `extractSummaryFirstLineSender` reads the first short line. Since "Customer Accounts Team" appears before "Severn Trent Water", the What Is This card may say "Customer Accounts Team" as the sender rather than "Severn Trent Water". This is a documented bug, not a regression.

---

### DOC_10 — NHS Hallamshire Hospital — Outpatient Appointment

**What it tests:** Appointment document type. Confirms `appointment` category detection, that `extractAppointmentDate` correctly identifies the appointment block date (not the letter header date), and that appointment-specific card framing is applied. Now on the **full extraction path** with a dedicated appointment whitelist guard.

**Known-correct assertions:**
- `document_category` = `appointment`
- `document_type` = `appointment_letter`
- `severity_level` = `medium`
- `when_is_it_due` card: `"Your appointment is on 01 July 2026."` (appointment block date, NOT the letter date of 05 June 2026)
- `what_is_this` summary: `"This appears to be an appointment from Hallamshire Hospital Outpatients on 01 July 2026."`
- Action card: steps include `"Attend the appointment or meeting."`

**Watch for:** The letter header date is 05 June 2026 (when the letter was written). The appointment is 01 July 2026. If the deadline card shows June instead of July, `extractAppointmentDate` has regressed and is falling through to `extractDeadline` which picks the header date. The whitelist condition requires confirmed appointment language — "your appointment is booked" and `Consultant:` / `Department:` fields in this fixture satisfy it. See known-gotchas for the appointment whitelist guard and `extractAppointmentDate` details.

---

## Group C — OCR Quality Detection Documents (stress-test session)

### DOC_11 — OCR-Garbled Energy Bill (PowerGrid)

**What it tests:** Moderately garbled OCR (letter-digit-letter patterns like `Ener9y`, `Serv1ces`, `rece1ved`). Tests the `estimateOcrGarbling` function and whether the engine correctly routes to caution mode and suppresses specific amounts/dates in the cue cards.

**Known-correct assertions:**
- `processing_mode` = `caution`
- `input_quality` = `borderline`
- `when_is_it_due` card: short_answer must contain uncertainty language ("too low to read it reliably"), NOT a specific date
- `what_is_this` card: must mention "text quality too low"

**Watch for:** If `when_is_it_due` says "Due by 25 June 2026" (the underlying date), the garble suppression has regressed. The date should be suppressed because the text is unreliable.

---

### DOC_12 — Two Letters Merged (Council Tax + GP Appointment)

**What it tests:** Resilience when two unrelated letters are concatenated with no separator. The engine should not crash and should produce some reasonable output, though the category and summary will be mixed.

**Known-correct assertions:**
- Engine does not throw
- Output has 6 cards
- No validation errors

---

### DOC_13 — Council Tax Notice Cut Off Mid-Sentence

**What it tests:** Document that ends abruptly before reaching the deadline and payment section. Tests that the engine does not invent a deadline it cannot see.

**Known-correct assertions:**
- Engine does not throw
- `when_is_it_due` card: should NOT state a specific deadline (document ends before that section)
- No validation errors

---

### DOC_14 — Heavily Garbled (near-unreadable)

**What it tests:** Text where the garble score exceeds the 0.25 "poor" threshold. The engine should route to `unsupported` mode, not attempt normal extraction.

**Known-correct assertions:**
- `input_quality` = `poor`
- `processing_mode` = `unsupported`

---

## Group D — Multi-Obligation Test Document

### DOC_15 — DWP Housing Benefit Award Notice (two distinct obligations)

**What it tests:** A benefit letter with two clearly distinct "you must" obligations in separate paragraphs. The primary regression test for the multi-obligation fix.

**Known-correct assertions:**
- `action_card.steps.length` >= 2
- Both income/savings AND address obligations appear in steps
- No duplicate steps (same sentence added twice)

---

## Notes on Expected Values

Expected values above are based on runs conducted during engine development sessions. Some FAILs are pre-existing known limitations documented in `known-gotchas.md` — check there before treating a FAIL as a regression.

The most critical tests in priority order:
1. DOC_8 (phishing): `verification_only` mode — safety critical
2. DOC_11 (garbled): garble suppression in deadline card — safety critical
3. DOC_6/DOC_15 (multi-obligation): steps.length >= 2 — correctness
4. DOC_1 (clean bill): amounts and dates correct — baseline
