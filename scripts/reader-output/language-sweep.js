#!/usr/bin/env node
// THE FALSE-POSITIVE SWEEP. Every reachable corpus document, in all nine
// non-English languages, through the measurement-only override.
//
// WHY IT EXISTS. The Hindi guard prototype was built against six real sentences
// from one document. Six sentences cannot tell you whether a guard over-fires;
// only volume can, and volume is what the override makes available without
// sourcing a single new document.
//
// The Hindi prototype is the ONLY guard under test, because it is the only one
// that exists. It can only fire on Devanagari, so its over-fires will be in the
// Hindi slice; the other eight languages are the control, which measures how
// often the model writes an obligation or imperative at all.
//
// NOTHING HERE IS SERVED. Four locks, documented on measurementLanguage() in
// aiStructuredResultService.js. Requires:
//   NODE_ENV must not be "production"
//   CLEARSTEPS_MEASUREMENT_LANGUAGE=1
//
// Usage:
//   CLEARSTEPS_MEASUREMENT_LANGUAGE=1 node scripts/reader-output/language-sweep.js --json out.json
//   ... --languages hi,pl --limit 5      to rehearse before the full run

"use strict";

const fs = require("fs");
const path = require("path");

const { loadEnvFile } = require(path.join(__dirname, "..", "..", "src", "utils", "loadEnv"));
loadEnvFile(path.join(__dirname, "..", ".."));

const { CORPUS } = require(path.join(__dirname, "..", "engine-baseline", "corpus"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "..", "src", "services", "clearStepsEngine"));
const aiService = require(path.join(__dirname, "..", "..", "src", "services", "aiStructuredResultService"));
const CORPUS_FACTS = require(path.join(__dirname, "..", "..", "tests", "fixtures", "corpus-facts.json"));

const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "language-sweep" };
const LANGUAGES = ["pl", "ro", "es", "fr", "pt", "hi", "bn", "gu", "pa"];
const CONCURRENCY = 6;
const ATTEMPTS = 2;      // a timeout is noise, not a result

// --------------------------------------------------------- the guard under test
// Copied from tests/hindiGuardVocabulary.test.js. guardParity() fails loudly if
// the two drift, so this cannot quietly measure a stale prototype.
const INF = ["ना", "नी", "ने"];
const AUX = ["होगा", "होगी", "होंगे", "पड़ेगा", "पड़ेगी", "पड़ेंगे", "चाहिए",
  "आवश्यक है", "ज़रूरी है", "जरूरी है"];
const STEMS = ["भुगतान\\s*कर", "चुका", "अदा\\s*कर", "संपर्क\\s*कर", "कॉल\\s*कर",
  "फ़ोन\\s*कर", "फोन\\s*कर", "जवाब\\s*द", "उत्तर\\s*द", "भेज", "प्रदान\\s*कर",
  "पुष्टि\\s*कर", "उपस्थित\\s*हो", "हाज़िर\\s*हो", "पूरा\\s*कर", "भर", "लौटा",
  "वापस\\s*कर", "जमा\\s*कर", "सूचित\\s*कर", "सूचना\\s*द", "खाली\\s*कर",
  "आवेदन\\s*कर", "व्यवस्था\\s*कर"];
const MATRA = "[\\u093E-\\u094C\\u0962\\u0963]?";
const HI_OBLIGATION = new RegExp("(?:" + STEMS.join("|") + ")" + MATRA +
  "(?:" + INF.join("|") + ")\\s+(?:[\\u0900-\\u097F]+\\s+){0,2}?(?:" + AUX.join("|") + ")");

const HI_TERMS = ["खाता\\s*विवरण", "खाते\\s*का\\s*विवरण", "बैंक\\s*विवरण", "बैंक\\s*खाता",
  "कार्ड\\s*(?:नंबर|नम्बर|विवरण)", "पिन", "पासवर्ड", "गुप्त\\s*कोड", "सॉर्ट\\s*कोड",
  "राष्ट्रीय\\s*बीमा", "व्यक्तिगत\\s*विवरण", "निजी\\s*जानकारी",
  "account\\s+details?", "bank\\s+details?", "sort\\s+code", "PIN", "password"];
const HI_ASK = ["बताएं", "बताइए", "बताना", "दें", "दीजिए", "देना", "भेजें", "भेजिए",
  "भेजना", "साझा\\s*करें", "साझा\\s*करना", "दर्ज\\s*करें", "दर्ज\\s*करना",
  "पुष्टि\\s*करें", "पुष्टि\\s*करना", "प्रदान\\s*करें", "प्रदान\\s*करना", "डालें", "भरें"];
const HI_NEG = ["न", "नहीं", "मत", "कभी\\s*नहीं"];
const HI_CREDENTIAL = new RegExp("(?:" + HI_TERMS.join("|") + ")" +
  "(?![\\s\\S]{0,30}?(?:" + HI_NEG.join("|") + ")\\s*[\\u0900-\\u097F]{0,12}?(?:" + HI_ASK.join("|") + "))" +
  "[\\s\\S]{0,40}?(?:" + HI_ASK.join("|") + ")");

function guardParity() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "..", "tests", "hindiGuardVocabulary.test.js"), "utf8");
  const stems = (source.match(/const HINDI_COMMAND_STEMS = \[([\s\S]*?)\];/) || [])[1];
  if (!stems) throw new Error("could not find HINDI_COMMAND_STEMS to compare against");
  const count = (stems.match(/"/g) || []).length / 2;
  if (count !== STEMS.length) {
    throw new Error("the Hindi prototype has " + count + " stems and this sweep has " +
      STEMS.length + ". The copy here is stale.");
  }
}

// ---------------------------------------------- the control, per language
//
// MEASUREMENT MARKERS, NOT GUARD VOCABULARY. These exist to COUNT how often the
// model writes an obligation, so the eight remaining vocabularies have a target.
// They are deliberately loose: a marker that over-counts gives a conservative
// (higher) target, which is the safe direction for scoping. Nothing here is a
// guard and nothing here is wired to anything.
const OBLIGATION_MARKERS = {
  pl: /\b(?:musi|musisz|muszą|trzeba|należy|konieczne\s+jest|wymagane\s+jest|powinien|powinna|powinno|powinni)\b/i,
  ro: /\b(?:trebuie|este\s+necesar|se\s+impune|ar\s+trebui)\b/i,
  es: /\b(?:debe|debes|deben|deberá|tiene\s+que|es\s+necesario|hay\s+que|es\s+obligatorio)\b/i,
  fr: /\b(?:doit|devez|doivent|il\s+faut|est\s+nécessaire|est\s+obligatoire)\b/i,
  pt: /\b(?:deve|deverá|devem|tem\s+de|é\s+necessário|é\s+obrigatório|terá\s+de)\b/i,
  hi: /(?:होगा|होगी|होंगे|पड़ेगा|पड़ेगी|चाहिए|आवश्यक\s*है|ज़रूरी\s*है|जरूरी\s*है)/,
  bn: /(?:হবে|করতে\s*হবে|প্রয়োজন|আবশ্যক|উচিত)/,
  gu: /(?:પડશે|જરૂરી\s*છે|આવશ્યક\s*છે|જોઈએ|કરવું\s*પડશે)/,
  pa: /(?:ਪਵੇਗਾ|ਪਵੇਗੀ|ਜ਼ਰੂਰੀ\s*ਹੈ|ਲਾਜ਼ਮੀ|ਚਾਹੀਦਾ)/
};

// A bare imperative. Northcue's own advice uses these, so a high rate here is
// EXPECTED and is not a target: the English command family does not catch them.
const IMPERATIVE_MARKERS = {
  pl: /\b(?:sprawdź|skontaktuj|zadzwoń|wyślij|zapłać|przeczytaj|zachowaj|potwierdź)\b/i,
  ro: /\b(?:verificați|contactați|sunați|trimiteți|plătiți|citiți|păstrați|confirmați)\b/i,
  es: /\b(?:compruebe|revise|contacte|llame|envíe|pague|lea|guarde|confirme)\b/i,
  fr: /\b(?:vérifiez|consultez|contactez|appelez|envoyez|payez|lisez|conservez|confirmez)\b/i,
  pt: /\b(?:verifique|consulte|contacte|ligue|envie|pague|leia|guarde|confirme)\b/i,
  hi: /(?:जांचें|जाँचें|करें|भेजें|देखें|पढ़ें|रखें|बताएं|लाओ|लाएं)(?:\s|।|$)/,
  bn: /(?:দেখুন|করুন|পাঠান|পড়ুন|রাখুন|জানান)(?:\s|।|$)/,
  gu: /(?:તપાસો|કરો|મોકલો|વાંચો|રાખો|જણાવો|લાવો)(?:\s|।|$)/,
  pa: /(?:ਜਾਂਚੋ|ਕਰੋ|ਭੇਜੋ|ਪੜ੍ਹੋ|ਰੱਖੋ|ਦੱਸੋ)(?:\s|।|$)/
};

const SCRIPT_OF = {
  pl: /[ąćęłńóśźż]/i, ro: /[ășțîâ]/i, es: /[ñáéíóú¿¡]/i, fr: /[àâçéèêëîïôùûü]/i,
  pt: /[ãõáâêç]/i, hi: /[ऀ-ॿ]/, bn: /[ঀ-৿]/,
  gu: /[઀-૿]/, pa: /[਀-੿]/
};

async function serveOnce(entry, language) {
  const rulesRun = runClearStepsEngine({
    extractedText: entry.text, fileMeta: FILE_META, facts: CORPUS_FACTS[entry.id] || null
  });
  const applied = await aiService.applySafetyPassAndRecordAiStatus({
    rulesRun, extractedText: entry.text, language, measurementLanguage: language
  });
  const d = (applied.api_output.debug && applied.api_output.debug.ai) || {};
  if (!d.ai_used) return { ok: false, status: d.ai_status, code: d.ai_error_code, errors: d.validation_errors || [] };
  const sentences = [];
  (applied.api_output.structured_result.cards || []).forEach((c) => {
    [c.title, c.simple_explanation].concat(c.key_points || []).filter(Boolean)
      .forEach((s) => String(s).split(/(?<=[।.!?])\s+/).forEach((x) => {
        const t = x.trim(); if (t) sentences.push({ card: c.card_number, text: t });
      }));
  });
  return { ok: true, sentences };
}

async function serve(entry, language) {
  let last = null;
  for (let i = 0; i < ATTEMPTS; i++) {
    last = await serveOnce(entry, language);
    if (last.ok) return last;
  }
  return last;
}

// A small worker pool, so 504 calls take half an hour rather than three.
async function pool(jobs, size, run) {
  const out = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (true) {
      const i = next++;
      if (i >= jobs.length) return;
      out[i] = await run(jobs[i], i);
    }
  }));
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonPath = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
  const only = args.includes("--languages") ? args[args.indexOf("--languages") + 1].split(",") : LANGUAGES;
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

  if (process.env.CLEARSTEPS_MEASUREMENT_LANGUAGE !== "1") {
    console.error("\n  CLEARSTEPS_MEASUREMENT_LANGUAGE=1 is required.\n"); process.exit(1);
  }
  if (process.env.NODE_ENV === "production") {
    console.error("\n  Refusing to run under NODE_ENV=production.\n"); process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) { console.error("\n  OPENAI_API_KEY is not set.\n"); process.exit(1); }
  guardParity();

  // Reachable means: the engine's own gates allow the provider. The four
  // credential-bearing scam documents are refused here, by design, in every
  // language, which is why the credential guard's true-positive case is not
  // samplable from corpus at all.
  const reachable = CORPUS.filter((entry) => {
    const run = runClearStepsEngine({
      extractedText: entry.text, fileMeta: FILE_META, facts: CORPUS_FACTS[entry.id] || null
    });
    return !aiService.providerSkipReason({ rulesRun: run, language: "hi", measurementLanguage: "hi" });
  }).slice(0, limit);

  const jobs = [];
  only.forEach((lang) => reachable.forEach((entry) => jobs.push({ lang, entry })));
  console.log("\n  " + reachable.length + " reachable documents x " + only.length +
    " languages = " + jobs.length + " calls, " + CONCURRENCY + " at a time.\n");

  let done = 0;
  const results = await pool(jobs, CONCURRENCY, async (job) => {
    const r = await serve(job.entry, job.lang);
    done++;
    if (done % 25 === 0) console.log("    " + done + "/" + jobs.length);
    if (!r.ok) return { lang: job.lang, id: job.entry.id, served: false, why: r.code || r.status };
    const inLang = r.sentences.filter((s) => SCRIPT_OF[job.lang].test(s.text)).length;
    return {
      lang: job.lang, id: job.entry.id, served: true,
      n: r.sentences.length, inLang,
      sentences: r.sentences,
      guardObligation: r.sentences.filter((s) => HI_OBLIGATION.test(s.text)).map((s) => s.text),
      guardCredential: r.sentences.filter((s) => HI_CREDENTIAL.test(s.text)).map((s) => s.text),
      markerObligation: r.sentences.filter((s) => OBLIGATION_MARKERS[job.lang].test(s.text)).map((s) => s.text),
      markerImperative: r.sentences.filter((s) => IMPERATIVE_MARKERS[job.lang].test(s.text)).map((s) => s.text)
    };
  });

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf8");
    console.log("\n  written: " + jsonPath);
  }

  console.log("\n  " + "lang".padEnd(6) + "served".padEnd(9) + "sents".padEnd(8) +
    "in-lang".padEnd(9) + "obligation".padEnd(12) + "imperative");
  console.log("  " + "-".repeat(64));
  only.forEach((lang) => {
    const rows = results.filter((r) => r.lang === lang && r.served);
    const all = results.filter((r) => r.lang === lang);
    const n = rows.reduce((a, r) => a + r.n, 0);
    const inl = rows.reduce((a, r) => a + r.inLang, 0);
    const ob = rows.reduce((a, r) => a + r.markerObligation.length, 0);
    const im = rows.reduce((a, r) => a + r.markerImperative.length, 0);
    console.log("  " + lang.padEnd(6) + (rows.length + "/" + all.length).padEnd(9) +
      String(n).padEnd(8) +
      (n ? Math.round(inl / n * 100) + "%" : "-").padEnd(9) +
      (n ? ob + " (" + (ob / n * 100).toFixed(1) + "%)" : "-").padEnd(12) +
      (n ? im + " (" + (im / n * 100).toFixed(1) + "%)" : "-"));
  });

  const hi = results.filter((r) => r.lang === "hi" && r.served);
  const hiObl = hi.reduce((a, r) => a + r.guardObligation.length, 0);
  const hiCred = hi.reduce((a, r) => a + r.guardCredential.length, 0);
  console.log("\n  THE GUARD UNDER TEST, Hindi prototype, on " +
    hi.reduce((a, r) => a + r.n, 0) + " Hindi sentences");
  console.log("    obligation pattern fired: " + hiObl);
  console.log("    credential pattern fired: " + hiCred);
  console.log("");
}

main().catch((error) => { console.error(error); process.exit(1); });
