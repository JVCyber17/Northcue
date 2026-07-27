# Hindi translation review pack for Northcue

Namaste, and thank you for checking these translations. This note explains
what the files are and what to look for. You do not need to be technical.

## What Northcue is

Northcue helps people in the UK who find official letters stressful,
including anxious, overwhelmed, and neurodivergent readers. It turns a
confusing bill, notice, or government letter into short, calm "cue cards"
that say what the letter appears to be, what matters, and what to check
next. The tone must always be calm, warm, and respectful, like a kind
helper, never like a government office and never alarming or commanding.
All Hindi copy uses the respectful आप form throughout.

## The two files to review

Both live in the `public/i18n/` folder of the project:

1. `public/i18n/hi.js` contains all the interface text: buttons, menus,
   headings, settings, help pages. 565 lines of text.
2. `public/i18n/templates-hi.js` contains every sentence the app can put
   on a cue card: 273 full sentences plus 51 sentence templates with
   slots.

Both files are machine drafts. Every value is plain text inside quotation
marks. To fix a translation, edit only the Hindi text between the quotes
on the right side of the colon. Please do not change anything to the left
of the colon (the key), and do not remove commas or braces.

## Rules the text must follow

- Slots in curly braces, like `{amount}`, `{date}`, `{sender}`, or
  `{typeName}`, must survive exactly as written, in English letters,
  braces included. The app replaces them with real values, for example
  `{amount}` becomes `£187.42`. You may move a slot to a different place
  in the sentence if Hindi grammar needs it, but never translate,
  respell, or delete it.
- No dashes. Never use an em dash or an en dash anywhere. Use a comma or
  a full stop instead. This matches the rest of the product.
- Full stops, not the danda (।). The product uses "." to end sentences.
- Numbers stay in Western digits (1, 2, 3), and money stays as written
  (£187.42).
- "Northcue" is a brand name and is never translated. "Council Tax",
  "HMRC", and "999" also stay exactly as written.
- Safety wording must stay hedged. English says "appears to be", "may",
  "check the original document". The Hindi should keep that softness,
  for example "लगता है", "हो सकता है", "मूल दस्तावेज़ जाँचें". Please never
  make a sentence more certain or more commanding than the English.
- A few values are deliberately left in English letters because they are
  technical or visual, for example "PDF, JPG या PNG", "0 KB", "B", "KB",
  "MB", "GB", "you@example.com", "northcue-date.ics", HTML bits like
  `<br>`, `&rarr;`, `&larr;`, `&times;`, and arrows like `←` and `→`.
  Leave those as they are.

## What to look at first

The file `SAMPLES.md` in this folder shows all 51 slot templates with the
English original, the Hindi draft, and two example sentences filled with
realistic UK values. Reading the filled examples aloud is the quickest
way to hear whether the Hindi sounds natural and calm.

## Where to send corrections

Edit the Hindi text in the two files directly, or note the key name (the
text on the left of the colon, for example `journey.submit`) and your
suggested wording, and send it back to the team.
