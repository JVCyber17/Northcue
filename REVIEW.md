# Translation review: Phase 0 ground truth (29 July 2026)

This file replaces every earlier review pass. It was re-derived from rendered
output, not from files and not from earlier reports, treating every prior count
and claim as unverified. Earlier passes remain available in git history; nothing
below carries a number forward from them.

## How this was derived

Three frozen tools, committed before the pass began (commit "Freeze the ground
truth render tooling"), produced the corpus:

- `scripts/render-language.js <code>`: the four engine scenarios (bailiff,
  scam, routine, non-document) through the REAL rules engine and REAL template
  bank, plus all 51 slot patterns with three contrasting value sets (small and
  singular, the Slavic 2 to 4 band with a feminine topic, large and plural with
  a long sender).
- `scripts/render-exact.js <code>`: all 273 exact bank sentences through the
  real matcher, English beside each rendering.
- `scripts/render-dictionary.js <code>`: all 573 Tier 1 keys resolved exactly
  as `t()` resolves them, English fallback flagged.

Coverage result before any judgement: zero English fallbacks across all 273
exact sentences and all 573 dictionary keys in every language. The 10 fallbacks
per scenario-and-pattern render are identical in all nine languages and are the
by-design set: the verbatim bailiff quotation plus the three pure assembly
templates times three value sets. The fallback mechanism carries no defects;
everything below is about the quality of what does render.

Who judged what: Gujarati, Hindi, Polish and Romanian were read in full by the
assistant directly. For Bengali, Panjabi, Spanish, French and Portuguese, the
safety-critical block (all banners, the scam set, the severity ladder, the risk
tiers, the strip templates) was read by the assistant directly, and the full
three-file sweep was done by five independent language agents working only from
the rendered files, unanchored (they were not shown this review or any earlier
one). Every agent claim that appears below was re-verified against the rendered
files before inclusion; agent claims that did not survive verification, or that
turned out to mirror flat English sources, are listed as disproved. No count in
this file comes from a scanner; scanners appear only where explicitly labelled
as screening floors.

## Provenance: what happened to the old numbers

- Per-language "patterns failing grammar" counts from the 27 July review
  (9 to 32 of 51): produced in the corrupted-era audit and by the ASCII `\b`
  scanner. Void. Not carried forward. The re-derived pattern-level defect
  counts below are far smaller (0 to 4 per language).
- The corrected scan's informal counts (Polish 140, Romanian 250, others 0):
  directionally right, but this pass proved the scanner's informal term list
  has gaps (see the Polish section), so those numbers are FLOORS, not counts.
- The "roughly 150 failing pattern renders" figure: void, same provenance.
- Hedge and refusal scanner columns: screening filters only, as already
  recorded; the rendered reading below supersedes them.

## Verdict table

Counts are verified defects outstanding today, from rendered output. "Safety"
uses the brief's definition (hedges turned certain, warnings weakened or
strengthened beyond English, refusals softened, tier collapse, reader dropped
from a warning, dangerous ambiguity). Sessions are estimated fix sessions to
AI-complete, including re-render and a fresh adversarial read.

| Language   | Safety | Grammar around values | Formality state            | Naturalness | Sessions |
|------------|--------|-----------------------|----------------------------|-------------|----------|
| Gujarati   | 0      | 0 (5 fixed)           | formal, confirmed          | 0 (2 fixed) | AI-complete |
| Hindi      | 0 (3 fixed) | 0 (fixed at the root) | formal, confirmed     | 0 (3 fixed) | AI-complete |
| Polish     | 0      | 0                     | formal, converted this pass | 0 (fixed)  | AI-complete |
| Romanian   | 0 (3 classes fixed) | 0 (9 surfaces fixed) | formal, converted this pass | 0 (fixed) | AI-complete |
| Bengali    | 0 (2 classes fixed) | 0 (fixed; convention pending) | formal, confirmed | 0 (fixed) | AI-complete-pending-convention |
| Panjabi    | 0 (4 fixed) | 0 (all classes fixed) | formal, confirmed     | 0 (fixed) | AI-complete |
| Spanish    | 0 (7 fixed) | 0 (fixed)        | usted, confirmed           | 0 (fixed) | AI-complete |
| French     | 0 (all fixed) | 0 (fixed)       | vous, confirmed            | 0 (fixed) | AI-complete |
| Portuguese | 0 (all fixed) | 0 (fixed)       | formal, neutralised this pass | 0 (fixed) | AI-complete |

Suggested completion order stays as planned: Gujarati and Hindi first (small,
founder-reviewable), then Polish (bank residue plus the dictionary conversion),
then Romanian (the largest job). Bengali, Panjabi, Spanish, French, Portuguese
in any order after; none is blocked on a decision except the Portuguese
regional question and the Bengali suffix-hyphenation style call.

## Findings that recur across languages (fix as classes, not per language)

1. **The consequence and check_wrap frames around verbatim English slots.**
   `tpl.consequence.reported` ("The document states that {X}." where X is a
   noun phrase) breaks in most languages because the connective demands a
   clause: Bengali strands যে, Spanish strands que, Portuguese reads the
   English article "a" as Portuguese, French lacks any quote cue, Hindi and
   Gujarati survive only via colons. `tpl.action.check_wrap` is broken in
   Gujarati (stranded verb after the English stop) and Bengali (verb-first
   calque), correct in Hindi/Polish/Romanian/French/Spanish/Portuguese.
   `tpl.consequence.may_follow` locks a singular verb against plural values in
   French ("further charges peut suivre"), Spanish ("podría producirse further
   charges") and Portuguese ("pode seguir-se further charges"). Panjabi has
   both halves (stranded ਕਿ, singular ਹੋ ਸਕਦਾ ਹੈ over plural values). One
   decision fixes all of these: colon-based, number-neutral quote frames per
   language.
2. **Hedge ADDED inside the attributed consequence.** Gujarati, Hindi, Polish
   AND Panjabi render `tpl.consequence.avoid` as "the document says this COULD
   happen: {X}" where English reports without modality; Romanian mirrors
   English exactly. For Panjabi this confirms the original review's lead, as
   an added hedge. Softening inside attribution is a deliberate-looking
   pattern that was never decided. Decide once (native question), align nine.
3. **Reader dropped from warnings.** English `tpl.readable.risk_response` /
   `risk_dates` say "You may miss..."; Hindi and Bengali render them agentless.
   The password and PIN scam-signal chips drop "you" in Panjabi (five chips)
   and Spanish (four chips) while sibling chips keep the reader. Same class as
   the fixed scam risk lines, lower stakes, and inconsistent within each set.
4. **Male-only reader forms in Romance languages.** Romanian "păcălit",
   "ca să fii sigur", "Găsește singur", "Mă simt mai capabil"; French "trompé",
   "pour en être sûr", "Toujours incertain"; Portuguese "enganado"; Spanish
   "usted mismo" twice. Polish already solved this class by restructuring.
   De-gender wherever a natural shape exists; the rest become native questions.
5. **"This looks important" (banner.urgent) drifts per language.** Hindi
   escalates it to अत्यावश्यक (extremely urgent) and is inconsistent with its
   own warning.urgent_result; Panjabi escalates it to the immediate-attention
   construction and near-duplicates its mip.urgent opener on the same screen;
   Spanish weakens the second half ("Conviene no dejarlo pasar" for "Do not
   ignore it"); Portuguese truncates it ("Não ignore." with no object). The
   banner needs a per-language decision anchored to English's calm "important".
6. **The scanner's informal term list is incomplete.** Rendered reading found
   four informal imperatives in the Polish bank that `scan-translations.js`
   calls clean (Traktuj, Podążaj, Miej, Wyślij). Same failure shape as the
   ASCII `\b` bug: a tool gap producing a false all-clear. Before the Polish
   and Romanian conversions, extend the term lists, and never accept a
   scanner zero without a rendered read.
7. **Gender- or case-locked frames around variable labels.** Gujarati hardcodes
   masculine participles (મોકલ્યો, આવેલો) that break on feminine labels; Romanian
   hardcodes masculine "Acesta pare a fi" against feminine predicates (four
   patterns, four exacts); Panjabi locks the copula masculine in one template
   family and feminine in another, so each breaks on the other gender, plus an
   ergative participle agreeing with nothing; Hindi stores topic labels in the
   oblique case and breaks its two nominative frames, while Panjabi stores
   them in the direct case and breaks its three ਬਾਰੇ frames. These are mirror
   images of one root decision: label sets need per-frame case and gender
   variants, or the frames must become case-free (the colon frames already
   prove that pattern works).

---

# Per-language work lists

## Gujarati (AI-COMPLETE, 30 July 2026; awaiting native review)

Every defect from the Phase 0 list is fixed and verified by rendered output.
Ten strings changed (seven bank, three dictionary); the render diff against
the Phase 0 corpus shows exactly the intended lines and nothing else.

What changed, by the phase order:
1. Safety class. `tpl.consequence.avoid` no longer adds "થઈ શકે છે" inside the
   attributed consequence; it now reports the document's own claim the way
   English does ("...તો આવું થશે: {consequence}."). The four confirm and enter
   password and PIN chips regained the reader ("તમને પાસવર્ડની ખાતરી કરવાનું કહે
   છે.") for consistency with their siblings (class finding 3). All other
   classes checked: banner.urgent matches English exactly (no class 5 drift),
   readable risk lines keep the reader, no male-only forms (gender-neutral
   plurals throughout), mip ladder intact.
2. Grammar around inserted values. The two gender-locked frames now use the
   invariant participle the file already uses elsewhere (જણાવેલ precedent):
   garbled_sender "મોકલેલ હોય એવું જણાય છે", readable.summary_sender "તરફથી આવેલ
   {type_label}", both grammatical for every label gender. check_wrap uses the
   colon frame ("આ તપાસો: {action_sentence}"), ending the stranded verb.
   Dictionary frames made gender-safe: "તમારો દસ્તાવેજ ({typeName}) વાંચી રહ્યા
   છીએ…", "આ {typeName} હોય એવું લાગે છે." (hedge on the clause, not the noun),
   and the calendar title "{label} તપાસો" (verb-final, no possessive).
   NO data-model change was needed: rewording within the current model solved
   the whole class for Gujarati.
3. Naturalness. consequence.reported dropped the doubled connective
   ("જણાવ્યું છે: {X}"); severity.information_only reads plainly
   ("ફક્ત માહિતી તરીકે દર્શાવેલ છે.").

Verification: render diff scoped to intended lines only; 244 tests pass;
live at phone width in light, dark and focus via ?lang=gu, including a real
scam document through the engine (cards, chips and check panel all Gujarati,
no overflow); the three dictionary compositions confirmed through the real
t() path. Fresh adversarial read: urgent clearly outranks routine, the scam
card keeps the reader as the one who loses and names the deception, nothing
reads machine-made.

For the native reviewer (also in NATIVE_REVIEW.md): whether "આવું થશે" inside
the attribution reads as the letter's threat rather than Northcue's; whether
the invariant participles (મોકલેલ, આવેલ, દર્શાવેલ) sit naturally or stiffly;
the existing scam-line and full-stop questions stand.

Disproved in Phase 0, unchanged: "12 of 51 patterns failing grammar" (real
pattern-level count was 3, all now fixed).

## Hindi (AI-COMPLETE, 30 July 2026; awaiting native review)

Every defect from the Phase 0 list is fixed and verified by rendered output.
Thirty-two strings changed (thirty bank, two dictionary); the render diff
against the Phase 0 corpus shows exactly the intended lines and nothing else.

THE LABEL MODEL QUESTION, ANSWERED: no data-model change is needed. Hindi's
case class is solved by rewording within one-form-per-label: the topic labels
moved to the nominative (their citation form) and the three about-frames
moved onto the colon strategy the product already uses in Polish and
Gujarati ("...हो सकती है. विषय: {topic}."), which leaves the two previously
broken nominative frames grammatical for every value and fixes check.topic
for free. The same shape is the plan for Panjabi's mirror-image problem
(direct-case labels breaking its ਬਾਰੇ frames): keep the labels in citation
form, let the frame carry the case via a colon or an inflected head noun.
One form per label holds across all nine.

What changed, by the phase order:
1. Safety class. The decline banner's clipped conditional is whole ("अगर यह
   कोई पत्र या बिल है, तो..."). banner.urgent no longer escalates: "यह ज़रूरी
   लगता है." matches English "This looks important." and its own
   warning.urgent_result (the mip pair keeps अत्यावश्यक/महत्वपूर्ण; ladder test
   green; rendered ladder confirmed, not reworked). Both readable risk lines
   regained the reader ("आपसे ... छूट सकती है"). The four password and PIN
   chips and verify_identity regained आपसे/आपकी (class finding 3).
   consequence.avoid stopped adding the hedge and reports the letter's claim
   ("...भुगतान न होने पर ऐसा होगा: {consequence}."), the same decision as
   Gujarati.
2. Grammar around inserted values. Ten topic labels to nominative; the three
   about-frames to colon frames; consequence.reported dropped the stranded कि
   ("दस्तावेज़ में लिखा है: {X}."); may_follow became number-neutral ("इसके बाद
   ऐसा हो सकता है: {X}"). All verified across the three contrasting value
   sets; every render is grammatical for every label gender and case.
3. Naturalness. severity.termination glossed concretely ("कॉन्ट्रैक्ट या नौकरी
   खत्म होने का ज़िक्र है."); feedback.confidence.moreAble gender-neutral and
   personal ("अब इसे संभालना आसान लगता है"); landing tag "14 Jul तक".
   Left deliberately: the internal Analytics casing strings (never shown to
   readers).

Verification: render diff scoped to intended lines only; 244 tests pass
including the ladder; live at phone width in light, dark and focus via
?lang=hi with a real scam document through the engine (cards, chips with
आपकी, check panel all Hindi, no overflow); both dictionary changes through
the real t() path. Fresh adversarial read: urgent clearly outranks routine,
the scam card keeps the reader as the one who loses and names the deception
on every chip, nothing reads machine-made.

For the native reviewer (also in NATIVE_REVIEW.md): whether "ऐसा होगा" inside
the attribution reads as the letter's threat rather than Northcue's; whether
the "विषय:" colon frames read naturally on the cards; whether banner ज़रूरी
beside card अत्यावश्यक reads correctly on the same screen (that pairing
mirrors English exactly).

Disproved in Phase 0, unchanged: "9 of 51 patterns failing grammar" (real
count was 2 surfaces, one root cause, now fixed).

## Polish (AI-COMPLETE, 30 July 2026; awaiting native review)

The language is finished: the four informal bank strings are converted, the
interface dictionary is converted in every block, Polish's instances of the
cross-language classes are fixed, and the register decisions are recorded
below for the native reviewer. Roughly 165 strings changed this session
(12 bank, 150 dictionary, plus 3 prose lines the extended screen surfaced);
every changed line was read in rendered output.

The register rules applied, recorded so nobody has to reverse-engineer them:
- Prosimy plus infinitive for every prose request, matching the bank.
- Państwo where the reader must own the sentence (possessives, risk lines,
  the completion count restructure "Mają Państwo za sobą wszystkie karty...").
- Warm impersonals where address adds nothing: encouragements ("Świetnie to
  idzie", "Spokojnie, każde tempo jest dobre"), help-guide reassurances
  ("To zupełnie zrozumiałe"), ability statements ("Można to zmienić...").
- CONTROL LABELS KEEP THE CONVENTIONAL UI IMPERATIVE: buttons, links, tabs,
  aria labels on controls, and short instructional step headings (Prześlij,
  Wybierz plik, Włącz tryb skupienia, Dalej). This is standard register-
  neutral Polish UI, the same convention gov.pl services and Polish banking
  apps use with formal customers, and converting them to Prosimy phrases
  would read broken. The extended scanner intentionally still flags them
  (61 control labels), so the screen stays honest about what was kept.
  THIS IS THE ONE DECISION THE NATIVE REVIEWER MUST CONFIRM (question 1 in
  NATIVE_REVIEW.md).

What changed, by the session order:
1. The four bank strings: "Prosimy traktować to jako pomoc w czytaniu...",
   "Prosimy wykonywać kroki z karty jeden po drugim." (also retiring the
   "karta z działaniem" literalism), "Prosimy mieć numer referencyjny pod
   ręką.", "Prosimy wysłać dokumenty lub formularz, o które proszą."
2. The dictionary, all blocks: landing, home, install, journey, status,
   help, helpGuides, comfort, privacy, why, check, feedback, nav. The
   recorded same-screen register splits are resolved: status.documentReady
   now matches the bank exactly ("Dokument jest gotowy."), status.tryAgain
   matches "Prosimy spróbować ponownie.", and the three mixed-register
   feedback strings read as one register ("Prosimy nie podawać...").
   The safety-adjacent check strings are formal and full strength
   ("Prosimy ignorować wszelkie terminy..., dopóki nie będzie pewności...").
   The informal example email placeholder became imie@przyklad.pl.
3. Cross-language classes: consequence.avoid reports the letter's own claim
   without the added hedge ("...nie zostanie dokonana, nastąpi: {X}."), the
   same decision as Gujarati and Hindi; the four password and PIN chips plus
   verify_identity, freeze and suspend regained Państwa (class 3).
   check_wrap, consequence.reported and may_follow were already sound.
4. Naturalness: the calendar event title is now "Do sprawdzenia: {label}",
   grammatical for every label; encouragements and guides kept their warmth
   through the conversion.

Tooling: the scanner's Polish informal list gained roughly forty imperative
and 2sg forms met during the conversion. The extended screen then surfaced
three prose lines the manual pass had missed (landing.copy.line1,
helpGuides.time.step1Detail, feedback.chooseFirst); all three are converted.
That is the screen-then-read loop working as the standards intend.

Verification: render diff read line by line (11 bank exact lines, 3 pattern
lines, 150 dictionary lines, nothing unintended); 244 tests pass; live at
phone width via ?lang=pl in light, dark and focus across the landing,
journey, cards, check panel, help page, a help guide popup and the feedback
modal, with a real scam document through the engine; compositions
(readingTyped, calendar title, scamDeadline) confirmed through the real t().
Fresh adversarial read: urgent clearly outranks routine, the scam panel
names Państwo on every chip and would stop compliance, and nothing reads
like a bureaucracy; the one deliberate office-register line remains
banner.urgent ("Prosimy tego nie ignorować"), which stays an open native
question from round 2.

For the native reviewer, beyond the standing round-2 questions: the control-
label convention above; the hero "Państwa list, teraz jaśniejszy." tone; the
emergency line register ("...prosimy natychmiast zadzwonić pod numer 999.");
and "nastąpi" inside the attributed consequence.

## Romanian (AI-COMPLETE, 30 July 2026)

Whole-file formal conversion done in one session: every second person
singular form in both files is converted, all three outstanding safety
classes and the eight grammar surfaces are fixed, and the scanner's Romanian
term list is extended and reshaped. Details below; native questions are in
NATIVE_REVIEW.md.

REGISTER RULES FOR THE CONVERSION, recorded 30 July 2026 before any string
was changed, the equivalent decisions to Polish's:

1. Formal address is dumneavoastră-register second person plural throughout.
   Where English says Please, the pattern is "Vă rugăm să" plus the plural
   subjunctive ("Vă rugăm să încărcați o imagine mai clară."). Card
   instructions without Please use the bare plural imperative ("Verificați
   documentul original."), which in Romanian IS the polite form, not a
   register break.
2. On risk lines the reader stays the grammatical subject, via the plural
   conditional, which carries no gender: "Ați putea pierde bani sau divulga
   date private."
3. Controls, buttons, nav tabs and step headings need NO register split in
   Romanian, unlike Polish. The plural imperative (Încărcați, Alegeți,
   Trimiteți, Aflați mai multe) is simultaneously the formal register and
   the standard convention of Romanian institutional and banking software
   (Microsoft ro-RO style, e-guvernare, bank sites). So controls convert
   along with prose and the file ends with zero second person singular
   forms. Nouns stay nouns (Acasă, Ajutor, Concentrare).
4. Possessives: tău/ta/tale become "dumneavoastră" after the noun, kept
   where ownership matters (the reader's document, data, feedback), dropped
   for the bare definite article where the sentence would stack two of them.
5. Warm impersonals where address adds nothing, so encouragement does not
   drown in dumneavoastră: "Merge foarte bine.", "Aproape gata.", "Orice
   ritm este bun."
6. De-gendering is folded into the conversion (class finding 4). In formal
   address Romanian participles and adjectives still agree with the
   reader's real gender ("sunteți sigur/sigură"), so NO adjective or
   participle may be predicated of the reader anywhere in either file.
   Rephrase actively or impersonally: "Cineva ar putea să vă păcălească"
   for păcălit, "pe cont propriu" for singur, "Totul pare copleșitor" for
   copleșit, "M-a derutat" for confuz, "Îmi este mai ușor să mă ocup de ea"
   for capabil, "Încă am îndoieli" for nesigur. The Phase 0 list had four
   instances; the conversion sweep must also catch copleșit, confuz and
   sigur in the feedback and help blocks, same class.
7. "împărtăși" is for sharing feelings; disclosing data to a stranger is
   "divulga" (risk_extractor, risk_card, strip.detail_request, and the
   fake-document guide). Sharing the summary with a trusted helper stays
   "împărtăși".
8. Cue-card naming settled to one term each: the six cards are "carduri cu
   indicii"; the card with the steps is "cardul de acțiune" everywhere, so
   banner.default retires "cardul cu pasul următor".
9. The hardcoded masculine "Acesta (nu) pare a fi" frames: drop the pronoun
   in slot frames ("Pare a fi {type_label}..."), Romanian subject drop is
   native, and name the subject in the fixed non-document strings ("Acest
   fișier nu pare a fi...").
10. tpl.banner.suspicious_urgent is ALREADY formal and stays byte-identical
    through the conversion.

WHAT WAS FIXED, all verified in re-rendered output against the frozen
pre-session corpus (about 100 bank strings and about 175 dictionary strings
changed; every changed line was read):

Safety classes, all three closed:
1. Male-only reader forms (class finding 4): risk_card is now active voice,
   "Cineva ar putea să vă păcălească să faceți o plată nesigură sau să
   divulgați date."; "ca să fii sigur" became "pentru siguranță" on both
   bill_in_credit forms; check.lowTrustStep uses "Căutați pe cont propriu";
   confidence.moreAble became "Îmi este mai ușor să mă ocup de ea". The
   conversion sweep found the same class in three more places Phase 0 had
   not listed and fixed them the same way: "Mă simt copleșit" (four keys)
   became "Totul pare copleșitor", "Nu, am fost confuz / Am rămas confuz"
   became "Nu, m-a derutat / Tot nu mi-e clar", "Încă nu sunt sigur" became
   "Încă am îndoieli". No adjective or participle is predicated of the
   reader anywhere in either file now.
2. "împărtăși" for handing over data became "divulga" on risk_extractor,
   risk_card, strip.detail_request and the fake-document guide. The single
   kept "Împărtășiți" (person.step1Detail) is sharing the summary with a
   trusted helper, the verb's real sense. Alongside, "detalii personale"
   was settled to "date personale", the standard data-protection term.
3. tpl.banner.suspicious_urgent was already formal and is byte-identical
   through the conversion, confirmed by diff.

Grammar class, all nine surfaces: the four slot patterns dropped the
pronoun ("Pare a fi {category_label}. ..." / "Pare a fi {type_label}
despre {topic}.", correct in all three value sets in render), and the four
fixed exacts name the subject ("Acest fișier nu pare a fi..."). A ninth
instance surfaced during conversion: journey.cardStyleSelected locked
masculine "selectat" against feminine and plural style labels; fixed with
the label-safe colon frame "Stil selectat: {styleLabel}." (the Hindi
citation-form principle). calendarEventTitle also moved to the colon frame
"De verificat: {label}", matching the Polish decision.

Formality: zero second person singular forms remain in either file. The
scanner's Romanian informal count is 0; its list was roughly tripled with
every 2sg form met during the conversion, and reshaped for the Romanian
homograph trap (2sg imperative of -a/-e verbs equals the 3rd person
indicative, and the -e infinitive equals the imperative): "citește",
"folosește" and "trimite" are documented in the list's comment instead of
listed, because their only remaining matches are third person or
infinitive ("Folosește un limbaj de presiune", "Northcue îl citește",
"pentru a trimite"). The screen-then-read loop caught nine dictionary
strings the manual pass had missed (language.title and language.aria.open
"Alege limba", topbar.aria.openComfort, landing.example.more,
landing.preview.whatToDo.title, journey.aria.privacyNote,
help.tier.support, status.typeConfirmAuto, check.categoryOutgoing); all
nine are converted. One deliberate exception stays: "Adaugă la ecranul
principal" inside the two iOS install lines quotes the iPhone share-menu
item and keeps the OS's own wording; our verb in the same sentence is
formal ("atingeți").

Naturalness: the "Ține-ți banii și detaliile personale protejate" calque
became "Protejați-vă banii și datele personale."; the cue-card naming
wobble is settled ("carduri cu indicii" for the six cards, "cardul de
acțiune" for the action card, banner.default now "Citiți mai întâi cardul
de acțiune."); bill_in_credit lost its double hedge ("Se pare că este
posibil ca...") for "Contul dumneavoastră pare să fie în credit, deci
s-ar putea să nu aveți nimic de plătit.", both hedges preserved once each;
mip.action_required ends "Vedeți ce aveți de făcut."; encouragements are
warm impersonals ("Merge foarte bine.", "Aproape gata.", "Orice ritm este
bun.").

DISPROVED earlier lead, unchanged: tpl.risk.medium "poate crea" does not
break the mood ladder; English itself steps from could down to may.
Latent only, still no fix needed: "toate cele {count} carduri" would need
"de" at 20 or more; card counts are single digits.

VERIFICATION: 244/244 tests pass. Rendered corpus re-generated with the
frozen tooling and byte-diffed against the pre-session baseline; every
changed line was read, and nothing outside the intended strings moved.
Live at 375px via ?lang=ro in light, dark and focus: landing, journey
upload, a real scam document through the engine (all six cards read in
place, banner, check panel with hero step, "Nu suntem siguri, vă rugăm să
aveți grijă", the scam deadline line and the chips "Vă cere să confirmați
o parolă" / "Amenință că vă suspendă contul într-un timp scurt"), help
page, the overwhelmed guide popup, and the feedback modal through the
"Nu, m-a derutat" path with the confidence options.

CROSS-LANGUAGE FINDING, found during this verification and FIXED the same
day (30 July 2026), app layer, not a Romanian file defect: strings that
app.js writes with t() at init resolved from English because the language
file loads asynchronously, and applyTranslations() covers data-i18n markup
only. The audit of every dynamic writer found four affected surfaces: the
focus-mode toggle labels, the card detail toggle, the detected-type line,
and the keyed status line; the toggles were broken twice over, because
applyTranslations also stomped their state-dependent visible spans back to
the default label whenever a language applied (a saved simple-view state
showed the aria for one state and the span for the other). Everything
else dynamic is written at render or open time and resolves correctly.
The fix is one function, refreshDynamicI18nText() in app.js, which
re-runs the toggle setters with state read back from the DOM and nothing
saved, re-resolves the type line, and re-derives the status line from
lastStatusTitleKey. It runs on every northcue:languagechange event,
attached BEFORE the switcher's fewer-than-two-languages early return
(otherwise the dev preview never gets it), plus once at wiring time to
cover a language file that finished loading first. Guarded by a new
i18nStandards test (245 total now); cache tokens bumped (index.html
app.js ?v=, sw.js CACHE_VERSION). Verified live at 375px on first load
with NO toggling: ?lang=pl announces "Tryb skupienia" and, with simple
view active from saved preferences, aria and span agree on "Pokaż pełne
szczegóły"; ?lang=ro announces "Mod concentrare" and "Arătați toate
detaliile"; plain English load is unchanged with a clean console.

## Bengali (AI-COMPLETE-PENDING-CONVENTION, 30 July 2026)

Everything on the verified list is fixed and render-verified; the one open
item is the suffix-hyphenation convention, which is deliberately NOT decided
here. The affected strings are enumerated in NATIVE_REVIEW.md so the native
checker can settle it once with the full list in front of them. Until then
the file keeps its current space-detached convention, confirmed consistent
(zero hyphenated instances in either file).

WHAT WAS FIXED, all verified in re-rendered output against the frozen
pre-session corpus (19 bank strings and 1 dictionary string changed; every
changed line was read across all three value sets):

Safety and classes:
1. Class 2, found on the check the phase brief ordered even though Phase 0
   had marked Bengali safety clean: tpl.consequence.avoid added "হতে পারে"
   inside the letter's attributed consequence where English reports without
   modality. It now reports the claim with the cross-language colon frame:
   "ডকুমেন্টটি বলছে, পেমেন্ট না করলে এটি হবে: {consequence}. মূল ডকুমেন্টটি
   দেখে নিন." (the gu/hi/pl decision).
2. Class 1, broken frames around verbatim English fragments, three fixes to
   the colon frame: check_wrap "এটি যাচাই করুন: {action_sentence}" (was the
   verb-first calque "যাচাই করুন the amount shown."), reported "ডকুমেন্টে
   লেখা আছে: {sentence_body}." (was যে stranded before a noun phrase), and
   may_follow "এরপর এটি হতে পারে: {consequence_clause}" (was the fragment
   sentence-initial; the hedge here is English's own "may follow" and is
   kept).
3. Class 3, readers restored: mip.urgent second sentence now "আপনাকে আজই
   পদক্ষেপ নিতে হতে পারে.", risk_response and risk_dates gained আপনার
   ("...আপনার চোখ এড়িয়ে যেতে পারে."), and the verify_identity chip gained
   আপনার ("অল্প সময়ের মধ্যে আপনার পরিচয় যাচাই করতে চাপ দেওয়া হয়েছে.") to
   match its freeze and suspend neighbours.

Grammar and naturalness:
4. The eight verbless "X নিয়ে." card-1 answers are complete predicates now
   with the সংক্রান্ত frame ("এটি বিমা সংক্রান্ত.", "এটি বিল বা পেমেন্টের
   অনুরোধ সংক্রান্ত."), one shape across all eight; সংক্রান্ত is already the
   file's own register (বেনিফিট বা কল্যাণ সংক্রান্ত চিঠি). Flagged for the
   native reviewer in case it reads stiff.
5. garbled_sender restored object-verb order ("মনে হচ্ছে {sender}
   {category_label} পাঠিয়েছে."), matching its gov_sender_amount sibling;
   correct with all three senders in render.
6. mip_topic rejoined the file's verb-final frame ("সবচেয়ে পরিষ্কার বিষয়টি
   {topic} বলে মনে হচ্ছে."); Bengali needs no citation-form change because
   topics carry no case or gender agreement, so the Hindi label model
   question does not arise.
7. review.unsupported negation scope fixed with the adjective the file
   already owns ("কিছু অংশ অস্পষ্ট বা অসমর্থিত."); review.verification now
   uses লক্ষণ so ধরন stays reserved for document type.
8. Lower tier, all resolved: the দেখা যাওয়া attributive is gone (check.dates
   "এই তারিখগুলি যাচাই করুন:", kp_amount "দেখানো অঙ্ক:", risk_dates
   rephrased); bare অঙ্ক in the mock steps became টাকার অঙ্ক, the file's own
   moneyFormat idiom; the focusHelper button label is quoted ('এই
   ডকুমেন্টটি বুঝুন'); পড়ার যোগ্য stacking removed (review_reason "এই
   ধরনের ডকুমেন্ট পড়া গেলেও এখনও পুরোপুরি সমর্থিত নয়.", summary.unknown
   "এটি একটি আনুষ্ঠানিক ডকুমেন্ট, যা পরিষ্কারভাবে পড়া যাচ্ছে."). The
   "doubled একটি" note was checked against the full rendered corpus: no
   adjacent doubling exists anywhere; the "আরও পরিষ্কার একটি ছবি বা অন্য
   একটি পাতা" coordination is natural and left alone.

Formality: formal throughout, zero informal forms, re-confirmed by the
scanner after the changes. No danda and no dashes in either file. The
scanner's hedge and refusal rows for Bengali were read one by one: all are
the documented screen-noise shapes (Bengali fuses negation into verb
endings like পায়নি that the marker list cannot see, and the English side
false-fires on could and appear); every Bengali line carries its negation
or hedge in the verb morphology. Term lists left as screening floors,
consistent with the Polish and Romanian sessions.

VERIFICATION: 245/245 tests pass. Rendered corpus re-generated with the
frozen tooling and byte-diffed; only the intended lines moved. Live at
375px via ?lang=bn in light, dark and focus: landing, journey upload with
the quoted focus helper, a real scam document through the engine (all six
cards read in place, card 5 showing "দেখানো অঙ্ক: £499.00."), the check
panel with the scam category, "আমরা নিশ্চিত নই, দয়া করে সাবধান থাকুন",
the scam deadline line and reader-present chips, and the help page with
the 999 line intact.

Adversarial read as a frightened reader: জরুরি with "আপনাকে আজই" clearly
outranks গুরুত্বপূর্ণ with its explicit "তবে জরুরি অবস্থা নয়"; the scam
card speaks about me and the deception verb ঠকিয়ে is present; the
consequence card now reads as the letter's threat reported by Northcue,
filed as the standard attribution question for the native reviewer.

## Panjabi (AI-COMPLETE, 30 July 2026)

Every item on the verified list is fixed and render-verified in one session:
the four safety items, all three grammar classes including the mirrored
label problem, the label defect, both formality wobbles, and the whole
naturalness list. About 30 bank strings and 13 dictionary strings changed;
every changed line was read across all three value sets.

Safety, all four closed:
1. banner.urgent returned to ਜ਼ਰੂਰੀ ("ਇਹ ਜ਼ਰੂਰੀ ਲੱਗਦਾ ਹੈ. ਇਸਨੂੰ ਅਣਗੌਲਿਆ ਨਾ
   ਕਰੋ."), the explicit class-5 decision: the banner no longer escalates
   past English and no longer near-duplicates the mip.urgent opener on the
   same screen. The ladder test's relational checks stay green (banner vs
   both high_stakes tiers is distinct, as in English).
2. garbled.review_reason regained the hedge: "ਰਕਮਾਂ ਅਤੇ ਤਾਰੀਖ਼ਾਂ ਸ਼ਾਇਦ
   ਭਰੋਸੇਯੋਗ ਨਾ ਹੋਣ." replaces the cannot-be-reliable hardening.
3. All five agentless scam chips regained the reader: ਤੁਹਾਨੂੰ on the four
   password and PIN chips, ਤੁਹਾਡੀ on verify_identity, matching their
   freeze and suspend neighbours.
4. consequence.avoid reports the letter's claim without the added "ਹੋ ਸਕਦਾ
   ਹੈ", through the cross-language colon frame: "ਦਸਤਾਵੇਜ਼ ਕਹਿੰਦਾ ਹੈ ਕਿ ਅਦਾਇਗੀ
   ਨਾ ਹੋਣ ਉੱਤੇ ਇਹ ਹੋਵੇਗਾ: {consequence}." (the gu/hi/pl/bn decision). Its
   class-1 siblings took the same shape: reported "ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਲਿਖਿਆ ਹੈ:
   {sentence_body}." (stranded ਕਿ gone) and may_follow "ਇਸ ਤੋਂ ਬਾਅਦ ਇਹ ਹੋ
   ਸਕਦਾ ਹੈ: {consequence_clause}" (hedge kept, it is English's own; the
   singular lock over plural values dissolved with the colon).
Verified intact and untouched: the rebuilt mip ladder, the scam risk lines
(ਗੁੰਮਰਾਹ ਕਰਕੇ, reader present, ਕਰ ਬੈਠ), ਗੰਭੀਰ on suspicious_urgent,
refusals, the term-plus-gloss policy.

Grammar, all surfaces fixed with Hindi's proven strategy:
1. The mirrored label problem: topic labels stay in citation form and the
   three ਬਾਰੇ frames became ਵਿਸ਼ਾ colon frames, mirroring Hindi exactly
   ("ਇਸ ਵਿੱਚ ਕੋਈ ਆਖ਼ਰੀ ਤਾਰੀਖ਼ ਹੋ ਸਕਦੀ ਹੈ. ਵਿਸ਼ਾ: {topic}.", "ਇਹ ਕੋਈ ਜਵਾਬ ਮੰਗ
   ਸਕਦਾ ਹੈ. ਵਿਸ਼ਾ: {topic}.", summary_topic "ਇਹ ਦਸਤਾਵੇਜ਼ {type_label} ਲੱਗਦਾ
   ਹੈ. ਵਿਸ਼ਾ: {topic}."). Grammatical for every label in every set in
   render; the doubled articles of sets A and B dissolved with the split.
2. Gender-locked frames, both directions, fixed by anchoring agreement on
   an overt masculine subject: "ਇਹ ਦਸਤਾਵੇਜ਼ {category_label/type_label}
   ਲੱਗਦਾ ਹੈ" in garbled, readable.summary, summary_sender and
   summary_topic, correct with feminine ਬੇਨਤੀ and masculine ਦਸਤਾਵੇਜ਼ values
   alike. garbled_sender's ergative now agrees with an invariant object:
   "ਲੱਗਦਾ ਹੈ ਕਿ {sender} ਨੇ ਇਹ ਭੇਜਿਆ ਹੈ: {category_label}."
3. The label defect fixed: type_label.legal_or_court is "ਇੱਕ ਕਾਨੂੰਨੀ ਜਾਂ
   ਅਦਾਲਤੀ ਚਿੱਠੀ", article before the adjective like its siblings.
Also fixed in the same family: journey.calendarEventTitle's ਆਪਣਾ locked
masculine against feminine ਚਿੱਠੀ labels; it took the label-safe colon frame
"ਜਾਂਚਣ ਲਈ: {label}" (the pl/ro decision), with the generic made parallel.
Still latent, no fix needed: analytics ਫ਼ੀਲਡ never pluralises.

Formality wobbles, both settled: feedback.confidence.moreAble is the
genderless "ਹੁਣ ਇਸ ਨਾਲ ਨਜਿੱਠਣਾ ਵੱਧ ਸੌਖਾ ਲੱਗਦਾ ਹੈ"; feedback is ਫੀਡਬੈਕ
everywhere, the help-page ਰਾਏ pair converted with its agreement.

Naturalness, all items resolved: ਅਸਲ regained ਦਸਤਾਵੇਜ਼ in the three bare
strings; the clipped sender frame gained its participle ("ਵੱਲੋਂ ਆਇਆ ਲੱਗਦਾ
ਹੈ", all 15 renders correct); the urgency chips dropped the calque ("ਸਮਾਂ
ਘੱਟ ਲੱਗਦਾ ਹੈ" above "ਸਮਾਂ ਜ਼ਰੂਰੀ ਹੈ", ladder preserved); "ਸ਼ਾਂਤ ਸਹਾਰਾ ਲਓ"
became "ਥੋੜ੍ਹਾ ਸਹਾਰਾ ਲਓ" (three keys); documents_to_send is "ਭੇਜਣ ਲਈ
ਦਸਤਾਵੇਜ਼ਾਂ", no longer colliding with ਭੇਜਣ ਵਾਲਾ the sender; the benefits
comma pairs closed their case gap ("ਅਸਲ ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਜਾਂ ਭੇਜਣ ਵਾਲੇ ਤੋਂ
ਜਾਂਚੋ"); why.blockC uses the plain negative ("ਤੁਹਾਨੂੰ ਨਹੀਂ ਡਰਾਵੇਗਾ"); the
badly-taught-person reading is gone ("ਅਜੇ ਪੂਰੀ ਤਰ੍ਹਾਂ ਤਿਆਰ ਨਹੀਂ", three
strings); the landing tag is "14 Jul ਤੱਕ" (the Hindi decision); the landing
example title carries its gloss ("Council Tax (ਕੌਂਸਲ ਟੈਕਸ) ਬਿੱਲ"), closing
the one gloss gap; the focus helper quotes its button label ('ਇਸ ਦਸਤਾਵੇਜ਼
ਨੂੰ ਸਮਝੋ'), the Bengali decision.

The nine settled cross-community word choices were not reopened. No new
choice made this session carries that weight (ਤਿਆਰ, ਥੋੜ੍ਹਾ ਸਹਾਰਾ, ਸਮਾਂ ਘੱਟ
are register-neutral); ਫ਼ੌਜਦਾਰੀ and ਬਿੰਦੀ remain native vocabulary
questions, filed in NATIVE_REVIEW.md.

VERIFICATION: 245/245 tests pass, scanner informal count 0, no danda, no
dashes. Rendered corpus re-generated with the frozen tooling and
byte-diffed; only the intended lines moved, read line by line across all
three value sets. Live at 375px via ?lang=pa in light, dark and focus
with Gurmukhi rendering correctly throughout (conjuncts, addhak, nukta):
landing with the glossed example tile, a real scam document through the
engine (all six cards read in place, the £499.00 slot correct), the check
panel with "ਤੁਹਾਨੂੰ ਪਾਸਵਰਡ ਦੀ ਪੁਸ਼ਟੀ ਕਰਨ ਲਈ ਕਿਹਾ ਗਿਆ ਹੈ" live, the help page
with ਫੀਡਬੈਕ settled and the 999 line intact, and the feedback modal with
the genderless confidence option.

Adversarial read as a frightened reader: the banner now says looks
important while card 2 says needs immediate attention with "ਅੱਜ ਹੀ", so
urgency clearly outranks routine without the same sentence twice on one
screen; the scam card names me and the deception; the consequence card
reads as the letter's threat reported by Northcue, filed as the standard
attribution question for the native reviewer.

## Spanish (AI-COMPLETE, 30 July 2026)

Every item on the verified list is fixed and render-verified in one session:
the seven safety items led by the deadline inconsistency, the grammar
classes, the hemisphere neutralisations and the naturalness list. About 25
bank strings and 12 dictionary strings changed; every changed line was read
across all three value sets.

THE DEADLINE DECISION: Northcue expresses a deadline in Spanish with the
INCLUSIVE form, "hasta el {date}" ("con plazo hasta el {date}" where it
follows an amount, "Vence el" on the landing tag, both already inclusive).
bill_full was the one exclusive holdout ("antes del") and now reads "con
plazo hasta el {date}", matching card 4's "Plazo hasta el {date}" so one
document can no longer show two different last days for the same date.
Verified mechanically: zero occurrences of "antes del" remain anywhere in
the re-rendered corpus, and the enforcement scenario's card 1 and card 4
now carry the same reading of 1 June 2026.

Safety, the other six closed: banner.urgent restored the prohibition ("No
lo deje pasar."); why.blockD.body refuses instead of preferring ("se niega
a responder en lugar de adivinar", agreeing with its own next sentence);
status.readingHintTyped hedges detection with the label-safe colon frame
("Parece ser de este tipo: {typeName}.", which also sidesteps the gendered
article the typeName values would otherwise force); the su-ambiguity died
in both surviving strings ("los datos de contacto oficiales de esa
organización", "el sitio web o la aplicación oficial de esa organización");
banner.high_stakes_urgent widened back from a reply to attention ("que
quizá haya que atender pronto"); and the conviene family is necessity now
("Hace falta revisar...") across banner.caution, review.default,
review.borderline, lowQuality.helpful_note and mock.what_matters_most.
risk.high says "sanciones". The class-2 check the phase brief ordered:
Spanish's consequence.avoid carries NO added hedge (dice, reports as
fact), confirmed clean; its class-1 frame is fixed below.

Grammar: the three consequence frames took the cross-language colon shape
("El documento dice que, si no se realiza un pago, pasará esto:
{consequence}.", "El documento indica lo siguiente: {sentence_body}.",
"después podría pasar esto: {consequence_clause}", which also dissolves
the podría-producirse singular lock). The stranded appositions read "y la
fecha {date}" in generic_full and generic_amount_date. The stacked-de
misreads are gone: benefits.summary_sender says "enviada por {sender}"
(fixed feminine head), and readable.summary_sender, whose type_label
values render in BOTH genders, uses the agreement-free clause "Esto parece
{type_label} y viene de {sender}.", a lock my first fix (enviada) would
have reintroduced, caught in the render read and corrected.
appt_sender_date says "para el {date}". One instance beyond the list, the
same defect Romanian had: cardStyleSelected locked masculine "seleccionado"
against feminine style labels; fixed with the colon frame "Estilo
seleccionado: {styleLabel}."

Region and formality: usted throughout, no vosotros, no printed pronouns
added. Neutralised: Enhorabuena to Felicidades, the corre-prisa pair to
"¿Cuánta urgencia tiene?" and "Parece haber poco tiempo" (heading now
clear as a question), desahucio to desalojo on the eviction chip, the one
"pulse" to "toque" (with the button label quoted, the cross-language
decision). Both "usted mismo" male-only forms became "por su cuenta".

Naturalness: bill_in_credit says "Puede que su cuenta tenga saldo a favor"
in both forms; the landing pronoun is the neuter "Nosotros lo aclaramos."
so the mixed antecedents hold; check.genuineMeaning completes ("de quien
dice enviarla"); the four password and PIN chips regained the reader ("Le
pide...", class finding 3); the privacy intro lands ("Los tratamos como
tales.").

VERIFICATION: 245/245 tests pass, scanner informal count 0, no dashes.
Rendered corpus re-generated with the frozen tooling and byte-diffed; only
the intended lines moved, read line by line across all three value sets.
Live at 375px via ?lang=es in light, dark and focus: landing, a real scam
document through the engine (all six cards read in place, the £499.00
slot correct), the check panel showing "¿Cuánta urgencia tiene?", the
scam deadline line and "Le pide confirmar una contraseña", and the help
page with the fake-document guide popup showing both su-ambiguity fixes.

Adversarial read as a frightened reader: "Esto es urgente. Puede que
necesite actuar hoy." clearly outranks "importante, pero no es una
emergencia"; the urgent banner now forbids rather than advises; the scam
card speaks to me ("Podrían engañarle...") and the chips name me; nothing
reads like a machine, and the one deliberately firm line stays the
prohibition on the urgent banner, filed for the native reviewer.

## French (AI-COMPLETE, 30 July 2026)

Every item on the verified list is fixed and render-verified in one session.
About 30 bank strings and 17 dictionary strings changed; every changed line
was read across all three value sets.

Safety: the legal_response chip carries the required weight ("est exigée",
matching its immediate_payment sibling, live since the chip fix delivered
it to readers). The three bare commands regained the house politeness, and
the whole ", s'il vous plaît" trailer family (14 lines, including the
status.errorTitle page heading) converted to the Veuillez + infinitive
house pattern in the same pass; the one kept "s'il vous plaît" is
feedback.contactBtn, the reader's own voice asking Northcue to call. The
class-2 check the phase brief ordered: French's consequence.avoid carries
NO added hedge ("indique", reports as fact), confirmed clean; its missing
colon cue is fixed below.

Class 4, male-only reader forms, all closed: risk_card went active ("On
pourrait vous tromper et vous amener à..."), "pour en être sûr" became
"pour vous en assurer" (three surfaces: benefits response and both
in-credit forms), "Toujours incertain" became "Encore des doutes", and the
sweep caught one more instance beyond the list: "cela m'a aidé" agrees
with the reader through the preceding object pronoun, so the yes-rating
pair became "Oui, cela m'a été utile" / "Cela m'a été utile" (été
invariable). Class 3: the four password and PIN chips regained the reader
("Vous demande de confirmer un mot de passe."), matching their
verify_identity, freeze and suspend siblings; this session's rendered
reading located it even though Phase 0's third-person note had passed the
labels (the subjects were right; the object "you" was missing).

Grammar: "la date du {date}" in all three generic frames, nine rendered
lines correct; the consequence frames took the cross-language colon shape
("Le document indique que, si un paiement n'est pas effectué, il se
passera ceci : {consequence}.", "Le document indique ceci :
{sentence_body}.", "ensuite, il peut se passer ceci :
{consequence_clause}"), which kills the may_follow class-1 shape and the
latent qu' elision hazard together; cardStyleSelected is the colon frame
"Style choisi : {styleLabel}." (was wrong four times out of four).

Elision re-verified: zero de/d'+sender shapes anywhere in the re-rendered
corpus, the par strategy holds, and the appointment frames joined it
("un rendez-vous annoncé par {sender}, le {date}"), which also repairs
the with-the-sender accuracy loss.

Naturalness, all items resolved: the juridique-ou-de-tribunal family is
judiciaire on all six surfaces (five bank, one dict category); "Une erreur
s'est produite." replaces the calque; "Protégez votre argent et vos
données personnelles."; "que vous avez envoyé / envoyée" for the two
envoyé-par-vous forms; why.blockC.title quotes 'je ne suis pas sûr'; the
lead says "vous serre le cœur"; moneyFormat says "Dans le format
britannique,"; the opaque chip is "Le temps compte"; "Crème chaude"
agrees; risk.urgent and why.blockC align on graves/grave. The plain space
before ? and : stays product-wide, the committed spec decision, no
non-breaking spaces introduced.

VERIFICATION: 245/245 tests pass, scanner informal count 0, no dashes,
hedge and refusal rows read one by one (all the documented en-side noise;
every French line carries its hedge in pourriez or n'a pas pu). Rendered
corpus re-generated with the frozen tooling and byte-diffed; only the
intended lines moved. Live at 375px via ?lang=fr in light, dark and
focus: landing, a real scam document through the engine (all six cards
read in place, the £499.00 slot and the new moneyFormat note correct),
the check panel with "veuillez faire attention" and the restored-reader
chip live, NO horizontal overflow with the long French strings at phone
width, the help page and the feedback modal with the de-gendered options.

Adversarial read as a frightened reader: "C'est urgent. Vous devrez
peut-être agir aujourd'hui." clearly outranks "important, mais ce n'est
pas une urgence"; the scam card names me and the trickery in active
voice; the consequence card reads as the letter's threat reported by
Northcue, filed as the standard attribution question; nothing reads like
a machine, and the Veuillez register is uniform rather than officious.

## Portuguese (AI-COMPLETE, 30 July 2026)

THE REGIONAL DECISION, SETTLED THIS SESSION: hemisphere-neutral wording,
per the original brief. Reasoning: the UK Portuguese-speaking audience
includes both Portuguese and Brazilian communities, with the Brazilian
community the larger; the file's EP markers sat on the highest-traffic
surfaces (card 1, the submit status, the scam chips); and unlike Panjabi
there is no script argument for one side. The scope is the ten
high-traffic marker families Phase 0 listed, resolved as: the estar-a
progressives recast (parece pedir, Leitura em curso, Vamos tratar como,
Vai muito bem); ficheiro to arquivo; carregar/carregamento to
enviar/envio; palavra-passe to senha on all four scam-chip surfaces;
telemóvel to telefone; câmara municipal to administração local; "para si"
rephrased (funcionou no seu caso), because it reads reflexive to
Brazilian readers; ecrã avoided in our own prose (Simplifica a página; a
screenshot is "um screenshot", the word both communities use in the UK),
kept ONLY inside the iOS share-menu quote, which cites the pt-PT OS
wording (the same OS-quote precedent as Bengali and Panjabi); and
contacto/contactos KEPT with the c, the one marker resolved by keeping:
the spelling is Acordo-valid, transparent to Brazilian readers, and the
alternative reads as a typo to European ones. Shared-register EP forms
both communities read without stumbling (demasiado, marcação,
arrendamento, definições) stay. Verified mechanically: zero occurrences
of carreg-, ficheiro, palavra-passe, telemóvel, câmara municipal, estar-a
progressives or "para si" anywhere in the re-rendered corpus, with the
single deliberate ecrã in the iOS quote.

Safety, all closed: the bailiff chip carries enforcement weight with the
UK-term-plus-gloss convention ("agentes de execução (bailiffs)"), fixing
the under-alarming failure on the top severity tier; next_step.urgent
says "Veja agora", no longer pushing past English as the bailiff set's
closing line; risk.high says "penalizações"; the verify_identity chip has
its object ("Pressiona para que verifique a sua identidade..."); and
risk_card is gender-free via the vítima recast ("Pode ser vítima de um
engano e acabar por fazer um pagamento inseguro ou partilhar dados."),
since Portuguese has no gender-free object clitic. The class-2 check the
phase brief ordered: consequence.avoid carries NO added hedge (indica,
reports as fact), confirmed clean. The password and PIN chips were
checked for the French failure specifically: their "Pede que confirme"
subjunctive carries the reader as its subject, so no object restore was
needed; recorded as checked. mip.urgent regained its reader ("Pode ter
de agir hoje."), the cross-language class-3 shape.

Grammar: "a data de {date}" in both generic frames; the consequence
frames took the cross-language colon shape ("O documento indica que, se
um pagamento não for feito, acontecerá isto: {consequence}.", "O
documento indica o seguinte: {sentence_body}.", "depois, pode acontecer
isto: {consequence_clause}"), which dissolves the pode-seguir-se singular
lock and the a-late-fee article misparse together; the de+sender chains
are gone (readable.summary_sender uses Spanish's agreement-free clause
"Isto parece ser {type_label} e vem de {sender}." because type_label
values span genders; benefits.summary_sender says "enviada por" against
its fixed feminine head); the label family settled on "jurídico ou
judicial" across all six surfaces, which also kills the
court-OF-Marston misparse; bill_in_credit regained "A sua conta" in both
forms; cardStyleSelected took the colon frame ("Estilo selecionado:
{styleLabel}.", the ro/es/fr defect and fix).

Naturalness: home.dash.intro anchors its agreement on "um documento
confuso" and "Os cartões mostram" replaces the calque; banner.urgent
completes ("Não o ignore."); the é-precisa family reads plainly ("seja
necessário agir", "é exigida uma resposta jurídica", which also removes
the lawful-reply misreading); the 999 line puts its subjects first ("Se
você ou outra pessoa estiver em perigo imediato, ligue para o 999.",
the one deliberate "você", clarity over register purity in an
emergency); the mencionando gerunds became "e menciona"; the
Contacte-contactos echo became "Fale com o remetente usando contactos de
confiança."; review.template dropped its added claim ("Foram encontrados
sinais de modelo."); genuineLow lost its comma splice; summary.outgoing
regained its reader ("que preparou para enviar") with categoryOutgoing
made parallel.

DISPROVED claims stay disproved: the medical and legal summary lines
match their flat English sources; all hedges verified present.

VERIFICATION: 245/245 tests pass, scanner informal count 0, no dashes.
About 55 bank strings and 60 dictionary strings changed; rendered corpus
re-generated with the frozen tooling and byte-diffed, every changed line
read across all three value sets. Live at 375px via ?lang=pt in light,
dark and focus: landing, a real scam document through the engine (all
six cards read in place, the £499.00 slot correct), the check panel with
the senha chip and the splice-free genuineLow live, no horizontal
overflow, and the help page with "Enviei o arquivo errado", "no seu
caso" and the rebuilt 999 line.

Adversarial read as a frightened reader: "Isto é urgente. Pode ter de
agir hoje." clearly outranks "importante, mas não é uma emergência"; the
bailiff chip now sounds like enforcement, not routine debt collection;
the scam card names the deception and would stop me; nothing reads like
a machine, and the neutralised wording reads as one calm voice rather
than a region.

---

## PHASE 2 CLOSING SUMMARY (30 July 2026)

All nine languages have had their full Phase 2 pass, every fix verified by
rendered output against the frozen Phase 0 corpus, live at phone width in
light, dark and focus, with the full test suite green (245) and all nine
languages still disabled.

Status: Gujarati AI-COMPLETE. Hindi AI-COMPLETE. Polish AI-COMPLETE.
Romanian AI-COMPLETE. Bengali AI-COMPLETE-PENDING-CONVENTION (one open
decision, the suffix-hyphenation convention, deliberately left to the
native checker with the complete 35-string list in NATIVE_REVIEW.md).
Panjabi AI-COMPLETE. Spanish AI-COMPLETE. French AI-COMPLETE. Portuguese
AI-COMPLETE, neutralised between European and Brazilian reading under the
settled regional decision recorded in its section.

THE CROSS-LANGUAGE DECISIONS THAT NOW BIND ALL NINE:
1. Attributed consequences report the letter's own claim without added
   modality, through a colon frame that also isolates the verbatim
   English fragment. Fixed where the hedge had crept in (gu, hi, pl, bn,
   pa), confirmed absent then colon-framed in es, fr and pt, verified
   clean in ro.
2. Verbatim English fragments are handed over after a colon, never
   inflected around: check_wrap, reported and may_follow share the shape
   in every language that needed it.
3. Labels stay in citation form and frames carry the case or gender:
   Hindi's nominative labels with colon frames, Panjabi's ਵਿਸ਼ਾ mirror,
   Gujarati's invariant participles. Where type_label values span
   genders, either an overt fixed-gender subject (Panjabi) or the
   agreement-free clause (Spanish, Portuguese) does the work. The same
   principle covers calendarEventTitle and cardStyleSelected everywhere
   the label could break the frame (pl, ro, pa, es, fr, pt).
4. Readers stay inside warnings and chips: the password and PIN chips
   carry their object pronoun in es, fr and pa, বাংলা's verify_identity
   carries আপনার, and Portuguese's subjunctive was checked and already
   carries the reader.
5. No adjective or participle is predicated of the reader in a language
   where it would gender them: active recasts (ro, fr), the vítima shape
   (pt), and genderless feedback options (ro, pa, fr).
6. Deadlines use one inclusive convention per language; Spanish's
   "hasta el" decision closed the last two-readings-of-one-date risk.
7. OS menu items keep the OS's own wording (bn, pa, pt); our own button
   names are quoted inside helper prose everywhere they appear.
8. The banner says looks-important while the card says
   needs-attention-today; no language repeats one sentence on one screen.
9. Register systems are recorded per language in their sections: Polish
   Prosimy/Państwo with the control-label convention, Romanian full
   dumneavoastră with no control split, Spanish usted without printed
   pronouns, French vous with uniform Veuillez, Portuguese
   hemisphere-neutral formal third person.
10. Scanners stay screening tools: informal term lists densify after
    every pass, homograph terms move into documented comments when the
    formal text makes them third person (Romanian), and hedge and
    refusal legs are floors, never verdicts.
11. No danda in the Indic files, no em or en dashes anywhere, and the
    French plain space before ? and : is a committed spec decision.

WHAT WAITS ON NATIVE REVIEWERS (all questions live in NATIVE_REVIEW.md):
Every language answers the three universal questions first (does urgent
outrank high aloud, do the scam lines feel personal, does anything read
machine-made), then its specific list: Polish 0 to 5 led by the
control-label convention; Romanian 0 to 7 led by plural imperatives as
tab names; Gujarati 1 to 5 including the danda and invariant-participle
checks; Hindi 1 to 6 including the banner pairing and the विषय frames;
Bengali 0 to 6 led by THE ONE OPEN DECISION, the suffix convention over
35 enumerated strings; Panjabi 1 to 7 including the ਫ਼ੌਜਦਾਰੀ and ਬਿੰਦੀ
vocabulary calls; Spanish 1 to 7 led by the inclusive-deadline
confirmation; French 1 to 7 led by the par and annoncé-par frames;
Portuguese 1 to 7 led by the neutralisation check, ideally one reader
from each community. The consequence-attribution question repeats in
every language by design; it is the product's most safety-sensitive
frame. Per the plan, the founder personally reviews Gujarati and Hindi.

Next phase: Phase 3 native review as reviewers become available, then
Phase 4 staged release, one language at a time.

---

## Notes for Phase 1 (the caller-to-bank hunt)

Nothing in this pass contradicts the chip fix: signals rendered translated,
stop-free and deduplicated in every language through the renderer's chip path.
The classes this pass DID find that Phase 1 should generalise: frames that
combine a translated verb with a verbatim English fragment (check_wrap,
consequence.reported, consequence.avoid, may_follow) are the highest-risk
join points between caller values and bank sentences, and they fail in
language-specific ways that no key-parity or content-scan test can see. A
contract-style test that renders each of those four frames with a
representative slot in all nine languages and asserts language-appropriate
punctuation joins (colon present where the language needs one, no stranded
connective) would guard the class the way bankLookupContract guards lookups.

## Session log note

Tooling was frozen and committed before any judgement. The five language
agents read only the rendered files. Their reports live in the session
transcript; everything from them that appears above was re-verified against
the renders by quote before inclusion, and their disproofs of earlier claims
were checked against the English sources. All nine languages remain disabled.
