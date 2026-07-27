# Turning a language on

Every language shipped with the multilingual merge is switched **off**. The
translation review found real problems in all nine, so none of them should
reach a reader until a native speaker has checked it. This file is the whole
procedure for switching one on.

## Before you switch anything on

A native speaker needs to sign off two files for that language:

- `public/i18n/<code>.js` — the interface dictionary
- `public/i18n/templates-<code>.js` — the sentence bank used for card text

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

Then bump two cache values so returning visitors get the new files:

- the `?v=` query strings on `styles.css` and `app.js` in `public/index.html`
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
