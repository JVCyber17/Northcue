# Northcue multilingual MVP, build plan

Branch: `feature/multilingual-mvp`. Nothing on this branch touches the live site until it is reviewed and merged. This plan is Phase 0 of the build described in the brief. REPORT.md, written at the end, explains the finished work in plain language.

## 1. The architecture in one paragraph

Northcue's safety judgement stays exactly where it is: in the deterministic rules engine, in English. Translation is a presentation layer built on lookup, never generation. Tier 1 is a dictionary of every fixed interface string, shipped as one reviewable file per language. Tier 2 is a sentence bank: the finite set of sentence patterns the engine can emit, each mapped to one reviewed translation per language, filled at runtime by exact match or slot extraction, with slot values (names, dates, amounts) inserted verbatim and never localised. Anything that cannot be matched renders in English with a small pre-translated notice. When the interface language is not English, the AI phrasing pass is skipped entirely on the server, so every non-English card is rules-built and bank-translated. No live AI translation exists in this MVP.

## 2. Where strings live today (inspection results)

Full verbatim inventories are committed under `docs/i18n/`:

- `html-string-inventory.md`: 281 user-facing strings in `public/index.html` (249 text nodes, 31 aria-labels, 1 alt), by page section, with mixed-markup and JS-owned elements flagged.
- `appjs-string-inventory.md`: 296 dictionary rows in `public/app.js` (281 plain, 15 slotted), plus 16 engine-passthrough render sites (places that display API result text). Includes the full helpGuides and feedbackChoices copy.
- `engine-sentence-inventory.md`: the backend's complete user-visible output inventory. 264 fixed strings, 51 slot templates, 8 genuinely dynamic categories. Also documents which fields the AI pass may rewrite (`structured_result`, `display_text`, `tts_script` only) and the four existing hard skip gates in `aiStructuredResultService.js`.

## 3. i18n file structure

New directory `public/i18n/`:

- `config.js` defines `window.NORTHCUE_I18N_CONFIG`: the language list with code, native name, and an `enabled` flag per language. The enabled flags are the go-live control: a language stays off in production until its files are human-checked.
- `en.js` defines `window.NORTHCUE_STRINGS` for English: the canonical key list. English is also the fallback for every missing key in any language.
- `pl.js`, `ro.js`, `gu.js`, `hi.js`, `bn.js`, `pt.js`: one dictionary per language, same keys, marked DRAFT PENDING HUMAN REVIEW at the top.
- `templates-en.js`: the Tier 2 sentence bank source: exact sentences and slot patterns.
- `templates-pl.js` etc: the translated banks per language, same template ids.
- `i18n.js` (in `public/`): the runtime. Provides `t(key)`, applies `data-i18n` attributes across the DOM, swaps aria-label and other attribute variants, sets `html lang` and `body data-lang`, loads the active language file on demand by script injection, persists the choice in `localStorage`, and owns the detection banner and switcher wiring.

Language codes: `en`, `pl`, `ro`, `gu`, `hi`, `bn`, `pt`. Adding a language later is one new file pair plus one config entry.

English mode is inert: no DOM rewriting happens when the language is `en`, so English behaviour is byte-identical to today by construction.

## 4. Tier 1 mechanics

- Visible text: elements gain `data-i18n="key"`. Mixed-markup elements (text plus `<strong>` or `<br>`) are tagged at leaf level, with small neutral `<span>` wrappers added where a bare trailing text node needs a tag. Markup-only adjustments, no visual change.
- Attributes: `data-i18n-aria-label`, `data-i18n-placeholder`, `data-i18n-alt`, `data-i18n-content` (for meta description); `document.title` handled by key.
- JS strings: literals become `t("key")` calls resolving through the active dictionary with automatic English fallback.
- Coverage is enforced by two new node tests: every `data-i18n*` key in index.html exists in `en.js`, and every `t("...")` key in app.js and i18n.js exists in `en.js`.

Two code hazards found in inspection are fixed as part of extraction, because translation breaks them otherwise:

- `setStatus()` currently compares English sentence literals to detect state (app.js:3058, 3080). These comparisons become key-based (a status id travels with the message).
- The feedback flow parses English rating text and uses chip labels as payload values and icon keys (app.js:2724 area). Display strings become translatable; the internal values and payload stay the fixed English identifiers so the backend and analytics are unchanged.

One pre-existing copy violation is fixed: a literal em dash in the feedback email label (app.js:2670) becomes a comma, per the standing no-dashes rule.

## 5. Tier 2, the sentence bank

Design:

- `templates-en.js` holds two lists: `exact` (fixed sentence, id to string) and `patterns` (id, template with `{slot}` names, compiled matching regex). Slot captures are inserted verbatim into the translated template. Numbers, dates, amounts, names are never converted or localised.
- The matcher runs in the frontend at render time, at the 16 passthrough sites, via one function `translateEngineSentence(text)`: try exact match, then patterns, else return English text flagged untranslated. Untranslated card text renders with a small pre-translated notice, "This part is shown in English", a Tier 1 key.
- The engine's 8 dynamic categories (document-extracted obligation sentences, hedged consequence transforms, sender names, extracted tokens, AI-rewritten text, error passthrough) are exactly the fallback cases. They are listed in REPORT.md as the dynamic-sentence exceptions.
- The frontend mock cards that render before upload (16 strings in `createMockApiResult`) are added to the bank as exact entries so the pre-upload screen translates through the same mechanism.
- Card titles translate by title string, not card id, because inspection showed the reading-aid path reuses ids under different titles.

Server-side AI gate (the one backend change):

- The analyse request gains an optional `language` field, validated against the config allowlist, defaulting to `en`.
- `applyAiStructuredResult` gains one more hard gate, mirroring the existing four: if language is not `en`, skip the AI pass with `ai_status: "skipped"`, `ai_error_code: "non_english_language"`. It sits after the safety stripper (which runs on every path) and before any provider call.
- This touches `src/routes/simplifyRoute.js` (thread the field) and `src/services/aiStructuredResultService.js` (the gate). It does not touch `clearStepsEngine.js` or any classification, severity, trust, or scam logic. A new test asserts the gate (no egress when language is not en) alongside the existing skip-gate tests.

## 6. Fonts

Lexend and Atkinson Hyperlegible do not cover Gujarati, Devanagari, or Bengali. Following the existing self-hosted pattern in `public/assets/fonts/`:

- Three files vendored: `noto-sans-gujarati.woff2`, `noto-sans-devanagari.woff2`, `noto-sans-bengali.woff2`. They are variable-weight files covering 400 to 700 (verified by hash: the 400 and 700 downloads are identical), so one file per script (~110 KB each).
- Three `@font-face` blocks with `font-weight: 400 700` and the script's `unicode-range`, appended after the existing font faces. Because of unicode-range, a browser only downloads a file when glyphs from that script actually render: English visitors fetch nothing new, and the switcher's own native-script labels trigger the tiny fetch only when the switcher opens.
- The font stacks gain the Noto names after the existing families, so Latin text keeps Lexend and Atkinson everywhere and the Noto faces only serve their scripts. Licence: Noto Sans is SIL OFL, matching the existing OFL fonts; noted alongside the existing OFL.txt.
- No external CDN. The files are served by the existing static server (`.woff2` already in the MIME map, and `/assets/` inherits the current caching behaviour).

## 7. Language UX integration points

- Switcher: a quiet text control in the topbar comfort cluster (desktop) and a compact equivalent in the mobile topbar, opening the existing modal with one calm option button per enabled language, each in its own name and script: English, Polski, Romana, Gujarati, Hindi, Bengali, Portugues (native scripts in the actual UI). No flags. Existing modal system means keyboard, focus trap, and swipe-dismiss come free.
- Landing: the landing page hides the topbar and is hero territory. The natural home is a small quiet language button in the landing brand row, top right. Before and after screenshots will be recorded in REPORT.md.
- Detection banner: on first visit, if `navigator.languages` matches a supported enabled non-English language and no stored choice exists, a calm dismissible banner appears in that language offering one-tap switch. Dismissal is remembered in `localStorage`. No blocking gate.
- Persistence: `localStorage` key, applied on load before first paint of translated pages, immediately on switch for Tier 1, and to the next document's cards for Tier 2 (the language travels with the next analyse request).
- `html lang` is set to the active language; `body data-lang` drives font stacks and any script-specific CSS.

## 8. Machine drafts for human review

- I generate the initial translations for all six languages, both tiers, directly (no external service). Every file header: DRAFT PENDING HUMAN REVIEW.
- Review packs: `translations-review/<lang>/` per language, containing the strings file, the template file, and a SAMPLES.md where each template is shown with two or three realistic slot-filled sentences so checkers read real output.
- Per-language `enabled` flags in `config.js` are the go-live control. All six are ON in this branch for testing; REPORT.md states plainly that they must be reviewed before staying on in production.
- No em or en dashes in any string in any language, enforced by a script scan across all i18n files before each commit.

## 9. Risks and safe interpretations

- Brief discrepancy: the languages section specifies six languages; the switcher line also mentions Spanish and French. Building the six. Adding Spanish and French later is one file set plus a config entry each. Flagged in REPORT.md for decision.
- Longer strings: Polish and Romanian typically run 20 to 30 percent longer than English; layout is checked at phone width per language in Phase 5. The switcher, banner, and any tight buttons use existing wrap-friendly patterns.
- The `setStatus` and feedback-rating refactors are behaviour-preserving but touch working upload-flow UI code; they are covered by the existing suite plus manual English pass in Phase 1 before any translation exists.
- Template drift: if the engine's wording changes in a future backend session, bank entries stop matching and those sentences fall back to English with the notice. This is safe by design (never wrong, only untranslated). The coverage tests and inventory files make re-syncing straightforward.
- RTL is out of scope. Future RTL languages (Urdu, Arabic) will need `dir="rtl"` on html, logical CSS properties audit (the stylesheet uses physical left/right in places), mirrored layout review, and an RTL-capable font. Documented here so it is costed later.

## 10. Future upgrade path, live translation of AI-phrased cards (documented, not built)

When AI phrasing is allowed beyond English later: the phrasing model would be asked to produce the target language directly from the English rules-built cards, then validated by the existing safety strippers extended with per-language forbidden-pattern lists (pay/credential phrasings per language), length and structure checks against the rules card shape, and a hard fallback to the deterministic bank translation on any validation failure or timeout. The bank remains the floor; AI phrasing only ever raises fluency, never replaces the safety floor. The `language` request field and the skip gate built in this MVP are the exact seam where that upgrade plugs in.

## 11. Phases and commits

- Phase 0: this plan plus the three inventories. Commit.
- Phase 1: i18n runtime, Tier 1 extraction, English inert and identical, coverage tests, suite green. Commit.
- Phase 2: sentence bank, matcher, passthrough wiring, AI language gate plus test, English output identical. Commit.
- Phase 3: switcher, banner, persistence, fonts, html lang. Commit.
- Phase 4: six-language drafts both tiers, review packs, flags on. Commit.
- Phase 5: full verification matrix, REPORT.md, final commit. Branch pushed, main untouched, no deploy.
