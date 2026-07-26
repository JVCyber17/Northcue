# app.js user-facing string inventory (Phase 0)

Scope: every user-facing string literal in `public/app.js` (3,476 lines), captured verbatim, for extraction into an i18n dictionary. Excluded: console messages, analytics event names and payload field values, CSS class names, data attribute values, object keys, URLs, code comments, and strings that never render (`styleIcons` at line 138 and `stylePillMarkup` at line 2292 are defined but never called, so they are excluded).

Notation:
- `{slot}` marks a variable interpolated into the string; the notes column says where the value comes from.
- ENGINE PASSTHROUGH marks places that render engine or API output (card.title, card.short_answer, trust fields, banner text, payload.error, payload.message). These are handled by the separate template bank, not the UI dictionary. They are listed in the final section, not counted as dictionary strings.
- One source string contains a literal em dash character (U+2014). It is written below as the escape `\u2014` so this document itself contains no dash characters. The source file has the real character.
- HTML entities are shown as they appear in source (`&rarr;`, `&larr;`, `&times;`); the rendered form is in the notes.

## Summary counts

- Plain strings (no slots): 281 rows
- Slotted strings (templates with `{slot}`): 15 rows
- Engine passthrough render locations: 16 sites

Total dictionary rows: 296. A few rows are deliberate duplicates across areas (for example "Was this helpful?" appears as a heading and as an aria-label, and "Simple view" appears as a card style label and as the detail toggle label); they are kept as separate rows so every render site is covered, with cross-references in the notes.

Known i18n hazards found while inventorying:
1. `setStatus()` compares the incoming message against exact English literals: `"Choose a document to begin."` at app.js:3058 and `"Document selected." / "Your document is ready."` at app.js:3080. These comparisons must become key or flag based before translation, or the hide and file-strip logic silently breaks.
2. `normaliseFeedbackRating()` (app.js:2724) parses the English rating text with `startsWith("yes")`, `includes("little")`, `includes("partly")`, `startsWith("no")`. Must switch to the stable answer keys (`yes` / `little` / `no`) before translating rating strings.
3. Feedback reason chips are sent to the backend as their English display text (`chip.dataset.reason`, app.js:2749), and `feedbackReasonIcon()` (app.js:2690) uses the English chip text as its lookup key. Translating the chips needs stable reason ids for both payload and icon lookup.
4. The completion screen sentence is split: index.html holds the sentence, JS injects only the number into `#completion-card-count` (app.js:2274). Slot the whole sentence in the dictionary instead.
5. The `"(optional) \u2014 only if you'd like a reply"` string at app.js:2670 contains a literal em dash (shown here as the escape), which breaks the Northcue no-dashes copy rule. Flag for a copy fix during extraction.

## Strings by feature area

### 1. Status and upload flow

| suggested_key | exact string or {slot} template | file:line | notes |
|---|---|---|---|
| status.choose_document | Choose a document to begin. | app.js:786, 813, 1466 | Also string-compared at app.js:3058 (hazard 1) |
| status.document_selected | Document selected. | app.js:786 | Also string-compared at app.js:3080 (hazard 1) |
| status.choose_one_first | Choose one document first. | app.js:835 | Error status, shown when submitting with no file |
| status.reading_typed | Reading your {typeName}… | app.js:841, 973 | {typeName} from typeNameForReading(selectedType); ellipsis is U+2026 |
| status.reading_generic | Reading your document… | app.js:841, 973 | Fallback when no type name |
| hint.reading_typed | This looks like a {typeName}. Pulling out the key points… | app.js:842, 974 | {typeName} as above; shown via setReadingHint |
| hint.reading_generic | Pulling out the key points… | app.js:842, 974 | |
| status.upload_failed | Upload failed. | app.js:871 | Fallback only; payload.error is ENGINE PASSTHROUGH (site 11) |
| status.cards_ready | Your cue cards are ready. | app.js:928, 1031 | |
| status.try_again | Please try again. | app.js:939, 1043 | Fallback when error.message is empty |
| status.analysis_failed | We could not understand this document yet. | app.js:999 | Fallback only; payload.error is ENGINE PASSTHROUGH (site 12) |
| upload.file_types_hint | PDF, JPG, or PNG | app.js:785, 812, 1465 | #file-name reset text |
| upload.more_types | More | app.js:759 | More-types dropdown label reset |
| type_confirm.auto | We’ll detect the type for you. | app.js:955 | Contains curly apostrophe U+2019 in source |
| type_confirm.letter | Looks like a letter. | app.js:956 | |
| type_confirm.bill | Looks like a bill. | app.js:957 | |
| type_confirm.work | Treating as a work document. | app.js:958 | |
| type_confirm.medical | Treating as a medical document. | app.js:959 | |
| type_confirm.school | Treating as a school document. | app.js:960 | |
| type_confirm.legal | Treating as a legal document. | app.js:961 | |
| type_confirm.email | Treating as an email. | app.js:962 | |
| type_confirm.article | Treating as an article. | app.js:963 | |
| type_confirm.other | Treating as another type. | app.js:964 | |
| type_confirm.fallback | Type selected. | app.js:966 | |
| type_name.letter | letter | app.js:3097 | Slot vocabulary for status.reading_typed and hint.reading_typed |
| type_name.bill | bill | app.js:3097 | |
| type_name.work | work document | app.js:3097 | |
| type_name.medical | medical document | app.js:3097 | |
| type_name.school | school document | app.js:3097 | |
| type_name.legal | legal document | app.js:3097 | |
| type_name.email | email | app.js:3097 | |
| type_name.article | article | app.js:3097 | |
| status.ocr_unreadable | This document is hard to read. Please upload a clearer image. | app.js:2856 | Fallback only; payload.error is ENGINE PASSTHROUGH (site 13) |
| status.document_ready | Your document is ready. | app.js:2861 | Fallback only; payload.message is ENGINE PASSTHROUGH (site 14); also string-compared at app.js:3080 (hazard 1) |
| status.error_title | Please check your upload | app.js:3075 | Status title used for every error status |
| status.ready_title | Document ready | app.js:3081 | |
| status.file_meta | {fileName} • {fileSize} | app.js:3082, 3087 | {fileName} = file.name (user data), {fileSize} = formatFileSize(file.size); separator is bullet U+2022 |
| upload.submit_loading | Reading... | app.js:3092 | Submit button while loading |
| upload.submit_idle | Understand this document → | app.js:3092 | Source uses the JS escape \u2192; renders as a right arrow |
| filesize.zero | 0 KB | app.js:3109 | |
| filesize.units | B, KB, MB, GB | app.js:3110 | Unit list; consider per-locale unit names |
| filesize.value | {value} {unit} | app.js:3113 | {value} rounded number, {unit} from filesize.units |
| status.upload_first_check | Upload a document first, then you can check it. | app.js:2059 | Error status from moveToRailStep |
| status.upload_first_deadline | Upload a document first, then Northcue can look for a deadline. | app.js:1623 | Error status from help action "deadline" |
| status.upload_first_summary | Upload a document first, then Northcue can make a summary. | app.js:1656 | Error status from help action "copy" |

Area totals: 41 plain, 4 slotted.

### 2. Journey and cards

| suggested_key | exact string or {slot} template | file:line | notes |
|---|---|---|---|
| cards.encouragement_1 | Good start. Let's go one card at a time. | app.js:292 | cardEncouragement[0] |
| cards.encouragement_2 | One step done. | app.js:293 | |
| cards.encouragement_3 | You are doing well. | app.js:294 | |
| cards.encouragement_4 | Good progress. | app.js:295 | |
| cards.encouragement_5 | You are nearly there. | app.js:296 | |
| cards.encouragement_6 | Last card. You made it. | app.js:297 | |
| cards.encouragement_fallback | Keep going at your own pace. | app.js:2248 | Used when cardIndex exceeds the array |
| cards.progress | Card {current} of {total} | app.js:2243 | {current} = cardIndex + 1, {total} = cards.length |
| cards.next | Next &rarr; | app.js:2251 | innerHTML; renders "Next" plus right arrow |
| cards.finish | Finish | app.js:2251 | Last card only |
| explain.what_is_this | It can be read clearly, so we can pull out the key points. | app.js:2328 | shortCardExplanation |
| explain.what_matters_most | This helps you know what needs attention first. | app.js:2331 | |
| explain.what_do_i_need_to_do | Use these as small steps, one at a time. | app.js:2334 | |
| explain.due_with_date | Use this date before making a reminder. | app.js:2337 | When card.date present |
| explain.due_no_date | No clear date was found in the document. | app.js:2337 | When card.date absent |
| explain.what_could_happen | This helps you decide how carefully to respond. | app.js:2340 | |
| explain.default | Check the original document if anything feels unclear. | app.js:2342 | |
| detail.date_found | Date found: {date}. | app.js:2870 | {date} = card.date, ENGINE PASSTHROUGH value inside a UI template (site 6) |
| detail.no_deadline | No deadline clearly stated. | app.js:2870 | Same string also in mock card at app.js:3403 |
| actions.summary_copied | Summary copied. | app.js:1444 | showActionMessage |
| actions.copy_failed | Copy did not work. You can copy from the card text. | app.js:1446 | |
| card_style.title | Card style | app.js:2371 | Modal title |
| card_style.simple | Simple view | app.js:2358, 3042 | Same words also used by the detail toggle (see simple_view.label) |
| card_style.animal | Animal Cards | app.js:2359, 3043 | |
| card_style.shape | Shape Cards | app.js:2360, 3044 | |
| card_style.map | Map Cards | app.js:2361, 3045 | |
| card_style.coming | Custom card packs coming later. | app.js:2371 | Inside modal body markup |
| card_style.selected | {styleLabel} selected. | app.js:2384 | {styleLabel} from labelForStyle(); fallback label is "Simple view" (app.js:3047) |
| focus.exit_label | Exit focus | app.js:616 | Button span text |
| focus.enter_label | Focus on card | app.js:616 | |
| simple_view.show_full | Show full details | app.js:650 | Button span text; same words as aria at app.js:649 |
| simple_view.label | Simple view | app.js:650 | Button span text when off |
| calendar.title | Add to calendar | app.js:2397 | Modal title (no-date case) |
| calendar.no_date_body | `No clear date was found in this document, so there's nothing to add yet.<br>If you spotted a date yourself, you can add it to your calendar by hand.` | app.js:2398 | HTML body with `<br>`, wrapped in `<p>` |
| calendar.downloaded | Calendar file downloaded. Open it to add the date, and your calendar will remind you. | app.js:2406 | showActionMessage |
| calendar.event_title | Check your {label} | app.js:2445 | {label} from the three label maps below; appears in the user's calendar app |
| calendar.event_title_generic | Check your document | app.js:2445 | |
| calendar.type.council_tax_notice | council tax letter | app.js:2416 | Keyed by engine trust.document_type |
| calendar.type.energy_bill | energy bill | app.js:2417 | |
| calendar.type.bill_or_payment_notice | bill | app.js:2418 | |
| calendar.type.appointment_letter | appointment letter | app.js:2419 | |
| calendar.cat.bill_or_payment | bill | app.js:2422 | Keyed by engine trust.document_category |
| calendar.cat.appointment | appointment letter | app.js:2423 | |
| calendar.cat.government | council or government letter | app.js:2424 | |
| calendar.cat.medical | medical letter | app.js:2425 | |
| calendar.cat.housing | housing letter | app.js:2426 | |
| calendar.cat.employment | work letter | app.js:2427 | |
| calendar.cat.education | school letter | app.js:2428 | |
| calendar.cat.bank_or_loan | bank letter | app.js:2429 | |
| calendar.sel.bill | bill | app.js:2432 | Keyed by user-selected type |
| calendar.sel.letter | letter | app.js:2433 | |
| calendar.sel.medical | medical document | app.js:2434 | |
| calendar.sel.school | school document | app.js:2435 | |
| calendar.sel.work | work document | app.js:2436 | |
| calendar.sel.legal | legal document | app.js:2437 | |
| calendar.ics_description | A date from a document you reviewed in Northcue. Check the original document. | app.js:2486 | ICS DESCRIPTION field, visible in the user's calendar |
| mock.card1.title | What is this? | app.js:3400 | Mock and fallback card content: renders before any upload (renderCard runs at init on mock data) and merges under missing engine fields via normalizeApiResult. Keep aligned with the engine template bank |
| mock.card1.answer | This looks like a formal document. | app.js:3400 | |
| mock.card2.title | What matters most? | app.js:3401 | |
| mock.card2.answer | This may need checking soon. | app.js:3401 | |
| mock.card3.title | What do I need to do? | app.js:3402 | |
| mock.card3.answer | Check the amount and due date. | app.js:3402 | |
| mock.card3.step1 | Check the amount. | app.js:3402 | |
| mock.card3.step2 | Check the due date. | app.js:3402 | |
| mock.card4.title | When is it due? | app.js:3403 | |
| mock.card4.answer | No deadline clearly stated. | app.js:3403 | Duplicate of detail.no_deadline |
| mock.card5.title | What could happen if I ignore it? | app.js:3404 | |
| mock.card5.answer | There may be follow-up action. | app.js:3404 | |
| mock.card6.title | Helpful note | app.js:3405 | |
| mock.card6.answer | Check the original before acting. | app.js:3405 | |
| mock.banner_text | Some details need checking before you act. | app.js:3396 | Rendered when banner.text is used as the check hero base (app.js:2925) |
| mock.safe_next_step | Check the original document before acting. | app.js:3391 | Duplicate of safe_action.default; merges under missing trust.safe_next_step |

Area totals: 68 plain, 4 slotted. (Mock trust.review_reason "Some details may need checking." at app.js:3386 is never rendered anywhere in app.js and is excluded.)

### 3. Document check modal

| suggested_key | exact string or {slot} template | file:line | notes |
|---|---|---|---|
| check.title | Document check | app.js:2228, 2237 | Modal title, both the no-upload and normal case |
| check.upload_first | `Upload a document first.<br>Then Northcue can check trust, severity, and next steps.` | app.js:2228 | HTML body with `<br>`, wrapped in `<p>` |
| check.hero_label | One thing to do next | app.js:2895 | Hero label next to arrow icon |
| check.why_label | Why | app.js:2883 | Label before the why chips |
| check.genuine_q | Is it genuine? | app.js:2900 | |
| check.genuine_meaning | Whether this looks like a real letter from who it says it's from. | app.js:2902 | |
| check.urgent_q | How urgent is it? | app.js:2905 | |
| check.urgent_meaning | How soon it may need looking at, not whether it's genuine. | app.js:2907 | |
| check.meanings_toggle | What do these mean? | app.js:2909 | Progressive disclosure toggle button |
| check.scam_deadline | Ignore any deadline on this until you know it's real. | app.js:2889 | Replaces the urgency row in verification_only mode |
| check.low_trust_step | We can't confirm the sender. Find their official contact details yourself and check. Don't use details printed on this letter. | app.js:2923 | Hero next step when trust_assessment is low |
| check.no_rush_prefix | No rush. {base} | app.js:2926 | {base} = trust.safe_next_step or banner.text (ENGINE PASSTHROUGH, site 15) or a safe_action fallback below |
| urgency.urgent | Looks time-sensitive | app.js:2948 | |
| urgency.high | Time-sensitive | app.js:2949 | |
| urgency.medium | Worth attention | app.js:2950 | |
| urgency.low | No rush | app.js:2951 | Default urgency text |
| genuine.high_review | Looks genuine, worth a quick check | app.js:2968 | High trust with needs_human_review |
| genuine.high | Looks genuine | app.js:2968 | |
| genuine.low | We're not sure, please take care | app.js:2973 | |
| genuine.medium_clean | Nothing unusual spotted | app.js:2976 | Medium trust with zero companion flags |
| genuine.default | Probably genuine, worth a check | app.js:2978 | |
| category.bill_or_payment | Bill or payment | app.js:2983 | friendlyCategoryLabel; keyed by engine trust.document_category |
| category.housing | Housing letter | app.js:2984 | |
| category.appointment | Appointment letter | app.js:2985 | |
| category.employment | Work or employment letter | app.js:2986 | |
| category.education | School or education letter | app.js:2987 | |
| category.bank_or_loan | Bank or finance letter | app.js:2988 | |
| category.government | Government letter | app.js:2989 | |
| category.medical | Health letter | app.js:2990 | |
| category.legal_or_court | Legal or court letter | app.js:2991 | |
| category.benefits | Benefits letter | app.js:2992 | |
| category.insurance | Insurance letter | app.js:2993 | |
| category.email | Email message | app.js:2994 | |
| category.possible_scam | Possible scam message | app.js:2995 | |
| category.template | Blank form or template | app.js:2996 | |
| category.outgoing | Document you are sending | app.js:2997 | |
| category.unsupported | Unclear upload | app.js:2998 | |
| category.fallback | Official letter | app.js:3000 | |
| safe_action.verify | Verify using official contact details before acting. | app.js:3021 | safeActionFromTrust, verification_only |
| safe_action.unclear_upload | Use a clearer upload or ask for help checking details. | app.js:3024 | safeActionFromTrust, unsupported |
| safe_action.default | Check the original document before acting. | app.js:3026 | Duplicate of mock.safe_next_step |

Area totals: 40 plain, 1 slotted. (Why chips text is ENGINE PASSTHROUGH, site 16.)

### 4. Help guides

Full helpGuides object, app.js:145 to 289, captured verbatim. Structure per guide: title, text, steps (each with a non-rendered icon key plus title and detail), action label, and a non-rendered actionType key.

| suggested_key | exact string or {slot} template | file:line | notes |
|---|---|---|---|
| help.overwhelmed.title | I feel overwhelmed | app.js:147 | Also the modal title |
| help.overwhelmed.text | It is okay to feel this way. You can take one small step at a time. | app.js:148 | |
| help.overwhelmed.step1.title | Turn on Focus mode | app.js:152 | icon: focus |
| help.overwhelmed.step1.detail | Hide distractions and see one step at a time. | app.js:153 | |
| help.overwhelmed.step2.title | Read only the Action card | app.js:157 | icon: document |
| help.overwhelmed.step2.detail | You do not need to understand everything. | app.js:158 | |
| help.overwhelmed.step3.title | Take a break | app.js:162 | icon: pause |
| help.overwhelmed.step3.detail | It is okay to pause and come back later. | app.js:163 | |
| help.overwhelmed.action | Turn on Focus mode | app.js:166 | actionType: focus |
| help.fake.title | I think this document is fake | app.js:170 | |
| help.fake.text | Do not pay or share details until you check it safely. | app.js:171 | |
| help.fake.step1.title | Do not use links in the document | app.js:175 | icon: shield |
| help.fake.step1.detail | They may not be safe. | app.js:176 | |
| help.fake.step2.title | Search for the organisation yourself | app.js:180 | icon: search |
| help.fake.step2.detail | Use its official website or app. | app.js:181 | |
| help.fake.step3.title | Ask someone to check it with you | app.js:185 | icon: people |
| help.fake.step3.detail | A second look can help. | app.js:186 | |
| help.fake.action | Open Document check | app.js:189 | actionType: check |
| help.deadline.title | I cannot find the deadline | app.js:193 | |
| help.deadline.text | Deadlines can be hidden in small text. Check slowly. | app.js:194 | |
| help.deadline.step1.title | Open the Deadline card | app.js:198 | icon: calendar |
| help.deadline.step1.detail | Northcue looks for the due date. | app.js:199 | |
| help.deadline.step2.title | Check the original page | app.js:203 | icon: document |
| help.deadline.step2.detail | Look near the top, bottom, and bold text. | app.js:204 | |
| help.deadline.step3.title | Save the date if you find one | app.js:208 | icon: calendar |
| help.deadline.step3.detail | Write it down or add it to your calendar. | app.js:209 | |
| help.deadline.action | Open Deadline card | app.js:212 | actionType: deadline |
| help.time.title | I need more time | app.js:216 | |
| help.time.text | You may be able to ask for more time. Use safe contact details. | app.js:217 | |
| help.time.step1.title | Check who sent it | app.js:221 | icon: document |
| help.time.step1.detail | Find the organisation name first. | app.js:222 | |
| help.time.step2.title | Use official contact details | app.js:226 | icon: shield |
| help.time.step2.detail | Do not rely on unknown links or numbers. | app.js:227 | |
| help.time.step3.title | Ask for an extension | app.js:231 | icon: message |
| help.time.step3.detail | Use clear words: I need more time. | app.js:232 | |
| help.time.action | Go to Understand | app.js:235 | actionType: journey |
| help.wrong.title | I uploaded the wrong file | app.js:239 | |
| help.wrong.text | That is easy to fix. You can replace the file. | app.js:240 | |
| help.wrong.step1.title | Remove the current upload | app.js:244 | icon: close |
| help.wrong.step1.detail | Northcue will forget this file. | app.js:245 | |
| help.wrong.step2.title | Choose the correct document | app.js:249 | icon: folder |
| help.wrong.step2.detail | Pick one clear file if possible. | app.js:250 | |
| help.wrong.step3.title | Upload it again | app.js:254 | icon: upload |
| help.wrong.step3.detail | Start the same simple journey. | app.js:255 | |
| help.wrong.action | Upload another document | app.js:258 | actionType: upload |
| help.person.title | I need someone to help me | app.js:262 | |
| help.person.text | You can ask someone you trust to look with you. | app.js:263 | |
| help.person.step1.title | Copy the summary | app.js:267 | icon: copy |
| help.person.step1.detail | Share only the simple explanation. | app.js:268 | |
| help.person.step2.title | Choose a trusted person | app.js:272 | icon: people |
| help.person.step2.detail | Family, friend, adviser, or support worker. | app.js:273 | |
| help.person.step3.title | Ask them to read one card | app.js:277 | icon: document |
| help.person.step3.detail | Start with the Action card together. | app.js:278 | |
| help.person.step4.title | Contact the organisation safely | app.js:282 | icon: shield; person is the only guide with four steps |
| help.person.step4.detail | Use official contact details, not links or numbers from the document. | app.js:283 | |
| help.person.action | Copy summary | app.js:286 | actionType: copy |
| help.section_title | Try these next steps | app.js:1548 | Above the numbered steps in the modal |
| help.back | &larr; Back | app.js:1553 | Renders as left arrow plus "Back" |
| help.action_button | {action} &rarr; | app.js:1554 | {action} = guide.action; arrow appended in an aria-hidden span |
| help.close_label | &times; | app.js:1527 | Help modal close button; renders as a multiplication sign; aria-label covered in area 9 |

Area totals: 59 plain, 1 slotted.

### 5. Feedback modal

| suggested_key | exact string or {slot} template | file:line | notes |
|---|---|---|---|
| feedback.yes.rating | Yes, this helped | app.js:416 | Also sent as payload data; see hazard 2 |
| feedback.yes.label | Yes | app.js:417 | |
| feedback.yes.detail | This helped | app.js:418 | |
| feedback.yes.heading | What helped most? | app.js:420 | Also used as group aria-label at app.js:2658 |
| feedback.yes.chip1 | Simple words | app.js:421 | Chips also feed payload and icon lookup; see hazard 3 |
| feedback.yes.chip2 | Clear next step | app.js:421 | |
| feedback.yes.chip3 | Easy to read | app.js:421 | |
| feedback.yes.chip4 | Less overwhelming | app.js:421 | |
| feedback.yes.chip5 | Focus mode helped | app.js:421 | |
| feedback.little.rating | A little | app.js:424 | |
| feedback.little.label | A little | app.js:425 | |
| feedback.little.detail | Partly helpful | app.js:426 | |
| feedback.little.heading | What could be clearer? | app.js:428 | |
| feedback.little.chip1 | Too much text | app.js:429 | |
| feedback.little.chip2 | Action was unclear | app.js:429 | |
| feedback.little.chip3 | Deadline was unclear | app.js:429 | |
| feedback.little.chip4 | Words felt difficult | app.js:429 | |
| feedback.little.chip5 | Needed more support | app.js:429 | |
| feedback.no.rating | No, I was confused | app.js:432 | |
| feedback.no.label | No | app.js:433 | |
| feedback.no.detail | I was confused | app.js:434 | |
| feedback.no.heading | What went wrong? | app.js:436 | |
| feedback.no.chip1 | I was still confused | app.js:437 | |
| feedback.no.chip2 | Wrong information | app.js:437 | |
| feedback.no.chip3 | Too much information | app.js:437 | |
| feedback.no.chip4 | I did not know what to do | app.js:437 | |
| feedback.no.chip5 | I did not trust it | app.js:437 | |
| feedback.title | Give feedback | app.js:2591, 2598, 2605 | Modal title, all three render paths |
| feedback.intro | Your feedback helps us make Northcue better. | app.js:2621 | |
| feedback.question | Was this helpful? | app.js:2624 | h3; duplicated as aria-label (area 9) |
| feedback.question_sub | This will only take a few seconds. | app.js:2625 | |
| feedback.private_note | Your feedback is private and helps us improve. | app.js:2630 | |
| feedback.or_contact | Or, would you like us to get in touch? | app.js:2633 | |
| feedback.contact_btn | Please get in touch with me | app.js:2634 | |
| feedback.selected | You selected: {rating} | app.js:2651 | {rating} = choice.rating string above |
| feedback.change | Change | app.js:2652 | |
| feedback.choose_any | Choose any that apply. | app.js:2656 | |
| feedback.anything_else | Anything else? | app.js:2661 | Label with an optional span |
| feedback.optional | optional | app.js:2661, 2545 | Span inside two labels |
| feedback.comment_placeholder | A short note is enough. Please do not include personal details such as your name, address, or account numbers. | app.js:2662 | textarea placeholder |
| feedback.contact_toggle | I'm happy for Northcue to contact me about this | app.js:2666 | Checkbox label |
| feedback.email_label | Email | app.js:2670 | |
| feedback.email_optional | (optional) \u2014 only if you'd like a reply | app.js:2670 | Source contains a literal em dash U+2014, written here as an escape; see hazard 5 |
| feedback.email_placeholder | you@example.com | app.js:2671 | |
| feedback.email_note | We'll only use this to reply to your feedback. | app.js:2672 | |
| feedback.send | Send feedback | app.js:2674 | Button, with send icon |
| feedback.choose_first | Choose one option first. | app.js:2786 | Validation message |
| feedback.bad_email | That email doesn't look right. Please check it, or untick to send without a reply. | app.js:2796 | Validation message |
| feedback.thanks_title | Thanks. | app.js:2830, 2834, 2573, 2577 | Modal title and h3, feedback and contact success |
| feedback.thanks_body | Every bit of feedback helps us make Northcue calmer, clearer and more helpful. | app.js:2835 | |
| feedback.done | Done | app.js:2836, 2579 | Success button, both flows |
| feedback.saved | Thank you. Your feedback was saved. | app.js:2845 | Inline (non-modal) panel path |
| feedback.saved_local | Thank you. Your feedback was saved on this device. | app.js:2846 | Local fallback path |
| contact.title | Get in touch | app.js:2532 | Modal title |
| contact.intro | Leave your details and we'll reach out when we can. | app.js:2540 | |
| contact.private_note | We'll only use this to contact you. Please don't include any document content here. | app.js:2541 | |
| contact.reach_label | Email or phone number | app.js:2543 | |
| contact.reach_placeholder | How should we reach you? | app.js:2544 | |
| contact.help_label | What would you like help with? | app.js:2545 | Label with optional span |
| contact.note_placeholder | A few words is enough. Please don't paste document content here. | app.js:2546 | textarea placeholder |
| contact.send | Send | app.js:2547 | Button, with send icon |
| contact.need_contact | Please add an email or phone number so we can reach you. | app.js:2560 | Validation message |
| contact.thanks_body | We've noted your request. Someone from Northcue will be in touch. | app.js:2578 | |
| misc.char_count | {count} / {max} | app.js:1676 | Character counter under any textarea with a .char-count sibling; {count} = value length, {max} = maxLength |

Area totals: 62 plain, 2 slotted.

### 6. Install prompt

No user-facing strings live in app.js for the install prompt. All install copy (card heading and body, the install and Not now buttons, the iOS instructions, and the permanent footline) lives in index.html under `[data-install-block]`. `wireInstallPrompt()` (app.js:2091 to 2223) only toggles `hidden` flags on those elements. Inventory those strings in the index.html phase.

Area totals: 0 plain, 0 slotted.

### 7. Completion screen

| suggested_key | exact string or {slot} template | file:line | notes |
|---|---|---|---|
| completion.card_count | {count} | app.js:2273, 2274 | Only the bare number is injected into #completion-card-count; the surrounding sentence lives in index.html. See hazard 4: slot the whole sentence in the dictionary |

All other completion copy (headline, body, the Add to calendar, Upload another, Back home, and feedback buttons) lives in index.html; the JS handlers at app.js:1509 to 1518 set no text.

Area totals: 0 plain, 1 slotted.

### 8. Navigation and misc

| suggested_key | exact string or {slot} template | file:line | notes |
|---|---|---|---|
| prefs.saved_title | Saved | app.js:3438 | Modal title; only reachable if savePreferences() is called without arguments. Every current call site passes false, so this path is dormant but live code |
| prefs.saved_body | Your preferences are saved on this device. | app.js:3438 | Wrapped in `<p>` |
| modal.back | Back | app.js:3124, 3138 | Default close button label for every modal except the help variant |
| misc.ics_filename | northcue-date.ics | app.js:2405 | Download filename the user sees in their downloads; decide whether it localises |

Area totals: 4 plain, 0 slotted.

### 9. Aria labels set from JS

| suggested_key | exact string or {slot} template | file:line | notes |
|---|---|---|---|
| aria.focus_off | Turn off Focus mode | app.js:610 | Focus toggle buttons when active |
| aria.focus_on | Focus mode | app.js:610 | Focus toggle buttons when inactive |
| aria.show_full_details | Show full details | app.js:649 | Detail toggle when simple view is on; same words as the visible label |
| aria.show_simpler_view | Show a simpler view | app.js:649 | Detail toggle when simple view is off |
| aria.close_help | Close help popup | app.js:1528 | Help modal close button |
| aria.progress_dot | {n} of {total} | app.js:2349 | Per progress dot; {n} = index + 1, {total} = cards.length |
| aria.was_helpful | Was this helpful? | app.js:2627 | Group aria-label; duplicate of feedback.question |
| aria.chip_group | {heading} | app.js:2658 | Group aria-label; {heading} = choice.heading, reuses feedback heading strings |
| aria.go_back | Go back | app.js:3125, 3139 | Default close button aria-label, set on open and on close |

Also excluded here deliberately: `northcueIcon()` renders every icon with `alt=""` and `aria-hidden="true"` (app.js:67), which is decorative markup, not translatable text.

Area totals: 7 plain, 2 slotted.

## Engine passthrough render sites

Text originating from the engine or API, rendered by app.js but owned by the separate template bank. Sixteen sites:

1. app.js:2245, card.title rendered into #card-title (renderCard).
2. app.js:2246, card.short_answer rendered into #card-answer (renderCard).
3. app.js:2259, card.steps rendered as list items into #card-steps (renderCard, escaped).
4. app.js:1079, card.title used as the details modal title, body from buildCardDetail(card).
5. app.js:2866, card.steps joined with spaces as the details body for the action card.
6. app.js:2870, card.date interpolated into the UI template "Date found: {date}." (template itself is dictionary row detail.date_found).
7. app.js:2873, card.short_answer as the default details body.
8. app.js:1441, clipboard summary built as "{card.title} {card.short_answer}" per card, joined with newlines (copy summary action).
9. app.js:2274, cards.length rendered as the completion count (numeric, also used in counts at app.js:2243 and 2349).
10. app.js:2898, trust.document_category mapped through friendlyCategoryLabel and rendered as the check caption (labels are dictionary rows; the input value is engine output).
11. app.js:871 with app.js:939, payload.error or error.message shown via setStatus on upload failure.
12. app.js:999 with app.js:1043, payload.error or error.message shown via setStatus on analysis failure.
13. app.js:2856, payload.error shown via setStatus when OCR marks the document unreadable.
14. app.js:2861, payload.message shown via setStatus when the OCR-ready result arrives.
15. app.js:2919 to 2926, trust.safe_next_step and banner.text used as the Document check hero next step (verification_only branch and the base of the "No rush. {base}" template).
16. app.js:3006 to 3014, trust.severity_signals and trust.scam_signals rendered as the "Why" chips in the Document check modal (escaped, trailing full stops trimmed).
