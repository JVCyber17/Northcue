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
| Romanian   | 3 classes | 8 surfaces (1 class) | informal throughout (both files) | 3        | 2-3      |
| Bengali    | 0      | 2 (+1 style decision) | formal, confirmed          | 6 + tail    | 1-2      |
| Panjabi    | 4      | 3 classes (~9 surfaces) | formal, confirmed        | 10 + vocab Qs | 2      |
| Spanish    | 7      | 5                     | usted, confirmed           | 5 + regional| 1-2      |
| French     | 2 (+1 class) | 4               | vous, confirmed            | high-count batch | 1-2 |
| Portuguese | 4 (+1 class) | 6               | formal, confirmed          | 6 + regional decision | 1-2 (+0.5) |

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

## Romanian (largest job: whole-file formal conversion; 2-3 sessions)

Safety, verified state: "grav" fix holds; ladder intact; scam lines keep reader
and deception. Three outstanding classes:
1. Male-only reader forms (class finding 4): "păcălit" (risk_card), "ca să fii
   sigur" (bill_in_credit, exact and pattern), dict "Găsește singur..."
   (check.lowTrustStep), dict "Mă simt mai capabil..." (confidence.moreAble).
   Fold de-gendering into the conversion.
2. "împărtăși" for disclosing data on three safety strings (risk_extractor,
   risk_card, strip.detail_request), the verb is for sharing feelings, not
   handing over data; use divulga/transmite. Blunts the scam warning.
3. Register inconsistency inside the safety set: `tpl.banner.suspicious_urgent`
   alone is ALREADY formal ("Verificați") while every sibling is informal , 
   flag so the conversion does not double-convert it.

DISPROVED earlier lead: `tpl.risk.medium` "poate crea" does not break the mood
ladder, English itself steps from "could" (urgent, high) down to "may"
(medium); ar putea/poate mirrors it exactly.

Grammar, one class, eight surfaces: hardcoded masculine "Acesta (nu) pare a fi
/ acesta este" against variable- or feminine-gender predicates. Patterns 22-25
(summary.garbled, readable.summary_sender, readable.summary,
readable.summary_topic) render "Acesta pare a fi o factură / o scrisoare
oficială" in two of three value sets; exacts banner.non_document,
nondoc.summary, nondoc.action, nondoc.next_step share the shape. Fix by
dropping the pronoun ("Pare a fi o factură...") or "Acest fișier pare a fi...".
Latent only, no fix needed: "toate cele {count} carduri" would need "de" if a
count ever reached 20; card counts are single digits.
Verified correct, no defect: the dict slot frames (typeNames carry indefinite
articles, calendar labels definite ones, "Citim o scrisoare...", "Verifică
factura").

Formality: informal throughout both files, confirmed in render. Scanner floor
250; same term-list caveat as Polish. This is the planned whole-file
conversion, with items 1-2 folded in.

Naturalness: "Ține-ți banii și detaliile personale protejate" calque (scam
action step); cue-card naming wobbles ("carduri cu indicii" vs "cardul de
acțiune" vs "cardul cu pasul următor"), settle one term.

## Bengali (safety clean; 1-2 sessions)

Safety: none outstanding. Ladder monotonic, গুরুতর in place, both scam fixes
hold (reader present, ঠকিয়ে present), refusals full strength, no danda
anywhere. Watch items only: mip.urgent's second sentence is impersonal;
scam chip verify_identity lacks আপনার where neighbours keep it.

Grammar around inserted values:
1. `tpl.action.check_wrap`: "যাচাই করুন the amount shown.", verb-first calque
   in a verb-final language (class finding 1).
2. `tpl.consequence.reported`: "লেখা আছে যে the amount shown.", যে demands a
   clause; genitive frame fixes it.
3. Style decision, pervasive (hundreds of lines, one decision): case endings
   and classifiers detached from Latin values ("EDF এর", "1 May 2026 এর মধ্যে",
   "6 টির মধ্যে"). Standard convention hyphenates (EDF-এর, 2026-এর, 6টির).
   This is the original review's "detached genitive suffix" claim, CONFIRMED
   as a class; decide once, apply mechanically.
No value-dependent agreement breaks across 51 x 3.

Formality: formal throughout, zero informal forms, confirmed.

Naturalness, priority order:
1. Eight card-1 answers are verbless "X নিয়ে." fragments (bill_generic,
   appointment_generic, employment, education, housing, bank_or_loan,
   benefits, insurance), "এটি বিমা নিয়ে." reads cut off, on the product's
   highest-traffic card.
2. `tpl.summary.garbled_sender` puts the object after the verb; its sibling
   gov_sender_amount gets it right.
3. `tpl.readable.mip_topic` breaks the "...বলে মনে হচ্ছে" frame.
4. `tpl.review.unsupported` negation scope can invert the meaning.
5. risk_response/risk_dates: "চোখ এড়িয়ে যেতে পারে" with no possessor (class 3).
6. `tpl.review.verification` "সন্দেহজনক ধরন" collides with ধরন = document type
   everywhere else; use লক্ষণ.
Plus a recorded lower tier (দেখা যাওয়া attributive, bare অঙ্ক in mock steps,
doubled একটি, unquoted button label in focusHelper, পড়ার যোগ্য stacking).

## Panjabi (4 safety items; 2 sessions)

Safety, all verified in render:
1. `tpl.banner.urgent`: "ਇਸ ਵੱਲ ਤੁਰੰਤ ਧਿਆਨ ਦੇਣ ਦੀ ਲੋੜ ਲੱਗਦੀ ਹੈ." escalates English
   "This looks important." to the immediate-attention construction AND
   near-duplicates the mip.urgent opener that renders on the same screen
   (banner plus card 2 saying almost the same thing). Since mip.high owns
   ਮਹੱਤਵਪੂਰਨ and the ladder is safe, banner.urgent can return to ਜ਼ਰੂਰੀ
   ("ਇਹ ਜ਼ਰੂਰੀ ਲੱਗਦਾ ਹੈ. ਇਸਨੂੰ ਅਣਗੌਲਿਆ ਨਾ ਕਰੋ."). Class finding 5; decide explicitly.
2. `tpl.garbled.review_reason`: "ਭਰੋਸੇਯੋਗ ਨਹੀਂ ਹੋ ਸਕਦੀਆਂ" reads "CANNOT be
   reliable", strengthened past English "may be unreliable". Fix "ਸ਼ਾਇਦ
   ਭਰੋਸੇਯੋਗ ਨਾ ਹੋਣ" (the dict already has the correct may-not pattern).
3. Five scam-signal chips are agentless where English says "you": confirm and
   enter password, confirm and enter PIN, verify_identity ("ਪਾਸਵਰਡ ਦੀ ਪੁਸ਼ਟੀ ਕਰਨ
   ਲਈ ਕਿਹਾ ਗਿਆ ਹੈ.") while siblings keep ਤੁਹਾਡਾ. Restore ਤੁਹਾਨੂੰ. Class finding 3.
4. `tpl.consequence.avoid` adds "ਹੋ ਸਕਦਾ ਹੈ" inside the attributed consequence , 
   the original review's Panjabi lead, CONFIRMED as an added hedge. Class 2.
Verified intact: rebuilt ladder (ਤੁਰੰਤ ਧਿਆਨ vs ਮਹੱਤਵਪੂਰਨ plus ਐਮਰਜੈਂਸੀ ਨਹੀਂ, reader
present with ਸ਼ਾਇਦ hedge), scam risk lines (ਗੁੰਮਰਾਹ ਕਰਕੇ deception, reader
present, ਕਰ ਬੈਠ potential form), ਗੰਭੀਰ on suspicious_urgent, refusals full
strength, the Bailiff/Council Tax/Benefits term-plus-gloss policy systematic
and correctly inflected, no danda anywhere.

Grammar around inserted values, three classes plus one label:
1. Gender-locked frames, BOTH directions (class finding 7):
   `tpl.summary.garbled` locked masculine ("ਬੇਨਤੀ ਲੱਗਦਾ ਹੈ", "ਚਿੱਠੀ ਲੱਗਦਾ ਹੈ" , 
   wrong in sets A and B); `tpl.readable.summary_sender` / `.summary` /
   `.summary_topic` locked feminine ("ਦਸਤਾਵੇਜ਼ ਲੱਗਦੀ ਹੈ", wrong in set C);
   `tpl.summary.garbled_sender` ergative participle locked masculine
   ("ਬੇਨਤੀ ਭੇਜਿਆ ਹੈ", "ਚਿੱਠੀ ਭੇਜਿਆ ਹੈ", ਨੇ agreement follows the object).
2. Topic labels stored in the direct case break the three ਬਾਰੇ frames:
   "ਕੋਈ ਕਾਨੂੰਨੀ ਜਾਂ ਅਦਾਲਤੀ ਮਾਮਲਾ ਬਾਰੇ", "ਘਰ ਜਾਂ ਕਿਰਾਇਆ ਬਾਰੇ" (mip_deadline,
   mip_response, summary_topic), ਬਾਰੇ requires the oblique (ਮਾਮਲੇ, ਕਿਰਾਏ).
   Every label ending in -ਾ breaks the same way. Mirror image of Hindi.
3. Class-finding-1 frames: may_follow and consequence.avoid lock a singular
   ਹੋ ਸਕਦਾ ਹੈ over plural English values; consequence.reported strands ਕਿ
   before a noun phrase.
Label defect: `tpl.label.type_label.legal_or_court` reads "ਕਾਨੂੰਨੀ ਜਾਂ ਅਦਾਲਤੀ
ਇੱਕ ਚਿੱਠੀ", the article cannot sit between adjective and noun (sibling
category_label gets it right). Minor: analytics ਫ਼ੀਲਡ never pluralises.
Clean, checked: date postpositions across all sets, parenthesis and colon
frames, ਨੇ/ਵੱਲੋਂ/ਦਾ with Latin senders, organisation-as-singular.

Formality: formal throughout, zero informal forms, confirmed. Two wobbles:
`feedback.confidence.moreAble` forces the reader's own voice masculine
("...ਸਮਰੱਥ ਮਹਿਸੂਸ ਕਰਦਾ ਹਾਂ") where every sibling chip is gender-free, replace
with a genderless shape ("ਹੁਣ ਇਸ ਨਾਲ ਨਜਿੱਠਣਾ ਵੱਧ ਸੌਖਾ ਲੱਗਦਾ ਹੈ"); and "feedback"
is ਫੀਡਬੈਕ in six strings but ਰਾਏ in the help-page pair, settle on ਫੀਡਬੈਕ.

Naturalness, top items (all verified): "ਅਸਲ ਜਾਂਚੋ" in three strings leaves the
adjective without its noun (add ਦਸਤਾਵੇਜ਼); the "ਇਹ {sender} ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ" frame
(15 renders) is clipped, needs a participle ("ਵੱਲੋਂ ਆਇਆ ਲੱਗਦਾ ਹੈ"); the check
panel urgency chips are a time-sensitive calque ("ਸਮੇਂ ਦੇ ਲਿਹਾਜ਼ ਨਾਲ ਜ਼ਰੂਰੀ");
"ਸ਼ਾਂਤ ਸਹਾਰਾ ਲਓ" calque; severity.documents_to_send "ਭੇਜਣ ਵਾਲੇ ਦਸਤਾਵੇਜ਼ਾਂ"
momentarily reads as the SENDER's documents because ਭੇਜਣ ਵਾਲਾ means the sender
throughout this product; the benefits check strings carry the English comma
pair with a case gap; why.blockC's poetic "ਡਰਾਵੇਗਾ ਨਹੀਂ" inversion; "Northcue
... ਸਿਖਾਇਆ ਨਹੀਂ ਗਿਆ" reads as a badly-taught person (use ਸਿਖਲਾਈ or ਤਿਆਰ ਨਹੀਂ);
doubled articles in summary_topic sets A and B; landing tag "ਦੇਣਯੋਗ 14 Jul".
Native vocabulary questions beyond the nine settled choices: ਫ਼ੌਜਦਾਰੀ opaque on
the prosecution chip (consider ਅਪਰਾਧਿਕ plus gloss); ਬਿੰਦੀ in the money-format
note names a Gurmukhi diacritic (consider ਦਸ਼ਮਲਵ ਨੁਕਤਾ); the landing "Council
Tax ਬਿੱਲ" is the one Council Tax string without its gloss.

## Spanish (7 safety items; 1-2 sessions)

Safety, all verified in render:
1. DEADLINE INCONSISTENCY, live inside one rendered document: card 1
   "...pago de £8.50 antes del 1 June 2026" (bill_full, exclusive) against
   card 4 "Plazo hasta el 1 June 2026" (deadline.due, inclusive). bill_full is
   the only money-plus-date template using "antes del". The original review's
   Spanish deadline claim, CONFIRMED and located. Align to the inclusive form.
2. `tpl.banner.urgent`: "Conviene no dejarlo pasar." turns the prohibition
   "Do not ignore it." into advice, on the urgent banner. Fix "No lo deje pasar."
3. `why.blockD.body`: "Northcue prefiere no responder antes que adivinar"
   softens the refusal to a preference and contradicts its own next sentence
   ("Negarse..."). Fix to "se niega a responder".
4. `status.readingHintTyped`: "Tipo detectado: {typeName}." asserts detection
   as fact where English hedges ("This looks like"). Fix "Parece ser de este
   tipo: {typeName}."
5. Residual su-ambiguity on the low-trust path: `check.lowTrustStep` "Busque
   usted mismo sus datos de contacto oficiales" (their/your) and
   `helpGuides.fake.step2Detail` "Use su sitio web o su aplicación oficial."
   The exact failure mode action_verify was rewritten to avoid, surviving in
   two sibling strings. Fix with "de esa organización".
6. `tpl.banner.high_stakes_urgent`: "puede necesitar una respuesta pronto"
   narrows "action" to a reply. The earlier lead, CONFIRMED. Fix "...que quizá
   haya que atender pronto."
7. The "conviene" family downgrades "need checking" to advisability on the
   caution tier (banner.caution, review.default, review.borderline,
   lowQuality.helpful_note). Batch fix toward necessity.
Minor: risk.high "recargos" narrower than "penalties".
Verified intact: ladder, grave, scam set (engañarle, reader kept, action_verify
clean), moneyFormat note correct and natural.

Grammar around inserted values: consequence frames (dice/que plus bare English
fragment; "podría producirse" singular against plural values, class finding 1);
"y una fecha, 1 May 2026." stranded apposition in generic_full and
generic_amount_date; stacked-de misreads ("solicitud de pago de EDF", "carta de
prestaciones sociales de EDF", move to "enviada por {sender}");
appt_sender_date C needs "para el {date}".

Formality and region: usted consistent everywhere, confirmed. Peninsular items
to neutralise: "Enhorabuena", "¿Cuánto corre?" / "corre prisa" (also unclear as
a heading), "desahucio" (LatAm desalojo) on the eviction chip, one "pulse"
where the file elsewhere says "toque". "usted mismo" twice is also male-only
(drop the pronoun).

Naturalness, top items: bill_in_credit "su cuenta puede estar a favor" (wrong
collocation, on the money card; "tenga saldo a favor"); landing "Nosotros la
aclaramos." (la fails with "un aviso"); check.genuineMeaning "de quien dice
ser" incomplete; password chips drop "you" where the sibling keeps it ("Le
pide..."); privacy intro "Los tratamos así." dangling.

## French (2 safety items plus one class; 1-2 sessions)

Safety, verified in render:
1. `tpl.label.signal.severity.legal_response` still reads "est demandée"
   (obligation downgraded to request). The old review called this moot while
   the chip bug hid the label; the chip fix now delivers it to readers, so it
   is live. Sibling severity.immediate_payment uses "exigé" correctly. Fix
   "est exigée".
2. English "Please" became a bare command in three strings:
   `tpl.error.pdf_scanned` ("envoyez plutôt...", the only politeness-free
   error string in its set), `feedback.badEmail`, `check.genuineLow` ("faites
   attention"). Restore the house Veuillez pattern.
3. Class finding 4: "trompé", "pour en être sûr" (twice), "Toujours incertain"
   address the reader as male only.
Watch, naturalness not safety: risk.urgent "problèmes sérieux" and why.blockC
"lettre sérieuse" are idiomatic French (not the serios false-friend failure,
which required the document itself to be called earnest), but "graves" would
match the banner's register; align during the fix pass.
Verified intact: grave, Veuillez on both high-stakes banners, trompé with
reader as subject, hedges (bill_in_credit keeps both hedge slots; one stacked
hedge flattened to a single "semble", acceptable, recorded), ladder, zero
de/d'+sender shapes (the par strategy held everywhere), correct participle
agreement, scam-signal labels correctly third-person.

Grammar around inserted values:
1. Missing "du" before dates in generic_full, generic_amount_date,
   generic_sender_date ("...et la date 1 May 2026"), nine rendered lines;
   siblings do it right ("datée du"). Fix "la date du {date}".
2. `tpl.consequence.may_follow`: "further charges peut suivre" (class 1).
3. Dict `journey.cardStyleSelected` "{styleLabel} sélectionné.", all four
   possible values are feminine, so it is wrong four times out of four. Fix
   "Style choisi : {styleLabel}."
4. Consequence frames lack a colon/quote cue plus a latent qu' elision hazard.

Formality: vous throughout, confirmed.

Naturalness, top items: the "juridique ou de tribunal" family (should be
judiciaire), highest reach; trailing ", s'il vous plaît" on 14 lines including
a page heading (house style is Veuillez + infinitive); "Quelque chose s'est mal
passé" calque; "Gardez ... protégés" calque on the scam action step
("Protégez votre argent..."); "rendez-vous avec EDF" asserts the sender is the
counterparty where English says "from" (small accuracy loss); "envoyé par vous"
twice; unquoted "je ne suis pas sûr" in why.blockC.title; "serre la poitrine"
calque; moneyFormat "Dans l'écriture britannique" unidiomatic; "Sensible aux
délais" opaque as a chip; "Crème chaud" misagreement. The plain space before
? and : still holds product-wide (known accepted item).

## Portuguese (4 safety items plus one class; 1-2 sessions, +0.5 if neutralising region)

Safety, verified in render:
1. `tpl.label.signal.severity.bailiff`: "Menciona ação de agentes de
   cobrança." UNDERSTATES, bailiffs are court-authorised enforcement agents,
   "agentes de cobrança" are ordinary debt collectors, and this label feeds
   the top severity tier. Fix with the UK-term-plus-gloss convention:
   "agentes de execução (bailiffs)".
2. `tpl.next_step.urgent`: "Veja já o cartão de ação...", "já" pushes harder
   than English "now", as the closing line of the bailiff card set. This
   LOCATES the old vague lead "one bailiff line more pressing than English".
   Fix "Veja agora...".
3. `tpl.risk.high`: "multas" narrower than "penalties" ("penalizações").
4. Scam chip verify_identity: "Pressiona para verificar a sua identidade..."
   has no object pronoun, nobody is being pressured. Fix "Pressiona para que
   verifique...".
5. Class finding 4: "enganado" male-only in risk_card.
DISPROVED earlier claims (against the English sources): "medical and legal
summary lines assert flat fact where siblings hedge", the English originals
are themselves flat; Portuguese matches its source, and all 16 summary exacts
plus 20 summary patterns keep their hedges. Ladder, grave, refusals, risk_card
shape all verified intact.

Grammar around inserted values: missing "de" before dates in generic_full and
generic_amount_date ("e a data 1 May 2026", siblings write "com data de");
"pode seguir-se" singular against plural values (class 1); de+sender chains
misread in composed patterns ("documento jurídico ou do tribunal de Marston..."
reads as the court OF Marston; "pedido de pagamento de EDF" ambiguous, move
to "enviado por {sender}"); consequence frames ("indica que the amount shown.",
"indica a late fee" where "a" reads as the feminine article); bill_in_credit
drops "your" ("A conta..." should be "A sua conta..."); the "do tribunal /
de tribunal" label family inconsistency drives the misparse, settle
"jurídico ou judicial".

Formality and region: formal third-person throughout, confirmed (no tu-forms;
"Não ignore" and kin are formal subjunctives; "Comecem" correctly plural).
Region: internally consistent EUROPEAN Portuguese, confirming the old review's
direction, with high-visibility markers on the first card and primary status:
"parece estar a pedir" (card 1), "A ler..." (submit status), ficheiro,
carregar/carregamento, ecrã, palavra-passe (scam chips), contacte/contactos,
câmara municipal, telemóvel, "para si". DECISION FOR THE FOUNDER, recorded not
made: stay EP (UK Portuguese speakers skew EP, but there is no script argument
like Panjabi's) or neutralise the roughly ten high-traffic markers.

Naturalness, top items: home.dash.intro first paragraph ("carta oficial
confusa" agrees only with the last list item, plus "Eles mostram" calque);
banner.urgent "Não ignore." truncated; the "é precisa" family stiff
(mip.medium, action_check, legal_response, where "resposta legal" also risks
reading as "lawful reply"; use jurídica); the 999 emergency line requires
re-parsing mid-crisis ("Se estiver em perigo imediato, ou se outra pessoa
estiver, ligue para o 999."); "mencionando" gerund calque; "Contacte...
contactos" echo doubled on the bailiff action card; review.template "marcas de
modelo por preencher" opaque and adds a claim; genuineLow comma splice;
summary.outgoing drops "by you" while its sibling keeps it.

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
