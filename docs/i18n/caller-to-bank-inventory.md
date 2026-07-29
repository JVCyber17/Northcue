# Caller-to-bank inventory

Every place where text crosses from the engine or application code into a
translation lookup, what happens to it on the way, and which test guards the
gap. The trust panel bug lived exactly here: a caller stripped a full stop
before lookup, the bank indexes sentences stop included, and 55 safety labels
fell back to English in every language while every file-level check stayed
green. This inventory exists so that class of bug needs a conscious decision
to reintroduce.

Audited 29 July 2026 from the code. `tests/bankLookupContract.test.js` pins
the call-site census: adding or removing a bank call site fails the suite
until this file is updated.

## The contract

`translateEngineSentence(text, code)` indexes exact sentences on the EXACT
English string the engine emits, stop included, via a Map built once. The
only tolerated caller-side transform is `String(value).trim()` (bank values
carry no surrounding whitespace, so trim cannot change a hit into a miss).
Everything else (strip punctuation, case change, concatenation, slicing)
must happen AFTER the lookup, on the translated result.

## Tier 2: every bank call site in public/app.js

All fourteen sites route through the single wrapper `translatedEngineText()`
(app.js, which passes the value untouched to the bank with the active
language). Line numbers are as of this audit; the census test counts sites,
so drift shows up even when line numbers move.

| # | Where | Value passed | Transform before lookup | Index match |
|---|-------|--------------|-------------------------|-------------|
| 1 | upload submit error handler (~985) | `error.message` | none | Bank `tpl.error.*` values match byte for byte. Browser-level failures ("Failed to fetch") are not bank sentences and fall back to English on the status line, by design. |
| 2 | analyse error handler (~1091) | `error.message` | none | same as 1 |
| 3 | details modal title (~1127) | `card.title` | none | exact bank titles |
| 4 | copy summary (~1490, two calls) | `card.title`, `card.short_answer` | none; the join happens on translated results | exact |
| 5 | renderCard title (~2422) | `card.title` | none | exact |
| 6 | renderCard answer (~2423) | `card.short_answer` | none | exact or pattern |
| 7 | renderCard steps (~2441) | each `step` | none; translated once, results reused for the money note | exact, pattern, or by-design fallback (verbatim document quote) |
| 8 | OCR ready error (~3161) | `payload.error` | none | exact `tpl.error.*` |
| 9 | OCR ready message (~3173) | `payload.message` | none. A separate equality check against the exact English literal "Your document is ready." selects a key-based status first; any reworded message passes through untouched and falls back safely | exact |
| 10 | buildCardDetail steps (~3179) | each `step` | none; join after | exact or pattern |
| 11 | buildCardDetail answer (~3186) | `card.short_answer` | none | exact or pattern |
| 12 | check next step, verification mode (~3234) | `trust.safe_next_step` | none | exact |
| 13 | check next step, base (~3241) | `trust.safe_next_step` or `banner.text` | none; the no-rush prefix interpolates AFTER lookup | exact |
| 14 | checkWhyChips (~3350) | each `signal` | `String(value).trim()` only (allowed). The dedup key is stripped and lowercased in a separate variable that never reaches the lookup; the stop strip happens on the translated result | exact. This is the fixed trust panel site |

Callers outside app.js: `scripts/render-language.js` and
`scripts/render-exact.js` pass raw values (they exist to mirror the browser),
and the test files pass bank values verbatim. `public/i18n.js` and
`public/sw.js` never call the bank.

## How the contract test covers these sites

- Legs 1 and 2 (every exact sentence, and specifically every signal label,
  resolves in every language) protect ALL sites at the data level: if the
  index and the translations agree, an untransformed value cannot miss.
- Leg 4 (no caller normalises before lookup) parses every top-level function
  in app.js and flags any `translatedEngineText(...)` argument that is, or
  was assigned from, a lossy transform. Proven empirically at audit time by
  replicating the leg's chunking: all 16 occurrences (15 call sites plus the
  definition) sit inside named function chunks and 0 fall before the first
  top-level function, so nothing escapes its scan.
- Leg 5 proves the detector still catches the exact shape that shipped.
- The census leg (added with this inventory) counts `translatedEngineText(`
  occurrences, so a fifteenth site cannot appear without failing the suite
  and pointing here.

Recorded blind spots, so nobody believes the test does more than it does:
- A transform applied in a DIFFERENT function than the lookup (for example,
  mutating card text inside normalizeApiResult before renderCard translates
  it) would pass leg 4. Legs 1 and 2 would still catch it only if the
  mutation applied to a bank sentence in the test corpus. The census plus
  this inventory is the control: review any new transform against the
  contract at the top of this file.
- Server-origin strings that are legitimately not bank sentences (network
  errors) fall back visibly; that is designed behaviour, not a gap.

## Tier 1: the dictionary side of the same gap

Dictionary lookups are key-based, so the transform risk becomes a key
construction risk: a key assembled or stored somewhere the coverage test
does not look. Findings:

- `t()` applies no transform to the key; `applyTranslations()` passes
  attribute values untouched. Compliant.
- Interpolation (`{name}` fill) happens after lookup. Compliant.
- Six structures feed `t()` with keys stored in data maps rather than
  literal `t("...")` calls: `helpGuides`, `cardEncouragementKeys`,
  `feedbackChoices`, and three `labelKeys` maps (type confirm, calendar
  labels, check categories). `tests/i18nCoverage.test.js` originally
  extracted only literal `t("...")` calls, so a typo in any of those maps
  would have shipped as a raw key on screen. The coverage test now also
  extracts every dictionary-shaped string literal in app.js (first segment
  matching an en.js namespace) and requires it to exist in en.js, which
  closes the map gap.
- `setStatusKey` and status ids travel as keys end to end. Compliant.

## Measured baseline (29 July 2026)

Sizes on disk, per language (dictionary + bank, bytes served today; the
static server currently sends no gzip, so raw is what travels):

| Language | Dictionary | Bank | Switch download | If gzipped |
|----------|-----------|------|-----------------|------------|
| pl | 38,008 | 30,801 | 68,809 | 18,642 |
| ro | 38,620 | 30,277 | 68,897 | 17,818 |
| gu | 60,739 | 47,922 | 108,661 | 20,014 |
| hi | 60,771 | 48,181 | 108,952 | 20,135 |
| bn | 61,341 | 50,573 | 111,914 | 19,751 |
| pa | 62,313 | 47,255 | 109,568 | 20,204 |
| es | 37,738 | 29,655 | 67,393 | 17,885 |
| fr | 39,427 | 30,901 | 70,328 | 18,346 |
| pt | 38,178 | 29,493 | 67,671 | 17,601 |

Base i18n cost every visitor pays once: config 4,246 + en 35,222 +
templates-en 28,583 + templateBank 8,241 + i18n.js 12,883 = 89,175 bytes raw
(25,105 gzipped). Indic languages additionally fetch their font on first
render of the script (Gurmukhi 33,824; Gujarati 112,268; Devanagari 121,192;
Bengali 107,720 bytes), verified live: the Gurmukhi font request fires only
when Panjabi text first renders.

Switch time on a throttled line (raw bytes over two sequential fetches,
dictionary then bank): at Slow 3G (400 kbps) roughly 1.4 s for a European
language and 2.2 s for an Indic one before fonts; at Fast 3G (1.6 Mbps)
roughly 0.35 s and 0.55 s. Enabling gzip at the server would cut all of
these by roughly 70 percent; flagged for a backend session, not changed here.

Translation compute, real matcher, full 34-sentence card set (six cards,
banner, next step, eight chips), median of 2,000 runs:

- English (identity path): 2.5 microseconds per card set
- Polish, all exact hits: 10.1 microseconds per card set
- Worst case, all 34 sentences missing (full pattern scan each): 48.5
  microseconds per card set

The full-page DOM rewrite on switch (257 tagged elements) measured 2.4 ms in
the browser. Rendering cost is network, never lookup.

Memory: usedJSHeapSize measured 3.6 MB (English), 2.1 MB (Polish active),
3.5 MB (Panjabi active). The differences are inside garbage collector noise;
the per-language resident cost is bounded by one parsed dictionary plus bank
(under 1 MB) and the unload policy holds it at one language maximum.

Upload and OCR isolation, by evidence: `textExtraction.js`,
`ocrSessionStore.js`, `documentSessionService.js`, `supabaseService.js`,
`analyticsService.js`, `feedbackService.js`, `anonymousSessionService.js`
contain zero language references (grep count 0 each). The engine's six
"language" hits are English prose comments about document wording. The only
server code that sees the language field is `simplifyRoute.js` (validates it
against config.js, threads it) and `aiStructuredResultService.js` (skips the
AI pass when it is not "en", before any provider call), both guarded by
`tests/aiLanguageGate.test.js`. Nothing in the language layer can touch how
a document is uploaded, extracted, or judged.
