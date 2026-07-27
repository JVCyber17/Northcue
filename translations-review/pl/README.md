# Polish (pl) translation review notes

DRAFT PENDING HUMAN REVIEW. Everything in the two Polish files is a machine draft and needs a human check before the language goes live.

## What the files are

- `public/i18n/pl.js` holds every interface string (buttons, labels, pages). It mirrors `public/i18n/en.js` key for key and assigns `NORTHCUE_STRINGS_PL`.
- `public/i18n/templates-pl.js` holds every sentence the cue card engine can emit. It mirrors `public/i18n/templates-en.js`: an `exact` section (whole sentences) and a `patterns` section (sentences with slots) and assigns `NORTHCUE_TEMPLATES_PL`.

## Where to edit

Edit the Polish text values in those two files directly. Do not change the keys, the ids, or the file structure. `SAMPLES.md` in this folder shows every pattern filled with realistic example values so you can judge how the sentences read.

## The slot rule (most important)

Values in curly braces are slots, for example `{sender}`, `{amount}`, `{date}`, `{topic}`. The app pastes the real value in at runtime, exactly as it appears in the original document, usually in English.

- Never translate the slot name. `{date}` must stay `{date}`, spelled exactly the same.
- Never delete a slot. Every slot in the English template must survive in the Polish one.
- You may move a slot to a different position in the sentence if Polish grammar needs it.
- Remember the inserted value will be verbatim English (for example a UK date like `24 June 2026`), so phrase the sentence so an English value reads acceptably inside it.

The same applies to interface slots in `pl.js` such as `{current}`, `{total}`, `{typeName}`, `{fileName}`, `{fileSize}`, `{base}`.

## Other rules

- No em dashes and no en dashes anywhere. Use commas or full stops instead.
- "Northcue" is never translated. Cue cards are always "karty podpowiedzi".
- Tone: calm, warm, cautious, never alarming, never commanding. Safety wording stays hedged: "wygląda na", "może", "sprawdź oryginalny dokument".
- Sentence case, plain everyday Polish, no officialese.
- Keep untranslated tokens as they are: "Aa" style glyphs, "£128", "0 KB", and the unit tokens "B", "KB", "MB", "GB". `meta.title` stays "Northcue".
- Buttons and short labels should stay short. Polish runs long, so prefer the shortest natural phrasing.
