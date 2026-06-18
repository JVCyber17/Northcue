# Northcue Engine — Known Gotchas

Short, specific warnings from real discoveries in this codebase. Check here before treating a test failure as a regression.

---

## Topic Detection / Classification

**Bare-substring matching causes false-positive topic detection.**
Pattern: checking for a word like `"rent"` as a raw substring matches inside unrelated words (`"currently"`, `"Trent"`, `"different"`). Found and fixed for `"rent"`, `"claim"`, `"trip"`, `"manager"`, `"bank"`. The fix pattern: use multi-word arrays like `["rent arrears", "landlord"]` instead of bare single words. If you add new topic keywords, always use multi-word pairs or explicit `\b` word-boundary patterns — never a bare substring.
Files: `inferReadableTopic` and `detectDocumentCategory` in `clearStepsEngine.js`.

**`"claim"` inside benefits documents.**
`"claim"` matched insurance topic even when the document was about a PIP/benefits claim. Fixed by removing bare `"claim"` from the insurance check and requiring `["insurance", "policy"]` together. If insurance detection ever regresses, check this first.

---

## Document Category / Routing

**`isFullySupportedDocument` is a narrow intentional whitelist.**
As of the whitelist expansion session, the following route to full extraction: energy/electricity/gas/water/phone/broadband bill (keyword match), council tax (keyword match), government (category), `bill_or_payment` (category — covers final notices, arrears letters, outstanding balance letters), and confirmed appointment letters (category `appointment` WITH specific language: "outpatient appointment", "your appointment", "appointment has been", "appointment is booked", or `/\b(?:department|consultant)\s*:/i`). Everything else — housing, legal, benefits, insurance, employment, education, bank_or_loan (pure loans/mortgages not classified as `bill_or_payment`) — routes to the readable-unsupported path. This is deliberate caution: adding a new type without verifying `extractActions`, `inferSummary`, and `inferRisk` output is likely to produce wrong results.

**New `document_type` values: `bill_or_payment_notice` and `appointment_letter`.**
Added in `detectStructuredDocumentType`, `labelForStructuredDocumentType`, `ALLOWED_DOCUMENT_TYPES` (validateStructuredResult.js), and the unit test's allowed-type assertion. If you add another document type to `isFullySupportedDocument`, add it to all four locations or `sanitizeStructuredResult` will fall back to the fallback `document_type`, and the unit test will fail with "document_type uses an allowed value".

**The readable-unsupported path bypasses most extraction functions entirely.**
`buildReadableUnsupportedExtraction` constructs its own output using `inferReadableTopic` and `buildReadableUnsupportedSignals`. It does NOT call `extractActions`, `inferSummary`, or `inferRisk`. Any fix to those functions has NO effect on documents routed through the unsupported path. If you fix obligation extraction and an unsupported document doesn't show the fix, this is why.

**Incoming formal letters were being misclassified as "outgoing" — FIXED.**
`looksOutgoing` originally matched "yours sincerely", "yours faithfully", "from our team", and "i am writing to" — all of which appear in standard company letters addressed TO users. The Barclays mortgage arrears letter triggered "yours sincerely" in its sign-off and was classified as outgoing, showing "This looks like a document sent by you." Fixed by replacing those four signals with phrases that are genuinely distinctive of user-authored correspondence: "to whom it may concern", "dear sir or madam", "dear sir/madam", "i am writing to request/complain/cancel/dispute", "i wish to cancel/complain", "i hereby give notice".

---

## Deadline Extraction

**`\bto\s+pay\b` added to `deadlineContext` regex — required for Barclays-style phrasing.**
"Failure to pay the outstanding amount by 24 June 2026" does not contain "pay by" adjacent to the date — it has "to pay ... by" separated by several words. The 35-char window before "24 June 2026" contains "to pay" but not "pay by". Adding `\bto\s+pay\b` to `deadlineContext` catches this. Without it, the engine found no deadline-context match and fell back to the first date in the document (the letter date), producing the wrong result. If you add deadline context phrases, check that the window size (35 chars before the date) is wide enough to reach your keyword.

**`extractAppointmentDate` — appointment block vs letter header date disambiguation.**
Appointment letters contain two types of dates: the letter date in the header ("05 June 2026 — Dear Mr Vaidya") and the actual appointment date in a structured block ("Department: Orthopaedics / Date: 01 July 2026 / Time: 14:30"). `extractDeadline` finds the header date first because it appears earliest in the document. `extractAppointmentDate` (added in the whitelist expansion session) scans lines near `department|consultant|location|clinic|time` field markers and returns the date from that block. It is called from both `runExtractorLayer` (for the `when_is_it_due` card) and `inferSummary` (for the What Is This card) when `document_category === "appointment"`, with a fallback to `extractDeadline` if no structured block date is found. If the deadline card shows the letter date instead of the appointment date, check that the appointment field regex (`appointmentFieldRe`) still covers the fields present in the fixture.

**Appointment whitelist guard — planning consultation false positive.**
`detectDocumentCategory` contains "consultation" as an appointment keyword. Planning consultation documents ("Amber Valley Borough Council — Local Plan Consultation") therefore get `document_category = "appointment"`. Without a guard, they would route to the full appointment path and receive the "Your appointment is on..." framing — which is wrong. The whitelist condition requires BOTH `document_category === "appointment"` AND at least one of: `"outpatient appointment"`, `"your appointment"`, `"appointment has been"`, `"appointment is booked"`, or `/\b(?:department|consultant)\s*:/i`. Planning consultation letters contain none of these. If a new appointment document type fails the whitelist, check whether it contains one of these phrases — if it doesn't, add the most specific phrase from the document rather than weakening the guard.

**`extractDeadline` picks the first date near deadline-context language, falls back to first date in document.**
This can produce wrong results when a document has a billing period date before the actual payment-due date. Example: "for the period 1 April 2026 to 31 March 2027... Payment due 30 April 2026" — the engine may return `1 April 2026` (period start) instead of `30 April 2026` (payment deadline). Observed in the Sheffield Council Tax Notice (annual) and confirmed during AI-pass comparison testing.

**Past-tense overdue date winning over forward-looking compliance deadline — FIXED.**
In a document containing both "Payment was due by 01/05/2026" (an overdue amount already owed) and "Failure to pay by 16 June 2026 will result in prosecution" (the actual deadline to act on), `extractDeadline` was returning `01/05/2026` because `due\s+by` in the `deadlineContext` regex matched "was due by" regardless of tense. Fixed with a two-pass approach: the priority pass excludes any date whose 35-char before-context contains backward-looking markers (`was due`, `were due`, `became due`, `overdue since`). Those only get picked in a second-pass fallback if no forward-looking date exists. Verified: DOC_4 now returns "16 June 2026" (the prosecution deadline) instead of "01/05/2026" (the overdue date). All 42 skill assertions pass. The unit test for `missing_api_key` was also updated — its fixture text was too short to pass quality checks, causing the quality gate to fire before the API key check; replaced with a realistic-length appointment letter.

**Sort codes matching the date regex — FIXED.**
`40-22-99` (a UK sort code) matched `\d{1,2}[/-]\d{1,2}[/-]\d{2,4}` and was being extracted as a deadline date. Fixed by adding `isPlausibleNumericDate()` which validates that the first segment is 1–31 and the second is 1–12 (or vice-versa for MM/DD). `40-22-99` fails (40 > 31, 22 > 12) and is skipped. The fix is applied in three places: the first-pass loop in `extractDeadline`, the fallback in `extractDeadline`, and in `extractVisibleDates` (which feeds the readable-unsupported path's date listing). Verified: the Barclays document now shows "15 July 2026" — the actual deadline — with "40-22-99" absent from all cards.

---

## Severity Escalation

**`RISK_PHRASES` and `HIGH_SEVERITY_KEYWORDS` were disconnected — FIXED.**
`extractRiskSentence` (using `RISK_PHRASES`) correctly detected enforcement consequences like "prosecution" and "fixed penalty notices" and showed them in the risk card. But `pickSeverityLevel` used a separate keyword list (`HIGH_SEVERITY_KEYWORDS`) that only contained "criminal prosecution" — bare "prosecution" (civil enforcement, council tax, environmental) never escalated severity. The result: the risk card showed the correct serious consequence, but `severity_level` stayed at "low" — two systems disagreeing with each other. Fixed by adding `"prosecution"`, `"fixed penalty"`, `"county court"`, and `"debt collection"` to `HIGH_SEVERITY_KEYWORDS`. Documents that trigger `extractRiskSentence` now also trigger at least "high" severity. Verified: DOC_3 (enforcement notice), DOC_4 (council tax arrears), and DOC_7 (Barclays arrears) all escalate from "low" to "high". Routine bills and informational letters without consequence language are unaffected.

**Hedged consequence language escalates severity to "high", not "urgent".**
DOC_3 uses hedged language ("may include fixed penalty notices or prosecution"). The `normalizeRiskSentence` function correctly passes this through without the assertive "The document states that..." framing. For severity, hedged prosecution language still escalates to "high" (not "urgent"), since the consequence is real even if conditional. "Criminal prosecution" (assertive, specific) stays in `URGENT_SEVERITY_KEYWORDS` and reaches "urgent". This is intentional: the engine should match the document's own register, not add alarm the document itself doesn't express.

**"Legal action" was NOT added to severity keywords — deliberately.**
"If you do not pay, we may take legal action" appears in almost every overdue invoice and council tax notice as routine boilerplate. Adding bare "legal action" to HIGH_SEVERITY_KEYWORDS would over-trigger on routine bills. Only the more specific consequence terms (prosecution, fixed penalty, county court, debt collection) were added.

---

## Sender Detection

**`extractSummaryFirstLineSender` grabs the first short non-generic line.**
If the document header puts a department name before the organisation name (e.g. "Customer Accounts Team" / "Severn Trent Water"), the engine picks "Customer Accounts Team" as the sender. The What Is This card then says "Customer Accounts Team appears to have sent..." rather than "Severn Trent Water appears to have sent...". Observed in DOC_9 (Severn Trent). Not fixed; documented as expected behaviour.

---

## Obligation Extraction

**`extractActions` had a `break` after the first obligation match — only one obligation ever surfaced.**
Fixed in the multi-obligation session. The old code: for each pattern, run a non-global `.exec()`, push the match, then `break`. The new code: for each pattern, build a global regex, iterate all matches, deduplicate by 30-char prefix, cap at 3. If multi-obligation documents ever show only one step again, check whether `break` crept back in or the global flag was removed.

**Two patterns can match the same sentence — 30-char prefix deduplication prevents double-counting.**
"You must tell us" matches both the `you must` pattern and the `tell us` pattern. The `seenObligationPrefixes` Set prevents adding the same sentence twice. If you see duplicate steps in the action card, check this dedup logic.

---

## OCR Quality / Garble Detection

**`rateInputQuality` (textExtraction.js) and `detectInputQuality` (clearStepsEngine.js) are two separate functions with different implementations.**
`rateInputQuality` is used for image OCR quality feedback to the client. `detectInputQuality` is the engine's internal quality decision. They existed independently for a long time with different thresholds. Don't confuse them. Fixing one does not fix the other.

**Before the garble-detection fix, well-garbled text passed as "good" quality.**
`detectInputQuality` originally just counted characters and words. A 600-character string of garbled OCR output passed as `"good"` because it had enough letters. The `estimateOcrGarbling` function was added later. If garble detection ever regresses, check that `estimateOcrGarbling` is being called from `detectInputQuality` and that the threshold (`>= 0.06` for borderline, `>= 0.25` for poor) is intact.

**`garbled_by_ocr` is an internal trust field — it is NOT in `toPublicTrustShape`.**
Reading `output.trust.garbled_by_ocr` will always return `undefined` (falsy) even when garbling was detected. The garble suppression behaviour IS active — you can see it in the card content — but reading the flag from the public trust object doesn't work. Use `output.structured_output.trust_internal.garbled_by_ocr` if you need the flag programmatically.

**The structured_result still leaks partial corrupted amounts even when main cards suppress them.**
When garbling is detected, the main six `cards` correctly suppress specific amounts and dates. However, `structured_result.cards` (used for TTS/display_text) may still contain a truncated or partial extracted value (e.g. `£89` from `£89.2O`). This is because the suppression logic runs in `runExtractorLayer` (affecting `extraction.money_amounts`) but the structured_result builder can still reference partial regex matches. If you see a garbled amount in TTS output but not in the main cards, this is why.

---

## PDF Extraction

**pdfjs-dist v6 requires Node >= 22.13.0 due to `Promise.withResolvers`.**
On Node 20 or 21, the dynamic `import()` in `extractTextFromPdf` throws a `TypeError` and falls through to the catch block, returning `{ text: "", pageCount: 0 }`. The route then tells the user their PDF is a "scanned document" — which is wrong and misleading. There is no runtime error logged; it fails silently. The `engines` field in `package.json` is set to `>=22.13.0` to document this. If a deployment is on Node 20/21, PDF extraction will silently fail.

**pdfjs-dist v6 is ESM-only; the dynamic `import()` call caches the module after first load.**
The module is cached by Node after the first `import()`. Subsequent PDF extractions in the same process reuse the cached module without re-importing it. This is correct behaviour, not a bug — just worth knowing if you see surprising caching behaviour in tests.

---

## AI Pass (aiStructuredResultService.js)

**The AI pass only modifies `structured_result`, `display_text`, and `tts_script` — NEVER the main six `cards`.**
Users see `output.cards`. The AI pass updates `output.structured_result`. These are separate objects. Even when the AI pass runs successfully and produces better output, the main cue cards displayed to users are always the rules-engine version. Any fix in `structured_result` is invisible in the main UI.

**The AI pass is hard-gated on low-quality input — it does not run on borderline or poor documents.**
A code gate in `applyAiStructuredResult` (added after prompt-based suppression was confirmed unreliable with gpt-4.1-mini) skips the AI pass entirely when `input_quality === "borderline"` or `"poor"`, or `garbled_by_ocr === true`. When the gate fires: `ai_used: false`, `ai_status: "skipped"`, `ai_error_code: "low_quality_input"`, `duration: 0ms`. No API call is made. The rules engine output is returned unchanged, preserving the correct uncertainty language in the `structured_result` / TTS layer. Verified live: garbled OCR bill (DOC_11 / DOC 3 in `_ai_compare.js`) shows `ai_used=NO (skipped / low_quality_input)` and `[no changes]`.

**Prompt-based "do not pay / do not reference numbers or charities" rules are not reliably honoured by gpt-4.1-mini — FIXED with code-level enforcement.**
The AI pass runs a `stripAiViolations` post-processing step (in `aiStructuredResultService.js`) on every response before the result is accepted. It processes `simple_explanation`, `action_needed`, `read_aloud_text`, and every item in `key_points` across all six cards. Violations removed: (1) Imperative pay sentences ("Pay £X by [date]", "you must/should pay", "make a payment of", "and/then pay by [date]", "must pay") → replaced with "Check the original document for the payment amount and due date." (2) Sentences directing the user to call a specific phone number → replaced with "Use contact details from the original document." (3) Named debt advice organisations (StepChange, Citizens Advice, National Debtline, MoneyHelper, PayPlan, Christians Against Poverty, Debt Advice Foundation) → replaced with "a trusted advice service". (4) UK phone numbers appearing in non-call contexts → digits replaced with "the number in the original document". Debt org regex consumes optional domain suffixes (e.g. stepchange.org) to prevent garbled ".org" artifacts. Prompt-level instructions are kept in place as a first line of defence; the code layer is the enforcement fallback. Verified live: DOC 1 (clean energy bill) and DOC 4 (Barclays arrears) both pass a full violation scan — zero phone numbers, zero charity names, zero direct pay instructions in structured_result/TTS output.

**The AI pass uses the Responses API endpoint (`/v1/responses`), not the Chat Completions endpoint.**
The response parsing in `extractResponseText` handles both `output_text` (top-level) and the nested `output[].content[].text` structure. If the OpenAI API changes its response format, this parser may silently produce empty output and fall back to rules.

---

## Miscellaneous

**`detectDocumentCategory` runs BEFORE trust signals are fully resolved.**
The category is used to inform severity and mode decisions, but it's computed from raw text patterns before the trust layer runs. Circular dependencies are possible if severity signals trigger category changes or vice versa. Currently this is managed by run order, but adding category-dependent severity rules requires care.

**Template letters (`[Name]`, `[Date]` placeholders) route to a separate `template` document type.**
The template detection check runs early and sets `document_type = "template"` and `document_category = "template"`. Downstream extraction does not infer amounts or dates from template placeholders. If a real document happens to contain square-bracket values (some legal forms use `[insert date]`), it will be flagged as a template.
