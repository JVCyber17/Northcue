// GUJARATI COMMAND-FAMILY VOCABULARY, PROTOTYPE. Its own file, its own
// denominator, its own commit, per the one-language-at-a-time instruction.
// Not wired into the stripper, exactly as the other prototypes are not.
//
// ============================================================================
// THE THREE WORD-ORDER QUESTIONS, answered in writing before any vocabulary,
// per the rule in ENGINE_STATE.md, from the 504-sample sweep:
//
// Q1 WHERE DOES THE MODAL SIT? At the END. Gujarati is verb-final like
//    Hindi and Bengali; the auxiliary closes the sentence.
// Q2 CAN THE VERB BE SPLIT FROM THE MODAL? Yes: the compound is a NOUN
//    plus a light verb that separate around dates and amounts (the Hindi
//    finding), the infinitive agrees in gender (-વો/-વી/-વું), and the
//    due-date shape puts the light verb હ (be) between noun and auxiliary:
//    "ચુકવણી 25 જુલાઈ 2026 સુધી હોવી જોઈએ". A participle can also stand
//    before હોવી જોઈએ: "ભરેલી હોવી જોઈએ", should be filled in.
// Q3 IS THE OBLIGATION MARKER AMBIGUOUS? YES, the worst of the nine, the
//    measured 25%: the -શે endings are the plain future and પડશે/રહેશે
//    end in -શે themselves. The recorded answer is applied: the
//    INFINITIVE is REQUIRED before the auxiliary, so bare futures
//    (ચુકવણી થશે, the payment will happen) never enter the pattern.
//
// The Bengali lessons hold here too: negation and the whether-marker
// follow the auxiliary (જરૂર નથી, જરૂરી છે કે કેમ), and the hedge is પડી
// શકે (may be needed). English keeps all three, so the auxiliary carries
// a lookahead.
//
// ============================================================================
// THE DENOMINATOR, per the recorded rule, derived from NOTHING the guard
// uses: an obligation auxiliary preceded by ANY infinitive-shaped word
// within two words. The infinitive requirement is the recorded ambiguity
// answer, grammar not vocabulary; no noun or stem list appears in the
// expression. Measured 5 August 2026:
//
//     lang   sentences  denominator  exempt*  in scope  caught   bank fires
//     gu     864        39           1        38        27 = 71%   0 of 371
//
//     *attributed, which the ENGLISH guard also exempts
//
// Every residual miss was read and classified against the verbatim English
// list: all eleven are outside it or are statements English keeps (do as
// the card question, notify three times, urgent-attention, maintain,
// arrive, check as Northcue's own caution line, bring twice, and one
// deadline statement that is not an obligation at all). Against the verbs
// English names, recall is complete: 27 of 27. Zero fires outside the
// denominator, zero on exempt members.
//
// ============================================================================
// THE PROVENANCE FINDING, carried in as instructed: the English provenance
// exemption compares byte-identical engine strings and does not survive
// translation. What replaces it is the attribution exception plus the
// zero-fire assertion over the 371-sentence reviewed Gujarati bank, with
// no exemption set at all. The Bengali যাচাই lesson was applied up front:
// તપાસ (check) and ધ્યાન (attention) never entered the noun list, and the
// caution lines built from them are pinned below as keeps.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

// Gujarati block U+0A80-U+0AFF; vowel signs U+0ABE-U+0ACC.
const G = "[\\u0A80-\\u0AFF]";
const MATRA = "[\\u0ABE-\\u0ACC\\u0AD0]?";

// REVIEW_REQUIRED throughout: a reader confirms each form is the one
// official post uses and names what is missing. Nouns and stems cover the
// 21 English verbs only, the mirror rule made structural.
const CFG = {
  gu: {
    aux: ["પડશે", "જોઈએ", "જોઇએ", "રહેશે", "જરૂરી\\s*છે", "જરૂર\\s*છે",
      "આવશ્યક\\s*છે", "ફરજિયાત\\s*છે", "જરૂરિયાત\\s*છે"],
    inf: ["વાનું", "વાની", "વાના", "વું", "વુ", "વી", "વા", "વો",
      "ેલી", "ેલું", "ેલા"],
    // તપાસ (check) and ધ્યાન (attention) deliberately absent, see header.
    nouns: ["ચુકવણી", "ચૂકવણી", "ચુકવવા", "સંપર્ક", "કૉલ", "કોલ", "ફોન",
      "જવાબ", "ઉત્તર", "પ્રદાન", "પુષ્ટિ", "હાજર", "પૂર્ણ", "પરત", "સબમિટ",
      "જમા", "ખાલી", "દૂર", "વ્યવસ્થા", "અરજી", "માહિતી", "હપ્તો", "હપ્તા", "સાફ"],
    light: ["કર", "આપ", "થ", "હ", "લ", "રાખ", "પાડ", "મોકલ", "ભર", "ચૂકવ", "ચુકવ"],
    simple: ["મોકલ", "ચૂકવ", "ચુકવ", "ભર", "પરત", "પહોંચાડ"],
    attribution: ["પત્ર(?:માં)?\\s*(?:કહે|જણાવ|લખ|ઉલ્લેખ)",
      "દસ્તાવેજ(?:માં)?\\s*(?:કહે|જણાવ|ઉલ્લેખ)", "મુજબ", "અનુસાર",
      "કહેવામાં\\s*આવ્યું", "જણાવવામાં\\s*આવ્યું", "કહે\\s*છે", "જણાવે\\s*છે"],
    subordinate: ["જો", "કે\\s*કેમ", "કે\\s*નહીં", "કે\\s*નહિ"]
  }
};

function obligationPattern(lang) {
  const c = CFG[lang];
  const notAttributed = "(?<!(?:" + c.attribution.join("|") + ")[\\s\\S]{0,60})";
  const notSub = "(?<!(?:" + c.subordinate.join("|") + ")[^।?!.]{0,24})";
  const compound = "(?:" + c.nouns.join("|") + ")" + "[^।?!.]{0,30}?\\s*" +
    "(?:" + c.light.join("|") + ")";
  const simple = "(?:" + c.simple.join("|") + ")";
  const stem = "(?:" + compound + "|" + simple + ")" + MATRA;
  // Negation, hedge and whether-marker follow the aux; English keeps them.
  const keepAfter = "(?!\\s*(?:નથી|નહીં|નહિ|પડી\\s*શકે|હત|કે\\s*કેમ|કે\\s*નહીં|કે\\s*નહિ))";
  const inf = "(?:" + c.inf.join("|") + ")";
  const aux = "(?:" + c.aux.join("|") + ")";
  return new RegExp(notAttributed + notSub + stem + inf +
    "\\s+(?:" + G + "+\\s+){0,2}?" + aux + keepAfter, "u");
}

const P = Object.fromEntries(Object.keys(CFG).map((l) => [l, obligationPattern(l)]));

// Every sentence below is MEASURED output from the 504-sample sweep, not
// invented, except where a gloss says CONSTRUCTED.
const MUST_FIRE = {
  gu: [
    ["પ્રથમ હપ્તો 1 એપ્રિલ 2026 સુધી ચૂકવવો જરૂરી છે.",
      "pay, the masculine infinitive -વો the first draft lacked"],
    ["આ સ્થિતિમાં વર્ષભરનો બાકી રકમ એકસાથે ચૂકવવી પડશે.",
      "pay with પડશે, the -શે auxiliary that is only obligation AFTER an infinitive"],
    ["3 સપ્ટેમ્બર 2026 સુધી સંપર્ક કરવો જરૂરી છે.", "contact"],
    ["બાકી રકમ 12 સપ્ટેમ્બર 2026 સુધી સાફ કરવી જરૂરી છે.",
      "clear, which IS in the English 21"],
    ["સહી કરેલ સંમતિ ફોર્મ 5 જૂન 2026 સુધીમાં પાછું મોકલવું જરૂરી છે.",
      "return, sent back"],
    ["ફોર્મમાં તમામ માહિતી કાળી શાહીથી ભરવી જરૂરી છે.", "complete"],
    ["તમારી ઓળખ 30 દિવસની અંદર પુષ્ટિ કરવી જરૂરી છે.", "confirm"],
    ["ચુકવણી 25 જુલાઈ 2026 સુધી હોવી જોઈએ.",
      "the due-date shape: pay noun + light હ + જોઈએ"],
    ["સહી અને તારીખ ભરેલી હોવી જોઈએ.",
      "complete, the participle before હોવી જોઈએ"],
    ["તમારા માટે બેલેન્સ £187.82 ચૂકવવાની જરૂર છે.",
      "pay, જરૂર છે with the amount inside the compound gap"],
    ["ચુકવણી 3 સપ્ટેમ્બર 2026 પહેલા કરવી જરૂરી છે.",
      "pay, noun and light verb separated by the date, the Hindi gap finding"]
  ]
};

// NEVER STRICTER THAN ENGLISH. Real measured sentences whose verbs the
// English list does not name.
const OUT_OF_SCOPE_BY_DESIGN = {
  gu: [
    ["જો નવિનીકરણ રોકવું હોય તો 1 August 2026 પહેલા સૂચના આપવી પડશે.", "notify"],
    ["તમારા પરિસ્થિતિમાં કોઈ ફેરફાર હોય તો એક મહિના અંદર જાણ કરવી જરૂરી છે.", "notify"],
    ["10 મિનિટ પહેલા પહોંચવું જરૂરી છે.", "arrive"],
    ["પત્ર સાથે લાવવું જરૂરી છે.", "bring"],
    ["તાત્કાલિક સુરક્ષા જાળવવી જરૂરી છે.", "maintain"],
    ["મને શું કરવું જોઈએ?", "do, the card question form"]
  ]
};

// The ambiguity and the after-aux grammar, made structural. Every one is a
// sentence a reader must keep.
const MUST_KEEP = {
  gu: [
    ["તમારે કોઈ કાર્યવાહી કરવાની જરૂર નથી.",
      "need-not: negation follows the aux family"],
    ["ડાયરેક્ટ ડેબિટથી ચુકવણી થાય તો કોઈ કાર્યવાહી કરવાની જરૂર નથી.",
      "need-not beside the pay noun itself"],
    ["મૂળ દસ્તાવેજમાં તમામ વિગતો તપાસવી જરૂરી છે.",
      "Northcue's own caution line: check is not in the family"],
    ["તાત્કાલિક ધ્યાન આપવું જરૂરી છે.",
      "needs-urgent-attention, which English keeps"],
    ["જરૂરી ચુકવણી તારીખ: 3 સપ્ટેમ્બર 2026.",
      "a label, not an obligation"],
    ["હાજરી આ ટર્મમાં 82 ટકા છે જ્યારે જરૂરી 95 ટકા છે.",
      "an attendance statistic beside a family noun"],
    ["આ સમયમર્યાદા દાવાની પ્રક્રિયા માટે જરૂરી છે.",
      "a statement about the deadline, not an instruction"],
    ["ક્યારે જરૂરી છે?", "the when-is-it-needed card title"],
    ["તમારે જવાબ આપવો જરૂરી છે કે કેમ તે મૂળ દસ્તાવેજમાં તપાસો.",
      "CONSTRUCTED: whether-after-aux, the Bengali finding applied up front"]
  ]
};

// Attributed: reports of an obligation, exempt as in English.
const EXEMPT = {
  gu: [
    ["પત્રમાં જણાવાયું છે કે 24 જૂન 2026 સુધી માહિતી મોકલવી જરૂરી છે.",
      "the letter states that, the measured attributed member"]
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
    assert.equal(CFG.gu.nouns.length, 24);
    assert.equal(CFG.gu.aux.length, 9);
    assert.equal(CFG.gu.inf.length, 11);
    assert.equal(CFG.gu.light.length, 11);
    assert.equal(CFG.gu.simple.length, 6);
  });

  await t.test("તપાસ and ધ્યાન stay out of the noun list", () => {
    assert.ok(!CFG.gu.nouns.includes("તપાસ") && !CFG.gu.nouns.includes("ધ્યાન"),
      "check or attention re-entered the family; Northcue's own caution copy fires");
  });
});
