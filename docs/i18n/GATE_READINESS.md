# Gate readiness, 5 August 2026

The document the gate decision is made from. One row per language; nothing
in it opens anything. **No language opens until its verification has landed
and the founder says open, per language.**

## 1. The table

Writing side is the guard over what the model would write to a reader.
Reading side is the protection over what a reader uploads. Verification is
the native-speaker pack, `docs/i18n/verification/`.

| lang | writing-side guard | reading-side protection | verification | what opens when verification completes |
|---|---|---|---|---|
| pl | command family built, measured 15/23, hedge+negation protected. Credential guard NOT built | structural tier + 18 decisive needles, measured on 3 scam docs. polish_phishing: 6 signals | pack built, not returned | nothing by itself; see checklist. pl is a candidate first open: most scam evidence, most different grammar already handled |
| es | command family built, 30/44. Credential guard NOT built | structural tier + 12 needles, 1 measured must-fire | pack built, not returned | candidate first open: largest sweep slice, multiple corpus docs |
| fr | command family built, 23/36. Credential guard NOT built | structural tier + 11 needles, 1 measured must-fire | pack built, not returned | candidate first open |
| pt | command family built, 38/50. Credential guard NOT built | structural tier + 13 needles, 2 measured must-fires | pack built, not returned | candidate first open |
| ro | command family built, 14/24. Credential guard NOT built | structural tier + 9 needles, zero-fire validated, must-fires CONSTRUCTED (no scam corpus) | pack built, not returned | opens after a Romance/Polish first open proves the release path |
| hi | command family built, 52% overall, complete vs English list. Credential guard built (the only one). Tempered-gap fix owed before open | structural tier + 9 needles, must-fires constructed (no scam corpus). One genuine corpus doc only | pack built (includes credential rows), founder is the reader | after verification AND a second genuine corpus doc; one document cannot test a rule |
| bn | command family built, 24/50, pairing grammar. Credential guard NOT built | structural tier + 10 needles, must-fires constructed | pack built, not returned | same as hi: corpus before gate |
| gu | command family built, 27/38, ambiguity handled structurally. Credential guard NOT built | structural tier + 9 needles, must-fires constructed | pack built, founder is the reader, starts tonight | same as hi: corpus before gate |
| pa | command family built, 15/25. Credential guard NOT built | structural tier + 8 needles, must-fires constructed | pack built, not returned | same as hi: corpus before gate |

Common to all nine, live today: refusal-path strings translation-tested
(`tests/refusalPathTranslation.test.js`); the lure gate on the AI path;
cvv/cvc borrowed tokens; refusals engine-owned, no model on the path;
account_suspension excluded per D3. Known uncovered in all nine: the
13-entry English advisory/distrust phrase tier has no translation; the
crypto/bitcoin borrowed token is unbuilt; the non-document gate's four
checks are English; sender mismatch deliberately unshipped pending
adversarial review.

## 2. The gate mechanics, confirmed

As built, the gate is ONE binary branch
(`providerSkipReason`, aiStructuredResultService.js): every non-English
language is refused the model, and there is no per-language capability. So
today NOTHING can open per language, automatically or otherwise, which is
the safe default confirmed.

The opening mechanism, when the founder first approves a language:

1. The branch becomes a per-language allowlist read from config data (the
   i18n standard: config, not code branches). It ships EMPTY, which is
   byte-identical behaviour to today, proven by the existing gate test.
2. Adding a language to that allowlist is the switch. It happens in its own
   commit, on the founder's explicit instruction, one language per commit,
   never grouped, never inferred, never automatic. Verification landing
   does not open anything; it makes a language ELIGIBLE for the founder to
   open.
3. Turning a language off is the same edit in reverse, one line, and the
   fallback is today's behaviour: bank-translated engine cards.

## 3. The release checklist for the first opening, whichever language is first

In order. Items 1 to 8 block the release; 9 and 10 are owed and the founder
decides whether they block.

1. **Verification returned and ingested**: the language's pack back, the
   fixture in `tests/fixtures/native-review-<lang>.json`, the per-language
   fixture test passing, zero unresolved over-fire rows. The machine
   meaning of verified, per `docs/i18n/verification/INGEST.md`.
2. **The credential-ask writing guard for that language** (exists for Hindi
   only). A language does not open with half its writing-side guard
   missing.
3. **Guard wiring**: command family and credential vocabularies into the
   stripper behind that language's flag, with the per-language replacement
   sentence, which is reader-visible: bank entry in all ten files plus
   NATIVE_REVIEW flag.
4. **Cross-language date canonicalisation for that language**: without it,
   `repairInventedDates` eats every dated sentence the model writes in that
   language (the measured 88-repair class). The English benchmark's
   foreign-source ratchet is lowered in the same commit, per its pin.
5. **THE PRIVACY AND UI COPY CHANGE, IN THE SAME RELEASE.** Recorded here
   as the standing commitment. Today a non-English reader's document
   NEVER reaches the AI provider; the moment the gate opens for their
   language it does, and its output is what they read. In that release,
   in their language, through the bank with NATIVE_REVIEW flags: the
   privacy page's AI step says their document content is sent to the
   provider; the language banner stops implying English-only phrasing;
   docs/i18n/enabling-a-language.md's "Note on AI phrasing" is rewritten.
   No open without this, in the same deploy, never trailing it.
6. **NATIVE_REVIEW.md for that language returned**: the bank batches
   including the 5 August additions (the CVV line, the three pressure
   warnings, the hour and day word lists). The pack and the bank review
   are one sitting where possible.
7. **Per-language benchmark captured on open day**: the capture script run
   for that language's reachable corpus, pinned like the English fixture,
   so day-one quality is frozen the way English was frozen.
8. **The production check watches that language from day one**: one
   nullable `language` column on document_sessions (the
   ai_validation_errors precedent: written where ai_status already is,
   value-free), and `scripts/production/daily-check.js` segmenting
   completion by language, alerting on good-quality sessions with ZERO
   completions per language. A language-specific regression must be an
   alert, not a discovery. document_sessions records no language today,
   so the column comes first.
9. **Progress indication on the upload screen**, owed since the timeout
   went to 40 seconds; prose latency is most visible to the first
   non-English readers.
10. **Carried guard findings for the opening language**: hedge and negation
   lookbehinds if es, fr, pt or ro opens first; the tempered-gap fix if
   Hindi.

## 4. Verification packs

All nine in `docs/i18n/verification/`, blind, one sitting each. Gujarati
and Hindi first; the founder holds both. Answer keys in
`tests/fixtures/verification-keys/`, never shown to a reviewer.
