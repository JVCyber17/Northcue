# Translation quality review, nine languages

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
