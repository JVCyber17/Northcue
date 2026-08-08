# Northcue multilingual MVP, what was built

Written for you, not for a programmer. Branch `feature/multilingual-mvp`. **Nothing has been merged and nothing has been deployed. The live site is untouched.** Everything below is waiting on your review.

---

## 1. The short version

Northcue now speaks nine languages besides English: Polish, Romanian, Gujarati, Hindi, Bengali, Portuguese, Spanish, French, and Panjabi. A person picks their language once, and the whole interface plus their cue cards appear in it. The choice is remembered.

Crucially, **the safety thinking never changed**. The engine still reads every document, decides what it is, how serious it is, and whether it looks like a scam, all in English, in exactly the same code as before. Translation happens afterwards, and only by looking words up in a reviewed list. Nothing is invented, and no AI translates anything.

---

## 2. How translation works, in plain language

Think of it as two phrasebooks.

**Phrasebook one, the interface.** Every fixed word on screen (buttons, headings, help text, error messages) has an ID. English holds 565 of them. Each language has a file with the same 565 IDs and its own words. When you switch language, the app swaps the words in.

**Phrasebook two, the cue card sentences.** The engine builds cue cards from a fixed set of sentences. We catalogued every one of them: 273 complete sentences, plus 51 sentence patterns with gaps in them, like "The document says {amount} is due by {date}". Each language has translations of all 324. At the moment a card is shown, the app finds the matching sentence and swaps it, dropping the real values (names, dates, amounts) into the gaps **exactly as they appear on the document**. An amount is never converted, a date never reformatted, a company name never altered.

**When something has no translation** (see section 6), the sentence stays in English. That is the deliberate safe outcome: never a guess, only an honest gap. A small line under the card used to say so explicitly, in the person's own language. It was retired on 6 August 2026: after the language launch every model written sentence was unmatched by definition, so the line printed on all six cards of every session, under text that was not English at all.

**AI is switched off for non English users.** When the language is not English, the app skips the AI phrasing step completely on the server, so those users always get the deterministic rules cards translated by the phrasebook. AI phrasing stays English only in this version. This is a one line gate that sits next to the four safety gates the app already had, and it does not touch any judgement code.

---

## 3. What each language got

Every one of the nine has all of the following, and every file says **DRAFT PENDING HUMAN REVIEW** at the top:

- A full interface dictionary, all 565 entries, no gaps.
- A full sentence phrasebook, all 273 sentences and all 51 patterns.
- A review pack in `translations-review/<language>/` with a plain English README explaining the rules to a checker, and a SAMPLES file showing every pattern with two realistic filled in examples, so a checker reads real sentences like "Thames Water says £187.42 is due by 24 June 2026" rather than bare templates.

### Translator notes worth your attention

**Polish.** Cue cards became "karty podpowiedzi". Some phrases were rewritten to avoid assuming the reader's gender, for example "I feel overwhelmed" became "To mnie przytłacza". The completion sentence was restructured so Polish number grammar works around the card count.

**Romanian.** Cue cards became "carduri cu indicii", informal address throughout. A few gendered forms are flagged for a checker. Document type names carry their own article so sentences stay grammatical. The iPhone install line uses Romanian menu names and needs checking on a real device.

**Gujarati.** Respectful "તમે" throughout, everyday loanwords kept where UK Gujarati speakers use them. One flagged issue: in one pattern the English fragment ends with a full stop before the Gujarati verb, so the stop lands mid sentence. Fixing it would turn a gentle suggestion into a command, so a human should decide.

**Hindi.** Respectful "आप", full stops rather than danda. "I feel overwhelmed" became "सब कुछ बहुत ज़्यादा लग रहा है", feeling first rather than clinical.

**Bengali.** Respectful "আপনি", everyday loanwords for document, benefits, and appointment rather than formal alternatives; a checker should confirm that choice. Some sentences reorder the gaps to fit Bengali grammar, which the system supports.

**Portuguese.** Neutral for both Portugal and Brazil. "Rent" avoided the word that means income in Brazil, appointment rendered as "marcação", cue cards as "cartões de apoio".

**Spanish.** Neutral for Spain and Latin America, no "vosotros". Council became "administración local" rather than a Spain specific word. One sentence was rephrased because Spanish grammatical gender would have clashed with the inserted document type.

**French.** Neutral standard French, deliberately avoiding France only expressions because many UK French speakers are from French speaking African communities. Cue cards became "fiches d'aide". French runs long, so its longest buttons were checked on a phone and all fit.

**Panjabi.** Gurmukhi script, accessible everyday register. Nine word choices differ between Indian Sikh heritage and Pakistani heritage usage, all listed in the review pack for a human to settle, including everyday words like please, date, letter, and thank you.

**UK terms** such as Council Tax stay in English with a short explanation in brackets in the local language, so someone can still recognise the words on their letter.

---

## 4. The language controls

- **A quiet switcher** appears in three places so it is always reachable: the desktop top bar, a small pill on the mobile top bar, and the landing page. It opens the app's normal calm panel listing every language in its own name and script, English, Polski, Română, ગુજરાતી, हिन्दी, বাংলা, Português, Español, Français, ਪੰਜਾਬੀ. No flags, because a flag is a country, not a language.
- **A first visit offer.** If someone's browser is set to one of these languages, a calm strip appears under the header, written in that language, offering a one tap switch. Dismissing it is remembered, and it never blocks anything.
- **The choice sticks** and applies immediately to the interface, and to the next document's cards.
- **Screen readers are told** which language the page is in.

## 5. Fonts

Northcue's normal fonts do not contain Gujarati, Hindi, Bengali, or Panjabi letters, so those languages would have shown as boxes. Four Noto Sans font files are now included in the project itself, no outside services. They are set up so a browser only downloads one when those letters actually appear on screen: an English visitor downloads nothing new. Verified working for all four scripts.

---

## 6. The honest gaps, where English still shows

The engine can produce some sentences that are not fixed phrases and therefore cannot be pre translated. These stay in English with the small notice. Listed for completeness:

1. Sentences quoting an obligation lifted from the document itself.
2. Consequence sentences reshaped from the document's own wording.
3. Sender names, taken from the letter.
4. Document headings used as a subject line.
5. Dates, amounts, and reference numbers, which are shown exactly as printed, by design.
6. Anything reworded by the AI phrasing step (English users only, since AI is off for other languages).
7. Some error messages passed through from the server.
8. Multi document uploads, which the engine already handles by explaining the main letter.

In practice a non English user sees the notice rarely, because AI phrasing is off for them and the rules sentences are all in the phrasebook.

---

## 7. What I checked, and what I found

**Automated:** 189 tests pass, up from 109 before this work. Four new test files were added and they now guard, permanently:
- every interface word used anywhere exists in English,
- every language has all 565 entries and all 324 sentences,
- **no translation ever loses a gap**, so a real amount or date cannot vanish,
- no em dashes or en dashes in any language,
- the AI really is skipped for non English users, with no data leaving the server.

**By hand in the browser, at phone width, all ten languages in light, dark, and focus mode:** no layout broke anywhere, no text was cut off, no untranslated placeholder leaked, the page language was correct every time, cue cards translated, the four scripts rendered with the right fonts loading only when needed, and the switcher, the first visit banner, and remembering the choice all behaved.

**One real bug found and fixed.** While testing the fallback I discovered that three entries in the phrasebook are the engine's internal assembly templates, essentially just "{gap} {gap}". Because they are almost all gaps, they matched *any* sentence, handed it back unchanged, and reported it as successfully translated. The effect was that a genuinely untranslated sentence would have shown in English **without** the notice, quietly pretending it was fine. The matcher now ignores templates with too little real text, which excludes exactly those three and keeps every genuine one. A test now covers this directly, and I re verified the notice appears correctly afterwards.

---

## 8. Things I need you to decide

1. **The review flags per language**, especially the nine Panjabi word choices between the two communities, the Gujarati punctuation issue in section 3, and the Romanian iPhone menu names.
2. **The enabled switches are the go live control.** In `public/i18n/config.js` each language has `enabled: true`. All nine are on **for your testing in this branch**. A language should be switched to `false` before this reaches the public until a human has checked its files. That is the safety valve.
3. **Spanish and French were in your original brief's switcher list** but not its language list. I built them, and Panjabi, as you later confirmed.
4. **These are machine drafts.** They are structurally perfect and read sensibly, but no native speaker has confirmed the tone yet. For a product used by anxious people reading frightening letters, that check matters.

---

## 9. How to review, merge, and deploy

**To look at it yourself:**
```bash
git checkout feature/multilingual-mvp
npm start
```
Open the site, use the language switcher in the top right, and try each language. Upload a document while a language is active to see translated cue cards.

**To send translations for checking:** each folder in `translations-review/` is self contained. Send the whole folder for one language to a speaker of it.

**To turn a language off before going live:** open `public/i18n/config.js` and change that language's `enabled: true` to `enabled: false`.

**To merge when you are happy:**
```bash
git checkout main
git merge feature/multilingual-mvp
npm test          # expect 189 passing
git push          # this deploys to the live site
```

**To undo after merging, if needed:** `git revert -m 1 <merge commit>` puts everything back.

---

## 10. Every file, in one place

**New, the translation system:** `public/i18n.js` (the machinery), `public/i18n/config.js` (languages and the on/off switches), `public/i18n/templateBank.js` (the sentence matcher), `public/i18n/en.js` plus nine language files, `public/i18n/templates-en.js` plus nine phrasebooks.

**New, fonts:** four Noto Sans files in `public/assets/fonts/`.

**New, for humans:** `PLAN.md`, `REPORT.md`, three inventories in `docs/i18n/`, and eighteen review files in `translations-review/`.

**New, tests:** `tests/i18nCoverage.test.js`, `tests/templateBank.test.js`, `tests/translationParity.test.js`, `tests/aiLanguageGate.test.js`.

**Changed, five files only:**
- `public/index.html`, labels added to every piece of text, plus the switcher and banner.
- `public/app.js`, text now comes from the dictionary, cards go through the phrasebook.
- `public/styles.css`, styling for the switcher and banner, and the font rules.
- `src/routes/simplifyRoute.js`, passes the chosen language through.
- `src/services/aiStructuredResultService.js`, one new gate that skips AI for non English.

**Untouched:** the rules engine, all classification, severity, trust and scam logic, the upload flow, privacy and deletion, and the hero. Two small pre existing problems were fixed because translation would have broken them: the app used to compare English sentences to decide what to show, and it sent feedback button labels to the server as data. Both now use stable IDs. One old em dash in a feedback label was replaced with a comma.
