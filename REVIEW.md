# Translation quality review, nine languages

> **Status, 28 July 2026.** The original review below was read and report only.
> A first round of fixes has now been applied. **This round is not the whole
> job.** What is done, what is deliberately decided, and what is still
> outstanding are all recorded in "Fix round 1" immediately below. Read that
> section before trusting any verdict in the original review, because several
> of them have changed. All nine languages remain disabled.

---

# Fix round 1

## What was fixed and verified

### Cross cutting 1, number formatting. Decided and built.

The decision was to keep the digits exactly as printed so the figure still
matches the paper in the reader's hand, and to remove the ambiguity in the
surrounding text instead.

The design: a short note appears on any card that shows an amount containing a
separator, naming the UK convention explicitly. It appears **only** in the five
languages where the convention is inverted, Polish, Romanian, Spanish, French
and Portuguese. The four Indic languages already use a full stop for the
decimal, so they never see it.

The note is gated on a separator being present, because "£40" reads the same
everywhere and does not need explaining. One point the original review missed:
the risk is not only that "£1,247.00" reads as one and a quarter pounds. In the
same five languages "£8.50" can read as eight hundred and fifty, because the
full stop is their thousands separator. The note covers both directions.

Implementation is `shouldExplainMoneyFormat()` in `app.js` plus the new
`i18n.moneyFormat` string in all ten languages. No digits are ever touched and
the engine is untouched.

### Cross cutting 3, the untranslated bailiff line. Decided and built.

The line stays in English, because it is lifted word for word from the
document. What changed is that the reader is now told why.

The old notice read "This part is shown in English." That states a fact and
explains nothing, on the action card of the most frightening letter Northcue
handles. It now reads, in each language, the equivalent of "One line here is
copied word for word from your letter, so it stays in English. These are the
sender's own words, not ours."

That turns an unexplained gap into a visible quotation, and it tells the reader
the words belong to the sender rather than to Northcue, which matters when the
line is an unhedged command.

### Cross cutting 4, Panjabi cross community word choices. Decided.

All nine were reviewed and **all nine drafts were confirmed**, with one
overriding piece of reasoning: the files are Gurmukhi only, and the choice of
script has already selected the audience. UK readers of Gurmukhi are
predominantly of Indian Sikh heritage; Pakistani heritage Panjabi speakers
generally read Shahmukhi. Optimising the vocabulary for a readership that
cannot read the script would help nobody.

Within that, everyday words were preferred over formal ones throughout, because
the reader is anxious and rushed:

| | Chosen | Rejected | Reason |
|---|---|---|---|
| 1 | ਧੰਨਵਾਦ | ਸ਼ੁਕਰੀਆ | Script already selects the audience |
| 2 | ਕਿਰਪਾ ਕਰਕੇ | ਮਿਹਰਬਾਨੀ ਕਰਕੇ | Standard in Gurmukhi writing |
| 3 | ਭਾਸ਼ਾ | ਜ਼ਬਾਨ | Standard in Gurmukhi writing |
| 4 | ਅਦਾਇਗੀ | ਭੁਗਤਾਨ | Everyday speech, not officialese |
| 5 | ਸੰਸਥਾ | ਅਦਾਰਾ | Standard in Gurmukhi writing |
| 6 | ਤਾਰੀਖ਼ | ਮਿਤੀ | Everyday; ਮਿਤੀ is official register |
| 7 | ਠੱਗੀ | ਧੋਖਾਧੜੀ | Lands faster, and this is the scam card |
| 8 | ਚਿੱਠੀ | ਪੱਤਰ, ਖ਼ਤ | Everyday word, understood by all |
| 9 | ਦਸਤਾਵੇਜ਼ | ਕਾਗ਼ਜ਼ਾਤ | Understood across both communities |

Consistency was then checked mechanically across both Panjabi files: every
chosen term appears, and **no rejected alternative appears even once**.

### Cross cutting 5, label leaks. Already fixed, re verified.

Fixed before the merge, in the matcher rather than the translation files, so it
covers all nine at once. Guarded by a test that sweeps nine languages against
nine vocabulary patterns.

### Safety, the severity ladder. Fixed in Hindi and Panjabi.

Hindi was the most serious finding in the original review and it was real.
`tpl.mip.urgent` and `tpl.mip.high` both opened "यह ज़रूरी है", because ज़रूरी
covers both "necessary" and "urgent". A bailiff notice and routine post began
with identical words.

**Panjabi had exactly the same collapse and the original review missed it.**
`ਇਹ ਜ਼ਰੂਰੀ ਹੈ` opened both tiers, for the same reason.

Hindi now uses अत्यावश्यक for the urgent tier and महत्वपूर्ण for the tier below,
which share no root. Panjabi rebuilds the top tier around ਤੁਰੰਤ ਧਿਆਨ, immediate
attention, which states time pressure rather than importance, against
ਮਹੱਤਵਪੂਰਨ below it.

A check now enforces this across all nine, and getting its metric right took
three attempts that are worth recording because each failure was instructive:

1. "Do the tier openings differ" flagged **English itself**. English uses
   parallel construction deliberately: every `tpl.risk` tier opens "Ignoring
   this". That is style, not collapse.
2. "How many characters until they diverge" did not catch the Hindi bug at all.
   Hindi diverged at character 12, well inside any sensible tolerance, purely
   because one tier ended "है." and the other "है,".
3. "Compare the first clause, splitting on commas" flagged Polish, Gujarati and
   Bengali, which attach the urgency clause with a comma where English attaches
   it without one. Those three were correct all along.

What actually separates the defect from the false alarms is the *relationship*
between tiers. English `high_stakes_urgent` is `high_stakes` plus an extra
clause, so a translation doing the same is right. English `mip.urgent` and
`mip.high` are not in that relationship, they use different adjectives, so a
translation that makes one a prefix of the other has collapsed a tier. The
check flags any pair whose relationship is weaker than English's, and it has
been confirmed to catch the original Hindi values and to clear the current ones.

### Safety, a false friend in four languages, not one.

The review found Romanian "serios", which means earnest or trustworthy rather
than grave, so the highest alarm line read as "may be suspicious and also
trustworthy".

Checking the same string across the others, **Spanish "serio", Portuguese
"sério" and French "sérieux" all carry the same earnest or reliable sense**.
The top scam banner was softening itself in four languages. All four now use
grave, which carries danger in all of them.

### Safety, the rest of the per language findings.

| Language | Defect | Fix |
|---|---|---|
| Gujarati | "શેર કરી બેસો" is imperative, so the risk line read as an instruction to go ahead and share private data | Potential form, "શેર કરી બેસી શકો છો" |
| Bengali | Both scam risk lines were agentless, "money may get lost" | Reader restored as the subject of both |
| Hindi | Same agentless problem in `risk_extractor`, not flagged in the original review | Reader restored |
| Panjabi | Same again, also not flagged | Reader restored |
| Portuguese | `risk_card` said only "there may be a risk of", dropping the deception and the reader | "Pode ser enganado e levado a" |
| French | "amené à", led to, dropped the deception from the only string naming it | "trompé et amené à" |
| French | Both high stakes banners were bare commands where English hedges with "Please" | "Veuillez" restored |
| Spanish | "su" means both its and your, so the scam card no longer said whose website to trust | Rewritten with no possessive at all |

### Grammar, French elision. Fixed structurally.

"de {sender}" rendered "de EDF" where French requires "d'EDF", across twelve
patterns. Rather than teach the template bank French phonology for one
language, the sentences were restructured around **par**, which never elides:
"par EDF", "par Orange", "par Hounslow Council" are all correct for every
possible sender, with nothing to get wrong later.

This surfaced a second bug in my own first attempt, which is worth recording.
"Cela semble être {type_label}, envoyé par {sender}" forces the participle to
agree with a label whose gender is unknown until runtime: "une lettre
officielle" is feminine, "un avis officiel" masculine, and no single form is
right. That sentence was split in two, which removes the agreement entirely.
Both genders verified rendering correctly.

Slots that cannot trigger elision were deliberately left alone: `{amount}`
always begins with a currency symbol and `{date}` with a digit.

---

# Polish, round 2 (28 July 2026)

Polish only. Worked from rendered output throughout, never from files: every
pattern was put through the real matcher with three value sets chosen to
trigger Polish numeral agreement, and every fix below was confirmed by reading
the card rather than by checking the file contains a string.

## Two premises in the brief turned out to be wrong

**There is no numeral agreement problem in the Polish bank, because no template
inserts a number.** The 51 patterns use exactly seventeen slots and not one of
them is a count: sender, date, amount, topic, dates, type_label, title,
category_label, short_answer, header_date, consequence, sentence_body,
consequence_clause, action_sentence, explanation, key_points, field_list. A
number can therefore never land next to a noun that has to agree with it. The
"Polish numeral agreement" line in the first review was my own inference and it
was not checked against the actual slots.

The one place a count does reach the interface is the completion screen, and
**the Polish draft had already solved it** by restructuring: "Masz za sobą
wszystkie karty, a było ich {count} łącznie" puts the noun before the number
and an invariant word after it, so it is grammatical for any value. That is
exactly the restructuring strategy the brief asks for, already applied.

**The case agreement risk on inserted labels was also already solved.** Five
patterns insert {topic}, and several topics are feminine ("umówiona wizyta",
"sprawa prawna lub sądowa") where nominative and accusative differ. Every one
of those five patterns uses a colon before the slot, "Temat: {topic}", so the
label stays nominative regardless of gender. The type_label and category_label
values are all masculine inanimate or neuter, where the two cases coincide, so
they are safe in both the "wygląda na" (accusative) and "dokument to"
(nominative) frames.

So the largest category in the brief was, for Polish, already correct.

## Safety defects, found and fixed

**The lost hedge, as REVIEW.md said.** `tpl.readable.mip_topic` read
"Najwyraźniejszy temat to:", which states the topic as fact where English
hedges with "appears to be". Now "Wygląda na to, że najwyraźniejszy temat to:".

A sweep of every exact sentence, pattern and dictionary string for the same
class flagged thirteen candidates, and **twelve were false alarms of my own
pattern**: "mogłoby" and "się wydaje" are hedges it did not recognise, and
"could not read" is a plain negative rather than a hedge. Polish had lost
exactly one hedge, the one already known.

**The scam card had lost the deception.** `tpl.scam.risk_card` said "Ktoś może
nakłonić Cię", where "nakłonić" is neutral persuasion. English says "tricked".
On the card whose only job is to stop someone complying with a fraudster,
neutral persuasion is the wrong word. Now "Ktoś może podstępem nakłonić
Państwa". The active construction is deliberate: the Polish passive participle
is gendered (oszukany / oszukana) and the reader's gender is unknown.

**Both high stakes banners had dropped the English "Please"**, leaving bare
commands on the two most serious banners. Restored as "Prosimy".

**The Romance false friend does not extend to Polish.** "poważne" means grave
in the weighty sense and carries none of the earnest or trustworthy reading
that broke Romanian, Spanish, Portuguese and French. Checked, correct, left
alone.

**The severity ladder is intact.** "To jest pilne" against "To jest ważne"
keeps the tiers apart, and the ladder test passes.

## Formality: the bank block is converted, the interface block is not

**Register decision.** Polish formal address has three candidate forms and only
one works here:

- *Pan / Pani* forces a guess at the reader's gender in every sentence, and the
  "Pan/Pani" slash workaround is tax office register, the opposite of calm.
- *Prosimy + infinitive* is the standard institutional request form. Formal,
  warm, and carries no gender at all. **This is the default.**
- *Państwo* is formal, gender neutral, and keeps the reader as the grammatical
  subject. **Used only where the reader must be the subject**, which in
  practice means the risk lines. An agentless warning is the exact defect that
  had to be fixed in Bengali, Hindi and Panjabi, so trading the reader out of a
  scam warning to gain register purity would be a bad trade.

"zanim podejmiesz działanie" becomes "przed podjęciem działania", impersonal
and shorter. Reflexive "swoje" is kept: it is not second person and is correct
in formal Polish.

**Where formality made things colder, and what was done about it.** The risk
lines are the only place it bit. "Możesz stracić pieniądze" is warmer than
"Mogą Państwo stracić pieniądze", and the formal version does read more
distant. It was kept formal because the alternative that preserves warmth is
the informal *ty*, which the decision rules out, and the alternative that
preserves register without *Państwo* is an agentless construction, which is a
safety defect. Of the three, distance is the least harmful. A native speaker
should confirm this specific trade, and it is question 1 in NATIVE_REVIEW.md.

**A scanner bug worth recording, because it produced a false all clear.** The
first informality scan reported zero remaining informal strings in the bank
while the rendered card plainly read "Sprawdź oryginał". JavaScript's `\b` is
ASCII only, so in `/\bSprawdź\b/` the trailing boundary sits after "ź"
(U+017A), which JS does not treat as a word character, and the term never
matches. Every Polish word ending in a diacritic was invisible: Sprawdź,
Prześlij, Chroń, Cię, Twoją, możesz. The true count was 210 informal strings,
not the 179 first reported. Rewritten with `\p{L}` lookarounds and the `u`
flag. **This is why the brief's instruction to confirm by rendered output
rather than by asserting the file matters, and it caught a mistake that a file
level check had already passed.**

### Converted: the whole bank, 103 strings

Everything that can appear on a cue card is now formal: all 273 exact sentences
and all 51 patterns scan clean with the corrected scanner. Verified by
rendering the bailiff scenario and the routine scenario side by side, and by
checking all 51 patterns still match the bank rather than falling back (the 9
fallbacks are the three pure assembly templates, unchanged from before).

### Not converted: the interface dictionary, 158 strings

`public/i18n/pl.js` is untouched by this session and remains informal
throughout. It is interface chrome: buttons, headings, help pages, settings,
status messages. Nothing in it renders on a cue card.

The blocks remaining, in the order they should be done:

| Block | Strings | Notes |
|---|---|---|
| `journey.*` | 34 | Upload and card reading flow, the most seen |
| `home.*` | 24 | Landing and home tiles |
| `feedback.*` | 12 | The feedback flow |
| `helpGuides.*` | 22 | Five help guides |
| `status.*` | 14 | Upload status messages |
| `privacy.*` + `why.*` | 15 | Two content pages |
| `check.*` | 6 | Document check modal |
| everything else | 31 | comfort, install, nav, aria, landing, help, topbar |

Re run `scratchpad/pl_informal.js` to regenerate that list exactly; it prints
key, matched term and current value for each.

## Naturalness

Fixed what sounded like a machine when read aloud:

- `tpl.mip.high` repeated "to" twice in one short sentence, the giveaway of
  English word order. Now "To jest ważne, ale nie jest to nagły wypadek."
- `tpl.next_step.urgent` said "kartę z działaniem", a literal rendering of "the
  action card" that means nothing in Polish, then a participle clause English
  would use and Polish would not. Rewritten as a person would say it.
- All three `tpl.risk.*` tiers used "spowodować" for "cause". "Doprowadzić do"
  is what a person says about a consequence arriving over time.

## Adversarial read

Read the finished cards as a frightened person, urgent against routine:

- **Does the urgent card feel more serious?** Yes, and clearly. "podejrzane i
  poważne" against "zwykły dokument"; "To jest pilne, być może trzeba działać
  jeszcze dziś" against "To wygląda na samą informację"; "mogłoby szybko
  doprowadzić do poważnych problemów" against "może doprowadzić do opóźnień".
- **Does the scam card make me less likely to comply?** Yes. The deception is
  named, the reader is the subject of both risk lines, and the instruction not
  to use numbers from the document is unambiguous.
- **Does anything sound like a machine?** Three things did; all three are fixed
  above. One stays on the list for a native ear: "zweryfikować" is correct but
  stiff, and a Polish person warning a friend would say "sprawdzić w
  niezależnym źródle". It was kept because English distinguishes "verify" from
  "check" and the engine relies on that distinction.

## Still outstanding for Polish

1. The interface dictionary, 158 strings, listed by block above.
2. Naturalness across the dictionary, not yet read at all.
3. The "zweryfikować" register question, for a native ear.
4. Whether formal *Państwo* on the risk lines reads too cold.

---

## Still outstanding

This is the honest remainder, and it is substantial. None of it is blocked on a
decision; it is unfinished work, not deferred work.

1. **Cross cutting 2, formality in Polish and Romanian.** The decision is made
   and recorded: formal address in every language, because these readers are
   dealing with debt and enforcement and respect ages better than familiarity.
   It is **not yet applied**. Both files are written informal throughout, and
   converting them means reviewing roughly nine hundred strings each for verb
   form, pronoun and imperative. A careless regex sweep over that volume would
   introduce more errors than it fixed, so it has been left rather than done
   badly.
2. **The bulk of the grammar work.** French elision is done. Bengali detached
   genitive suffixes, Polish numeral agreement, Romanian article attachment and
   the remaining inflection failures across the 51 patterns are not. The
   original review counted roughly 150 failing pattern renders across the nine
   languages; twelve are fixed.
3. **Polish hedge and Spanish deadline consistency.** Both identified in the
   original review, neither fixed.
4. **Naturalness.** No systematic pass was made over strings that read as
   translated English.
5. **The fresh adversarial review round.** Not run. The review that would have
   validated this round has not happened, so the fixes above are verified
   mechanically and by my own reading, not by a second adversarial pass.

Everything in this round was verified by rendering through the real matcher,
by the ladder check, and by the parity suite. Nothing here has been seen by a
native speaker of any of the nine languages.

---

# Original review, 27 July 2026

Read and report only. **No translation file was changed.** Branch `feature/multilingual-mvp`, still unmerged and undeployed.

## How this was tested

Not by reading templates. I ran the **real rules engine** on four UK documents, then pushed its actual output through each language exactly as the browser does, and judged the finished cards. I also rendered all 51 sentence patterns twice per language, once with small values (£8.50, 1 day, "EDF") and once with large ones (£1,247.00, 28 days, "Marston Holdings Enforcement Agents"), because that contrast is where number and case agreement breaks.

Two fixtures needed rework to reach the safety paths at all: my first scam letter was rated ordinary caution because the detector keys on set phrases like "act now", and my first menu was not declined because its top line read as a sender. Both now trigger the real refusal and decline text.

## Headline

**All nine need fixing before public release.** None is unsafe to test with. The pattern is consistent: the fixed calm sentences translated well, and the damage clusters where a real value gets dropped into a translated sentence.

| Language | Patterns failing grammar | Verdict |
|---|---|---|
| Hindi | 9 of 51 | needs fixing first |
| Gujarati | 12 of 51 | needs fixing first |
| French | 13 of 51 | needs fixing first |
| Panjabi | 13 of 51 | needs fixing first |
| Spanish | 14 of 51 | needs fixing first |
| Polish | 19 of 51 | needs fixing first |
| Romanian | 24 of 51 | needs fixing first |
| Bengali | 25 of 51 | needs fixing first |
| Portuguese | 3 templates, 32 as rendered | needs fixing first |

---

## Five problems that hit every language

These are worth more of your attention than the per-language lists, because fixing them once fixes nine languages.

**1. The scariest sentence in the set is shown in English.** In the bailiff scenario, one action step reads "Amount outstanding: £1,247.00 You must contact us by 3 September 2026." It stays English in all nine languages. This is the system working as designed: the sentence is lifted word for word from the letter, so it cannot be pre translated, and the app honestly shows it in English with a notice. But of the 63 sentences across four scenarios it is the **only** one that falls back, and it lands on the do this card of the most frightening document. Every reviewer raised it independently. It is also the only unhedged command anywhere in the output.

**2. Money can be misread as a much smaller amount.** Amounts insert exactly as printed, "£1,247.00". In Polish, Romanian, Spanish, French and Portuguese the comma is the decimal point, so a reader can parse that as roughly one and a quarter pounds. On an enforcement notice that is a serious misreading. **This is a genuine tension in your own design rule, not a translator error**: values are inserted verbatim so they match the letter in the reader's hand, which is right, but the format is ambiguous across locales. A decision is needed, see section at the end.

**3. Dates arrive in English and will not inflect.** "12 August 2026" is dropped into sentences whose grammar requires an inflected local date, giving "pana la 12 August 2026" in Romanian where it needs "12 august 2026", and the same in Polish, Spanish, French, Portuguese, Hindi, Panjabi. There are no local month names anywhere in the files. Same design tension as money.

**4. Northcue's own vocabulary leaks through untranslated.** I verified this myself. Nine patterns embed a label such as the document type, and the label is inserted in English even though the translation exists in the bank. Portuguese renders "EDF parece ter enviado **bill or payment**", when "Fatura ou aviso de pagamento" is sitting in the same file. **Unlike money and dates, this is a plain defect**: these labels are Northcue's words, not the letter's, so nothing is gained by keeping them English.

**5. Senders and inserted names break agreement.** Every inflected language hardcodes one grammatical form around a value it cannot inspect. French writes "de EDF" where it must be "d'EDF" (11 patterns, the French equivalent of "a apple"). Hindi and Panjabi freeze a masculine singular verb after the sender, so "Hounslow Council" and plural agency names read wrong. Bengali writes the possessive as a separate word after a Latin value. Polish, Romanian, Spanish and Portuguese have the same class of problem with articles and prepositions.

---

## Safety findings, per language

Only the issues that change meaning or weight. Full detail per language is in the working notes.

**Hindi, most serious of all.** The severity ladder collapses. "This is urgent" became "यह ज़रूरी है", which means "this is important". The tier below it, "This is important, but not an emergency", opens with the **same two words**. A Hindi reader cannot tell a bailiff notice from a routine letter. Also, the decline banner has a broken sentence, a bare "if this is" with nothing after it.

**Romanian.** The strongest scam banner says "suspect si serios". Romanian "serios" means earnest or trustworthy, not grave, so the highest alarm line reads as "may be suspicious and also trustworthy", contradicting itself. Four safety strings also address the reader as male only.

**Gujarati.** On the scam card, "or share private data" is phrased in a form that reads like a polite instruction to go ahead and share it, on the one card designed to stop exactly that. Also confirmed: the flagged punctuation bug is real and reads badly, the English fragment keeps its full stop so the sentence appears to end mid line with a stranded verb.

**Spanish.** The scam guidance says "compruebe la organizacion en su sitio web", and Spanish "su" means both "its" and "your", so it no longer clearly says whose website to trust. The same ambiguity hits the contact details line, where it can invert into "your contact details". Separately, two cards can state **different deadlines for the same document**, because one uses "before" and the other "up to".

**Bengali.** Both scam risk lines remove the reader: "you could lose money or share private data" becomes "money may get lost and information may go away". The warning stops being about what the reader does, in the scenario where that matters most.

**French.** The urgent banner drops "Please" and becomes a bare command. The scam card replaces "tricked" with "led to", removing the deception from the only string that names it.

**Polish.** One hedge lost: "the clearest topic appears to be" became "the clearest topic is".

**Panjabi.** No hedge was weakened anywhere, but the eviction and repossession signals are far more visceral than the English legal nouns, "thrown out of the house" and "house seized" versus "eviction risk". A human tone call.

**Portuguese.** Three summary lines assert flat fact where every sibling hedges, and they are the two highest stakes categories, medical and legal or court. One bailiff line is more pressing than the calm English.

---

## Other things worth knowing

**Register is clean everywhere.** I checked mechanically across every string and template, and the reviewers confirmed: no language mixes formal and informal address. Polish and Romanian are consistently **informal**, which is a deliberate translator choice and a product decision for you, since the readers are anxious people handling official letters.

**Regional neutrality partly missed.** Portuguese reads as European Portuguese, not neutral, and a Brazilian reader would notice within one card. Spanish leans Peninsular in places. Both were asked to be neutral.

**Length is not a problem.** Latin languages run 1.17x to 1.27x English, Indic ones are at or below parity. My browser pass at 375px found no overflow, no clipping, in any language, in light, dark and focus. French flags one real polish item: it uses plain spaces before "?" and ":" where French sets a narrow space, so a question mark can wrap alone onto its own line.

**One check of mine was wrong.** My automated scan flagged 14 Gujarati strings as informal address. On inspection the match was inside the ordinary verb "કરતું", not the pronoun. Discarded. Mentioning it because a clean report should show its failures too.

**Deliberate choices, not defects.** The Indic files use full stops rather than the traditional danda, and Bengali has no "।" anywhere. That was my instruction to the translators for consistency with the product, so do not let a checker "fix" it without deciding.

---

## What I would decide first

1. **The bailiff fallback.** The safe design is working, but the worst placed sentence is the untranslated one. Options: leave it, since honest English beats a guessed translation; or have the engine mark document quoted text so the card can introduce it in the reader's language ("The letter says, in English:").
2. **Money and date formats.** Verbatim matches the letter, which is right, but is ambiguous or ungrammatical in most of these languages. A middle path is to keep the verbatim value and add the local reading beside it once per card.
3. **The label leak in point 4.** This one is just a bug and I would fix it regardless.
4. **Hindi urgency wording**, before any Hindi speaker sees a serious letter.
5. **Polish and Romanian informal address**, a tone decision only you can make.

Nothing here needs an engine change. Points 1 and 2 touch how values are presented, everything else lives in the translation files.
