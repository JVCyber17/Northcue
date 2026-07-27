# Bengali (bn) translation review pack

DRAFT PENDING HUMAN REVIEW. These are machine draft Bengali translations for Northcue. Nothing here is final until a Bengali speaking checker has read and approved it.

## What Northcue is

Northcue helps people in the UK understand confusing official letters, bills and notices. It turns them into short, calm "cue cards". Many readers are anxious, overwhelmed or neurodivergent, so every sentence must stay calm, warm and respectful. The draft uses the polite আপনি form everywhere and plain everyday Bengali, the way a kind helper would speak. Common English loanwords that British Bangladeshi readers use naturally (বিল, আপলোড, ইমেল, অ্যাপয়েন্টমেন্ট) are kept where they sound natural.

## The two files to review

1. `public/i18n/bn.js`. All interface text: buttons, menus, headings, messages. 565 entries, one per line, in the form `"key": "Bengali text"`.
2. `public/i18n/templates-bn.js`. All sentences the document engine can show on cue cards. Two parts: `exact` (273 fixed sentences) and `patterns` (51 sentences with slots).

To suggest a change, edit only the Bengali text between the second pair of quotes on a line. Do not change the key names, the punctuation around the quotes, or the file structure.

## Slots in curly braces

Some sentences contain slots like `{date}`, `{amount}`, `{sender}`, `{typeName}`. The app fills these in later with real values, for example a date or a company name. Rules:

- Every slot must survive exactly as written, in English letters inside curly braces. `{date}` must stay `{date}`, never translated or retyped.
- You may move a slot to a different position in the sentence if Bengali grammar needs it. Its spelling must not change.
- Do not add or remove slots.

See `SAMPLES.md` in this folder for every slot sentence with two filled in examples, so you can judge how the sentence reads with real values.

## House rules that must not be broken

- No em dashes and no en dashes anywhere. Use commas or full stops instead.
- Sentences end with a full stop (.), not the Bengali danda, to match the rest of the product.
- Numbers stay Western (1, 2, 3), not Bengali numerals.
- "Northcue" is never translated. "Council Tax", HMRC and 999 stay in English. Values like "£128", "0 KB", "B", "KB", "MB", "GB" stay exactly as they are.
- Safety wording must stay cautious and hedged: মনে হচ্ছে, হতে পারে, মূল ডকুমেন্টটি দেখে নিন. Never make a sentence sound more certain, more commanding or more alarming than the English.
- Keep HTML bits like `<br>`, `&rarr;`, `&larr;`, `&times;` and arrows exactly as they are.

## If something reads badly

Please flag it rather than silently rewriting the meaning. The English source is the reference for meaning. Tone questions, word choices between Bangladeshi and West Bengal usage, and loanword choices are exactly the kind of feedback we want.
