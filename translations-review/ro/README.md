# Romanian translation review, machine draft pending human review

Thank you for checking this. You do not need to be technical. Everything you need to know is here.

## What these files are

Northcue turns confusing UK official letters into calm cue cards for people who feel anxious or overwhelmed. These two files hold the Romanian wording, drafted by a machine and waiting for a human check:

- `public/i18n/ro.js`, every button, label and message in the app, 565 lines of text.
- `public/i18n/templates-ro.js`, every sentence the letter reading engine can show, 273 fixed sentences plus 51 sentence templates with fill in slots.

`SAMPLES.md` in this folder shows all 51 templates with example sentences filled in, so you can judge how they read.

## Rules that must survive your edits

1. **Slots in curly braces must stay exactly as written.** Things like `{sender}`, `{amount}`, `{date}` or `{typeName}` are filled in by the app. You may move a slot to a different place in the sentence, but never translate, rename or delete it, and never change the braces.
2. **No em dashes and no en dashes anywhere.** Use a comma or a full stop instead. Ordinary Romanian hyphens inside words, like "fă-o", are fine.
3. **Only change the text between quotes on the right side.** Never change the key names on the left side, the punctuation around them, or the structure of the file.
4. **"Northcue" is never translated.** UK terms like Council Tax and HMRC stay recognisable.
5. **Tone: calm, warm, plain, never commanding, never alarming.** Keep the careful wording, "pare", "poate", "verifică documentul original". The app must never promise certainty about a letter.
6. **Cue cards are "carduri cu indicii" everywhere.** If you prefer a different term, change it in every place, not just some.

## Things to look at first

- Gendered wording. "Mă simt copleșit", "Am fost confuz" and "Contactează-mă, te rog" use masculine forms. If you know a natural neutral phrasing, please improve it.
- The whole draft speaks to the reader with informal "tu". Check this feels warm, not disrespectful.
- iOS wording in `install.card.iosLine` uses Romanian menu names, "Partajare" and "Adaugă la ecranul principal". Check against a Romanian language iPhone.
- Council Tax appears as "taxă locală (Council Tax)". Check this is clear for Romanians living in the UK.
- "ajutoare sociale" is used for UK benefits. Check it reads naturally for benefits letters.

## Where to edit

Edit the values in `public/i18n/ro.js` and `public/i18n/templates-ro.js` directly, or note your changes next to the examples in `SAMPLES.md` and pass them back to the team. Please do not edit the English files.
