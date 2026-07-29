# i18n engineering standards

These standards govern every phase of multilingual work and every future
change to the translation system. They exist because this system will be
maintained for years and touched every time the engine learns a new document
type. When code and these standards disagree, fix the code. Prefer boring and
obvious over clever: the next person reading this may be a native speaker
fixing wording, not an engineer.

## The standards

1. Exact sentence lookups are constant time via a Map, never a linear scan
   over the bank. Pattern matching runs only after an exact match fails.
2. Regexes compile once at load, never per lookup.
3. Only the active language's files may be in memory. Never load all nine.
4. Language files and fonts load on demand, never in the initial page bundle.
   English users must download nothing extra.
5. No per-language special casing in app.js or any application code. Language
   differences belong in data files. If a language needs different behaviour,
   it is a data property, not an if statement.
6. Adding a language stays one file set plus one config entry (see
   enabling-a-language.md). Adding a bank sentence stays one documented
   process (see adding-a-bank-sentence.md). If either becomes harder than
   that, fix the structure rather than working around it.
7. Prefer boring and obvious over clever.

They are enforced by `tests/i18nStandards.test.js`, which fails if a language
list reappears in application code, the money format note loses its data
driven gate, a switched-away language stays in memory, a non-English file
enters the initial bundle, or a test grows its own copy of the language list.

## Where each standard lives in the code

1. `public/i18n/templateBank.js`: `exactIdFor` builds a Map from English
   sentence to template id once and consults it first;
   `translateEngineSentence` only enters the pattern loop after an exact miss.
2. `compilePatterns` in the same file compiles every pattern regex once and
   caches the result; `resetCaches` is the only invalidation, called when a
   new language bank arrives. No application code builds a regex per lookup.
3. `public/i18n.js`: `setLanguage` unloads the previously active language's
   two window globals via `unloadLanguage`, so memory holds English plus at
   most one other language. English never unloads: it is the canonical key
   set, the matcher's source keys, and the fallback.
4. `public/index.html` ships only config.js, en.js, templates-en.js,
   templateBank.js, i18n.js and app.js. Non-English files load by script
   injection on demand. The Noto fonts carry unicode-range so a browser only
   fetches one when its script actually renders; the service worker has no
   precache list at all.
5. Per-language behaviour is a config.js data property. The one that exists
   today is `invertedNumberFormat` (drives the money format note through
   `NorthcueI18n.languageEntry()` in app.js). Add the next one the same way.
6. Tests discover languages from config.js, never from their own lists, so a
   new config entry is automatically held to key parity, bank completeness,
   the severity ladder check and the lookup contract.

## Accepted interpretations (audited 29 July 2026, recorded so nobody
relitigates them)

- config.js carries roughly 2 KB of non-English banner strings in the initial
  bundle. Deliberate: the first-visit banner must speak the DETECTED language
  before that language's dictionary has loaded. This is the only non-English
  data an English visitor ever downloads, and it never renders for them.
- en.js and templates-en.js duplicate English strings that also exist in the
  markup (roughly 64 KB uncompressed). That is the cost of the inert-English
  design, where English behaviour is byte identical to the untagged site.
- Pattern compilation is lazy (first lookup after load, not script load).
  Same count of compilations, later moment; fine.
- Loading a new language resets the English-derived caches too, forcing one
  recompilation per language load. Once per load, never per lookup; fine.
- i18n.js treats "en" as the pivot in several places. Those are uniform
  English-pivot gates, the same for all nine languages, not special casing.
- Switching back to a previously used language re-fetches its files (the
  price of standard 3). The HTTP cache and the service worker's runtime cache
  make that cheap.

## The known structural risk

Nothing connects the engine to the bank automatically: when the engine learns
a new sentence, no test fails, and the sentence honestly falls back to
English with the notice. That fallback is the designed safety property, not a
bug, but it means bank coverage erodes silently unless the process in
adding-a-bank-sentence.md is followed every time the engine's output changes.
If engine sessions start forgetting it, build the missing guardrail (an
engine-output-to-bank coverage test) rather than relying on memory.
