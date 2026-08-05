// BENGALI COMMAND-FAMILY VOCABULARY, PROTOTYPE. Its own file, its own
// denominator, its own commit, per the one-language-at-a-time instruction.
// Not wired into the stripper, exactly as the other prototypes are not.
//
// ============================================================================
// THE THREE WORD-ORDER QUESTIONS, answered in writing before any vocabulary,
// per the rule in ENGINE_STATE.md, from the 504-sample sweep:
//
// Q1 WHERE DOES THE MODAL SIT? At the END. Bengali is verb-final like
//    Hindi: the obligation auxiliary closes the sentence and everything it
//    governs stands before it. No anchor is possible.
// Q2 CAN THE VERB BE SPLIT FROM THE MODAL? Yes, twice over. The compound
//    verb is a NOUN plus a light verb (পরিশোধ কর, ফেরত দি), and the noun
//    and light verb separate around dates and amounts, the Hindi finding
//    transferred. Up to two words may also stand between the infinitive
//    and its auxiliary.
// Q3 IS THE OBLIGATION MARKER AMBIGUOUS? YES, the measured 5%: হবে is also
//    the plain future. "টাকা নেওয়া হবে" is "the money WILL BE taken", a
//    direct-debit statement, not an obligation. The disambiguation is
//    PAIRING, which is Bengali grammar: the infinitive -তে takes হবে
//    (করতে হবে, must do), the verbal noun -া/-ওয়া/-নো with optional
//    genitive -র takes উচিত/প্রয়োজন/দরকার/আবশ্যক (করা উচিত, should do).
//    A cross product would strip future statements a reader must keep.
//
// Bengali also puts NEGATION, the WHETHER-marker and the HEDGE after the
// auxiliary: হবে না (need not), হবে কি না (whether you must), প্রয়োজন
// হতে পারে (may be needed), উচিত ছিল (should have, a past due-date
// report). English keeps all four, so the auxiliary carries a lookahead.
// The exception inside the exception: না followed by হলে is "otherwise",
// and "করতে হবে, না হলে..." is a live obligation that must still fire.
//
// ============================================================================
// THE DENOMINATOR, per the recorded rule, derived from NOTHING the guard
// uses: an obligation auxiliary preceded by ANY word of the matching verb
// shape (-তে before হবে; -া/-ওয়া/-নো, optional -র, before the verbal-noun
// auxiliaries). The pairing is grammar, not the stem list; no noun or stem
// list appears in the expression. Measured 5 August 2026:
//
//     lang   sentences  denominator  exempt*  in scope  caught   bank fires
//     bn     868        54           4        50        24 = 48%   0 of 371
//
//     *attributed, which the ENGLISH guard also exempts
//
// Every residual miss was read and classified against the verbatim English
// list: 17 are verbs English does not name (give as a payable label twice,
// do four times, arrive twice, update, report twice, notify six times) and
// 9 are shapes English KEEPS and the lookahead protects (need-not six
// times, the hedged may-need-to-act, should-have twice). Against the verbs
// English names, recall is complete. Zero fires outside the denominator,
// zero on exempt members.
//
// ============================================================================
// THE PROVENANCE FINDING, carried in as instructed, and in Bengali the bank
// caught EIGHT fires in the first draft, all one word: যাচাই (check).
// "যাচাই করা দরকার" is Northcue's own some-details-need-checking caution
// copy, and check is not one of the 21 English verbs. যাচাই is therefore
// deliberately absent from the noun list; the in-family confirm arrives in
// Bengali as নিশ্চিত, which the measured obligations use. The zero-fire
// assertion over the 371-sentence reviewed bank is the standing replacement
// for the English provenance exemption, which compares byte-identical
// strings and does not survive translation.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

// Bengali block U+0980-U+09FF; vowel signs U+09BE-U+09CC.
const B = "[\\u0980-\\u09FF]";
const MATRA = "[\\u09BE-\\u09CC\\u09D7]?";

// REVIEW_REQUIRED throughout, as with the other prototypes: a reader
// confirms each form is the one official post uses and names what is
// missing. Nouns and stems cover the 21 English verbs only, the mirror
// rule made structural.
const CFG = {
  bn: {
    auxInf: ["হবে"],
    auxVn: ["উচিত", "আবশ্যক", "প্রয়োজন", "দরকার", "বাধ্যতামূলক"],
    inf: ["তে"],
    vnoun: ["ওয়া", "নো", "া"],
    // যাচাই (check) deliberately absent, see the header.
    nouns: ["পরিশোধ", "অর্থপ্রদান", "পেমেন্ট", "প্রদান", "যোগাযোগ", "কল", "ফোন",
      "টেলিফোন", "উত্তর", "জবাব", "জমা", "পূরণ", "ফেরত", "নিশ্চিত",
      "সরবরাহ", "উপস্থিত", "ব্যবস্থা", "আবেদন", "খালি", "সম্পূর্ণ", "সমাধান",
      "তথ্য", "কিস্তি"],
    light: ["কর", "দি", "দে", "হ", "নি", "নে"],
    simple: ["পাঠা", "ডাক", "ফেরা", "ভর", "মেটা", "চুকা"],
    attribution: ["চিঠি(?:তে|টি)?\\s*(?:বল|জানা|উল্লেখ)", "নথি(?:তে|টি)?\\s*(?:বল|উল্লেখ)",
      "ডকুমেন্ট(?:ে|টি|টিতে)?\\s*(?:বল|উল্লেখ)", "অনুযায়ী", "অনুসারে",
      "বলা\\s*হয়েছে", "বলছে"],
    subordinate: ["যদি", "কিনা", "কি\\s*না"]
  }
};

function obligationPattern(lang) {
  const c = CFG[lang];
  // 60 units, not 40: Bengali conjunct spelling nearly doubles code-unit
  // length, and the measured চিঠিতে বলা হয়েছে line sits 42 from its aux.
  const notAttributed = "(?<!(?:" + c.attribution.join("|") + ")[\\s\\S]{0,60})";
  const notSub = "(?<!(?:" + c.subordinate.join("|") + ")[^।?!]{0,24})";
  const compound = "(?:" + c.nouns.join("|") + ")" + "[^।?!]{0,30}?\\s*" +
    "(?:" + c.light.join("|") + ")";
  const simple = "(?:" + c.simple.join("|") + ")";
  const stem = "(?:" + compound + "|" + simple + ")" + MATRA;
  const keepAfter = "(?!\\s*(?:না(?!\\s*হলে)|নেই|ছিল|কি\\s*না|কিনা|হতে\\s*পারে))";
  const infBranch = stem + "(?:" + c.inf.join("|") + ")" +
    "\\s+(?:" + B + "+\\s+){0,2}?" + "(?:" + c.auxInf.join("|") + ")" + keepAfter;
  const vnBranch = stem + "(?:" + c.vnoun.join("|") + ")" + "র?" +
    "\\s+(?:" + B + "+\\s+){0,2}?" + "(?:" + c.auxVn.join("|") + ")" + keepAfter;
  return new RegExp(notAttributed + notSub + "(?:" + infBranch + "|" + vnBranch + ")", "u");
}

const P = Object.fromEntries(Object.keys(CFG).map((l) => [l, obligationPattern(l)]));

// Every sentence below is MEASURED output from the 504-sample sweep or the
// reviewed bank, not invented.
const MUST_FIRE = {
  bn: [
    ["৭ জুলাই ২০২৬ তারিখের মধ্যে বকেয়া পরিশোধ করতে হবে।",
      "pay, verb-final, aux closes the sentence"],
    ["আপনাকে ১ জুলাই ২০২৬ তারিখের মধ্যে £74.22 পরিশোধ করতে হবে।",
      "pay, amount between noun and light verb, the Hindi gap finding"],
    ["১৪ দিনের মধ্যে তথ্য প্রদান করতে হবে।",
      "provide, the unattributed twin of the exempt letter-says line"],
    ["৩ সেপ্টেম্বর ২০২৬ তারিখের মধ্যে যোগাযোগ করা উচিত।",
      "contact, verbal noun with উচিত, the other pairing"],
    ["সই করা সম্মতি ফর্ম ৩ সেপ্টেম্বর ২০২৬ এর মধ্যে ফেরত দিতে হবে।",
      "return, the দি light verb"],
    ["সব অংশ কালো কালি দিয়ে পূরণ করতে হবে।", "complete"],
    ["আপনার পরিচয় ৩০ দিনের মধ্যে নিশ্চিত করতে হবে।",
      "confirm, নিশ্চিত not যাচাই"],
    ["আবেদন যত দ্রুত সম্ভব পাঠানো উচিত।",
      "send, a simple stem with the -নো verbal noun"],
    ["বকেয়া 12 সেপ্টেম্বর 2026 তারিখের মধ্যে মেটাতে হবে।",
      "settle, the simple stem মেটা"],
    ["সই করা সম্মতি ফর্ম ফেরত দেওয়ার প্রয়োজন।",
      "return, the genitive verbal noun দেওয়ার"],
    ["আপনার আয়ের তথ্য ২৪ জুন ২০২৬ এর মধ্যে জমা দিতে হবে।", "submit"],
    ["আপনার পরিচয় ৩০ দিনের মধ্যে নিশ্চিত করতে হবে না হলে দাবি প্রক্রিয়া করা যাবে না।",
      "না হলে is OTHERWISE: the obligation stays live through the negation exception"],
    ["কাউন্সিল ট্যাক্স বিলের প্রথম কিস্তি 1 April 2026 তারিখে দিতে হবে।",
      "pay, carried by the instalment noun"],
    ["আবেদনপত্রে নাম, ঠিকানা, জন্মতারিখ, জাতীয় বীমা নম্বর এবং আয়ের তথ্য দিতে হবে।",
      "provide, information given through তথ্য দি"]
  ]
};

// NEVER STRICTER THAN ENGLISH. Real measured sentences whose verbs the
// English list does not name.
const OUT_OF_SCOPE_BY_DESIGN = {
  bn: [
    ["যদি হাউজিং বেনিফিট নেন, অফিসকে জানাতে হবে।", "notify"],
    ["পরিস্থিতির পরিবর্তন এক মাসের মধ্যে রিপোর্ট করতে হবে।", "report"],
    ["অ্যাপয়েন্টমেন্টে ১৫ মিনিট আগে পৌঁছানো উচিত।", "arrive"],
    ["অ্যাকাউন্ট ৭ জুলাই ২০২৬ তারিখের মধ্যে আপ টু ডেট করতে হবে।", "update"],
    ["আমার কী করতে হবে?", "do, the card question form"],
    ["মোট দিতে হবে £1,381.50।", "give, a payable-total label"]
  ]
};

// The ambiguity and the after-aux grammar, made structural. Every one is a
// sentence a reader must keep.
const MUST_KEEP = {
  bn: [
    ["টাকা 2 May 2026 তারিখে নেওয়া হবে।",
      "PASSIVE FUTURE: the money will be taken, a statement; the pairing keeps it"],
    ["আপনার নতুন মাসিক পেমেন্ট £742.19 হবে।",
      "plain future beside a family noun"],
    ["পলিসি স্বয়ংক্রিয়ভাবে নবায়ন হবে যদি আপনি 1 August 2026 এর আগে অন্যথা না জানান।",
      "renewal future"],
    ["যদি আপনি মাসিক ডাইরেক্ট ডেবিটে থাকেন, তাহলে আপনাকে কিছু করতে হবে না।",
      "need-not: negation follows the aux"],
    ["অ্যাকাউন্টে £83.86 ক্রেডিট আছে, তাই কিছু পরিশোধের প্রয়োজন নেই।",
      "need-not beside the pay noun itself"],
    ["আজই কিছু পদক্ষেপ নেওয়া প্রয়োজন হতে পারে।",
      "the hedged may-need-to-act urgency line, which English keeps"],
    ["পেমেন্ট ৩ জুলাই ২০২৬ তারিখে হওয়া উচিত ছিল।",
      "should-have: a past due-date report"],
    ["আপনাকে উত্তর দিতে বা কিছু পাঠাতে হবে কি না, তা মূল ডকুমেন্টে বা প্রেরকের কাছে যাচাই করুন.",
      "THE BANK CHECK LINE: whether-marker follows the aux, হবে কি না"],
    ["আমার কী যাচাই করা উচিত?",
      "the what-should-I-check card title: যাচাই is not in the family"],
    ["পদক্ষেপ নেওয়ার আগে কিছু বিষয় যাচাই করা দরকার.",
      "the caution line that fired eight times before যাচাই was removed"]
  ]
};

// Attributed: reports of an obligation, exempt as in English.
const EXEMPT = {
  bn: [
    ["চিঠিতে বলা হয়েছে, ১৪ দিনের মধ্যে তথ্য প্রদান করতে হবে।",
      "the letter says, the attributed twin of a must-fire line"],
    ["ডকুমেন্টে বলা হয়েছে সম্মতি ফর্ম ৩ সেপ্টেম্বর ২০২৬ এর মধ্যে ফেরত দিতে হবে।",
      "the document says"],
    ["বিজ্ঞপ্তি বলছে পেমেন্ট ১৫ জুন ২০২৬ এর আগে করতে হবে।",
      "the notice says"]
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
      // In Bengali this assertion did real work: it caught eight fires on
      // Northcue's own যাচাই caution copy in the first draft. No exemption
      // set exists; every engine-authored sentence passes on its own merits.
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
    assert.equal(CFG.bn.nouns.length, 23);
    assert.equal(CFG.bn.simple.length, 6);
    assert.equal(CFG.bn.auxInf.length + CFG.bn.auxVn.length, 6);
    assert.equal(CFG.bn.light.length, 6);
  });

  await t.test("যাচাই stays out of the noun list", () => {
    assert.ok(!CFG.bn.nouns.includes("যাচাই"),
      "যাচাই (check) re-entered the family; eight bank caution lines fire again");
  });
});
