# Portuguese (pt) translation review pack

DRAFT PENDING HUMAN REVIEW. Everything in this folder describes machine draft
Portuguese for Northcue. Nothing here is final until a human checker approves it.

## What the files are

- `public/i18n/pt.js` holds all interface text, 565 short strings such as
  buttons, headings, status messages and screen reader labels. It mirrors
  `public/i18n/en.js` key for key, in the same order.
- `public/i18n/templates-pt.js` holds the sentence bank the engine uses to
  build cue cards, 273 exact sentences plus 51 sentence templates with slots.
  It mirrors `public/i18n/templates-en.js`.
- `SAMPLES.md` in this folder shows every one of the 51 templates in English
  and Portuguese, each with two example sentences filled with realistic UK
  values, so you can judge how the slots read in real sentences.

## Slots in braces

Pieces like `{sender}`, `{amount}`, `{date}` or `{typeName}` are slots. The
app replaces them with real values at run time. They must survive exactly as
written, same spelling, same braces. Their position in the sentence is
allowed to move so the Portuguese grammar works, and in a few templates it
does move. What you may never do is rename, translate, add or remove a slot.

## The no dashes rule

Northcue copy never uses em dashes or en dashes, in any language. Use commas
or full stops instead. Ordinary hyphens inside words, like palavra-passe, are
fine. Please keep this rule when you edit.

## Tone to keep

Calm, cautious and warm. Safety wording stays hedged: parece, pode, verifique
o documento original. Plain everyday Portuguese, not officialese. The base is
European Portuguese, written to stay readable for Brazilian Portuguese
speakers too, and the explicit pronoun você is avoided. Northcue is never
translated. Never alarming, never commanding.

## Decisions a checker should look at first

- appointment is translated as marcação (and consulta for urgent medical).
  Brazilian readers may expect agendamento or consulta, please judge.
- rent is translated as arrendamento, not renda, because renda means income
  in Brazil.
- benefits letters use benefícios, matching how the UK Portuguese community
  talks about UK benefits.
- Council Tax and HMRC are kept in English as proper UK terms.
- council is translated as câmara municipal.
- cue cards is translated as cartões de apoio.
- I feel overwhelmed is rendered as Isto é demasiado para mim to stay gender
  neutral.
- feedback is rendered as opinião.
- The thank you string uses Obrigado as a brand voice choice, review if you
  prefer Agradecemos.
- The calendar file name is localised to northcue-data.ics.

## Where to edit

Edit the values in `public/i18n/pt.js` and `public/i18n/templates-pt.js`
directly, keeping every key name, every slot and the file structure exactly
as they are. This README and SAMPLES.md are explanation only, the app never
reads them, but please keep SAMPLES.md in step with any template you change.
