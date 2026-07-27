# French (fr) translation review pack

DRAFT PENDING HUMAN REVIEW. Everything in this folder describes machine draft
French for Northcue. Nothing here is final until a human checker approves it.

## What the files are

- `public/i18n/fr.js` holds all interface text, 565 short strings such as
  buttons, headings, status messages and screen reader labels. It mirrors
  `public/i18n/en.js` key for key, in the same order.
- `public/i18n/templates-fr.js` holds the sentence bank the engine uses to
  build cue cards, 273 exact sentences plus 51 sentence templates with slots.
  It mirrors `public/i18n/templates-en.js`.
- `SAMPLES.md` in this folder shows every one of the 51 templates in English
  and French, each with two example sentences filled with realistic UK values,
  so you can judge how the slots read in real sentences.

## Slots in braces

Pieces like `{sender}`, `{amount}`, `{date}` or `{typeName}` are slots. The
app replaces them with real values at run time. They must survive exactly as
written, same spelling, same braces. Their position in the sentence is allowed
to move so the French grammar works, and in a few templates it does move. What
you may never do is rename, translate, add or remove a slot.

## The no dashes rule

Northcue copy never uses em dashes or en dashes, in any language. Use commas
or full stops instead. This matters more in French than in most languages,
because French typography normally reaches for the em dash and the non
breaking space plus dash pairing. Neither is used here. Ordinary hyphens
inside words, like rendez-vous or e-mail, are fine. Please keep this rule when
you edit.

## Tone to keep

Calm, cautious and warm. Safety wording stays hedged: semble, peut, vérifiez
le document original. Plain everyday French, not officialese. Northcue is
never translated. Never alarming, never commanding.

## Audience and register

The vous form is used everywhere, never tu. The French is deliberately neutral
standard French rather than French from France, because many French speakers
in the UK come from French speaking African communities. There is no verlan,
no France only administrative shorthand, and no France specific institution
names such as CAF or RIB. Words that are read the same way everywhere were
preferred, so mairie rather than any regional word for a local council, and
aides sociales rather than a France specific benefits name.

## Decisions a checker should look at first

- cue cards is translated as fiches d'aide. Alternatives worth judging are
  fiches repères or simply fiches.
- upload is translated with the verb envoyer, and the noun envoi, throughout.
  The alternatives are charger, importer or téléverser. Envoyer was chosen as
  the plainest everyday word, but it also means send, so please sanity check
  the upload screen strings as a set.
- I feel overwhelmed is rendered as C'est trop pour moi, so the phrase stays
  gender neutral. Vous y êtes, faites attention and Oui, cela m'a aidé were
  chosen for the same reason, to avoid a masculine or feminine ending.
- Council Tax stays in English with a short gloss, Council Tax (taxe locale).
  HMRC, 999, PDF, JPG, PNG and WEBP stay exactly as they are.
- council is rendered as mairie in running text, which reads naturally for all
  French speakers even though a UK council is not exactly a mairie.
- benefits is rendered as aides sociales, kept in French rather than left in
  English. If UK French speakers usually say benefits, tell us and we will
  switch the label to Benefits (aides sociales).
- appointment is rendered as rendez-vous everywhere.
- feedback is rendered as avis.
- The apostrophe used throughout is the plain straight apostrophe, not the
  curly typographic one, so the files stay easy to edit. Please keep it
  consistent if you change a line.
- French normally puts a space before ? ! and : and this draft does, using an
  ordinary space rather than a non breaking space. That keeps the files clean
  to edit, but it means a question mark can wrap onto the next line on a
  narrow phone. If that looks wrong in testing, tell us and we will decide
  whether to switch those to non breaking spaces.
- The calendar file name stays northcue-date.ics, because date is the same
  word in French.
- Six interface values are intentionally identical to English because the
  French word is the same: Focus, Actions (twice), Standard, Questions and
  article. Three sentence bank patterns are also identical on purpose, the
  composite assembly templates, because they only join slots together.

## Length and layout to check

French runs roughly 20 to 30 percent longer than English, so buttons were kept
as short as the language allows. These are the longest ones and are the first
places to look for wrapping or overflow, at both desktop and mobile width:

- `helpGuides.fake.action`, Ouvrir la vérification du document, 34 characters
  against 19 in English. This is the longest button in the pack.
- `feedback.contactBtn`, Contactez-moi, s'il vous plaît, 30 characters.
- `helpGuides.deadline.action`, Ouvrir la fiche Date limite, 27 characters.
- `home.welcome.start` and `home.board.start`, Commencer avec un document, 26
  characters.
- `why.cta.try`, Essayer avec votre lettre, and
  `journey.actions.uploadAnother`, Envoyer un autre document, 25 characters.
- `journey.done.addCalendar`, Ajouter au calendrier, and
  `journey.showFullDetails`, Voir tous les détails, 21 characters.

The tab bar and top bar labels all stayed short: Accueil, Comprendre, Aide,
Réglages, Focus, Texte, Confort. Comprendre is the longest at 10 characters
and is the one to watch on small phones.

## Where to edit

Edit the values in `public/i18n/fr.js` and `public/i18n/templates-fr.js`
directly, keeping every key name, every slot and the file structure exactly as
they are. This README and SAMPLES.md are explanation only, the app never reads
them, but please keep SAMPLES.md in step with any template you change.
