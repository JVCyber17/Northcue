# Phase 3A: final cross-language verification (30 July 2026)

The last AI verification pass before staged release. One deep pass per language,
all nine languages, run the way a professional localisation QA team would run
it: full corpus re-read with fresh eyes, the eleven binding decisions checked
against rendered output, an English mirror test on every safety-critical
sentence, slot torture with hostile values, and a UI completeness sweep at
phone width. Unambiguous mechanical defects were fixed in this pass and
re-verified by rendered diff; judgement calls are held below as findings for
the native reviewers.

## Verdict table

| Language | Verdict | Fixed this pass | Held for native review |
| --- | --- | --- | --- |
| Polish | RELEASE-CANDIDATE | 1 | 4 |
| Romanian | RELEASE-CANDIDATE | 5 | 4 |
| Gujarati | RELEASE-CANDIDATE | 4 | 6 |
| Hindi | RELEASE-CANDIDATE | 5 | 5 |
| Bengali | RELEASE-CANDIDATE, conditional on the suffix convention | 1 | 3 |
| Panjabi | RELEASE-CANDIDATE | 1 | 3 |
| Spanish | RELEASE-CANDIDATE | 2 | 7 |
| French | RELEASE-CANDIDATE | 8 | 5 |
| Portuguese | RELEASE-CANDIDATE | 3 | 2 |

No blocking findings survived verification in any language. Every held item is
a naturalness or convention question that cannot mislead a reader about
safety, urgency, or who does what; each is listed in its language section and
queued in NATIVE_REVIEW.md. Bengali's condition is not a defect: it is the one
deliberately open decision (suffix hyphenation, 35 enumerated strings) that
the native checker owns.

## How this was run

- Nine independent verifier agents, one per language, each rendering its full
  corpus through the frozen tooling (`render-language.js`, `render-exact.js`,
  `render-dictionary.js`) plus a Phase 3A torture renderer kept in the session
  scratchpad so the frozen scripts stayed untouched. Each agent read every
  rendered line through three lenses in sequence: a frightened first-time
  reader, a professional translator checking register consistency, and a
  hostile reviewer hunting for anything that could mislead.
- Every agent claim was re-verified against the rendered files by exact quote
  before any fix or finding was accepted. Claims without a surviving quote
  were discarded.
- Fixes were applied to the source files only after quote verification, then
  all nine languages were fully re-rendered and the before/after diffs were
  read line by line. Every changed rendered line was an intended fix; nothing
  else changed in any corpus.
- Full suite 245/245 before and after. Scanner informal counts 0 in every
  language except Polish's documented 62 control labels (the recorded UI
  imperative convention; 61 were documented, the extra one is scanner list
  densification catching another control label, not a prose break). Zero em
  or en dashes and zero danda across all changed files, checked with explicit
  UTF-8 decoding. All nine languages remain disabled; `en` is the only
  enabled language.

## Slot torture (hostile values)

Three hostile sets over all 51 patterns in all nine languages:

- T1: a 94-character NHS trust sender, £999,999.99, year-boundary dates
  (31 December 2026 with 1 January 2027).
- T2: £0.01, year-start date, and the real debt collector Past Due Credit
  Solutions, whose name is made of common English nouns.
- T3: the short common-noun sender Home Group, a leap-day date
  (29 February 2028), and the feminine-in-Romance label an official letter.

Result: no capture errors, duplication, truncation, or text loss around any
slot in any language. The common-noun senders never misparse; the long sender
never breaks agreement (Panjabi's ergative frame keeps agreement on the
object, Spanish's enviada por stays with the fixed feminine carta). £0.01 and
£999,999.99 are grammatical in every amount frame. The single mechanical break
found was Gujarati's ભાડું before વિશે (fixed below). The English baseline was
rendered first and is intact, so every flagged line was genuinely
language-side.

## Cross-language consistency matrix

The eleven binding decisions from REVIEW.md, verified in rendered output per
language. After this pass's fixes, decisions 1 through 9 and 11 hold in all
nine languages. Decision 10 (scanner policy) is not observable in renders and
was confirmed by running the scanners directly. Drifts found and closed:

- Decision 6 (one inclusive deadline convention): French had drifted. The two
  bill summary templates read "avant le {date}" (strictly before, exclusive)
  while the deadline card reads "Échéance le {date}" (inclusive), so one
  routine document showed two readings of one date. Both templates now read
  "au plus tard le {date}". The misreading direction was safe (acting at most
  one day early), which is why this was minor rather than blocking.
- Decision 7 (own button names quoted in helper prose): Gujarati and Hindi
  embedded the submit button's name unquoted. Latin-script languages mark the
  name with capital letters; Devanagari and Gujarati have no capitals, so the
  helper sentence garden-pathed into two stacked imperatives, on the helper
  aimed at overwhelmed Focus-mode users. Both now quote the name, matching
  Bengali and Panjabi. Hindi's "समझें पर जाएँ" tab reference gained the same
  quotes.
- Decision 9 (recorded register systems): two Romanian tu-imperative remnants
  ("Finalizează", "Ia legătura cu noi") became "Finalizați" and "Luați
  legătura cu noi"; two French "Merci de" strings became "Veuillez" per the
  uniform Veuillez system; one Hindi "बताइए" became "बताएँ कि" per the aap
  -एँ system.
- One-control-one-name: the identical English string "Give feedback" names
  the same control on six surfaces, but Romanian, Gujarati and Hindi each
  rendered the Help-page instance with a different noun (părerea, પ્રતિભાવ,
  राय) from the one used by the feedback feature itself. All three now use
  the feature's own term (feedback / ફીડબેક / फ़ीडबैक), with agreement
  corrected in the subtitles. Polish's Help CTA varies only the verb
  (Prześlij vs Podziel się) around the same noun opinia; held as a note.

## The English mirror test

Safety-critical sentences back-translated and set beside the English original
in all nine languages. Drifts found and fixed:

- Hindi garbled-text warning (class 2, the same class Panjabi's Phase 2 pass
  fixed): "रकम और तारीखें भरोसेमंद नहीं हो सकतीं." read as "cannot be
  trustworthy", impossibility where English says "may be unreliable". Now
  "हो सकता है कि रकम और तारीखें भरोसेमंद न हों."
- Severity ladder medium rung weakened in Hindi and Panjabi: "Action is
  likely needed soon." had been rendered with the may-modal (पड़ सकता है /
  ਸ਼ਾਇਦ ... ਪਵੇ), the same modality as the urgent rung's second sentence, so
  the likely-versus-may distinction between rungs was flattened. Both now
  carry likelihood (की संभावना है / ਦੀ ਸੰਭਾਵਨਾ ਹੈ). The other seven languages
  mirror the rung correctly.
- Gujarati freeze chip: "બંધ કરવાની ધમકી" (threatens to close) reported a
  more final threat than English "freeze" and blurred toward the suspend
  chip. Now "ફ્રીઝ કરવાની ધમકી", matching the loanword its sibling languages
  use, with the suspend chip still distinct (સ્થગિત).
- French formal-versus-official: four sentences rendered English "formal" as
  "officiel(le)", claiming official status where English deliberately claims
  only formal structure, including the trust chip "Contient une structure de
  lettre officielle." and the summary for unknown documents. All four now use
  formel(le), the mapping the French label keys already used. The same
  upgrade in the Romanian and French placeholder cards ("un document oficial"
  / "un document officiel") is also fixed to formal/formel.
- Spanish high-urgency chip: "Con plazo cercano" asserted that a concrete
  deadline exists and is near, where English "Time-sensitive" claims only
  that time matters, and a high-urgency letter may state no deadline. Now
  "El tiempo importa", parallel to French "Le temps compte" and the Panjabi
  chips, with the urgency ladder relations preserved (urgent stays hedged
  "Parece haber poco tiempo").

Mirror drifts recorded but held (safe direction or defensible, native queue):
Polish adds "wyłącznie" to the urgent next step and "natychmiast" to the 999
line (both restrict or strengthen in the safe direction); Polish
gov_sender_amount tucks notice-hood into a definite noun phrase under a
leading hedge; Romanian banner.default compresses "before you act" to "first";
Romanian freeze/suspend use the standard present-after-amenință convention;
French bill_in_credit carries one hedge (semble) where English has two
(looks like + may), with peut-être intact in the second clause; Spanish and
Portuguese render "require an action" with their single attribution verb
pedir, with the next sentence restoring the obligation.

## Other mechanical fixes from the corpus re-read

- Gujarati mip_deadline and mip_response: the one topic label whose oblique
  differs from citation form (ભાડું, oblique ભાડા) sat directly under the
  postposition વિશે, a case break against the corpus's own housing sentence.
  Both frames were recast to the settled labels-in-citation-form colon
  strategy: "આમાં કોઈ છેલ્લી તારીખ હોઈ શકે છે. વિષય: {topic}. ..." matching
  the વિષય frames the corpus already uses. Verified across all six value
  sets.
- Romanian legal_or_court label family: "juridic(ă) sau de la instanță" said
  "from the court" (provenance) where a type label must say court-type, and
  stacked two de-la phrases when the frame appended "de la {sender}",
  momentarily readable as "from the court of Marston Holdings". The family
  (type label, category label, doctype label, category display name, and the
  fixed summary sentence) now reads "de instanță", the collision-free shape
  the Romanian topic label already used, and the same settlement Spanish and
  Portuguese made in Phase 2 (legal o judicial / jurídico ou judicial).
- Polish appt_sender_date: "z datą {date}" (the letter-date frame, "dated")
  misassigned the appointment day as a document date. Now "To wygląda na
  zawiadomienie od {sender} o wizycie w dniu {date}.", using the sibling
  appt_date pattern's "w dniu" shape and attaching the sender to the notice.
- Spanish risk_response and risk_dates: the escape-notice idiom is pronominal
  (pasársele por alto); the corpus had "pasarle". Both fixed.
- Bengali feedback.commentPrivacyNote: the corpus's sole "অনুগ্রহ করে"
  aligned to the recorded "দয়া করে" please-marker.
- Portuguese regional residue: three European-only forms sat outside the two
  documented keeps: "Criámos" (now "Construímos", identical spelling in both
  hemispheres), "Registámos o seu pedido." (now "Recebemos o seu pedido."),
  and "concluiu esta secção" (now "concluiu esta parte"). A marker sweep
  (ámos/émos, secção, connosco, registado) found nothing else; the two
  documented keeps (contacto spelling, ecrã inside the iOS quote) stand.

Every fix above was verified three ways: the re-rendered diff read line by
line across all value sets, the full suite (245/245, including the relational
severity ladder test), and live in the browser at 375px through the real
lookup path (t() for dictionary keys, translateEngineSentence for bank
sentences, and on-screen surfaces where reachable: the Gujarati ફ્રીઝ chip in
a real scam check panel, the quoted focus helpers, the Help contact blocks,
the Romanian placeholder card).

## UI completeness sweep (375px, dev override)

Every screen, modal and error state in each of the nine languages: landing,
home, upload states 1 and 2, all six cue cards with a real scam document
through the engine, the document check panel, dark mode, focus mode, the help
page, one guide modal, the feedback modal, the accessibility settings page,
and the wrong-file-type error state.

Result, identical in all nine languages: `html lang` and the body language
marker correct on the dev override path, the dev preview badge present, zero
raw i18n keys, zero horizontally overflowing or off-viewport text elements on
any screen (measured geometrically on every element), zero page-level
horizontal scroll, the error state fully translated, dark and focus modes
applying with zero overflow, and English-script text limited to the by-design
set (Northcue, file format names, OS menu quotes, glossed UK terms, the
verbatim letter line, and Latin-script languages' own words). The aria fix
holds live: card regions announce in the active language on first load
(Karta z przewodnikiem, ਗਾਈਡਡ ਕਾਰਡ, Fiche guidée, and so on).

Two honest caveats. First, pixel screenshots could not be captured this
session because the Browser pane was not displayed (the compositor produces
no frames); the layout claims above rest on the geometric checks plus each
language's Phase 2 visual confirmation, and a screenshot pass on the next
interactive session costs nothing. Second, the live path with the AI layer
active produces AI-composed card sentences that render in English with the
verbatim-line note, by design of the lookup-only translation tiers; the
frozen CLI renders remain the coverage ground truth, and this pass verified
the live lookup mechanism is the same code path the renderer exercises.

## Per-language detail

### Polish: RELEASE-CANDIDATE

Fixed: appt_sender_date date-role misassignment (above). Held for native
review: the gov_sender_amount presupposition nuance on the urgent card (the
whole clause sits under "Wygląda na to, że", the bank's garbled_sender shape
shows the alternative); "w sprawie: sprawa prawna lub sądowa" noun doubling
when the topic label begins with sprawa; the two safe-direction intensifiers
(wyłącznie, natychmiast); the verify_identity agentless infinitive. Scanner
floor: 62 informal hits, all control labels and step headings under the
recorded convention, zero prose breaks, list read in full this pass.

### Romanian: RELEASE-CANDIDATE

Fixed: the two register remnants, the Give-feedback naming split, the
placeholder-card formal upgrade, and the de-instanță label family. Held:
banner.default's compressed "before you act"; the amenință-că present
convention on the freeze and suspend chips; helpGuides.overwhelmed.step1Detail
reading as mode-describes-itself; "Pare presat de timp" naturalness on the
urgency chip.

### Gujarati: RELEASE-CANDIDATE

Fixed: the ભાડું case break via the colon recast of both mip frames, the
quoted focus helper, the freeze chip mirror, the Give-feedback naming. Held:
હજુ versus હજી single-variant consistency; the અપલોડ gender flip between two
status lines; the respectful anusvāra plural participles (confirm the
convention, some speakers read the form as feminine-marked); "ક્યારે તે
મહત્વનું છે?" word order; the વાળું suffix spacing orthography on two lines
(the same suffix-joining question class as Bengali's open convention);
may_follow's bare-subject handover (confirm it is the recorded
did-not-need-a-colon case; nothing inflects around the fragment).

### Hindi: RELEASE-CANDIDATE

Fixed: the garbled-warning hedge restoration, the ladder medium rung, the
quoted focus helper and quoted समझें tab reference, the बताएँ register
alignment, the Give-feedback naming. Held: अत्यावश्यक as the deliberate top
rung versus the corpus's plain register; "साफ फ़ोटो" versus the comparative
"और साफ" in the refusal path; सरकारी versus आधिकारिक for "official advice" in
the disclaimer scope; the standard default masculine agreement with आप
(confirm it matches the recorded convention); सभी तारीखें for "any dates".

### Bengali: RELEASE-CANDIDATE, conditional on the suffix convention

Fixed: the please-marker alignment. The mirror test, torture and matrix came
back clean, the only language with zero mirror flags. Held: the একজন
classifier personifying the AI provider (two strings); the landing example
chip's translated month (জুলাই) against real renders keeping English months;
the added বিনয়ের সাথে on the why page. The suffix-hyphenation convention
remains the one open decision, unchanged, with its 35-string list in
NATIVE_REVIEW.md; the space-detached convention was re-verified consistent
corpus-wide this pass.

### Panjabi: RELEASE-CANDIDATE

Fixed: the ladder medium rung. Held: "ਸਮਝ ਨਹੀਂ ਆਇਆ" colloquial versus strict
feminine agreement on a feedback chip; the PDF gender flip between two
neighbouring error strings (masculine ਲੱਗਦਾ versus feminine ਵਾਲੀ, pick one or
recast with the ਇਹ ਦਸਤਾਵੇਜ਼ anchor); the stiff ਉਹੀ anaphor in the
non-document helpful note.

### Spanish: RELEASE-CANDIDATE

Fixed: the pronominal idiom on both risk lines, the high-urgency chip. Held:
the landing chip "Vence el 14 jul" versus the hasta-el convention (marketing
mock, same inclusive meaning); the printed usted instances (all doing
contrastive who-does-what work, confirm the recorded no-printed-pronouns
system licenses them); the added "que encuentre usted" on the scam contact
step (matches the English playbook elsewhere); "juntos" generic masculine in
the helper guide; the comma before y mirroring English punctuation; "Con
cuánta antelación" parsing load on the urgency explainer; the pedir softening
on action_required.

### French: RELEASE-CANDIDATE

Fixed: the deadline convention on both bill templates, the two Merci-de
register breaks, the four formal-to-formel corrections plus the placeholder
card. Held: bill_in_credit's single hedge; check_wrap's colon-less handover
(confirm as the recorded shape, French needs no case marking there);
"Utilise un avertissement sous pression" parse on one scam chip; the ni/et
mixed negative list on the privacy page; "la fiche action" versus "la fiche
Action" self-citation capitalisation.

### Portuguese: RELEASE-CANDIDATE

Fixed: the three European-only forms, closing the hemisphere-neutral
decision's residue. Held: check_wrap's colon-less handover (same question as
French); the pedir rendering of "require an action" (the corpus's single
recorded attribution verb, with obligation restored in the next sentence).

## What changed on disk

Fourteen language files (both tiers of pl, ro, gu, hi, es, fr and the
dictionary-only fixes in bn, pt, plus templates-pa), the i18n loader VERSION
(i18n-20260730a) and the service worker CACHE_VERSION (northcue-v1-20260730b)
so shipped caches refresh. No engine, safety logic, classification, severity,
trust or scam detection code was touched. app.js and index.html untouched.

## Next

Phase 3 native review proceeds per language with the questions in
NATIVE_REVIEW.md, now including this pass's held findings. Phase 4 staged
release, one language at a time, after native sign-off. All nine languages
remain disabled.
