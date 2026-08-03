# For a native speaker: twenty minutes, please

Thank you for helping. Northcue turns confusing official letters, bills and
government post into short calm cards for people who find that post stressful.
It is being translated into nine languages. Everything so far is a machine
draft checked by machine. **You are the first person who actually speaks the
language to look at it.**

You do not need to be technical and you do not need to read any code. Below is
the short list for your language. Please answer in whatever form is easiest,
even just "1 fine, 2 wrong, should be X".

**The one thing that matters most.** Northcue must never sound more certain,
more alarming, or more commanding than it needs to. The reader may be frightened
and holding a letter about money they do not have. If any answer below sounds
like an order, or like a threat, say so, even if the words are correct.

---

## Every language: three questions

Please answer these three first. They take five minutes and they matter more
than anything else on this page.

**Q1. Do these two sound clearly different in seriousness?**

> A. *(the urgent one)*
> B. *(the one below it)*

Find them in `public/i18n/templates-<your language>.js` as `tpl.mip.urgent` and
`tpl.mip.high`. A reader must be able to tell a bailiff notice from routine post
by the first few words. **Does A sound more serious than B, immediately?**

**Q2. Does this make you less likely to do what a scam letter asks?**

> `tpl.scam.risk_card` and `tpl.scam.risk_extractor`

These two lines exist to stop someone paying a fraudster. **Do they sound like
a warning to you personally, or like a general statement about the world?**
They should feel like they are about you.

**Q3. Does anything on that card sound like a machine wrote it?**

Point at anything that reads as translated English rather than something a
careful person would actually say. You do not need to fix it, just mark it.

---

## Then, your language only

### Polish

Polish is AI-complete (30 July 2026): the cue card text had its full pass
earlier, and the whole interface is now converted to the same formal register.

**0. The interface decision that needs your confirmation first.** Prose is
formal everywhere (Prosimy plus infinitive, Państwo where the sentence is
about you), but BUTTONS, LINKS AND SHORT STEP HEADINGS keep the conventional
Polish UI imperative: Prześlij, Wybierz plik, Włącz tryb skupienia, Dalej.
That is the register gov.pl and Polish banking apps use with formal
customers. **Does that split feel right, or do any of those controls read
too familiar next to the formal prose around them?**

**0a. The homepage headline now reads "Państwa list, teraz jaśniejszy."**
**Does Państwo work in a headline, or does it tip into stiffness there?**

**0b. The emergency line reads "Jeśli Państwu lub komuś innemu grozi
bezpośrednie niebezpieczeństwo, prosimy natychmiast zadzwonić pod numer
999."** In an emergency, is prosimy right, or should this one line be a
direct command?

**0c. The consequence card now reports the letter's own claim without
softening: "Dokument informuje, że jeśli płatność nie zostanie dokonana,
nastąpi: {the letter's words}."** Does this clearly read as the LETTER's
threat, reported by Northcue, and not as Northcue threatening you?

**1. The big one. Does the formal register read as respectful, or as cold?**

Cue cards now use *Prosimy* plus an infinitive for anything we ask the reader
to do, and *Państwo* where the sentence has to be about them:

> Prosimy sprawdzić oryginalny dokument przed podjęciem działania.
> Mogą Państwo stracić pieniądze lub udostępnić prywatne dane.

The reader is anxious and holding a letter about money. We chose formal because
*ty* felt too familiar for debt and enforcement, and because *Pan/Pani* would
mean guessing their gender in every sentence. **Is that the right call, and is
there anywhere it has tipped from respectful into cold?** The second sentence
above is the one we are least sure about.

**2. Is "zweryfikować" too stiff for a scam warning?**

> To może być podejrzane i poważne. Prosimy to zweryfikować przed podjęciem działania.

English distinguishes "verify" from "check" and we kept that distinction. But
"zweryfikować" is officialese. **Would a Polish person warning a friend say
this, or would they say "sprawdzić w niezależnym źródle"?**

**3. Does the deception land?**

> Ktoś może podstępem nakłonić Państwa do niebezpiecznej płatności lub udostępnienia danych.

This used to say only "nakłonić", persuade, which lost the trickery. **Does
"podstępem" make it clear somebody is trying to deceive them?**

**4. Dates stay in English, like "3 September 2026", because they are copied
from the letter.** So a card can read "Wizyta jest zaplanowana na 3 September
2026." **How badly does that read?** We can introduce them differently if it
is jarring, but we cannot translate the date itself.

**5. Read these two aloud. Does the first sound more serious than the second?**

> To jest pilne. Być może trzeba działać jeszcze dziś.
> To jest ważne, ale nie jest to nagły wypadek.

### Romanian

Romanian is AI-complete (30 July 2026): both files were converted from tu to
the dumneavoastră register in one pass, so the register questions matter most.

**0. The register decision that needs your confirmation first.** Everything
is second person plural now, including buttons, the navigation tabs and step
titles: Încărcați, Alegeți un fișier, and the Understand tab is called
"Înțelegeți". We chose this because the plural imperative is what Romanian
institutional and banking software uses, and unlike other languages it is
the polite form itself. **Do plural imperatives as TAB AND STEP NAMES read
normal, or would you expect nouns there (Încărcare, Înțelegere)?**

**0a. The homepage headline now reads "Scrisoarea dumneavoastră, mai
clară."** On a phone the long word takes its own line. **Does dumneavoastră
work in a headline, or does it tip into stiffness there?**

**0b. The emergency line reads "Dacă dumneavoastră sau altcineva sunteți în
pericol imediat, sunați la 999."** In an emergency, is this right, or is it
too ceremonial for that one line?

**0c. `tpl.banner.suspicious_urgent` says *grav*.** It used to say *serios*.
**Is grav right for "this may be dangerous"?**

**1. The big one. Does the formal register read as respectful, or as cold?**

The scam warnings now read:

> Ați putea pierde bani sau divulga date private.
> Cineva ar putea să vă păcălească să faceți o plată nesigură sau să divulgați date.

We chose "divulga" over "împărtăși" because handing data to a stranger is
disclosure, not sharing, and it is the word Romanian banks use. **Is that the
right call, or would a Romanian person warning a friend say it differently
("să dai datele")?** The reader is anxious and holding a letter about money;
tell us anywhere the register tips from respectful into office-cold.

**2. Gender. Romanian adjectives would guess the reader's gender, so none is
predicated of the reader anywhere.** That produced these rewrites:

> Totul pare copleșitor. (for "I feel overwhelmed")
> Nu, m-a derutat. (for "No, I was confused")
> Încă am îndoieli. (for "Still unsure")
> Îmi este mai ușor să mă ocup de ea. (for "I feel more able to deal with it")

**Do these read as natural things a person would tap, or as evasions?**

**3. "Pentru siguranță" closes the in-credit card: "Verificați documentul
original pentru siguranță."** English says "to be sure". **Does pentru
siguranță carry that, or does it read like "for safety"?**

**4. Some card answers now start without a pronoun: "Pare a fi o factură
sau o cerere de plată."** We dropped "Acesta" because the thing named after
the verb changes gender. **Natural subject drop, or does it read clipped?**

**5. Sentences that insert a sender or an amount: do the articles still
attach correctly, or do you get something like "de la Hounslow Council"
where Romanian wants a different form?**

**6. Dates stay in English, like "3 September 2026", because they are copied
from the letter.** So a card can read "Programarea dumneavoastră este pe
3 September 2026." **How badly does that read?**

**7. Read these two aloud. Does the first sound more serious than the
second?**

> Acesta este urgent. S-ar putea să fie nevoie să acționați astăzi.
> Acesta este important, dar nu o urgență.

### Gujarati

Gujarati has had its full pass (AI-complete, 30 July 2026), so its questions
are specific.

1. `tpl.scam.risk_extractor` used to read as an instruction to share your
   private data. It now uses "શેર કરી બેસી શકો છો". **Does it now clearly warn
   against sharing rather than suggest it?**
2. We use a full stop everywhere and never the danda. **Does that look wrong to
   you, or acceptable for an app?**
3. The consequence card used to soften the letter's threat with "થઈ શકે છે".
   It now reports the letter's own claim:
   > દસ્તાવેજમાં લખ્યું છે કે જો ચુકવણી ન થાય તો આવું થશે: {the letter's words}.
   **Does this clearly read as the LETTER's threat, reported by Northcue,
   and not as Northcue threatening you?** That attribution is the whole point.
4. To stay correct for every document type, some sentences now use the
   invariant participle: "મોકલેલ હોય એવું જણાય છે", "તરફથી આવેલ", "દર્શાવેલ છે".
   **Do these read as normal formal Gujarati, or noticeably stiff?**
5. While reading, the status line says "તમારો દસ્તાવેજ (બિલ) વાંચી રહ્યા છીએ…"
   with the detected type in brackets. **Acceptable, or does the bracket feel
   technical?**

### Hindi

Hindi has had its full pass (AI-complete, 30 July 2026), so its questions
are specific.

1. `tpl.mip.urgent` now uses **अत्यावश्यक** and `tpl.mip.high` uses
   **महत्वपूर्ण**. Both used to be ज़रूरी, which made them sound identical.
   **Is अत्यावश्यक clearly more urgent than महत्वपूर्ण to an ordinary reader?**
   It is a formal word; if it sounds bureaucratic, tell us what you would say.
2. The decline banner used to stop halfway ("अगर यह है, तो..."). It now reads
   "अगर यह कोई पत्र या बिल है, तो साफ फ़ोटो या कोई दूसरा पेज आज़माएँ."
   **Does it read whole now?**
3. On a serious letter the top banner says "यह ज़रूरी लगता है. इसे अनदेखा न
   करें." and the card below it says "यह अत्यावश्यक है." **Does that pairing
   read right on one screen, banner calm, card urgent?** English makes the
   same distinction (looks important / is urgent).
4. The consequence card used to soften the letter's threat with "हो सकता है".
   It now reports the letter's own claim:
   > दस्तावेज़ कहता है कि भुगतान न होने पर ऐसा होगा: {the letter's words}.
   **Does this clearly read as the LETTER's threat, reported by Northcue,
   and not as Northcue threatening you?**
5. Several card sentences now name the topic after a colon:
   > इसमें कोई आखिरी तारीख हो सकती है. विषय: कानूनी या अदालती मामला.
   > सबसे साफ विषय यह लगता है: अपॉइंटमेंट.
   **Do these read naturally on a card, or too much like a form?**
6. The risk lines now keep you in the sentence: "आपसे जवाब का कोई अनुरोध या
   कोई ज़रूरी तारीख छूट सकती है." **Natural, or would you say it differently?**

### Bengali

Bengali is AI-complete except for ONE decision that is deliberately yours,
question 0. Everything else had its pass on 30 July 2026.

**0. The suffix convention. This is the one open decision, and this list is
complete, so you can settle it once.** When a case ending or classifier
follows a name, date or amount written in English letters, the files
currently put a SPACE before it: "EDF এর কাছ থেকে", "1 May 2026 এর মধ্যে",
"Northcue এর", "6 টির মধ্যে". The standard written convention hyphenates
(EDF-এর, 2026-এর, 6টির). **Should these be hyphenated, attached, or left
with the space?** The strings affected, so one decision covers all of them:

> Card sentences that insert a sender, amount or date (19): tpl.deadline.due,
> tpl.summary.bill_full, bill_amount_date, bill_sender_date, bill_amount,
> bill_sender, bill_in_credit_sender, gov_sender_amount, gov_sender,
> gov_amount, appt_sender_date, appt_sender, generic_full,
> generic_sender_amount, generic_sender_date, generic_sender,
> tpl.readable.summary_sender, tpl.benefits.summary_sender,
> tpl.readable.sender_card.
> Fixed sentences with a Latin name (3): tpl.garbled.review_reason ("OCR এ"),
> tpl.error.pdf_scanned ("এই PDF টি"), tpl.error.file_too_large
> ("Northcue এর").
> Interface lines with Northcue or iPhone (9): home.welcome.aria.region,
> privacy.head.intro, privacy.thinking.body, journey.icsDescription,
> comfort.title, feedback.intro, feedback.thanksBody, install.card.iosLine,
> install.footline.iosLine.
> Numbers with a classifier (4): journey.card.progress ("6 টির মধ্যে"),
> journey.cardProgress, aria.progressDot, and the completion line where the
> count sits between "আপনি মোট" and "টি কার্ডই দেখে ফেলেছেন".

**1. The two scam lines keep the reader as the subject: "আপনি টাকা হারাতে
পারেন বা ব্যক্তিগত তথ্য শেয়ার করে ফেলতে পারেন." and "আপনাকে ঠকিয়ে অনিরাপদ
পেমেন্ট করানো বা তথ্য শেয়ার করানো হতে পারে."** **Do they sound like they are
about you personally, and does ঠকিয়ে make the deception clear?**

**2. Card 1 now says "এটি বিমা সংক্রান্ত." where it used to stop at "এটি
বিমা নিয়ে."** The old form read cut off. **Does the সংক্রান্ত frame read as
a complete, calm sentence, or is it too stiff for the product's most-seen
card?** Same shape on eight answers (bills, appointments, work, school,
housing, banking, benefits, insurance).

**3. The consequence card reports the letter's own claim without softening:
"ডকুমেন্টটি বলছে, পেমেন্ট না করলে এটি হবে: {the letter's words}. মূল
ডকুমেন্টটি দেখে নিন."** It used to add "হতে পারে" to the letter's threat.
**Does this clearly read as the LETTER's threat, reported by Northcue, and
not as Northcue threatening you?**

**4. Read these two aloud. Does the first sound clearly more serious?**

> এটি জরুরি. আপনাকে আজই পদক্ষেপ নিতে হতে পারে.
> এটি গুরুত্বপূর্ণ, তবে জরুরি অবস্থা নয়.

**5. We use a full stop everywhere and never the danda.** **Does that
look wrong to you, or acceptable for an app?**

**6. Sentences that quote the letter switch to English after a colon:
"ডকুমেন্টে লেখা আছে: the amount shown."** The English words are the
letter's own and cannot be translated. **Does the colon handover read
acceptably?**

### Portuguese

Portuguese is AI-complete (30 July 2026) and was NEUTRALISED between
European and Brazilian reading this session, so the region questions come
first. Ideally one reader from each community answers 1 and 2.

**1. The neutralisation. We replaced the high-traffic European markers:
enviar not carregar, arquivo not ficheiro, senha not palavra-passe,
telefone not telemóvel, administração local not câmara municipal, "parece
pedir" not "parece estar a pedir", "Leitura em curso..." not "A ler...".**
**As a Portuguese reader: does anything now read wrong or foreign? As a
Brazilian reader: does anything still stumble?**

**2. Two deliberate keeps: "contactos" keeps its c (valid in both
spellings, transparent both ways), and the iPhone install line quotes the
pt-PT share menu ("Adicionar ao ecrã principal").** **Right calls?**

**3. The bailiff chip now reads "Menciona ação de agentes de execução
(bailiffs)."** It used to say "agentes de cobrança", ordinary debt
collectors. **Does "agentes de execução" carry the court-backed weight,
and is the English gloss helpful or noise?**

**4. The consequence card reports the letter's own claim: "O documento
indica que, se um pagamento não for feito, acontecerá isto: {the letter's
words}."** **Does this clearly read as the LETTER's threat, reported by
Northcue, and not as Northcue threatening you?**

**5. The scam risk card avoids gendering you: "Pode ser vítima de um
engano e acabar por fazer um pagamento inseguro ou partilhar dados."**
**Does "ser vítima de um engano" land as a personal warning, or is it
too soft compared with "ser enganado"?**

**6. One frame avoids gender on purpose: "Isto parece ser uma carta
oficial e vem de Hounslow Council."** The label before "e vem de" changes
gender. **Natural, or engineered?**

**7. Read these two aloud. Does the first sound clearly more serious?**

> Isto é urgente. Pode ter de agir hoje.
> Isto é importante, mas não é uma emergência.

### Spanish

Spanish is AI-complete (30 July 2026), so its questions are specific.

**1. The deadline decision. Every deadline now uses the inclusive form:
"con plazo hasta el 1 June 2026" on the money card and "Plazo hasta el
1 June 2026" on the deadline card.** One template used to say "antes del",
which is a different last day. **Does "hasta el" clearly include that day
for you, in both Spain and Latin America?**

**2. The urgent banner now reads "Esto parece importante. No lo deje
pasar."** It used to advise ("Conviene no dejarlo pasar."). **Is the
direct form right on an urgent banner, or too commanding?**

**3. The consequence card reports the letter's own claim: "El documento
dice que, si no se realiza un pago, pasará esto: {the letter's words}."**
**Does this clearly read as the LETTER's threat, reported by Northcue,
and not as Northcue threatening you?**

**4. Three lines were rewritten to kill the su-ambiguity (its/your):
"Busque por su cuenta los datos de contacto oficiales de esa
organización", "Use el sitio web o la aplicación oficial de esa
organización".** **Is it now unambiguous whose website to check?**

**5. Hemisphere check. We changed Enhorabuena to Felicidades, desahucio to
desalojo, "¿Cuánto corre?" to "¿Cuánta urgencia tiene?", and one "pulse"
to "toque".** **Does anything else in the first cards read as
Spain-only or as Latin-America-only to you?**

**6. One frame avoids gender on purpose: "Esto parece una carta oficial y
viene de Hounslow Council."** The label before "y viene de" changes gender,
so no participle would agree. **Does it read natural, or engineered?**

**7. Read these two aloud. Does the first sound clearly more serious?**

> Esto es urgente. Puede que necesite actuar hoy.
> Esto es importante, pero no es una emergencia.

### French

French is AI-complete (30 July 2026), so its questions are specific.

**1. Sentences naming the sender use *par*, never *de*: "une facture
envoyée par EDF", and appointments now read "un rendez-vous annoncé par
EDF, le 1 May 2026".** This avoids the de/d' elision problem with English
names, and "annoncé par" avoids claiming the appointment is WITH the
sender. **Do these read naturally, or stilted?**

**2. The consequence card reports the letter's own claim: "Le document
indique que, si un paiement n'est pas effectué, il se passera ceci : {the
letter's words}."** **Does this clearly read as the LETTER's threat,
reported by Northcue, and not as Northcue threatening you?**

**3. Northcue's requests all use Veuillez + infinitive now ("Veuillez
envoyer une image plus nette."), never a trailing "s'il vous plaît".**
**Does the uniform Veuillez read polite, or bureaucratic when it repeats
across error messages?**

**4. Gender. No form addresses the reader as male only: "On pourrait vous
tromper...", "pour vous en assurer", "Encore des doutes", "Oui, cela m'a
été utile".** **Do these read as natural things a person would tap, or as
evasions?**

**5. We say "juridique ou judiciaire" for legal-or-court everywhere.**
It used to say "juridique ou de tribunal". **Right call?**

**6. We use a plain space before "?" and ":". French usually sets a narrow
non-breaking space; this is a recorded spec decision.** **Does the plain
space look wrong enough to revisit?**

**7. Read these two aloud. Does the first sound clearly more serious?**

> C'est urgent. Vous devrez peut-être agir aujourd'hui.
> C'est important, mais ce n'est pas une urgence.

### Panjabi

Panjabi is AI-complete (30 July 2026), so its questions are specific.

**1. The urgency pair. On a serious letter the top banner now says "ਇਹ
ਜ਼ਰੂਰੀ ਲੱਗਦਾ ਹੈ. ਇਸਨੂੰ ਅਣਗੌਲਿਆ ਨਾ ਕਰੋ." and the card below it says "ਇਸ ਵੱਲ
ਤੁਰੰਤ ਧਿਆਨ ਦੇਣ ਦੀ ਲੋੜ ਹੈ. ਤੁਹਾਨੂੰ ਸ਼ਾਇਦ ਅੱਜ ਹੀ ਕਦਮ ਚੁੱਕਣਾ ਪਵੇ."** The banner
used to say almost the same thing as the card. **Does the pairing read
right on one screen now, banner calm, card urgent?**

**2. The consequence card reports the letter's own claim without
softening: "ਦਸਤਾਵੇਜ਼ ਕਹਿੰਦਾ ਹੈ ਕਿ ਅਦਾਇਗੀ ਨਾ ਹੋਣ ਉੱਤੇ ਇਹ ਹੋਵੇਗਾ: {the
letter's words}."** It used to add "ਹੋ ਸਕਦਾ ਹੈ" to the letter's threat.
**Does this clearly read as the LETTER's threat, reported by Northcue, and
not as Northcue threatening you?**

**3. Several card sentences now name the topic after a colon:**

> ਇਸ ਵਿੱਚ ਕੋਈ ਆਖ਼ਰੀ ਤਾਰੀਖ਼ ਹੋ ਸਕਦੀ ਹੈ. ਵਿਸ਼ਾ: ਕੋਈ ਕਾਨੂੰਨੀ ਜਾਂ ਅਦਾਲਤੀ ਮਾਮਲਾ.
> ਇਹ ਕੋਈ ਜਵਾਬ ਮੰਗ ਸਕਦਾ ਹੈ. ਵਿਸ਼ਾ: ਘਰ ਜਾਂ ਕਿਰਾਇਆ.

We did this because "ਮਾਮਲਾ ਬਾਰੇ" was breaking the grammar (ਬਾਰੇ wants
ਮਾਮਲੇ), and the label list cannot inflect. **Do these read naturally on a
card, or too much like a form?**

**4. Some card answers now start "ਇਹ ਦਸਤਾਵੇਜ਼ ... ਲੱਗਦਾ ਹੈ", and the
garbled card says "ਲੱਗਦਾ ਹੈ ਕਿ EDF ਨੇ ਇਹ ਭੇਜਿਆ ਹੈ: ਇੱਕ ਅਧਿਕਾਰਤ ਚਿੱਠੀ."**
Both exist so the verb never has to guess the gender of what follows.
**Do they read as normal sentences, or noticeably engineered?**

**5. The check panel urgency chips now read "ਸਮਾਂ ਘੱਟ ਲੱਗਦਾ ਹੈ" above
"ਸਮਾਂ ਜ਼ਰੂਰੀ ਹੈ".** **Is the first clearly more pressing than the second?**

**6. The eviction and repossession wording is more vivid than the English
legal nouns, closer to "thrown out of the house".** **Is that too
frightening, or is it what a person would actually say?**

**7. We chose everyday words over formal ones throughout: ਚਿੱਠੀ not ਪੱਤਰ,
ਤਾਰੀਖ਼ not ਮਿਤੀ, ਠੱਗੀ not ਧੋਖਾਧੜੀ.** **Agree?** Two specific words to check:
the prosecution chip says ਫ਼ੌਜਦਾਰੀ ਮੁਕੱਦਮਾ, **is ਫ਼ੌਜਦਾਰੀ clear to your
community, or would ਅਪਰਾਧਿਕ ਮਾਮਲਾ with a gloss be safer?** And the
money-format note says ਬਿੰਦੀ for the decimal point, **does ਬਿੰਦੀ read as
the punctuation mark here, or does it suggest the Gurmukhi dot diacritic?**

---

## Phase 3A additions (30 July 2026): a few extra questions per language

A final machine verification pass ran after the questions above were written.
It fixed small mechanical slips directly and left these judgement calls for
you. Same rules: quick answers are fine.

**Polish.** The urgent next step adds "wyłącznie" (act exclusively on trusted
details) and the 999 line adds "natychmiast"; both are stronger than the
English, in the cautious direction. Keep or trim? One pattern can produce
"w sprawie: sprawa prawna lub sądowa"; is the doubling acceptable, or should
the frame say "na temat:"? On the urgent screen, "Wygląda na to, że nadawcą
urzędowego zawiadomienia jest X" presents notice-hood as given inside the
hedge; fine, or restructure like the garbled variant ("a dokument to list
urzędowy")?

**Romanian.** "Citiți mai întâi cardul de acțiune." compresses "before you
act" to "first"; strong enough? "Amenință că vă îngheață contul." uses the
standard present after amenință; confirm. "Ascunde distragerile și arată un
singur pas o dată." describes Focus mode rather than instructing you; fine,
or switch to "Ascundeți..."? "Pare presat de timp" describes a person more
than a letter; better hedge-keeping wording welcome.

**Gujarati.** One string says હજુ where the corpus says હજી; pick one. અપલોડ
is neuter in one line (થયું) and masculine in another (વાંચવો); pick one. The
respectful plural participles (પહોંચી ગયાં છો, કરી રહ્યાં છો) are used
throughout for gender neutrality; confirm they read respectful, not
feminine-marked, to your community. "ક્યારે તે મહત્વનું છે?" versus "તે
ક્યારે મહત્વનું છે?" as a card title. વાળું is written detached in two
strings (ખાનાં વાળું, પાનાં વાળી); joined or detached? The freeze chip now
says ફ્રીઝ કરવાની ધમકી; is the loanword right for your community?

**Hindi.** The urgent card opens "यह अत्यावश्यक है."; deliberate top rung, or
would "यह बहुत ज़रूरी है." serve better in this plain register? The refusal
suggests "साफ फ़ोटो"; should it be the comparative "और साफ फ़ोटो"? The
disclaimer says "सरकारी सलाह" for "official advice"; wide enough, or
"आधिकारिक सलाह"? The ladder's middle rung now reads "जल्द ही कदम उठाने की
ज़रूरत पड़ने की संभावना है."; natural, or is there a plainer way to keep
"likely"?

**Bengali.** "একজন AI প্রদানকারী" uses the human classifier for an
organisation; keep the personification or switch to একটি? The landing example
chip says "শেষ তারিখ 14 জুলাই" while real cards keep English month names; is
the mismatch fine as marketing copy? The why page adds "বিনয়ের সাথে"
(politely) to "Northcue declines"; keep the warmth or match the English?

**Panjabi.** A feedback chip says "ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ"; strict agreement
would be ਆਈ (ਸਮਝ is feminine); which reads right? PDF is masculine in one
error line (ਲੱਗਦਾ ਹੈ) and feminine in the next (ਵਾਲੀ PDF); pick one, or
recast with ਇਹ ਦਸਤਾਵੇਜ਼. The non-document note says "ਜੇ ਇਹ ਉਹੀ ਹੈ"; would
"ਜੇ ਇਹ ਚਿੱਠੀ ਜਾਂ ਬਿੱਲ ਹੈ" read more naturally? The ladder's middle rung now
reads "ਜਲਦੀ ਹੀ ਕਦਮ ਚੁੱਕਣ ਦੀ ਲੋੜ ਪੈਣ ਦੀ ਸੰਭਾਵਨਾ ਹੈ."; natural?

**Spanish.** The landing example chip says "Vence el 14 jul" while every real
deadline says "hasta el"; align or keep? A few lines print usted for
contrast ("Usted lo sube", "que encuentre usted en una fuente oficial");
does the no-printed-pronouns rule license these? "Empiecen juntos por la
tarjeta de acción." predicates juntos of you and your helper; fine as generic
masculine, or drop it? "Con cuánta antelación puede convenir mirarlo" on the
calm explainer; plainer alternative? The high-urgency chip now reads "El
tiempo importa"; natural next to "Parece haber poco tiempo"?

**French.** "Votre compte semble être créditeur" carries one hedge where the
English has two ("It looks like your account may be in credit"); is semble
enough on a reassuring sentence? "Vérifiez the amount shown." hands the
English fragment over without a colon while the other two frames use one;
confirm the direct handover reads naturally. "Utilise un avertissement sous
pression." on a scam chip; clearer shape? The privacy list mixes ni and et;
repeat ni? The card cites itself as "la fiche action" in two lines and
"la fiche Action" in others; which capitalisation?

**Portuguese.** "Verifique the amount shown." same colon question as French.
"Este documento parece pedir uma ação sua." renders "require" with pedir and
lets "precisa de fazer" carry the obligation; confirm. Three former
European-only forms now read "Construímos", "Recebemos o seu pedido." and
"concluiu esta parte"; do they read naturally to both communities?

---

## New since your list was written: the multi letter sentences (30 July 2026)

Seven new sentences were added to every language on one day, so they have not
been seen by any native speaker yet. They appear when someone photographs or
uploads **more than one letter at once**. Northcue now refuses to guess which
letter an amount or a date belongs to, and says so instead.

Please read these seven in your language and answer two questions about them:
**does the refusal sound calm and competent rather than broken or apologetic,
and is it clear that the reader has done nothing wrong?**

The seven, by where they appear:

1. Card 1 headline, what was found: English "This upload appears to contain
   more than one letter."
2. Card 1 key point and card 2, why nothing is being asserted: "The details
   have not been matched to a single letter." The meaning to preserve is that
   Northcue cannot tell WHICH letter each detail belongs to, not that the
   details are missing.
3. Card 3, the action: "Check each letter on the original documents."
4. Card 4, where a date would normally be: "Dates cannot be matched to one
   letter in this upload. Check the original documents."
5. Card 5, where an amount would normally be: "Amounts cannot be matched to one
   letter in this upload. Check the original documents."
6. A key point in the other case, where the letters WERE separated and only the
   first was read: "Only the first letter in this upload has been read." **Is it
   unmistakable that the other letters were not read at all?** This is the one
   most likely to be misread as "we read the first one first".
7. Card 6, the closing suggestion: "Uploading one letter at a time gives a
   clearer result."

Specific questions the machine drafts raised, per language, worth confirming:

- **Polish**: "przypisać do konkretnego listu" was chosen over the literal "do
  jednego listu", because the literal can be read as "they all belong to one
  letter". Does the chosen wording say what it should?
- **Romanian**: "o anumită scrisoare" over "o singură scrisoare" for the same
  reason. Also, does "Datele" read as dates and not data in the card 4 line?
- **Gujarati**: does "ફક્ત ... જ" make it plain that the remaining letters were
  not read? And is "એક વખતે" or "એક સમયે" the natural phrase for "at a time"?
- **Bengali, Hindi, Panjabi**: the plural "original documents" is new; the rest
  of the corpus says it in the singular. Does the plural read correctly beside
  the existing lines?
- **Spanish, French, Portuguese**: the word chosen for "upload" is the noun the
  rest of your file already uses. Does it still read naturally in these seven?

---

## New since your list was written: two sentences about serious letters (31 July 2026)

Two more sentences were added to every language on one day, so no native
speaker has seen them yet.

**1. The helpful note on a serious letter.** Northcue used to end a bailiff or
enforcement letter with "This looks like a normal formal letter." That was
wrong and it has been fixed. The replacement, in your file as
`tpl.note.high_stakes`, is English "This looks like an important letter. Ask
someone you trust if you are not sure what to do."

This one carries the most weight of anything added recently, because it appears
on the letters that frighten people most. Three questions:

- Does it sound **calm but not reassuring**? It must not imply the letter is
  routine, and it must not sound like an alarm either.
- Is "ask someone you trust" an **offer**, not an instruction? The reader must
  not feel told what to do, or that they cannot manage alone.
- Does your language's word for "important" here sound like *serious and worth
  attention*, rather than *urgent, act now*? The urgency is already said
  elsewhere on the same screen, so this line should not repeat it.

Note for **Polish**: the draft uses the impersonal "można poprosić o pomoc
zaufaną osobę" rather than a direct command, to match the register of the rest
of the file. Does that read as gentle rather than distant?

Note for **Romanian, Spanish, French, Portuguese**: the draft reuses the exact
first clause already in your `tpl.banner.high_stakes`, so the two lines agree
on screen. If you change one, the other should change with it.

**2. When the photo was hard to read.** In `<your language>.js`, not the
templates file, as `journey.explainWhatIsThisHardToRead`: English "Some of the
text was hard to read, so check the original document."

It sits under the first card when the upload was blurry or damaged. It replaced
a line that wrongly said the text could be read clearly. **Does it put the
difficulty on the photo rather than on the reader?** It must not sound like the
person took a bad picture.

---

## New since your list was written: when the date itself is unclear (31 July 2026)

Two more sentences, in your templates file as `tpl.check.date_ambiguous_order`
and `tpl.check.date_year_incomplete`. Both appear under the "When is it due?"
card, and both replace the ordinary line there rather than joining it.

Some letters print a date that genuinely cannot be read one way only. "03/06/26"
might be the 3rd of June or the 6th of March. "28 May 26" might be 2026 or 1926.
Northcue still shows the reader exactly what the letter says, because the person
holding the paper can usually tell, and then says which part it could not settle.

English:

> A. "The day and the month could be either way round. Check the original document: 03/06/2026."
>
> B. "The year is not written in full. Check the original document: 28 May 26."

Three questions:

- Does this sound like **a fact about the letter**, or like Northcue admitting a
  mistake? It should be the first. Nothing has gone wrong; the letter is simply
  printed that way.
- Does it sound **calm**? The card above it may say a payment is due. This line
  must not make that feel more urgent than it already is.
- Is "check the original document" an **ordinary suggestion** in your language,
  not an order? It is the same phrasing already used elsewhere in your file, so
  if it reads as commanding here it probably does there too, and we would want
  to know.

Note for **French**: the draft keeps the space before the colon, matching
`tpl.check.date_on_original` in your file.

Note for **Hindi, Panjabi, Gujarati, Bengali**: the date itself stays in the
Latin script exactly as the letter prints it, so the reader can match it against
the paper. Does the sentence read naturally when it ends with a Latin date?

---

## New since your list was written: when the date has gone (1 August 2026)

Two more sentences, in `public/i18n/<your language>.js` rather than the
templates file, as `journey.deadlinePassed` and `journey.appointmentDatePassed`.
They appear under the "When is it due?" card when the date the letter gives is
behind today.

English:

> A. "This date has already passed."
>
> B. "This appointment date has already passed."

This is the most delicate line added so far, because it appears exactly when the
reader may already be worried. Someone may be looking at a bill they have not
paid, on a card that has just told them the amount.

Four questions:

- **Does it read as a fact about the letter, or as an accusation?** This matters
  more than anything else here. It must say something about the date, not about
  the reader. If your language's most natural phrasing implies *you missed it*
  or *you are late*, that is the wrong phrasing, and we would rather have a
  stiffer sentence that stays neutral.
- Does it stay **calm**? It must not sound like an alarm. Northcue already says
  elsewhere on the same screen how serious the letter is, and this line must not
  add to that. On an ordinary council tax bill it sits inside a deliberately
  calm card.
- Does it avoid suggesting **what happens next**? It should say only that the
  day has gone. Not that a penalty follows, not that the reader should hurry,
  not what to do.
- **Is B clearly about an appointment rather than a payment?** A missed
  appointment and a missed bill are different things to have missed, which is
  why there are two sentences rather than one.

Note on the drafts: none of them contains a number, on purpose. Saying "this was
due 12 days ago" would need a different form for each plural category, and
Romanian would need "de" above nineteen, so the sentence deliberately says only
that the date has gone.

Note for **Polish and Romanian**: the appointment draft uses the noun for a
medical or official appointment (`wizyty`, `programări`). If a letter about a
school meeting or a benefits interview would use a different word, tell us,
because this line has to cover all of them.

---

## Expected, not a defect: card 5 quotes the letter in English

On some documents the "What could happen if I ignore it?" card shows a sentence
lifted **word for word from the reader's own letter**. UK official letters are
written in English, so that sentence stays in English even when the rest of the
page is in your language. This is deliberate. Those are the sender's words, not
Northcue's, and changing them would mean putting words in the sender's mouth. It
is the same rule that keeps amounts and dates exactly as printed, so the reader
can match what is on screen to what is in their hand. The app says so itself in
the line you have as `i18n.shownInEnglish`.

It used to happen only on the solicitor letter. It now also happens on the
possession notice and the court fine, because those two were moved onto the
fuller reading path (31 July 2026).

**Please do not report these English sentences as missing translations.** What
IS worth telling us: whether the surrounding cards make it clear that the
English line is a quotation from the letter rather than something Northcue
failed to translate. If a reader could mistake it for a bug, the framing needs
work even though the sentence does not.

---

## New since your list was written: what a letter says will happen (1 August 2026)

**These are the most serious sentences in the file, and they are the ones we
most need a person to read.** Please give them a few minutes even if you skip
everything else on this page.

Until now, when a letter warned what would happen if it was ignored, Northcue
quoted the letter's own sentence. That works when the letter is in English and
the reader is reading English. It does not work for someone holding a Polish
rent arrears letter, because the warning stayed in Polish inside an otherwise
translated card, or for someone reading English who was sent a letter in
another language.

So Northcue now recognises **seven kinds** of stated consequence and writes its
own sentence about each, which is why they need translating. Each has two
versions: one for when the letter says something MAY happen, and one for when
it says it WILL. Find them in `public/i18n/templates-<your language>.js` as
`tpl.consequence.kind.*`.

**Q. For each pair, is the second clearly more certain than the first?**

> `tpl.consequence.kind.enforcement_agent.may` / `.will`
> `tpl.consequence.kind.remove_goods.may` / `.will`
> `tpl.consequence.kind.possession.may` / `.will`
> `tpl.consequence.kind.eviction.may` / `.will`
> `tpl.consequence.kind.court_action.may` / `.will`
> `tpl.consequence.kind.disconnection.may` / `.will`
> `tpl.consequence.kind.prosecution.may` / `.will`

A letter that says bailiffs *may* visit and a letter that says they *will* are
different letters, and a reader has to hear the difference. If any pair sounds
the same in your language, that is the most useful thing you can tell us.

**Q. Does each one sound like a report, or like a threat?**

Every one begins with the equivalent of "The document says". That is deliberate:
Northcue is telling the reader what the letter states, never warning them
itself. **If any of these sounds like Northcue making the threat, say so.** That
is a safety problem, not a wording preference.

**Q. Are these the words a person would actually use?**

Some of them name things with an official name and a plain name. In English we
chose the plain one: "goods may be taken to cover what is owed" rather than
"controlled goods procedure", and "you losing your home" rather than "eviction
proceedings". Please do the same in your language. If the draft has reached for
the legal term, tell us the ordinary one.

**Two more, much smaller.** Northcue can now tell the difference between money
that is owed and money that is in arrears, where before it just said "amount
shown".

> `tpl.check.kp_amount_due` and `tpl.check.kp_amount_arrears`

**Q. Would a reader understand which is which?** These appear next to a figure
copied from the letter, so the label is doing all the work.

---

## New since your list was written: a refused upload that carries a link (2 August 2026)

Northcue refuses uploads that do not look like an official letter or bill, and
it tells the reader so. Until now it always finished by inviting them to try
again with a clearer photo or a different page, which is right for a photo of a
menu and wrong for a text message with a link in it. Three of our test
documents are exactly that: a Polish parcel delivery message, a Polish crypto
investment message and a Portuguese energy refund message. Each is a few lines
and a link, so Northcue correctly says it is not an official letter, and then
asked the person to send it again.

Four sentences, used only when the refused upload contains a link:

> `tpl.banner.non_document_link`
> `tpl.nondoc.action_link`
> `tpl.nondoc.helpful_note_link`
> `tpl.nondoc.next_step_link`

**Q. Does any of these sound like Northcue calling the message a scam?**

It must not, and this is the most important question on this page. Northcue
does not know. It knows two things: this does not look like an official letter,
and there is a link in it. The English is careful to say only what Northcue did
not do ("It has not checked the link, and cannot tell you whether it is safe")
rather than what the link is. **If your language's draft has drifted into
warning, accusing, or implying danger, tell us.** A drafted translation can
easily reach for a stronger word than the English, and here that would be
Northcue making a claim it cannot support.

**Q. Is "contact details you already have" clear?**

The whole point of these sentences is the contrast between the link in front of
the reader and a number or address they already trust, such as one on a
previous bill, a bank card, or the back of a letter. If your language needs
that spelled out to land, say so and suggest the phrasing. If the draft says
something closer to "official contact details", that is a different and weaker
idea, because a phishing message also claims to be official.

**Q. Does the last one work as an instruction on its own?**

`tpl.nondoc.next_step_link` appears by itself as the next step, with no
surrounding sentence to lean on. In English it is "Check using contact details
you already have, not the link in this message." If that shape is awkward
standing alone in your language, tell us what a person would actually say.

**Not a safety claim, so not blocking.** These four sit on a refusal, not on a
scam warning: no severity, no trust rating and no scam signal changes because
of them. They are here for wording, and specifically for the drift described in
the first question.

## URGENT, and different from everything else here (2 August 2026)

Until this week the engine had **never been handed a document in Gujarati,
Hindi, Bengali or Panjabi**. Not one. The sentence bank has carried 371
translated sentences for each of those languages, written without a single
document in that language to test them against.

Four documents have now been added to the test corpus so the engine is
exercised against these scripts at all:

> `spec_gujarati_nhs_appointment`, an NHS outpatient appointment letter
> `spec_hindi_dwp_universal_credit`, a DWP Universal Credit letter
> `spec_bengali_nhs_screening`, an NHS breast screening invitation
> `spec_panjabi_council_rent`, a council rent increase notice

**THEIR STRUCTURE IS ANCHORED TO A REAL TEMPLATE. THEIR WORDING IS NOT
NATIVE-REVIEWED.** The fields are the fields an NHS or DWP letter actually
carries. The sentences were drafted, not written by a speaker.

**Q. Is this what an official letter in your language actually sounds like?**

Not whether it is grammatical, though tell us if it is not. Whether a hospital
or a council writing to someone would write it this way. If it reads like a
translation of an English letter rather than a letter, say so, because that is
exactly what it is and we need to know how far off it lands.

**Q. Are the labels the labels a real letter uses?**

Especially the ones the engine keys on: the reference number, the letter date,
the appointment date, the amount. If a real letter would label the appointment
date differently, that matters more than anything else on this page, because
the engine is currently reading the LETTER date on both NHS letters and telling
the reader that is the date that matters.

**What we are asking for is a replacement, not a correction.** If these are
wrong, the useful thing is a letter you would actually expect to receive, with
invented names and numbers. That is worth more to this product than any
amount of proofreading.

## New since your list was written: the twelve month names (2 August 2026)

**This one is not a translation question, and it is the shortest on the page.**

Northcue reads dates off the letter itself. Until now it only recognised
English month names, which meant that in your language it found no dates at
all: on five of the six real non-English letters we test against, the card that
says when something is due read "No clear date was found." while the letter in
the reader's hand plainly gave a date.

The list is in `src/utils/monthNames.js`. There is no interface text to read.

**Q1. Are these the twelve months, spelled the way a letter writes them?**

Not the way a calendar heading writes them, the way a DATE writes them. Polish
is the example that made us ask: a Polish letter writes "6 sierpnia 2026", not
"6 sierpień 2026", so both forms are in the list. If your language changes the
month's ending inside a date, tell us the form the date uses.

**Q2. Is any common spelling missing?**

We have included the ones we know about, for instance both "सितंबर" and
"सितम्बर", and the accent-stripped forms some systems print. A missing spelling
costs the whole date, so an extra one is cheap and a gap is not.

**Q3. Would a letter in your language write the date some other way entirely?**

Native-script digits, for example, or a different order, or a different word
between the day and the month. We handle Devanagari, Bengali, Gurmukhi and
Gujarati digits, day-first order, and the Spanish and Portuguese "de". If your
language does something we have not named, that is the useful answer.

**Nothing here can make Northcue say something wrong.** A month name we get
wrong means a date is not found, and the cards already word that honestly. It
is a question of what the reader is shown, not of what they are told.

## What we are not asking you to do

You do not need to check spelling across 800 strings, and you do not need to
read the interface text. If the answers above are good, the rest follows. If
you have appetite for more afterwards, the file `translations-review/<your
language>/SAMPLES.md` shows every card sentence filled with realistic values,
and reading those aloud is the fastest way to hear what is wrong.

## Card 4, the two date strings, added 3 August 2026


**These two are not a wording preference. They are a correctness fix, and the
question we need answered is about the CLAIM, not the style.**

The old strings said the DOCUMENT contained no date:

    journey.explainDueNoDate   "No clear date was found in the document."
    journey.noDeadline         "No deadline clearly stated."

That is false on 19 of 36 affected documents, because the card directly above
the sub-line often names dates, for example "These dates appear in the
document: 9 August 2026. Check what they refer to." The reader was shown dates
and then told none were found.

The new strings report what NORTHCUE knows, which is that it could not confirm
which date, if any, is the due date:

    journey.explainDueNoDate   "We could not confirm a due date."
    journey.noDeadline         "We could not confirm a due date. A date in a
                                document is not always a deadline. You can
                                check the original document to see what any
                                date refers to."

**Q1. Does your translation say "we could not confirm", or has it drifted back
to "no date was found in the document"?**

The second is the defect being fixed. In several languages the natural
phrasing pulls that way, so this is the one to check first.

**Q2. Does it presuppose that a date exists?**

It must also be true on the 17 documents that contain no date at all. Watch for
articles, quantifiers, and anything that ranges over "the dates in this
document" rather than over documents in general.

**Q3. Is "due date" the right word, as against a plain "date"?**

The distinction is load bearing. Northcue can often see the dates; what it
cannot do is say which one is the deadline.

**Second surface, longer on purpose.** `journey.noDeadline` replaces the card
answer in the detail view, so it is the only text on that screen and the dates
the card named are not there. That is why it explains rather than just states.

### What is in the tree now, for you to correct


| language | `journey.explainDueNoDate` |
|---|---|
| English | We could not confirm a due date. |
| Polish | Nie możemy potwierdzić terminu. |
| Romanian | Nu am putut confirma o dată scadentă. |
| Spanish | No podemos confirmar una fecha de vencimiento. |
| French | Nous n'avons pas pu confirmer de date d'échéance. |
| Portuguese | Não conseguimos confirmar uma data limite. |
| Hindi | हम किसी देय तारीख की पुष्टि नहीं कर सके. |
| Bengali | আমরা কোনো শেষ তারিখ নিশ্চিত করতে পারিনি. |
| Gujarati | અમે નિયત તારીખની ખાતરી કરી શક્યા નથી. |
| Panjabi | ਅਸੀਂ ਕਿਸੇ ਆਖ਼ਰੀ ਤਾਰੀਖ਼ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਕਰ ਸਕੇ. |

Machine drafted, then independently back checked in the same language against
the three questions above. Four of the nine were revised at that stage, so
these are second drafts rather than first ones. **No native speaker has read
any of them.**

