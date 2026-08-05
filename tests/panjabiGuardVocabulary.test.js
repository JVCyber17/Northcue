// PANJABI COMMAND-FAMILY VOCABULARY, PROTOTYPE. The last of the nine. Its
// own file, its own denominator, its own commit, per the
// one-language-at-a-time instruction. Not wired into the stripper, exactly
// as the other prototypes are not.
//
// ============================================================================
// THE THREE WORD-ORDER QUESTIONS, answered in writing before any vocabulary,
// per the rule in ENGINE_STATE.md, from the 504-sample sweep:
//
// Q1 WHERE DOES THE MODAL SIT? At the END. Panjabi is verb-final; the
//    auxiliary closes the sentence.
// Q2 CAN THE VERB BE SPLIT FROM THE MODAL? Yes: the compound noun and
//    light verb separate around dates and amounts (the Hindi finding:
//    "ਭੁਗਤਾਨ 03/06/2026 ਤੱਕ ਕਰਨਾ"), the infinitive agrees in gender
//    (-ਨਾ/-ਨੀ/-ਣਾ/-ਣੀ), ਵੀ can stand between infinitive and auxiliary,
//    and a bare participle can stand before ਹੋਣ ਚਾਹੀਦੇ ("ਭਰੇ ਹੋਣ ਚਾਹੀਦੇ
//    ਹਨ", should be filled in).
// Q3 IS THE OBLIGATION MARKER AMBIGUOUS? The measured ZERO holds, but
//    only because of the pairing: ਹੋਵੇਗਾ alone is the plain future
//    ("ਭੁਗਤਾਨ 2 ਮਈ 2026 ਤੱਕ ਹੋਵੇਗਾ", payment will be by 2 May, a
//    statement), and it is only obligation AFTER an infinitive
//    ("ਕਰਨਾ ਹੋਵੇਗਾ"). The infinitive is required, as in Gujarati.
//
// The after-aux grammar holds here too: ਲੋੜ ਨਹੀਂ (need not), ਜਾਂ ਨਹੀਂ
// (whether or not), ਪੈ ਸਕਦੀ ਹੈ (may be needed), ਚਾਹੀਦਾ ਸੀ (should
// have). The ਹੈ-final auxiliaries decline need-not structurally (ਲੋੜ ਨਹੀਂ
// never matches ਲੋੜ ਹੈ), and the lookahead covers the rest.
//
// THE TEMPERED GAP, a defect this language found: with a plain gap the
// guard matched "ਜਾਣਕਾਰੀ ਦੇ ਅਨੁਸਾਰ ... ਜਵਾਬ ਦੇਣਾ ਲਾਜ਼ਮੀ ਹੈ" starting at
// the noun BEFORE "ਦੇ ਅਨੁਸਾਰ" (according to), so the attribution
// lookbehind never saw the marker sitting inside the match. The compound
// gap now refuses to cross an attribution marker, which pushes the match
// past it and lets the lookbehind do its work. The same structural hole
// exists latently in the committed Hindi guard and is recorded for it.
//
// ============================================================================
// THE DENOMINATOR, per the recorded rule, derived from NOTHING the guard
// uses: an obligation auxiliary preceded by ANY infinitive-shaped word
// within two words. No noun or stem list appears in the expression.
// Measured 5 August 2026:
//
//     lang   sentences  denominator  exempt*  in scope  caught   bank fires
//     pa     702        27           2        25        15 = 60%   0 of 371
//
//     *attributed or subordinate, which the ENGLISH guard also exempts
//
// Every residual miss was read and classified against the verbatim English
// list: all ten are outside it or are statements English keeps (do as the
// card question, arrive twice, check as Northcue's own caution line,
// notify three times, one attributed record-keeping instruction, and two
// plain futures the pairing keeps). Against the verbs English names,
// recall is complete: 15 of 15. Zero fires outside the denominator, zero
// on exempt members.
//
// ============================================================================
// THE PROVENANCE FINDING, carried in as instructed: the English provenance
// exemption compares byte-identical engine strings and does not survive
// translation. What replaces it is the attribution exception, the tempered
// gap, and the zero-fire assertion over the 371-sentence reviewed Panjabi
// bank, with no exemption set at all. The Bengali যাচাই lesson was applied
// up front: ਚੈੱਕ (check) never entered the noun list.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

// Gurmukhi block U+0A00-U+0A7F; vowel signs U+0A3E-U+0A4C.
const K = "[\\u0A00-\\u0A7F]";
const MATRA = "[\\u0A3E-\\u0A4C\\u0A70\\u0A71]?";

// REVIEW_REQUIRED throughout: a reader confirms each form is the one
// official post uses and names what is missing. Nouns and stems cover the
// 21 English verbs only, the mirror rule made structural.
const CFG = {
  pa: {
    aux: ["ਹੋਵੇਗਾ", "ਹੋਵੇਗੀ", "ਹੋਣਗੇ", "ਹੋਣਗੀਆਂ", "ਪਵੇਗਾ", "ਪਵੇਗੀ", "ਪੈਣਗੇ",
      "ਚਾਹੀਦਾ", "ਚਾਹੀਦੀ", "ਚਾਹੀਦੇ", "ਦੀ\\s*ਲੋੜ\\s*ਹੈ", "ਦੀ\\s*ਜ਼ਰੂਰਤ\\s*ਹੈ",
      "ਜ਼ਰੂਰੀ\\s*ਹੈ", "ਜਰੂਰੀ\\s*ਹੈ", "ਲਾਜ਼ਮੀ\\s*ਹੈ", "ਲਾਜ਼ਮੀ\\s*ਹਨ"],
    inf: ["ਨਾ", "ਨੀ", "ਨੇ", "ਣਾ", "ਣੀ", "ਣੇ", "ਨ", "ਣ", "ੇ"],
    // ਚੈੱਕ (check) deliberately absent, see the header.
    nouns: ["ਭੁਗਤਾਨ", "ਅਦਾਇਗੀ", "ਅਦਾ", "ਸੰਪਰਕ", "ਕਾਲ", "ਫ਼ੋਨ", "ਫੋਨ",
      "ਜਵਾਬ", "ਉੱਤਰ", "ਜਮ੍ਹਾਂ", "ਜਮ੍ਹਾ", "ਜਮਾ", "ਪੂਰਾ", "ਪੂਰੀ", "ਵਾਪਸ", "ਪੁਸ਼ਟੀ",
      "ਪ੍ਰਦਾਨ", "ਹਾਜ਼ਰ", "ਖਾਲੀ", "ਪ੍ਰਬੰਧ", "ਅਰਜ਼ੀ", "ਕਿਸ਼ਤ", "ਜਾਣਕਾਰੀ", "ਸਾਫ਼", "ਸਾਫ"],
    light: ["ਕਰ", "ਦੇ", "ਦਿ", "ਹੋ", "ਲੈ", "ਭਰ", "ਭੇਜ", "ਚੁਕਾ", "ਮੋੜ"],
    simple: ["ਭੇਜ", "ਚੁਕਾ", "ਭਰ", "ਮੋੜ", "ਪਹੁੰਚਾ", "ਪਰਤਾ"],
    attribution: ["ਪੱਤਰ(?:\\s*ਵਿੱਚ)?\\s*(?:ਕਹਿ|ਦੱਸ|ਲਿਖ|ਜ਼ਿਕਰ)",
      "ਚਿੱਠੀ(?:\\s*ਵਿੱਚ)?\\s*(?:ਕਹਿ|ਦੱਸ|ਲਿਖ)",
      "ਦਸਤਾਵੇਜ਼(?:\\s*ਵਿੱਚ)?\\s*(?:ਕਹਿ|ਦੱਸ|ਜ਼ਿਕਰ)", "ਅਨੁਸਾਰ", "ਮੁਤਾਬਕ",
      "ਕਿਹਾ\\s*(?:ਗਿਆ|ਜਾਂਦਾ)\\s*ਹੈ", "ਦੱਸਿਆ\\s*ਗਿਆ\\s*ਹੈ", "ਕਹਿੰਦਾ\\s*ਹੈ", "ਦੱਸਦਾ\\s*ਹੈ"],
    subordinate: ["ਜੇਕਰ", "ਜੇ", "ਕਿ"]
  }
};

function obligationPattern(lang) {
  const c = CFG[lang];
  const notAttributed = "(?<!(?:" + c.attribution.join("|") + ")[\\s\\S]{0,60})";
  const notSub = "(?<!(?:" + c.subordinate.join("|") + ")[^।?!.]{0,24})";
  // Tempered: the compound gap refuses to cross an attribution marker.
  const gap = "(?:(?!ਅਨੁਸਾਰ|ਮੁਤਾਬਕ)[^।?!.]){0,30}?";
  const compound = "(?:" + c.nouns.join("|") + ")" + gap + "\\s*" +
    "(?:" + c.light.join("|") + ")";
  const simple = "(?:" + c.simple.join("|") + ")";
  const stem = "(?:" + compound + "|" + simple + ")" + MATRA;
  const keepAfter = "(?!\\s*(?:ਨਹੀਂ|ਸਕਦ|ਸੀ|ਜਾਂ\\s*ਨਹੀਂ))";
  const inf = "(?:" + c.inf.join("|") + ")";
  const aux = "(?:" + c.aux.join("|") + ")";
  return new RegExp(notAttributed + notSub + stem + inf +
    "\\s+(?:" + K + "+\\s+){0,2}?" + aux + keepAfter, "u");
}

const P = Object.fromEntries(Object.keys(CFG).map((l) => [l, obligationPattern(l)]));

// Every sentence below is MEASURED output from the 504-sample sweep, not
// invented.
const MUST_FIRE = {
  pa: [
    ["ਤੁਹਾਨੂੰ 1 ਜੁਲਾਈ 2026 ਤੱਕ £74.22 ਭੁਗਤਾਨ ਕਰਨਾ ਹੋਵੇਗਾ।",
      "pay: ਹੋਵੇਗਾ is obligation because the infinitive precedes it"],
    ["ਤੁਹਾਡੇ ਲਈ £41.99 ਦਾ ਭੁਗਤਾਨ 03/06/2026 ਤੱਕ ਕਰਨਾ ਜਰੂਰੀ ਹੈ।",
      "pay, the date between noun and light verb, the Hindi gap finding"],
    ["ਤੁਹਾਨੂੰ 14 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਜਵਾਬ ਦੇਣਾ ਚਾਹੀਦਾ ਹੈ।", "reply"],
    ["ਸਹਿਮਤੀ ਫਾਰਮ 5 ਜੂਨ 2026 ਤੱਕ ਵਾਪਸ ਭੇਜਣਾ ਲਾਜ਼ਮੀ ਹੈ।", "return"],
    ["ਬਕਾਇਆ ਰਕਮ 7 ਜੁਲਾਈ 2026 ਤੱਕ ਸਾਫ਼ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।",
      "clear, which IS in the English 21"],
    ["ਸਾਰੇ ਹਿੱਸੇ ਸਹੀ ਤਰੀਕੇ ਨਾਲ ਭਰਨਾ ਜਰੂਰੀ ਹੈ।", "complete"],
    ["ਭੁਗਤਾਨ 25 ਜੁਲਾਈ 2026 ਤੱਕ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।",
      "the due-date shape: pay noun + light ਹੋ + ਚਾਹੀਦਾ"],
    ["ਮੁੜ ਵਿਚਾਰ ਲਈ ਅਰਜ਼ੀ ਇੱਕ ਮਹੀਨੇ ਵਿੱਚ ਦੇਣੀ ਚਾਹੀਦੀ ਹੈ।", "apply"],
    ["ਨਾਂ, ਪਤਾ, ਜਨਮ ਤਾਰੀਖ, ਨੈਸ਼ਨਲ ਇੰਸ਼ੋਰੈਂਸ ਨੰਬਰ ਅਤੇ ਆਮਦਨ ਸਹੀ ਭਰੇ ਹੋਣ ਚਾਹੀਦੇ ਹਨ।",
      "complete, the bare participle before ਹੋਣ ਚਾਹੀਦੇ"],
    ["£312.44 ਦੀ ਬਕਾਇਆ ਰਕਮ 15 ਜੂਨ 2026 ਤੱਕ ਭੁਗਤਾਨ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।",
      "pay, passive"],
    ["ਦਸਤਖਤ ਅਤੇ ਤਾਰੀਖ ਭਰਨਾ ਵੀ ਜਰੂਰੀ ਹੈ।",
      "complete, with ਵੀ between infinitive and auxiliary"]
  ]
};

// NEVER STRICTER THAN ENGLISH. Real measured sentences whose verbs the
// English list does not name.
const OUT_OF_SCOPE_BY_DESIGN = {
  pa: [
    ["ਤਬਦੀਲੀਆਂ ਦੀ ਸੂਚਨਾ ਦੇਣੀ ਜਰੂਰੀ ਹੈ।", "notify"],
    ["ਨਿਯੁਕਤੀ 'ਤੇ 15 ਮਿੰਟ ਪਹਿਲਾਂ ਪਹੁੰਚਣਾ ਚਾਹੀਦਾ ਹੈ।", "arrive"],
    ["ਮੈਨੂੰ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?", "do, the card question form"],
    ["ਦਸਤਾਵੇਜ਼ ਕਹਿੰਦਾ ਹੈ ਕਿ ਤੁਸੀਂ ਆਪਣੀਆਂ ਹਾਲਤਾਂ ਵਿੱਚ ਕੋਈ ਵੀ ਤਬਦੀਲੀ ਇੱਕ ਮਹੀਨੇ ਵਿੱਚ ਦਰਜ ਕਰਵਾਉਣੀ ਚਾਹੀਦੀ ਹੈ।",
      "record, and attributed besides"]
  ]
};

// The pairing and the after-aux grammar, made structural. Every one is a
// sentence a reader must keep.
const MUST_KEEP = {
  pa: [
    ["ਮੂਲ ਦਸਤਾਵੇਜ਼ ਨੂੰ ਚੈੱਕ ਕਰਨਾ ਜਰੂਰੀ ਹੈ।",
      "Northcue's own caution line: check is not in the family"],
    ["ਖਾਤਾ ਕ੍ਰੈਡਿਟ ਵਿੱਚ ਹੈ, ਇਸ ਲਈ ਕੋਈ ਭੁਗਤਾਨ ਕਰਨ ਦੀ ਲੋੜ ਨਹੀਂ।",
      "need-not beside the pay noun: ਲੋੜ ਨਹੀਂ never matches ਲੋੜ ਹੈ"],
    ["ਤੁਹਾਨੂੰ ਕੁਝ ਕਰਨ ਦੀ ਲੋੜ ਨਹੀਂ।", "need-not"],
    ["ਭੁਗਤਾਨ 2 ਮਈ 2026 ਤੱਕ ਹੋਵੇਗਾ।",
      "PLAIN FUTURE beside the pay noun: no infinitive, no fire"],
    ["ਨਵੀਂ ਮਹੀਨਾਵਾਰ ਰਕਮ £742.19 ਹੋਵੇਗੀ।", "plain future"],
    ["ਪਾਲਿਸੀ ਆਪਣੇ ਆਪ ਨਵੀਨੀਕਰਨ ਹੋਵੇਗੀ।", "renewal future"],
    ["ਇਸ ਸਮੇਂ ਹਾਜ਼ਰੀ 82% ਹੈ, ਜਦਕਿ ਲੋੜੀਂਦੀ ਹਾਜ਼ਰੀ 95% ਹੈ।",
      "an attendance statistic beside a family noun"],
    ["ਇਹ ਕਦੋਂ ਜਰੂਰੀ ਹੈ?", "the when-is-it-needed card title"]
  ]
};

// Attributed or subordinate: reports of an obligation, exempt as in English.
const EXEMPT = {
  pa: [
    ["ਪੱਤਰ ਵਿੱਚ ਦਿੱਤੀ ਜਾਣਕਾਰੀ ਦੇ ਅਨੁਸਾਰ 14 ਦਿਨਾਂ ਵਿੱਚ ਜਵਾਬ ਦੇਣਾ ਲਾਜ਼ਮੀ ਹੈ।",
      "THE TEMPERED-GAP MEMBER: attribution inside the compound gap"],
    ["ਜੇ ਵਿੱਤੀ ਸਹਾਇਤਾ ਦੀ ਲੋੜ ਹੈ ਤਾਂ ਸਕੂਲ ਦਫਤਰ ਨਾਲ ਗੱਲ ਕਰੋ।",
      "subordinate ਜੇ"],
    ["ਪੱਤਰ ਕਹਿੰਦਾ ਹੈ ਕਿ ਤੁਹਾਡੇ ਕਿਰਾਏਦਾਰੀ ਰਿਕਾਰਡ ਨੂੰ ਅਪਡੇਟ ਕਰਨ ਲਈ ਵਾਧੂ ਜਾਣਕਾਰੀ ਚਾਹੀਦੀ ਹੈ।",
      "the letter says"]
  ]
};

// Derived from CFG, per the i18n standard: no hand-maintained language list.
Object.keys(CFG).forEach((lang) => {
  test(lang + ": measured obligations fire, out-of-scope, kept and exempt do not", async (t) => {
    for (const [line, gloss] of MUST_FIRE[lang]) {
      await t.test("fires: " + gloss, () => {
        assert.equal(P[lang].test(line), true, line);
      });
    }
    for (const [line, verb] of OUT_OF_SCOPE_BY_DESIGN[lang]) {
      await t.test("never stricter than English: " + verb, () => {
        assert.equal(P[lang].test(line), false,
          "the " + lang + " guard is stricter than the English one: " + line);
      });
    }
    for (const [line, why] of MUST_KEEP[lang]) {
      await t.test("kept: " + why, () => {
        assert.equal(P[lang].test(line), false, line);
      });
    }
    for (const [line, why] of EXEMPT[lang]) {
      await t.test("exempt, " + why, () => {
        assert.equal(P[lang].test(line), false, line);
      });
    }
  });

  test(lang + ": zero fires on the reviewed bank, which is the provenance re-verification", async (t) => {
    await t.test("371 engine-authored sentences as translated", () => {
      global.window = global;
      require(path.join(__dirname, "..", "public", "i18n", "templates-" + lang + ".js"));
      const T = global["NORTHCUE_TEMPLATES_" + lang.toUpperCase()];
      const bank = Object.values(T.exact || {}).concat(Object.values(T.patterns || {}))
        .filter((s) => typeof s === "string");
      assert.ok(bank.length > 300, "premise: the bank loaded, got " + bank.length);
      assert.deepEqual(bank.filter((s) => P[lang].test(s)), [],
        "the guard fires on Northcue's own " + lang);
    });
  });
});

test("the counts a reviewer is asked to check", async (t) => {
  await t.test("pinned, so the report cannot drift from the file", () => {
    assert.equal(CFG.pa.nouns.length, 25);
    assert.equal(CFG.pa.aux.length, 16);
    assert.equal(CFG.pa.inf.length, 9);
    assert.equal(CFG.pa.light.length, 9);
    assert.equal(CFG.pa.simple.length, 6);
  });

  await t.test("ਚੈੱਕ stays out of the noun list", () => {
    assert.ok(!CFG.pa.nouns.includes("ਚੈੱਕ"),
      "check re-entered the family; Northcue's own caution copy fires");
  });
});
