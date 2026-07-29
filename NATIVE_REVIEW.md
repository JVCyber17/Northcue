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

Polish has had a full pass on the cue card text, so its questions are more
specific than the others. The interface text has not been touched yet and is
still informal, so please ignore buttons and menus.

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
1. Same formality question as Polish. The file is informal and is being changed
   to formal. **Does it sound cold?**
2. `tpl.banner.suspicious_urgent` used to say *serios*. It now says *grav*.
   **Is grav right for "this may be dangerous"?**
3. Sentences that insert a sender or an amount: do the articles still attach
   correctly, or do you get something like "de la Hounslow Council" where
   Romanian wants a different form?

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
1. `tpl.mip.urgent` now uses **अत्यावश्यक** and `tpl.mip.high` uses
   **महत्वपूर्ण**. Both used to be ज़रूरी, which made them sound identical.
   **Is अत्यावश्यक clearly more urgent than महत्वपूर्ण to an ordinary reader?**
   It is a formal word; if it sounds bureaucratic, tell us what you would say.
2. The decline message: is there a sentence that stops halfway, a bare "if this
   is" with nothing after it?

### Bengali
1. The two scam lines were rewritten so the reader is the subject, "you could
   lose money" rather than "money may get lost". **Do they now sound like they
   are about the reader?**
2. Where a sender name in English letters is followed by a possessive, does it
   read correctly, or does the suffix look detached from the name?

### Portuguese
1. Does this read as European or Brazilian Portuguese? We asked for neutral and
   suspect it leans European. **Would a Brazilian reader notice in the first
   card?**
2. `tpl.summary` lines for medical and legal documents: do they state something
   as flat fact where the others hedge?

### Spanish
1. Does it read as Peninsular or neutral? Same question as Portuguese.
2. `tpl.scam.action_verify` was rewritten to remove *su*, which meant both
   "its" and "your". **Is it now unambiguous whose website to check?**
3. Do any two cards give different deadlines for the same letter, one saying
   "before" and one "up to"?

### French
1. Sentences naming the sender were changed from *de* to *par*, so
   "une facture envoyée par EDF" rather than "de EDF". **Does that read
   naturally, or is it stilted?**
2. We use a plain space before "?" and ":". French usually sets a narrow space.
   **Does the plain space look wrong enough to fix?**

### Panjabi
1. `tpl.mip.urgent` now opens "ਇਸ ਵੱਲ ਤੁਰੰਤ ਧਿਆਨ ਦੇਣ ਦੀ ਲੋੜ ਹੈ" instead of
   "ਇਹ ਜ਼ਰੂਰੀ ਹੈ", which was identical to the tier below it. **Is it clearly
   more urgent now, and does it sound natural?**
2. The eviction and repossession wording is more vivid than the English legal
   nouns, closer to "thrown out of the house". **Is that too frightening, or
   is it what a person would actually say?**
3. We chose everyday words over formal ones throughout: ਚਿੱਠੀ not ਪੱਤਰ, ਤਾਰੀਖ਼
   not ਮਿਤੀ, ਠੱਗੀ not ਧੋਖਾਧੜੀ. **Agree?**

---

## What we are not asking you to do

You do not need to check spelling across 800 strings, and you do not need to
read the interface text. If the answers above are good, the rest follows. If
you have appetite for more afterwards, the file `translations-review/<your
language>/SAMPLES.md` shows every card sentence filled with realistic values,
and reading those aloud is the fastest way to hear what is wrong.
