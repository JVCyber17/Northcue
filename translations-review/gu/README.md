# Gujarati (gu) translation review notes

DRAFT PENDING HUMAN REVIEW. Everything in the two Gujarati files is a machine draft and needs a human check before the language goes live.

## What the files are

- `public/i18n/gu.js` holds every interface string (buttons, labels, pages). It mirrors `public/i18n/en.js` key for key and assigns `NORTHCUE_STRINGS_GU`.
- `public/i18n/templates-gu.js` holds every sentence the cue card engine can emit. It mirrors `public/i18n/templates-en.js`: an `exact` section (whole sentences) and a `patterns` section (sentences with slots) and assigns `NORTHCUE_TEMPLATES_GU`.

## Where to edit

Edit the Gujarati text values in those two files directly. Do not change the keys, the ids, or the file structure. `SAMPLES.md` in this folder shows every pattern filled with realistic example values so you can judge how the sentences read.

## The slot rule (most important)

Values in curly braces are slots, for example `{sender}`, `{amount}`, `{date}`, `{topic}`. The app pastes the real value in at runtime, exactly as it appears in the original document, usually in English.

- Never translate the slot name. `{date}` must stay `{date}`, in Latin letters, spelled exactly the same.
- Never delete a slot. Every slot in the English template must survive in the Gujarati one.
- You may move a slot to a different position in the sentence if Gujarati grammar needs it. Gujarati puts the verb at the end, so slots often move earlier than in English.
- Remember the inserted value will be verbatim English (for example a UK date like `24 June 2026`, or an amount like `£187.42`), so phrase the sentence so an English value reads acceptably inside it.

The same applies to interface slots in `gu.js` such as `{current}`, `{total}`, `{typeName}`, `{fileName}`, `{fileSize}`, `{base}`.

## Other rules

- No em dashes and no en dashes anywhere. Use commas or full stops instead.
- Use the full stop, not the danda, to end sentences. This matches the rest of the product.
- Numbers stay in Western Arabic numerals (0 to 9), not Gujarati numerals.
- "Northcue" is never translated. `meta.title` stays "Northcue". Cue cards are always "ક્યૂ કાર્ડ".
- Tone: calm, warm, cautious, never alarming, never commanding. Safety wording stays hedged: "હોવાનું જણાય છે", "હોઈ શકે છે", "અસલ દસ્તાવેજ તપાસો".
- Register: તમે throughout, consistently. Plain everyday Gujarati as spoken in UK Gujarati households, not Sanskritised formal prose. Common English loanwords are fine where they are what people actually say, for example બિલ, ફોર્મ, એપોઇન્ટમેન્ટ, ઇમેઇલ, અપલોડ.
- Keep untranslated tokens as they are: "Aa" style glyphs, "£128", "0 KB", and the unit tokens "B", "KB", "MB", "GB". "Council Tax", "HMRC", "PIN", "PDF", "999" and the iPhone menu names "Share" and "Add to Home Screen" also stay in English, because that is what the reader will see on the letter or on the screen.
- Buttons and short labels should stay short. Prefer the shortest natural phrasing for keys with cta, start, next, back, finish, dismiss, install, switch, tabbar and topbar in the name.
