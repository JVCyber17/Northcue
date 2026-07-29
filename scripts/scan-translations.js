#!/usr/bin/env node
// Northcue translation scanner.
//
// Scans a translated language for the defect classes the reviews look for:
// informal address, lost hedges, and softened refusals. Weakened warnings and
// machine sounding constructions are not mechanically detectable and are left
// to a reader; this tool narrows what a reader has to look at.
//
// WHY THIS FILE EXISTS AT ALL, AND WHY IT NEVER USES \b
//
// JavaScript's \b is defined as a transition between [A-Za-z0-9_] and anything
// else. Every letter outside that ASCII range counts as a NON word character,
// so a boundary between two non ASCII letters does not exist as far as \b is
// concerned. The consequence:
//
//   /\bSprawdź\b/.test("Prosimy Sprawdź to.")   ->  false
//
// The trailing \b sits after "ź" (U+017A). JS sees a non word character on
// both sides and reports no boundary, so the term never matches. This silently
// under reported every scan run against Polish, Romanian, Portuguese, Hindi,
// Bengali and Panjabi. It happens to work for French and Spanish terms that
// end in an ASCII letter, which is why those languages looked cleaner than
// they were rather than being genuinely clean.
//
// The opposite failure is just as bad. Dropping boundaries entirely and using
// a plain substring test makes the Gujarati pronoun તું match inside the
// ordinary verb કરતું, which produced fourteen false positives in the first
// review.
//
// (?<!\p{L}) and (?!\p{L}) with the u flag are real boundaries for every
// alphabet and are correct in both directions.
//
// Usage:
//   node scripts/scan-translations.js            all languages, summary
//   node scripts/scan-translations.js pl         one language, full detail
//   node scripts/scan-translations.js pl --json  machine readable

"use strict";

const fs = require("fs");
const path = require("path");

const I18N_DIR = path.join(__dirname, "..", "public", "i18n");
// Languages come from config, the single source of truth for the list.
const LANGS = require(path.join(I18N_DIR, "config.js")).languages
  .map((entry) => entry.code)
  .filter((code) => code !== "en");

// --------------------------------------------------------------------------
// Boundary helper. Everything in this file goes through here.
//
// \p{L} ALONE IS NOT ENOUGH, and getting this wrong is the second order
// version of the same bug. Indic vowel signs are Unicode category M (a
// combining mark), not L. In the Gujarati word વપરાતું, "is used", the
// sequence તું is preceded by the vowel sign ા (U+0ABE, mark). A lookbehind
// that only excludes \p{L} sees a non letter there, declares a word boundary,
// and matches the informal pronoun તું inside an ordinary verb. That produced
// five false positives in Gujarati and is the same shape as the fourteen the
// very first review had to discard.
//
// The word character set therefore has to be [\p{L}\p{M}\p{N}]: letters, the
// marks that attach to them, and digits. That is the conventional Unicode
// approximation of a word character and it is correct for every script here.
const WORD_CHAR = "[\\p{L}\\p{M}\\p{N}]";

function boundedPattern(terms) {
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(
    "(?<!" + WORD_CHAR + ")(" + escaped.join("|") + ")(?!" + WORD_CHAR + ")",
    "u"
  );
}

// --------------------------------------------------------------------------
// Informal address markers, per language.
//
// Northcue addresses an anxious adult about official post, so the target
// register is formal in every language. These lists are the informal forms
// that must not appear: second person singular pronouns, possessives, and the
// singular imperative and present forms that go with them.
// --------------------------------------------------------------------------
const INFORMAL = {
  pl: [
    "Ty", "Ciebie", "Cię", "Ci", "Tobie", "Twój", "Twoja", "Twoje", "Twojego",
    "Twojej", "Twoim", "Twoją", "Twoich", "Twojemu", "Twoi", "Twych",
    "Sprawdź", "sprawdź", "Prześlij", "prześlij", "Zobacz", "zobacz",
    "Wybierz", "wybierz", "Przeczytaj", "przeczytaj", "Zweryfikuj", "zweryfikuj",
    "Korzystaj", "korzystaj", "Chroń", "chroń", "Skontaktuj", "skontaktuj",
    "Spróbuj", "spróbuj", "Poczekaj", "poczekaj", "Użyj", "użyj",
    "Zachowaj", "zachowaj", "Podaj", "podaj", "Dodaj", "dodaj", "Napisz", "napisz",
    "Kliknij", "kliknij", "Otwórz", "otwórz", "Wpisz", "wpisz", "Weź", "weź",
    "Pamiętaj", "pamiętaj", "Traktuj", "traktuj", "ignoruj",
    "możesz", "masz", "chcesz", "sprawdzisz", "podejmiesz", "odpowiesz",
    "zechcesz", "jesteś", "będziesz", "musisz", "potrzebujesz"
  ],
  ro: [
    "tu", "Tu", "tine", "Tine", "ție", "Ție", "tău", "ta", "tale", "tăi",
    "ți", "te", "Te",
    "verifică", "Verifică", "încearcă", "Încearcă", "citește", "Citește",
    "trimite", "Trimite", "alege", "Alege", "vezi", "Vezi", "apasă", "Apasă",
    "folosește", "Folosește", "contactează", "Contactează", "așteaptă",
    "poți", "ai", "faci", "ești", "trebuie să faci", "vrei", "acționezi",
    "ignora", "Ignora"
  ],
  // Portuguese and Spanish need a narrower list than the others, because their
  // informal (tu / tú) imperative is a HOMOGRAPH of the third person singular
  // indicative, which is also the polite form. "Verifica" is both "check!"
  // (informal command) and "checks" (third person). "se usa" is "is used" and
  // "Usted elige" is correct FORMAL address, yet a naive list flags all three.
  // An early version of this list produced 23 Spanish hits of which almost all
  // were third person indicatives, so only unambiguous markers are listed:
  // pronouns, possessives, and second person singular verb endings that no
  // other person shares.
  pt: [
    "tu", "Tu", "teu", "teus", "tua", "tuas", "contigo", "ti",
    "podes", "és", "tens", "queres", "precisas", "fazes", "vais", "estás", "sabes"
  ],
  es: [
    "tú", "Tú", "ti", "tus", "contigo",
    "puedes", "eres", "tienes", "quieres", "necesitas", "debes", "estás",
    "sabes", "vas", "haces", "compruebas", "verificas"
  ],
  // French has the same homograph trap twice over, so only pronouns and
  // possessives are reliable:
  //   the tu imperative of an -er verb equals the third person indicative, so
  //   "Utilise une urgence artificielle" is "[the document] uses artificial
  //   urgency", a scam signal label, not a command to the reader;
  //   first and second person singular are identical for many verbs, so
  //   "Que dois-je faire ?" is "what must I do?", not second person at all.
  // An earlier list containing those forms produced six hits, all false.
  fr: [
    "tu", "Tu", "toi", "Toi", "ton", "ta", "tes", "tiens", "tienne", "tiennes",
    "t'as", "t'es"
  ],
  // Indic languages: the informal second person pronoun and its verb
  // agreement. The formal pronoun is listed in FORMAL below for contrast.
  gu: ["તું", "તારું", "તારો", "તારી", "તને", "તારા", "તારે"],
  hi: ["तू", "तुम", "तेरा", "तेरी", "तेरे", "तुझे", "तुम्हारा", "तुम्हारी", "तुम्हें"],
  bn: ["তুই", "তুমি", "তোর", "তোমার", "তোকে", "তোমাকে", "তোদের", "তোমাদের"],
  pa: ["ਤੂੰ", "ਤੇਰਾ", "ਤੇਰੀ", "ਤੇਰੇ", "ਤੈਨੂੰ", "ਤੁਧ"]
};

// --------------------------------------------------------------------------
// Hedge markers. English marks uncertainty; the translation must too, or a
// guess becomes a statement of fact on a letter about enforcement.
// --------------------------------------------------------------------------
// "looks" on its own is not a hedge: "Northcue looks for the due date" is a
// statement about searching. Only "looks like" hedges. "unclear" and
// "suggests" were also dropped, they were matching feedback chip labels like
// "Deadline was unclear" and producing noise.
const EN_HEDGE = /((?<![\p{L}])(appears?|may|might|seems?|could|possibly|likely|probably)(?![\p{L}])|looks? like)/iu;

// Substring matching is correct for these: they are stems that legitimately
// take many endings (wygląda/wyglądać, pare/pares, लगता/लगती).
// Stems, matched as substrings on purpose, because these take many endings.
// The lists cover morphological variants deliberately: an early version had
// Gujarati "શકે" but not "શકશે", and "સ્પષ્ટ નથી" but not "અસ્પષ્ટ", which
// reported hedges as lost when they were plainly there.
const TARGET_HEDGE = {
  pl: /(wygląd|wydaje|wydają|może|możn|mogą|mogł|prawdopodobn|możliw|zdaje|niejasn|raczej|chyba|nie ma pewnoś)/i,
  ro: /(pare|par |poate|pot |putea|probabil|posibil|s-ar|neclar|se pare|ar fi)/i,
  pt: /(parece|parecem|pode|podem|poderia|provavelmente|possív|possiv|talvez|claro|aparent)/i,
  es: /(parece|parecen|puede|pueden|podría|probablemente|posible|quizá|quizás|tal vez|claro|aparent)/i,
  fr: /(semble|semblent|peut|peuvent|pourrait|probablement|possible|peut-être|il se peut|clair|apparem)/i,
  gu: /(લાગ|શક|કદાચ|સંભવ|જણા|સ્પષ્ટ|પણ હોય|હોઈ શકે)/,
  hi: /(लग|सकत|शायद|संभव|प्रतीत|स्पष्ट|हो सकत)/,
  bn: /(মনে হ|পার|হয়তো|সম্ভব|স্পষ্ট|বলে মনে|হতে পারে)/,
  pa: /(ਲੱਗ|ਸਕਦ|ਸ਼ਾਇਦ|ਸੰਭਵ|ਸਪਸ਼ਟ|ਹੋ ਸਕਦ)/
};

// --------------------------------------------------------------------------
// Refusal markers. When Northcue declines a document it must stay declined.
// --------------------------------------------------------------------------
// Bare words are useless here. An early version listed "do", "not" and "will",
// which made "What to do" and "You choose what to do next" count as refusals
// and produced 22 meaningless hits for Romanian alone. A refusal in Northcue
// is always Northcue declining or being unable, so match those phrases.
const EN_REFUSAL = /(does not look like|do not look like|could not find|could not read|could not understand|could not be saved|cannot be|is not able|has not turned|not been able|we are unable|no official document details|does not give|never|do not use|do not include|do not share)/i;

// Bounded, because an unbounded "nu " matches inside Romanian "anunț" and an
// unbounded "no " inside Spanish "nombre", which would wrongly report the
// negation as present and hide a real softening.
const TARGET_REFUSAL = {
  pl: boundedPattern(["nie", "brak", "braku", "nigdy", "żaden", "żadnych", "odmawia", "bez"]),
  ro: boundedPattern(["nu", "niciodată", "nicio", "niciun", "nici", "lipsesc", "lipsește", "fără"]),
  pt: boundedPattern(["não", "nao", "nunca", "nenhum", "nenhuma", "sem", "falta"]),
  es: boundedPattern(["no", "nunca", "ningún", "ninguna", "ningun", "sin", "falta"]),
  fr: boundedPattern(["ne", "n", "pas", "jamais", "aucun", "aucune", "sans", "ni"]),
  gu: boundedPattern(["નથી", "ના", "નહીં", "ક્યારેય", "વગર", "કોઈ"]),
  hi: boundedPattern(["नहीं", "ना", "नही", "कभी", "बिना", "कोई"]),
  bn: boundedPattern(["না", "নয়", "নেই", "কখনো", "কখনও", "ছাড়া", "কোনো"]),
  pa: boundedPattern(["ਨਹੀਂ", "ਨਾ", "ਨਹੀ", "ਕਦੇ", "ਬਿਨਾਂ", "ਕੋਈ"])
};

// --------------------------------------------------------------------------

function loadLanguage(code) {
  const dict = require(path.join(I18N_DIR, code + ".js"));
  const bank = require(path.join(I18N_DIR, "templates-" + code + ".js"));
  return { dict: dict, bank: bank };
}

function everyString(code) {
  const loaded = loadLanguage(code);
  const rows = [];
  Object.entries(loaded.dict).forEach(([k, v]) => {
    if (typeof v === "string") rows.push({ id: k, value: v, where: "dictionary" });
  });
  Object.entries(loaded.bank.exact || {}).forEach(([k, v]) => {
    if (typeof v === "string") rows.push({ id: k, value: v, where: "bank exact" });
  });
  Object.entries(loaded.bank.patterns || {}).forEach(([k, v]) => {
    if (typeof v === "string") rows.push({ id: k, value: v, where: "bank pattern" });
  });
  return rows;
}

function englishFor(id) {
  const enDict = require(path.join(I18N_DIR, "en.js"));
  const enBank = require(path.join(I18N_DIR, "templates-en.js"));
  if (Object.prototype.hasOwnProperty.call(enDict, id)) return enDict[id];
  if (Object.prototype.hasOwnProperty.call(enBank.exact, id)) return enBank.exact[id];
  const pattern = enBank.patterns.find((p) => p.id === id);
  return pattern ? pattern.template : null;
}

function scanLanguage(code) {
  const informalPattern = boundedPattern(INFORMAL[code]);
  const rows = everyString(code);
  const findings = { informal: [], lostHedge: [], lostRefusal: [] };

  rows.forEach((row) => {
    const informalHit = informalPattern.exec(row.value);
    if (informalHit) {
      findings.informal.push({ id: row.id, where: row.where, term: informalHit[1], value: row.value });
    }

    const english = englishFor(row.id);
    if (!english) return;

    if (EN_HEDGE.test(english) && !TARGET_HEDGE[code].test(row.value)) {
      findings.lostHedge.push({ id: row.id, where: row.where, en: english, value: row.value });
    }
    if (EN_REFUSAL.test(english) && !TARGET_REFUSAL[code].test(row.value)) {
      findings.lostRefusal.push({ id: row.id, where: row.where, en: english, value: row.value });
    }
  });

  findings.total = rows.length;
  return findings;
}

// What the OLD, broken scan would have reported, so the difference is visible.
function scanLanguageWithAsciiBoundary(code) {
  const terms = INFORMAL[code].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // ascii-boundary-ok: this function exists precisely to REPRODUCE the broken
  // behaviour so the report can show how many strings the old scans missed or
  // invented. It must keep using \b or it measures nothing.
  const broken = new RegExp("\\b(" + terms.join("|") + ")\\b");
  return everyString(code).filter((row) => broken.test(row.value)).length;
}

function main() {
  const arg = process.argv[2];
  const asJson = process.argv.includes("--json");
  const codes = arg && arg !== "--json" ? [arg] : LANGS;

  const summary = {};
  codes.forEach((code) => {
    const f = scanLanguage(code);
    const missedBy = scanLanguageWithAsciiBoundary(code);
    summary[code] = {
      strings: f.total,
      informal: f.informal.length,
      informalUnderAsciiBoundary: missedBy,
      hiddenByTheBug: f.informal.length - missedBy,
      lostHedge: f.lostHedge.length,
      lostRefusal: f.lostRefusal.length
    };
    if (codes.length === 1 && !asJson) {
      console.log("\n===== " + code.toUpperCase() + " =====");
      ["informal", "lostHedge", "lostRefusal"].forEach((kind) => {
        console.log("\n--- " + kind + " (" + f[kind].length + ") ---");
        f[kind].forEach((hit) => {
          console.log("\n" + hit.id + "   [" + hit.where + (hit.term ? ", " + hit.term : "") + "]");
          if (hit.en) console.log("   en " + hit.en);
          console.log("   " + code + " " + hit.value);
        });
      });
    }
  });

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (codes.length > 1) {
    console.log("\nlang  strings  informal  (ascii-\\b said)  hidden-by-bug  lostHedge  lostRefusal");
    Object.entries(summary).forEach(([code, s]) => {
      console.log(
        "  " + code.padEnd(5) +
        String(s.strings).padEnd(9) +
        String(s.informal).padEnd(10) +
        String(s.informalUnderAsciiBoundary).padEnd(17) +
        String(s.hiddenByTheBug).padEnd(15) +
        String(s.lostHedge).padEnd(11) +
        String(s.lostRefusal)
      );
    });
  }
}

if (require.main === module) main();

module.exports = { boundedPattern, scanLanguage, INFORMAL, TARGET_HEDGE, LANGS };
