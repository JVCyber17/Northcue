# Turning a language on

## Looking at one first, without turning it on

Add `?lang=<code>` to a localhost URL:

```bash
npm start
```

Then open `http://localhost:3000/?lang=fr`. The whole site renders in that
language, including cue cards, and a badge at the bottom names it so a
disabled draft is never mistaken for shipped state.

This works only on a loopback host. On northcue.co.uk the parameter does
nothing at all: no language file is fetched and the page stays in English.
The `enabled` flags are not touched, so the switcher stays hidden and the
detection banner keeps its production behaviour. The choice is never
remembered, so removing the parameter restores English on the next load.

Use this to check translation work before shipping it. It is the only
supported way to see a disabled language, and it is much safer than flipping
`enabled` locally and risking that edit reaching a commit.



Every language shipped with the multilingual merge is switched **off**. The
translation review found real problems in all nine, so none of them should
reach a reader until a native speaker has checked it. This file is the whole
procedure for switching one on.

## Before you switch anything on

A native speaker needs to sign off two files for that language:

- `public/i18n/<code>.js`, the interface dictionary
- `public/i18n/templates-<code>.js`, the sentence bank used for card text

Give them `translations-review/<code>/SAMPLES.md`, which shows the real
rendered output rather than raw strings, and `REVIEW.md`, which lists the
specific problems already found. The five issues in the "problems that hit
every language" section of `REVIEW.md` apply to all of them and are worth
fixing before a reviewer starts, so they are not reporting the same thing nine
times.

## Switching it on

One flag, in `public/i18n/config.js`:

```js
{
  code: "pt",
  nativeName: "Português",
  enabled: true,   // was false
  ...
}
```

That is the only change needed. The switcher appears automatically as soon as
two or more languages are enabled, on all three of its positions (desktop
topbar, mobile topbar, landing page). The first visit detection banner starts
offering that language to browsers that ask for it.

Then bump the cache values so returning visitors get the new files. There are
three places, and which ones apply depends on what changed:

- the `?v=` query strings in `public/index.html` (`styles.css`, `app.js`, and
  the five `/i18n/` script tags share two tokens)
- `VERSION` in `public/i18n.js`, which stamps the on-demand per-language file
  fetches, so bump it whenever any `<code>.js` or `templates-<code>.js` changed
- `CACHE_VERSION` in `public/sw.js`

## What to check after enabling

Run `npm test` first. `tests/languageOffSwitch.test.js` and
`tests/translationParity.test.js` will catch a missing translation key or a
malformed config entry.

Then, in the browser at phone width:

1. The switcher appears and lists English plus the newly enabled language.
2. Switching shows translated interface text, and the choice survives a reload.
3. Upload a real document and read all the cards. Amounts, dates and sender
   names must appear exactly as printed on the letter, never reformatted.
4. Any sentence the bank cannot translate shows in English with the small
   notice under the card. That is correct behaviour, not a bug.
5. Check light, dark and focus mode.

## Adding a language that does not exist yet

Enabling covers the nine shipped languages. A genuinely new language is one
file set plus one config entry, and the structure keeps that true:

1. Create `public/i18n/<code>.js` (the Tier 1 dictionary, every key in
   `en.js`) and `public/i18n/templates-<code>.js` (the Tier 2 bank, every id
   in `templates-en.js`). Mark both DRAFT PENDING HUMAN REVIEW.
2. Add one entry to `public/i18n/config.js`: code, nativeName, `enabled:
   false`, the three banner strings, and `invertedNumberFormat: true` if the
   language writes 1.234,56 where the UK writes 1,234.56.
3. Run `npm test`. Every language-sweeping test discovers the new code from
   config automatically: parity, the severity ladder, the lookup contract,
   the word boundary guard. Missing keys, missing bank ids, dashes, or a
   collapsed tier all fail the build with the code named.
4. Bump the cache values (previous section) and verify with the localhost
   `?lang=<code>` preview.

The one documented exception: a language in a script the site has never
rendered (the current fonts cover Latin, Gujarati, Devanagari, Bengali and
Gurmukhi) also needs font work in `public/styles.css`, following the existing
pattern: a vendored variable font in `public/assets/fonts/`, an `@font-face`
block scoped by `unicode-range`, the family added to the language switcher
stack, and a `body[data-lang="<code>"]` block. Right-to-left scripts are a
larger piece of work and are recorded as out of scope in PLAN.md.

## Turning it back off

Set `enabled` back to `false` and bump the cache values again. A reader who had
already chosen that language falls back to English on their next load, because
`languageList()` filters on the flag and the stored choice is validated against
it. Nothing else needs undoing.

## Note on AI phrasing

The AI phrasing pass is English only. When the interface language is anything
else the pass is skipped server side and the deterministic rules cards are
served instead, translated through the bank. That is deliberate: the safety
judgement is the same either way, only the wording is less polished.
