# Spanish (es) translation review pack

DRAFT PENDING HUMAN REVIEW. Everything in this folder describes machine draft
Spanish for Northcue. Nothing here is final until a human checker approves it.

## What the files are

- `public/i18n/es.js` holds all interface text, 565 short strings such as
  buttons, headings, status messages and screen reader labels. It mirrors
  `public/i18n/en.js` key for key, in the same order.
- `public/i18n/templates-es.js` holds the sentence bank the engine uses to
  build cue cards, 273 exact sentences plus 51 sentence templates with slots.
  It mirrors `public/i18n/templates-en.js`.
- `SAMPLES.md` in this folder shows every one of the 51 templates in English
  and Spanish, each with two example sentences filled with realistic UK
  values, so you can judge how the slots read in real sentences.

## Slots in braces

Pieces like `{sender}`, `{amount}`, `{date}` or `{typeName}` are slots. The
app replaces them with real values at run time. They must survive exactly as
written, same spelling, same braces. Their position in the sentence is
allowed to move so the Spanish grammar works, and in a few templates it does
move. What you may never do is rename, translate, add or remove a slot.

## The no dashes rule

Northcue copy never uses em dashes or en dashes, in any language. Use commas
or full stops instead. Ordinary hyphens inside words are fine, and Spanish
inverted punctuation (¿ and ¡) is welcome wherever it reads naturally. Please
keep this rule when you edit.

## Tone to keep

Calm, cautious and warm. Safety wording stays hedged: parece, puede, revise el
documento original. Plain everyday Spanish, not officialese. Northcue is never
translated. Never alarming, never commanding.

## Neutral Spanish

The draft is written to read naturally for readers in Spain and in Latin
America. The polite usted register is used for verbs and possessives (revise,
suba, su documento) but the pronoun usted itself is almost never printed.
Vosotros forms are not used anywhere. Regional words were avoided in favour of
widely understood ones: archivo not fichero, subir not cargar, tomar una foto
not hacer una foto, teléfono not móvil or celular, alquiler not renta.

## Decisions a checker should look at first

- cue cards is translated as tarjetas de apoyo.
- Council Tax, HMRC, PDF and the emergency number 999 are kept in English.
  Council Tax carries a short gloss on its prominent uses, Council Tax
  (impuesto municipal).
- council and local authority are translated as administración local rather
  than ayuntamiento, which reads as Spain specific.
- benefits is translated as prestaciones sociales. Some UK Spanish speakers
  say beneficios, please judge which the community would recognise.
- appointment is translated as cita, which works for medical and official
  appointments in both regions.
- feedback is translated as comentarios, and Give feedback is Enviar
  comentarios.
- Focus mode is translated as modo enfoque, with the short button label
  Enfoque. Alternatives worth weighing are modo concentración and modo foco.
- I feel overwhelmed is rendered as Esto es demasiado para mí, which stays
  gender neutral. The same choice avoids abrumado or abrumada elsewhere.
- status.readingHintTyped was rephrased to Tipo detectado: {typeName} because
  a literal Esto parece un/una {typeName} would clash with the gender of the
  inserted word.
- Document check is translated as Revisión del documento, and the verb check
  is consistently revisar rather than comprobar, except where comprobar means
  verify against an outside source.
- The calendar file name is localised to northcue-fecha.ics.
- Buttons were kept as short as Spanish allows, since Spanish runs longer than
  English. If any button still wraps on a narrow phone, shorten it here.

## Where to edit

Edit the values in `public/i18n/es.js` and `public/i18n/templates-es.js`
directly, keeping every key name, every slot and the file structure exactly as
they are. This README and SAMPLES.md are explanation only, the app never reads
them, but please keep SAMPLES.md in step with any template you change.
