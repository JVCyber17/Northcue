# Panjabi (Gurmukhi) translation review pack for Northcue

Sat sri akal, and thank you for checking these translations. This note
explains what the files are and what to look for. You do not need to be
technical.

## What Northcue is

Northcue helps people in the UK who find official letters stressful,
including anxious, overwhelmed, and neurodivergent readers. It turns a
confusing bill, notice, or government letter into short, calm "cue cards"
that say what the letter appears to be, what matters, and what to check
next. The tone must always be calm, warm, and respectful, like a kind
helper, never like a government office and never alarming or commanding.

All Panjabi copy uses the respectful ਤੁਸੀਂ form throughout, and everyday
spoken Panjabi rather than literary or high register. The script is
Gurmukhi only. There is no Shahmukhi (Arabic script) anywhere in these
files, and the app is left to right only.

## The two files to review

Both live in the `public/i18n/` folder of the project:

1. `public/i18n/pa.js` contains all the interface text: buttons, menus,
   headings, settings, help pages. 565 lines of text.
2. `public/i18n/templates-pa.js` contains every sentence the app can put
   on a cue card: 273 full sentences plus 51 sentence templates with
   slots.

Both files are machine drafts. Every value is plain text inside quotation
marks. To fix a translation, edit only the Panjabi text between the
quotes on the right side of the colon. Please do not change anything to
the left of the colon (the key), and do not remove commas or braces.

## Rules the text must follow

- Slots in curly braces, like `{amount}`, `{date}`, `{sender}`, or
  `{typeName}`, must survive exactly as written, in English letters,
  braces included. The app replaces them with real values, for example
  `{amount}` becomes `£187.42`. You may move a slot to a different place
  in the sentence if Panjabi grammar needs it, but never translate,
  respell, or delete it.
- No dashes. Never use an em dash or an en dash anywhere. Use a comma or
  a full stop instead. This matches the rest of the product.
- Full stops, not the danda. The product uses "." to end every sentence,
  and the danda mark used in Indic scripts must not appear anywhere.
- Numbers stay in Western digits (1, 2, 3), and money stays as written
  (£187.42).
- "Northcue" is a brand name and is never translated. "Council Tax",
  "Benefits", "HMRC", "999", "PDF", "JPG", "PNG" also stay in English
  letters. Where a UK term would not be recognised on its own, it keeps
  the English word plus a short Panjabi gloss in brackets, for example
  "Council Tax (ਕੌਂਸਲ ਟੈਕਸ)", "Benefits (ਸਰਕਾਰੀ ਮਦਦ)", "Bailiff (ਵਸੂਲੀ ਅਫ਼ਸਰ)".
  This matches how the Romanian and Hindi files handled Council Tax.
- Safety wording must stay hedged. English says "appears to be", "may",
  "check the original document". The Panjabi keeps that softness, for
  example "ਲੱਗਦਾ ਹੈ", "ਹੋ ਸਕਦਾ ਹੈ", "ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ". Please never make a
  sentence more certain or more commanding than the English.
- A few values are deliberately left in English letters because they are
  technical or visual, for example "PDF, JPG ਜਾਂ PNG", "0 KB", "B", "KB",
  "MB", "GB", "£128", "you@example.com", "northcue-date.ics", HTML bits
  like `<br>`, `&rarr;`, `&larr;`, `&times;`, and arrows like `←` and `→`.
  Leave those as they are.

## Community differences, please decide these first

UK Panjabi speakers include both Indian Sikh heritage and Pakistani
heritage communities, and the two communities often reach for different
words. In every case below the draft picked the option believed to be
most widely understood by both, but a human should confirm. If you change
one, please change it everywhere it appears.

1. "Thank you": the draft uses ਧੰਨਵਾਦ. Pakistani heritage readers may
   expect ਸ਼ੁਕਰੀਆ. (Keys: `feedback.thanksTitle`, `feedback.saved`,
   `feedback.savedLocal`, and the language banner in `config.js`.)
2. "Please": the draft uses ਕਿਰਪਾ ਕਰਕੇ. The common alternative is
   ਮਿਹਰਬਾਨੀ ਕਰਕੇ. This appears in many `status.*`, `feedback.*` and
   `tpl.error.*` values.
3. "Language": the draft uses ਭਾਸ਼ਾ. The alternative is ਜ਼ਬਾਨ.
   (Keys: `language.title`, `language.aria.open`, `language.aria.banner`.)
4. "Payment": the draft uses ਅਦਾਇਗੀ, which is Persian derived and common
   in both communities. The Sanskrit derived alternative is ਭੁਗਤਾਨ.
5. "Organisation": the draft uses ਸੰਸਥਾ. The Urdu derived alternative is
   ਅਦਾਰਾ.
6. "Date": the draft uses ਤਾਰੀਖ਼. The Sanskrit derived alternative used in
   Indian Panjabi official writing is ਮਿਤੀ.
7. "Scam": the draft uses ਠੱਗੀ, everyday in both communities. The more
   formal alternative is ਧੋਖਾਧੜੀ.
8. "Letter": the draft uses ਚਿੱਠੀ. Alternatives are ਪੱਤਰ (formal, Indian)
   and ਖ਼ਤ (Urdu derived).
9. "Document": the draft uses ਦਸਤਾਵੇਜ਼ throughout, understood in both
   communities.
10. "Privacy": the draft uses the English loan ਪ੍ਰਾਈਵੇਸੀ rather than
    ਨਿੱਜਤਾ, matching how the Hindi file handled it.
11. "Housing letter": the draft says ਘਰ ਬਾਰੇ ਚਿੱਠੀ rather than a loan word,
    so it reads plainly for both communities.
12. Subscript dot letters (ਖ਼, ਗ਼, ਜ਼, ਫ਼, ਸ਼) are used in words like ਤਾਰੀਖ਼,
    ਫ਼ਾਈਲ and ਜ਼ਰੂਰੀ. Some readers write these without the dot. Please pick
    one convention and apply it consistently if you change any.

## What to look at first

The file `SAMPLES.md` in this folder shows all 51 slot templates with the
English original, the Panjabi draft, and two example sentences filled
with realistic UK values. Reading the filled examples aloud is the
quickest way to hear whether the Panjabi sounds natural and calm.

## Where to send corrections

Edit the Panjabi text in the two files directly, or note the key name
(the text on the left of the colon, for example `journey.submit`) and
your suggested wording, and send it back to the team.
