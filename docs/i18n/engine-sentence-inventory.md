# Engine sentence inventory (Phase 0)

Complete inventory of every English string the Northcue backend can emit as user-visible card or result content, for building a translation template bank. All strings are verbatim from source, except that interpolated values are shown as named `{slots}`.

File abbreviations used in the tables below:

- `engine` = src/services/clearStepsEngine.js
- `ai` = src/services/aiStructuredResultService.js
- `route` = src/routes/simplifyRoute.js
- `server` = server.js
- `httpErrors` = src/utils/httpErrors.js
- `textExtraction` = src/services/textExtraction.js
- `feedback` = src/services/feedbackService.js
- `analytics` = src/services/analyticsService.js
- `requestParsing` = src/utils/requestParsing.js
- `validateSR` = src/utils/validateStructuredResult.js

## Summary counts (fixed / template / dynamic)

- FIXED: 264 strings total. Breakdown: 217 fixed sentences and labels (tables below), 9 distinct card title strings, 38 slot vocabulary fragments (fixed fragments interpolated into templates).
- TEMPLATE: 51 templates with named slots.
- DYNAMIC: 8 categories of genuinely dynamic text that cannot be templated.

The engine is deterministic. When the AI phrasing step is skipped (see the skip gates section), every user-visible string in the result is drawn from the fixed strings and templates below, except the small dynamic set (document-extracted obligation and consequence sentences, sender names, document headings, and extracted date/amount/reference tokens used as slot values).

## Card titles by id

The six card ids (src/schemas/cardSchema.js:1-8, src/utils/validateStructuredResult.js:24-31) and their fixed English titles. The legacy `cards` array and the `structured_result.cards` array share the same six `card_id` values in the same order.

| card_id | Normal path title | Readable reading-aid path title | Structured cards adaptive title |
|---|---|---|---|
| what_is_this | "What is this?" (engine:364-366) | "What is this?" (engine:560) | "What is this?" (engine:686) |
| what_matters_most | "What matters most?" (engine:371) | "Who sent it?" (engine:566) | "What matters most?" (engine:699) |
| what_do_i_need_to_do | "What do I need to do?" (engine:377) | "What do I need to do?" (engine:574) | "What do I need to do?" (engine:707) |
| when_is_it_due | "When is it due?" (engine:384) | "When does it matter?" (engine:580) | "When is it due?" (engine:715) |
| what_could_happen | "What could happen if I ignore it?" (engine:397) | "What matters most?" (engine:588) | Adaptive: "What could happen if I ignore it?" when a consequence is stated, otherwise "What should I check?" (engine:728) |
| helpful_note | "Helpful note" (engine:403) | "What should I check?" (engine:594) | "Helpful note" (engine:739) |

Distinct title strings (9): "What is this?", "What matters most?", "What do I need to do?", "When is it due?", "What could happen if I ignore it?", "Helpful note", "Who sent it?", "When does it matter?", "What should I check?".

Note: on the readable reading-aid path the what_could_happen slot carries the "What matters most?" title and the what_matters_most slot carries "Who sent it?". Titles and ids are not one-to-one, so translation keys should be per title string, not per card id.

## Fixed sentences

### Banner sentences (engine buildBanner)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| banner.non_document | This does not look like an official letter or bill. If it is one, try a clearer photo or a different page. | engine:1399 | banner.text, probable non-document |
| banner.suspicious_urgent | This may be suspicious and serious. Verify before acting. | engine:1407 | banner.text, low trust + urgent |
| banner.high_stakes_urgent | This looks like an important letter that may need action soon. Please read it carefully and check the original document. | engine:1419 | banner.text, high-stakes urgent tier |
| banner.high_stakes | This looks like an important letter. Please read it carefully and check the original document. | engine:1425 | banner.text, high-stakes high tier |
| banner.urgent | This looks important. Do not ignore it. | engine:1433, engine:809 | banner.text, urgent severity; also per-card warning on structured cards |
| banner.suspicious | This may be suspicious. Check before responding. | engine:1441 | banner.text, low trust |
| banner.caution | Some details need checking before you act. | engine:1449 | banner.text, medium trust |
| banner.safe | This looks like a normal document. Check the original if anything is unclear. | engine:1457 | banner.text, high trust + low severity |
| banner.default | Read the next step card before you act. | engine:1464 | banner.text, fallback |

### Verification-only (suspected scam) fixed card content

The whole verification_only card set is fixed and the AI step is hard-skipped for it.

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| scam.most_important | Check authenticity before taking any action. | engine:254 | what_matters_most short_answer |
| scam.action_verify | Verify the organisation on its official website. | engine:256, engine:2161 | action step 1 |
| scam.action_official_contact | Use contact details from an official source. | engine:257, engine:2162 | action step 2 |
| scam.action_protect | Keep your money and personal details protected. | engine:258, engine:2163 | action step 3 |
| scam.risk_extractor | You could lose money or share private data. | engine:261 | extractor risk field |
| scam.helpful_note | Do not use links or numbers from this document until checked. | engine:262 | helpful_note (extractor) |
| scam.risk_card | You may be tricked into unsafe payment or data sharing. | engine:2022 | what_could_happen short_answer (inferRisk) |
| scam.summary | This may be a suspicious message about money or details. | engine:1901 | what_is_this short_answer (inferSummary, possible_scam) |

### Non-document decline card (probable non-document)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| nondoc.summary | This does not look like an official letter or bill. | engine:433 | what_is_this short_answer |
| nondoc.most_important | Northcue could not find the things an official letter usually has, like a sender, a reference, or a date. | engine:434 | what_matters_most short_answer |
| nondoc.action | Upload a clearer photo or a different page if this is a letter or bill. | engine:435 | action step |
| nondoc.risk | No official document details were found. | engine:437 | what_could_happen short_answer |
| nondoc.helpful_note | Northcue is made for official letters and bills, so it has not turned this into cue cards. If it is one, a clearer photo or a different page may help. | engine:438 | helpful_note short_answer |
| nondoc.review_reason | This does not look like an official document. | engine:446, engine:1700 | review_reason, warnings list |
| nondoc.next_step | If this is a letter or bill, try a clearer photo or a different page. | engine:1713 | safe_next_step, helpful_note key point |

### Low-quality and unsupported upload messages

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| unsupported.summary | Readable text is limited in this upload. | engine:233 | what_is_this short_answer, poor/short unsupported path |
| unsupported.action | Upload a clearer copy if possible. | engine:235 | action step |
| unsupported.risk | Important details may be missing. | engine:237 | what_could_happen short_answer |
| unsupported.helpful_note | This document can be partly explained, but details need checking. | engine:238 | helpful_note short_answer |
| unsupported.summary_poor | Some parts are unclear in this document. | engine:1898 | what_is_this short_answer when input_quality is poor |
| unsupported.note_poor | Upload a clearer version if possible. | engine:2054 | helpful_note (inferContextNote) |
| unsupported.card_warning | This upload may be hard to read. | engine:801 | per-card warning field |
| unsupported.result_warning | This document may be hard to read. Upload a clearer copy if possible. | engine:823 | structured_result.warnings |
| unsupported.next_step | Upload a clearer copy before taking action. | engine:1719 | safe_next_step |
| unsupported.summary_category | This document is not fully readable. | engine:1962 | what_is_this short_answer (category fallback) |

### Garbled OCR messages

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| garbled.deadline | A date or deadline may appear in this document, but the text quality is too low to read it reliably. Check the original document. | engine:390 | when_is_it_due short_answer |
| garbled.review_reason | OCR garbling detected. Amounts and dates may be unreliable. | engine:318 | review_reason, warnings list |

### Readable reading-aid (partially supported document) messages

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| readable.action_check | Check the original document to see whether a response or action is needed. | engine:462 | action step |
| readable.helpful_note | Northcue is not fully trained for this document type yet. Use this as a reading aid, not advice. | engine:470 | What should I check? card headline |
| readable.review_reason | This readable document type is not fully supported yet. | engine:478 | review_reason, warnings list |
| readable.sender_unknown | The sender is not clearly stated. Check the original document. | engine:569 | Who sent it? card short_answer |
| readable.key_point_training | Northcue is not fully trained for this type yet, so use it as a reading aid and check the original document. | engine:692 | what_is_this key point (structured cards) |
| readable.dates_visible | Important dates are visible. Check what each date refers to. | engine:929 | most important point |
| readable.check_original_generic | Check the original document to understand what this is. | engine:932 | most important point (generic topic) |
| readable.no_date | No clear date was found. Check the original document. | engine:942 | When does it matter? card |
| readable.risk_response | You may miss a response request or important date. | engine:953 | risk message |
| readable.risk_dates | You may miss what the visible dates mean. | engine:956 | risk message |
| readable.risk_none | Not clearly stated. Check the original document. | engine:958 | risk message |
| readable.check_sender_generic | Check who sent the document. | engine:963 | key checks list |
| readable.check_topic_generic | Check what the document is about. | engine:964 | key checks list |
| readable.check_response | Check whether a response is requested. | engine:966 | key checks list |
| readable.check_official_contacts | Use official contact details before acting. | engine:967, engine:786 | key checks list; check key points (verification_only) |

### Benefits reading-aid messages

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| benefits.action_check | Check the original document, or with the sender, whether you need to respond or send anything. | engine:518 | action step when no obligations found |
| benefits.most_important_obligations | This may ask you to do something. Check the original document carefully. | engine:521 | most important point when obligations found |
| benefits.most_important_response | This may need a response. Check the original document, or with the sender, to be sure. | engine:522 | most important point otherwise |
| benefits.summary_generic | This appears to be a benefits letter. | engine:531 | what_is_this short_answer, no sender |
| benefits.helpful_note | Northcue is not fully trained for benefits letters yet. Use this as a reading aid, not advice, and check the original document or with the sender. | engine:539 | What should I check? card headline |
| benefits.review_reason | Benefits or welfare letters are handled as a reading aid only. | engine:547 | review_reason, warnings list |

### Deadline and check card messages

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| deadline.none | No deadline clearly stated. | engine:677, engine:1152 | when_is_it_due short_answer / explanation |
| check.generic | Check key details on the original document. | engine:777 | What should I check? explanation, no amount or date |
| check.no_extra | No extra checks clearly stated. | engine:791 | check card key points fallback |
| check.unclear_details | Check unclear details on the original. | engine:788 | check card key points when human review needed |

### Structured result warnings

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| warning.suspicious_card | This may be suspicious. Verify before acting. | engine:797 | per-card warning, verification_only |
| warning.suspicious_result | This may be suspicious. Verify using official contact details before acting. | engine:819 | structured_result.warnings |
| warning.urgent_result | This looks important. Check the original document carefully. | engine:827 | structured_result.warnings |

### Review reasons (pickReviewReason; shown in trust panel and warnings)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| review.unsupported | Some parts are unclear or unsupported. | engine:1701 | trust.review_reason, warnings |
| review.verification | Suspicious patterns were detected. | engine:1702 | trust.review_reason, warnings |
| review.multi_document | Multiple documents may be mixed in one upload. | engine:1703 | trust.review_reason, warnings |
| review.template | Template markers were found. | engine:1704 | trust.review_reason, warnings |
| review.outgoing | Looks like an outgoing document. | engine:1705 | trust.review_reason, warnings |
| review.borderline | Some details are readable but need checking. | engine:1706 | trust.review_reason, warnings |
| review.no_issue | No major trust issue found. | engine:1707 | trust.review_reason |
| review.default | Some details need checking before action. | engine:1708 | trust.review_reason, warnings |

### Safe next step (trust panel and helpful_note key point / action_needed)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| next_step.verification | Verify using official contact details from the organisation website. | engine:1716 | trust.safe_next_step |
| next_step.urgent | Check the action card now and act using trusted details. | engine:1722 | trust.safe_next_step |
| next_step.medium | Check key details on the original document before acting. | engine:1725 | trust.safe_next_step |
| next_step.default | Follow the action card step by step. | engine:1727 | trust.safe_next_step |

### Fixed summaries (what_is_this short_answer)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| summary.template | This looks like a template with blank fields. | engine:1899, engine:2065 | summary; also helpful_note |
| summary.outgoing | This looks like a document sent by you. | engine:1900 | summary, outgoing document |
| summary.bill_in_credit | This appears to be a bill. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure. | engine:1915 | summary, in-credit bill, no sender |
| summary.bill_generic | This is about a bill or payment request. | engine:1923, engine:1950 | summary fallback, bill_or_payment |
| summary.government_generic | This is from a government or council source. | engine:1932, engine:1956 | summary fallback, government |
| summary.appointment_generic | This is about an appointment. | engine:1939, engine:1951 | summary fallback, appointment |
| summary.employment | This is about work or employment. | engine:1952 | summary fallback |
| summary.education | This is about school or university. | engine:1953 | summary fallback |
| summary.housing | This is about housing or rent. | engine:1954 | summary fallback |
| summary.bank_or_loan | This is about banking or a loan. | engine:1955 | summary fallback |
| summary.medical | This is a medical document. | engine:1957 | summary fallback |
| summary.legal_or_court | This is a legal or court document. | engine:1958 | summary fallback |
| summary.benefits | This is about benefits support. | engine:1959 | summary fallback |
| summary.insurance | This is about insurance. | engine:1960 | summary fallback |
| summary.email | This appears to be an email message. | engine:1961 | summary fallback |
| summary.unknown | This is a readable formal document. | engine:1963, engine:1966 | summary fallback |

### Most important point (what_matters_most short_answer)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| mip.suspicious | This may be suspicious. Check it first. | engine:1993 | low trust |
| mip.urgent | This is urgent. You may need to act today. | engine:1997 | urgent severity |
| mip.high | This is important, but not an emergency. | engine:2001 | high severity |
| mip.medium | Action is likely needed soon. | engine:2005 | medium severity |
| mip.action_required | This document appears to require an action from you. See what you need to do. | engine:2014 | low severity with a real action |
| mip.information_only | This looks like information only. | engine:2017 | low severity, no action |

### Risk lines (what_could_happen short_answer)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| risk.urgent | Ignoring this could cause serious problems quickly. | engine:2029 | urgent severity |
| risk.high | Ignoring this could lead to penalties or service issues. | engine:2033 | high severity |
| risk.medium | Ignoring this may create delays or follow-up action. | engine:2037 | medium severity |
| risk.none | No risk clearly stated. | engine:2041, engine:2045, engine:2048, engine:398 | fallback |

### Helpful note lines (helpful_note short_answer)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| note.template_fields | Some fields may be missing. | engine:2052 | template document |
| note.outgoing_copy | This may be a copy sent by you. | engine:2053 | outgoing document |
| note.reference | Keep the reference number ready. | engine:2055 | reference number found |
| note.records | Keep this with your records in case you need it later. | engine:2056 | default context note |
| note.links | Do not use links or numbers in the document until checked. | engine:2061 | low trust |
| note.outgoing | This looks like an outgoing document. | engine:2069 | outgoing document |
| note.normal | This looks like a normal formal letter. | engine:2073 | high trust |
| note.unknown | Some details are unclear. Check the original document. | engine:2077 | unknown trust |
| note.missing | Some details are missing. Check the original. | engine:2080 | fallback |

### Fixed action lines (what_do_i_need_to_do steps and short_answer)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| action.none | No action needed right now. | engine:461, engine:2231, engine:2257, engine:2259 | action step / action line |
| action.check_payment | Check the payment amount and due date. | engine:2175, engine:2217 | action step, payment-like documents |
| action.contact_sender | Contact the sender using trusted contact details. | engine:2178 | action step |
| action.attend | Attend the appointment or meeting. | engine:2181 | action step |
| action.send_documents | Send the requested documents or form. | engine:2184 | action step |

### Consequence fallback

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| consequence.payment_due | The document says a payment may be due. Check the original document. | engine:1379 | what_could_happen, payment command with no extractable consequence |

### Global fallback

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| fallback.not_stated | Not clearly stated. | engine:2274 (cleanLine default), engine:234, engine:366, engine:658, engine:747 | any empty card field |

### Document type labels (structured_result.document_type_label)

| suggested_key | exact English string | source |
|---|---|---|
| label.council_tax_notice | Council tax notice | engine:1189 |
| label.energy_bill | Energy bill | engine:1190 |
| label.bill_or_payment_notice | Bill or payment notice | engine:1191 |
| label.appointment_letter | Appointment letter | engine:1192 |
| label.unknown | Unknown document | engine:1193 |
| label.unsupported | Unsupported document | engine:1194 |
| label.government | Official letter | engine:1201 |
| label.benefits | Benefits letter | engine:1202, engine:636 |
| label.bank_or_loan | Bank or finance letter | engine:1203 |
| label.legal_or_court | Legal or court letter | engine:1204 |
| label.housing | Housing letter | engine:1205 |
| label.medical | Health letter | engine:1206 |
| label.employment | Work letter | engine:1207 |
| label.education | School or education letter | engine:1208 |
| label.insurance | Insurance letter | engine:1209 |
| label.non_document | Not an official document | engine:634 |

### Trust and check panel signal labels

These appear in the public trust shape (`trust.scam_signals`, `trust.distrust_signals`, `trust.authentic_signals`, `trust.severity_signals`, engine:602-624). `severity_signals` also appear as key points on the what_matters_most structured card (engine:701).

Scam signals (engine:1470-1491), 18 distinct labels:

| suggested_key | exact English string | source |
|---|---|---|
| signal.scam.gift_card | Mentions gift card payment. | engine:1470 |
| signal.scam.crypto | Mentions crypto payment. | engine:1471 |
| signal.scam.bank_transfer | Requests immediate bank transfer. | engine:1472 |
| signal.scam.pressure | Uses pressure wording. | engine:1473 |
| signal.scam.pressure_warning | Uses pressure warning wording. | engine:1474 |
| signal.scam.link | Requests link-based response. | engine:1475 |
| signal.scam.account_verification | Requests account verification details. | engine:1476 |
| signal.scam.secret_details | Requests secret details. | engine:1477 |
| signal.scam.full_password | Asks for a full password, which real organisations never request. | engine:1481 |
| signal.scam.confirm_password | Asks you to confirm a password. | engine:1482 |
| signal.scam.enter_password | Asks you to enter a password. | engine:1483 |
| signal.scam.confirm_pin | Asks you to confirm a PIN. | engine:1484 |
| signal.scam.enter_pin | Asks you to enter a PIN. | engine:1485 |
| signal.scam.card_and_pin | Asks for card number and PIN together. | engine:1486, engine:1487 |
| signal.scam.pin_and_password | Asks for PIN and password together. | engine:1488 |
| signal.scam.verify_identity | Pressures you to verify your identity within a short time. | engine:1489 |
| signal.scam.freeze | Threatens to freeze your account. | engine:1490 |
| signal.scam.suspend | Threatens to suspend your account within a short time. | engine:1491 |

Distrust signals (engine:1499-1502):

| suggested_key | exact English string | source |
|---|---|---|
| signal.distrust.generic_greeting | Generic greeting used. | engine:1499 |
| signal.distrust.urgent_payment | Urgent payment pressure. | engine:1500 |
| signal.distrust.limited_time | Artificial urgency used. | engine:1501 |
| signal.distrust.unusual_sender | Sender wording appears unusual. | engine:1502 |

Authentic signals (engine:1510-1513):

| suggested_key | exact English string | source |
|---|---|---|
| signal.authentic.pdf | Uploaded as PDF format. | engine:1510 |
| signal.authentic.reference | Contains reference details. | engine:1511 |
| signal.authentic.date | Contains date format. | engine:1512 |
| signal.authentic.formal | Contains formal letter structure. | engine:1513 |

Severity signals (engine:1732-1760), 29 labels:

| suggested_key | exact English string | source |
|---|---|---|
| signal.severity.court_action | Mentions court action. | engine:1732 |
| signal.severity.eviction | Mentions eviction risk. | engine:1733 |
| signal.severity.winding_up | Mentions winding up action. | engine:1734 |
| signal.severity.bailiff | Mentions bailiff action. | engine:1735 |
| signal.severity.prosecution | Mentions criminal prosecution. | engine:1736 |
| signal.severity.termination | Mentions termination. | engine:1737 |
| signal.severity.disconnection | Mentions disconnection risk. | engine:1738 |
| signal.severity.foreclosure | Mentions foreclosure risk. | engine:1739 |
| signal.severity.urgent_medical | Mentions urgent medical appointment. | engine:1740 |
| signal.severity.final_notice | Mentions final notice wording. | engine:1741 |
| signal.severity.immediate_payment | Mentions immediate payment required. | engine:1742 |
| signal.severity.overdue | Mentions overdue payment. | engine:1743 |
| signal.severity.missed_deadline | Mentions missed deadline. | engine:1744 |
| signal.severity.employment_warning | Mentions employment warning. | engine:1745 |
| signal.severity.benefit_issue | Mentions benefit issue. | engine:1746 |
| signal.severity.housing_risk | Mentions housing risk. | engine:1747 |
| signal.severity.loan_default | Mentions loan default. | engine:1748 |
| signal.severity.legal_response | Mentions legal response required. | engine:1749 |
| signal.severity.appointment | Mentions appointment. | engine:1750 |
| signal.severity.school_action | Mentions school action needed. | engine:1751 |
| signal.severity.documents_to_send | Mentions documents to send. | engine:1752 |
| signal.severity.form_to_complete | Mentions form to complete. | engine:1753 |
| signal.severity.meeting | Mentions meeting to attend. | engine:1754 |
| signal.severity.information_only | Marked as information only. | engine:1755 |
| signal.severity.confirmation | Looks like confirmation content. | engine:1756 |
| signal.severity.receipt | Looks like receipt content. | engine:1757 |
| signal.severity.newsletter | Looks like newsletter content. | engine:1758 |
| signal.severity.no_action | Says no action needed. | engine:1759 |
| signal.severity.general_update | Looks like general update content. | engine:1760 |

Note: `serious_document_signals` (engine:1780-1870, phrases like "supply disconnection under warrant") stay in `trust_internal` only and never reach the API output (toPublicTrustShape, engine:602-624). They are excluded from this inventory.

### AI safety stripper replacement sentences

Applied to AI output AND to the rules-engine cards on every path (ai:21, ai:410-426), so these can appear in any card text.

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| strip.pay_command | Check the original document for the payment amount and due date. | ai:450 | replaces any pay-instruction sentence |
| strip.detail_request | Check the original document. Do not share personal or banking details. | ai:453 | replaces any credential-sharing instruction |
| strip.phone_call | Use contact details from the original document. | ai:456 | replaces any call-this-number sentence |
| strip.debt_org (fragment) | a trusted advice service | ai:459 | replaces debt-advice organisation names inline |
| strip.phone_number (fragment) | the number in the original document | ai:460 | replaces phone numbers inline |

### Upload flow and API error messages (shown in the UI)

| suggested_key | exact English string | source | where it appears |
|---|---|---|---|
| api.document_ready | Your document is ready. | route:118 | upload success response message |
| api.pdf_too_many_pages | Please upload a PDF with 5 pages or fewer for now. | route:256, server:221 | error response |
| api.pdf_scanned | This PDF appears to be a scanned document rather than a text document. For best results, please upload a clear photo of the document instead. | route:264-266 | error response |
| api.unreadable | We could not read enough text from this document. Please upload a clearer image or PDF. | route:403 | error response (unreadable text, expired OCR session) |
| api.hard_to_read | This document is hard to read. Please upload a clearer image. | textExtraction:41, textExtraction:63, textExtraction:75 | OCR failure error |
| api.bad_file_type | Please upload a PDF, JPG, PNG, WEBP, or text file. | server:212 | error response |
| api.invalid_json | Invalid JSON body. | server:249, server:290, server:331 | error response |
| api.bad_upload_shape | Use multipart upload or JSON text input. | server:252 | error response |
| api.nothing_to_analyse | Upload a document or provide pasted text. | server:257 | error response |
| api.feedback_json | Use JSON for feedback. | server:282 | error response |
| api.feedback_failed | Feedback could not be saved right now. | server:314 | error response |
| api.analytics_json | Use JSON for analytics. | server:323 | error response |
| api.analytics_failed | Analytics event could not be saved right now. | server:355 | error response |
| api.forbidden | Forbidden. | server:385 | error response |
| api.not_found | Not found. | server:108, server:389 | error response |
| api.rate_limited | Northcue is receiving too many requests from this browser right now. Please wait a moment and try again. | server:185, httpErrors:29 | error response |
| api.file_too_large | This file is too large for Northcue right now. Please upload a smaller file. | httpErrors:18 | error response (any 413) |
| api.bad_request | Please check your request and try again. | httpErrors:40 | 4xx fallback when error has no message |
| api.server_error | Something went wrong. Please try again. | httpErrors:50 | 5xx fallback |
| api.feedback_rating_required | Feedback rating is required. | feedback:80 | 400 feedback error (message passed through) |
| api.analytics_not_object | Analytics event must be a JSON object. | analytics:43 | 400 analytics error |
| api.analytics_not_allowed | Analytics event is not allowed. | analytics:50 | 400 analytics error |
| api.body_too_large | Request body is too large. | requestParsing:22 | shadowed: 413 mapping in httpErrors:12-21 replaces it with api.file_too_large, so this exact string never reaches the user |

## Templates

Slot names and their sources:

- `{sender}` = sender organisation guessed from document text (guessDetailedSender engine:1053, guessSender engine:2251, extractSummaryFirstLineSender engine:1307). Dynamic value.
- `{amount}` = best money amount extracted from document text (extractMoneyAmounts engine:2237, bestMoneyAmount engine:1256). Dynamic token, format like "£320.00".
- `{date}` = deadline or appointment date extracted from document text (extractDeadline engine:2095, extractAppointmentDate engine:2140). Dynamic token, kept in document format.
- `{dates}` = comma-joined list of up to 3 visible dates/timeframes (extractVisibleDates engine:1099, extractVisibleTimeframes engine:1119). Dynamic tokens.
- `{header_date}` = the letter's own header date (extractHeaderDate engine:1130). Dynamic token.
- `{topic}` = topic label, mostly from a fixed vocabulary (see below), occasionally a lowercased document heading (dynamic, engine:1016).
- `{type_label}` = fixed vocabulary from friendlyTypeForCategory (engine:414-427).
- `{category_label}` = fixed vocabulary from inferGarbledSummary (engine:1971-1984).
- `{consequence}` / `{sentence_body}` = transformed clause from a document consequence sentence. Dynamic.
- `{action_sentence}` = a document-extracted obligation sentence. Dynamic.
- `{title}`, `{explanation}`, `{short_answer}`, `{key_points}` = other already-built result strings (composites).
- `{field_list}` = comma-joined unknown analytics field names from the client payload. Dynamic.

| suggested_key | template with {slots} | slot sources | source |
|---|---|---|---|
| tpl.deadline.appointment | Your appointment is on {date}. | extraction.deadline | engine:387 |
| tpl.deadline.due | Due by {date}. | extraction.deadline | engine:388, engine:677 |
| tpl.summary.bill_full | {sender} appears to be asking you to pay {amount} by {date}. | sender guess, best money amount, deadline | engine:1917 |
| tpl.summary.bill_amount_date | This appears to be a payment request for {amount}, due by {date}. | best money amount, deadline | engine:1918 |
| tpl.summary.bill_sender_amount | {sender} appears to be asking you to pay {amount}. | sender guess, best money amount | engine:1919 |
| tpl.summary.bill_sender_date | This appears to be a bill from {sender}, dated {date}. | sender guess, deadline | engine:1920 |
| tpl.summary.bill_amount | This appears to be a payment request for {amount}. | best money amount | engine:1921 |
| tpl.summary.bill_sender | This appears to be a bill from {sender}. | sender guess | engine:1922 |
| tpl.summary.bill_in_credit_sender | This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure. | sender guess | engine:1914 |
| tpl.summary.gov_sender_amount | {sender} appears to have sent an official notice mentioning {amount}. | sender guess, best money amount | engine:1929 |
| tpl.summary.gov_sender | This appears to be an official notice from {sender}. | sender guess | engine:1930 |
| tpl.summary.gov_amount | This appears to be an official notice mentioning {amount}. | best money amount | engine:1931 |
| tpl.summary.appt_sender_date | This appears to be an appointment from {sender} on {date}. | sender guess, appointment date | engine:1936 |
| tpl.summary.appt_sender | This appears to be an appointment from {sender}. | sender guess | engine:1937 |
| tpl.summary.appt_date | This appears to be an appointment on {date}. | appointment date | engine:1938 |
| tpl.summary.generic_full | This appears to be from {sender}, mentioning {amount} and a date of {date}. | sender guess, best money amount, deadline | engine:1943 |
| tpl.summary.generic_amount_date | This document appears to mention {amount} and a date of {date}. | best money amount, deadline | engine:1944 |
| tpl.summary.generic_sender_amount | This appears to be from {sender}, mentioning {amount}. | sender guess, best money amount | engine:1945 |
| tpl.summary.generic_sender_date | This appears to be from {sender}, with a date of {date}. | sender guess, deadline | engine:1946 |
| tpl.summary.generic_sender | This appears to be from {sender}. | sender guess | engine:1947 |
| tpl.summary.garbled_sender | {sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details. | sender guess, garbled category vocabulary | engine:1985-1988 |
| tpl.summary.garbled | This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details. | garbled category vocabulary | engine:1987-1988 |
| tpl.readable.summary_sender | This appears to be {type_label} from {sender}. | friendly type vocabulary, sender guess | engine:455 |
| tpl.readable.summary | This appears to be {type_label}. | friendly type vocabulary | engine:457 |
| tpl.readable.summary_topic | This appears to be {type_label} about {topic}. | friendly type vocabulary, topic | engine:458 |
| tpl.benefits.summary_sender | This appears to be a benefits letter from {sender}. | sender guess | engine:530 |
| tpl.readable.sender_card | This appears to be from {sender}. Check the original document to confirm. | sender guess | engine:568 |
| tpl.readable.mip_deadline | This may include a deadline about {topic}. Check the original before acting. | topic | engine:923 |
| tpl.readable.mip_response | This may ask for a response about {topic}. Check the original document. | topic | engine:926 |
| tpl.readable.mip_topic | The clearest topic appears to be {topic}. Check the original for details. | topic | engine:934 |
| tpl.date.letter_dated | No clear due date was found. The letter is dated {header_date}. | header date | engine:941, engine:1150 |
| tpl.date.important_dates | These may be important dates: {dates}. Check what they refer to. | visible dates list | engine:946 |
| tpl.date.dates_appear | These dates appear in the document: {dates}. Check what they refer to. | visible dates list | engine:948 |
| tpl.date.no_due_dates_appear | No clear due date. These dates appear in the document: {dates}. Check what they refer to. | visible dates list | engine:1147 |
| tpl.check.sender | Check the sender: {sender}. | sender guess | engine:963 |
| tpl.check.topic | Check the topic: {topic}. | topic | engine:964 |
| tpl.check.dates | Check these visible dates: {dates}. | visible dates list | engine:965 |
| tpl.check.date_on_original | Check this date on the original document: {date}. | extraction.deadline | engine:717 |
| tpl.check.amount_and_date | Check the amount ({amount}) and the date ({date}) on the original document. | first money amount, deadline | engine:774 |
| tpl.check.amount_any_dates | Check the amount ({amount}) and any dates on the original document. | first money amount | engine:775 |
| tpl.check.date_any_amounts | Check the date ({date}) and any amounts on the original document. | deadline | engine:776 |
| tpl.check.kp_date | Date: {date}. | extraction.deadline | engine:783 |
| tpl.check.kp_amount | Amount shown: {amount}. | first money amount | engine:784 |
| tpl.consequence.avoid | The document says {consequence} if a payment is not made. Check the original document. | describeConsequence transform of document clause (dynamic) | engine:1377 |
| tpl.consequence.reported | The document states that {sentence_body}. | document consequence sentence, first letter lowercased (dynamic) | engine:1389 |
| tpl.consequence.may_follow (fragment) | {consequence_clause} may follow | document "to avoid X" / "or X" clause (dynamic) | engine:1365 |
| tpl.action.check_wrap | Check {action_sentence} | first extracted action sentence (dynamic) | engine:2262 |
| tpl.composite.read_aloud | {title}. {explanation}. {key_points} | built card fields | engine:1247-1250 |
| tpl.composite.display_text | {title} {short_answer} | built card fields, newline-joined per card | engine:62, ai:129, ai:419 |
| tpl.composite.tts | {title}. {short_answer} | built card fields, newline-joined per card | engine:63, ai:130, ai:420 |
| tpl.api.unknown_analytics_fields | Unknown analytics fields: {field_list} | unknown field names from client payload (dynamic) | analytics:103 |

### Slot vocabularies (fixed fragments interpolated into templates)

`{type_label}` (friendlyTypeForCategory, engine:414-427), 10 values: "an official letter", "a benefits letter", "a bank or finance letter", "a legal or court letter", "a housing letter", "a health letter", "a work letter", "a school or education letter", "an insurance letter", "a formal letter" (fallback).

`{category_label}` (inferGarbledSummary, engine:1971-1984), 12 values: "a bill or payment request", "an official notice", "an appointment notice", "a work or employment document", "a school or education document", "a housing or rent document", "a banking or loan document", "a medical document", "a legal or court document", "a benefits document", "an insurance document", "a formal document" (fallback).

`{topic}` (inferReadableTopic, engine:990-1035; GENERIC_TOPIC engine:971), 16 fixed values: "housing or rent", "a local plan or consultation", "healthcare services", "an appointment", "school or education", "work or employment", "banking or a loan", "insurance", "benefits support", "a legal or court matter", "a council or local authority matter", "tax or HMRC", "medical information", "a government or council matter", "an email message", "the topic shown in the document" (generic fallback). Additionally the topic can be a lowercased document heading (dynamic, engine:1015-1016).

## Dynamic, cannot template

1. Obligation action sentences extracted verbatim from the document (extractActions obligation loop, engine:2203-2228, via extractSentenceAround engine:1265-1305). Appear as steps on the what_do_i_need_to_do card and, via normalizeActionLine (engine:2256-2263), as its short_answer, sometimes wrapped as "Check {action_sentence}". Arbitrary document sentences.
2. Consequence / risk sentences extracted from the document (extractRiskSentence engine:1337-1347). When the document already hedges ("may result", "could lead") the sentence passes through unchanged (normalizeRiskSentence engine:1386); otherwise it is wrapped in the "The document states that {sentence_body}." template. Appears on the what_could_happen card, the readable most-important point (engine:920-921) and inferRisk (engine:2025-2026).
3. describeConsequence transformation (engine:1362-1366): rewrites a document clause in place, e.g. "being passed to X" becomes "may be passed to X". Document-derived wording.
4. `{sender}` slot values: lines lifted from the document letterhead (engine:1053-1091, engine:1307-1320, engine:2251-2254). Names of real organisations, left untranslated in practice.
5. `{topic}` fallback from firstMeaningfulHeading (engine:1015-1016, engine:1037-1051): a lowercased document heading.
6. Extracted tokens used as slot values: dates (engine:1099-1125, engine:2095-2156), money amounts (engine:2237-2239), reference numbers (engine:2241-2243). Kept exactly as the document prints them.
7. All AI-rewritten text when the AI phrasing step runs (see next section): free gpt-4.1-mini output constrained by prompt and validators, then safety-stripped. Not reducible to templates.
8. 4xx error message passthrough (httpErrors:34-43 uses `error.message` for any 400-499 error). In practice these are the enumerated fixed strings above, but any future thrown 4xx message would surface verbatim, so treat this path as dynamic.

## AI phrasing: fields it may rewrite, and existing skip gates

### Fields the AI step may rewrite (when it runs)

The AI step (applyAiStructuredResult, ai:14-168) replaces exactly three things in the output (ai:128-133):

- `structured_result` (the whole object, after sanitizing and validation). Within it the model may rewrite: `document_type`, `document_type_label`, `document_type_confidence`, `overall_confidence`, `risk_level`, `processing_mode`, `needs_user_check`, `summary.one_line_summary`, `summary.main_action`, `summary.main_date`, `summary.main_amount`, `warnings`, and per card: `card_type`, `title`, `simple_explanation`, `key_points`, `action_needed`, `possible_deadline`, `possible_payment`, `confidence_level`, `warning`, `read_aloud_text`, `status` (sanitizeStructuredResult, validateSR:83-114, sanitizeCards validateSR:203-230). `session_id`, `anonymous_session_id`, `schema_version`, card order, `card_id`, `card_number` and the `privacy` flags are pinned to the fallback.
- `display_text` (rebuilt from AI cards, ai:129).
- `tts_script` (rebuilt from AI cards, ai:130).

Engine-deterministic in every case (never touched by the AI): `job_id`, `trust` (all classification, severity, trust, scam fields), the legacy `cards` array, `banner`, and `debug` (except the added `debug.ai` metadata). So the trust panel, banner and legacy card array are always translatable from this inventory; only `structured_result`, `display_text` and `tts_script` become AI-variable.

### Skip gates (AI never runs; rules cards returned unchanged)

1. Low-quality input: `input_quality` is "borderline" or "poor", or `garbled_by_ocr` is true. ai:34-44, error code `low_quality_input`.
2. Suspected scam: `processing_mode` is "verification_only" or any scam signal present. ai:52-65, error code `verification_only_state`.
3. Unsupported or probable non-document: `processing_mode` is "unsupported" or `is_probable_non_document`. ai:71-81, error code `unsupported_or_non_document`.
4. No API key: `OPENAI_API_KEY` missing. ai:83-93, error code `missing_api_key`.

Fallback gates (AI ran but its output is discarded, rules result returned):

5. AI output fails validation (invalid shape or unsafe advice patterns, validateSR:33-48 and validateSR:50-81). ai:106-125, error code `invalid_structured_result`. sanitizeStructuredResult itself also falls back wholesale (validateSR:108-111).
6. Any request error, timeout (default 25s), empty response, or JSON parse failure. ai:149-167, codes `ai_timeout`, `empty_ai_response`, `ai_json_not_found`, `ai_json_parse_failed`, `openai_http_*`, `invalid_api_key`, `ai_failed`.

Also note: the AI safety stripper runs on every path, including pure rules output (sanitiseRulesStructuredResult, ai:21 and ai:410-426), so the three stripper replacement sentences can appear even when the AI is skipped.

## Where the result is assembled

- Engine output object (job_id, trust, cards, structured_result, banner, display_text, tts_script, debug): src/services/clearStepsEngine.js:56-88 (`runClearStepsEngine`), with `structured_result` built by `buildStructuredResult` at src/services/clearStepsEngine.js:626-672 and structured cards at src/services/clearStepsEngine.js:674-767.
- Orchestration point, rules engine then optional AI pass: src/routes/simplifyRoute.js:345-357 (`analyseDocumentText`). This is the natural place to gate the AI step on a language parameter: `applyAiStructuredResult` is called here after `runClearStepsEngine` has fully finished classification, severity, trust and scam logic, so skipping or swapping the AI call there cannot affect any of that logic.
- AI replacement of structured_result / display_text / tts_script: src/services/aiStructuredResultService.js:128-133.
- Final HTTP response: server.js:260-275 (`handleSimplify` sends `simplifyRoute`'s return value via `sendJson` at server.js:275).
