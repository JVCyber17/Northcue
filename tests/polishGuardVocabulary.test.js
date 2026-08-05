// POLISH COMMAND-FAMILY VOCABULARY, PROTOTYPE. Its own file, its own
// denominator, its own commit, per the one-language-at-a-time instruction.
// Not wired into the stripper, exactly as the other prototypes are not.
//
// ============================================================================
// THE THREE WORD-ORDER QUESTIONS, answered in writing before any vocabulary,
// per the rule in ENGINE_STATE.md, from the 504-sample sweep. Polish is the
// most different of the nine:
//
// Q1 WHERE DOES THE MODAL SIT? Not reliably first: "Kwota £312.40 musi być
//    zapłacona", "Do 24 June 2026 trzeba przesłać". Position-free.
// Q2 CAN THE VERB BE SPLIT FROM THE MODAL? Three ways, more than any other
//    language: musi/powinna + być/zostać + a passive participle that AGREES
//    in gender and number (zapłacona, zwrócona, uregulowana); the
//    impersonals należy/trzeba + a bare infinitive in -ć; and the light-verb
//    shape transferred from Hindi, where the NOUN carries the command and
//    nastąpić (occur) is semantically empty: "Odpowiedź powinna nastąpić w
//    ciągu 14 dni" is you-must-reply.
// Q3 IS THE OBLIGATION MARKER AMBIGUOUS? No: musi/będzie are distinct
//    words. But Polish surfaced two hazards the questionnaire did not ask
//    about, both found by measurement: the HEDGE (być może trzeba = you MAY
//    need to, which English keeps because may separates you from the modal)
//    and NEGATION (nie musisz = need not, reassurance copy). Both carry
//    explicit lookbehinds before the modal in both branches.
//
// ============================================================================
// THE DENOMINATOR, per the recorded rule, derived from NOTHING the guard
// uses: a modal marker plus ANY verb-shaped word within 60 characters, where
// "verb-shaped" is a bare infinitive in -ć/-c or a participle-agreement
// shape (-ony/-ona/-one/-eni, -any/-ana/-ane/-ani, and their -ych forms).
// The rule's tell ran in reverse TWICE during the build. First: five guard
// fires sat OUTSIDE the denominator because the verb shape closed with
// ASCII \b, which is never a boundary after ć, so every -ć infinitive was
// invisible to the truth set (the recorded Portuguese \b defect, again).
// Second: the participle branch lacked a closing boundary, so mieszkANIowym
// counted as a participle. Both fixes widened or corrected the TRUTH SET,
// never the guard; the denominator went 15 to 30. Measured 5 August 2026:
//
//     lang   sentences  denominator  exempt*  in scope  caught   bank fires
//     pl     758        30           7        23        15 = 65%   0 of 371
//
//     *attributed or subordinate, which the ENGLISH guard also exempts
//
// Every residual miss was read and classified against the verbatim English
// list (pay contact clear call ring phone reply respond send provide confirm
// settle attend complete return submit act vacate remove arrange apply): all
// eight are outside it (report twice, bring, arrive, stop, notify, and the
// negated do-nothing reassurance twice, which must never fire). Against the
// verbs English names, recall is complete: 15 of 15. Zero fires outside the
// denominator, zero on exempt members.
//
// ============================================================================
// THE PROVENANCE FINDING, carried in as instructed, and in Polish it EARNED
// ITS KEEP: the first draft fired on the reviewed bank's "To jest pilne. Być
// może trzeba działać jeszcze dziś", the rendering of "This is urgent. You
// may need to act today", which the ENGLISH guard keeps because "may" sits
// between you and the modal. Polish hedging leaves trzeba unchanged, so
// without the hedge lookbehind this guard was stricter than English on
// Northcue's own safety copy. The zero-fire assertion over the 371-sentence
// reviewed bank is what caught it, and is the standing replacement for the
// provenance exemption, which compares byte-identical English strings and
// does not survive translation.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const OPEN = "(?<![\\p{L}\\p{M}\\p{N}])";
const CLOSE = "(?![\\p{L}\\p{M}\\p{N}])";

// REVIEW_REQUIRED throughout, as with the other prototypes: a reader
// confirms each stem is the form official post uses and names what is
// missing. Stems cover the 21 English verbs only, the mirror rule made
// structural. Character classes like p[łl]a[ct] accept diacritic and
// diacritic-stripped spellings, which real model output mixes.
const CFG = {
  pl: {
    modals: ["musi", "musz[ąa]", "musisz", "musicie", "powinien", "powinna",
      "powinno", "powinny", "powinni", "nale[żz]y", "trzeba", "jest\\s+wymagane",
      "ma\\s+obowi[ąa]zek", "s[ąa]\\s+zobowi[ąa]zan[ie]"],
    stems: ["zap[łl]a[ct]", "op[łl]a[ct]", "p[łl]a[ct]", "uregulow", "ureguluj",
      "sp[łl]a[ct]", "skontaktow", "skontaktuj", "kontakt", "zadzwon", "dzwon",
      "telefon", "odpowiedz", "odpowiada", "wys[łl]", "wy[śs]l", "przes[łl]",
      "prze[śs]l", "dostarcz", "przekaz", "przeka[żz]", "poda", "potwierdz",
      "zweryfikow", "zweryfikuj", "weryfik", "staw", "wype[łl]n", "uzupe[łl]n",
      "zwr[óo][ct]", "zwraca", "odes[łl]", "ode[śs]l", "z[łl]o[żz]", "z[łl][óo][żz]",
      "sk[łl]ada", "dzia[łl]a", "podj", "podejm", "opu[śs][ćc]", "opuszcz", "usun",
      "usuwa", "um[óo]w", "umawia", "zorganizow", "dokon", "wykon"],
    endings: ["a[ćc]", "i[ćc]", "y[ćc]", "[ąa][ćc]", "e[ćc]", "[ćc]",
      "ony", "ona", "one", "eni", "onych", "any", "ana", "ane", "ani", "anych",
      "ty", "ta", "te", "ci", "ie", "iona", "iony", "ione",
      "a[ćc]\\s+si[ęe]", "i[ćc]\\s+si[ęe]"],
    passive: "(?:by[ćc]|zosta[ćc]|zosta[łl][ay]?)?\\s*",
    // The Hindi structure, transferred: nouns covering the English 21 whose
    // obligation arrives as noun + modal + nastąpić.
    lightNouns: ["p[łl]atno[śs][ćc]", "zap[łl]ata", "wp[łl]ata", "odpowied[źz]",
      "potwierdzenie", "zwrot", "kontakt", "wysy[łl]ka"],
    lightVerb: "nast[ąa]pi[ćc]?",
    attribution: ["pismo\\s+(?:m[óo]wi|wskazuje|informuje|stanowi)",
      "list\\s+(?:m[óo]wi|wskazuje|informuje|stanowi)",
      "dokument\\s+(?:m[óo]wi|wskazuje|informuje|stanowi)",
      "zgodnie\\s+z", "wed[łl]ug", "zawiadomienie\\s+(?:m[óo]wi|wskazuje)"],
    subordinate: ["czy", "[żz]e", "je[śs]li", "je[żz]eli", "gdy", "kt[óo]r[aey]", "wspomina"]
  }
};

const GAP = 30;

function obligationPattern(lang) {
  const c = CFG[lang];
  const verbs = "(?:" + c.stems.flatMap((s) => c.endings.map((e) => s + e)).join("|") + ")";
  const modal = "(?:" + c.modals.join("|") + ")";
  const notSub = "(?<!" + OPEN + "(?:" + c.subordinate.join("|") + ")" + CLOSE + "[^.!?]{0,24})";
  const notAttrib = "(?<!(?:" + c.attribution.join("|") + ")[\\s\\S]{0,40})";
  // Hedge and negation sit directly before the modal in BOTH branches, so
  // "Płatność nie musi nastąpić" is protected in the light branch too.
  const guardedModal = "(?<!" + OPEN + "mo[żz]e\\s)(?<!" + OPEN + "nie\\s)" +
    OPEN + modal + CLOSE;
  const stemBranch = guardedModal + "\\s*" + c.passive +
    "[^.!?]{0," + GAP + "}?" + OPEN + verbs + CLOSE;
  const lightBranch = OPEN + "(?:" + c.lightNouns.join("|") + ")" + CLOSE +
    "[^.!?]{0," + GAP + "}?" + guardedModal + "\\s*" + c.lightVerb + CLOSE;
  return new RegExp(notAttrib + notSub + "(?:" + stemBranch + "|" + lightBranch + ")", "iu");
}

const P = Object.fromEntries(Object.keys(CFG).map((l) => [l, obligationPattern(l)]));

// Every sentence below is MEASURED output from the 504-sample sweep unless
// its gloss says CONSTRUCTED.
const MUST_FIRE = {
  pl: [
    ["Kwota £1,381.50 musi być zapłacona do 1 kwietnia 2026, aby zachować prawo do płatności w ratach.",
      "passive participle with feminine agreement, pay"],
    ["Zaległość musi zostać uregulowana do 7 lipca 2026.",
      "the zostać auxiliary variant, settle"],
    ["Podpisana zgoda powinna być zwrócona do 5 czerwca 2026.",
      "powinna, return"],
    ["Trzeba odesłać podpisaną zgodę do 5 czerwca 2026.",
      "impersonal trzeba + infinitive, the -ć shape ASCII \\b could not see"],
    ["Należy wypełnić wszystkie pola czarnym atramentem.",
      "należy + infinitive, complete"],
    ["Musisz potwierdzić swoją tożsamość w ciągu 30 dni, aby kontynuować wniosek.",
      "confirm"],
    ["Potwierdzenie obecności należy przekazać swojemu przełożonemu.",
      "provide, object before the impersonal modal"],
    ["W razie potrzeby zmiany terminu należy skontaktować się pod numerem +[phone].",
      "contact, reflexive się"],
    ["Do 24 June 2026 trzeba przesłać informacje o dochodach.",
      "send, modal mid-sentence, Q1"],
    ["Odpowiedź powinna nastąpić w ciągu 14 dni od 4 czerwca 2026.",
      "light verb: the noun carries reply, nastąpić is empty"],
    ["Płatność powinna nastąpić w ciągu 14 dni od daty faktury.",
      "light verb, pay"],
    ["Potwierdzenie tożsamości musi nastąpić w ciągu 30 dni.",
      "light verb, confirm, genitive between noun and modal"]
  ]
};

// NEVER STRICTER THAN ENGLISH. Real measured sentences whose verbs the
// English list does not name; a Polish reader keeps them because an English
// reader would. notify is the recorded English decision, applied here.
const OUT_OF_SCOPE_BY_DESIGN = {
  pl: [
    ["Musisz zgłosić zmiany w ciągu miesiąca od daty listu (8 lipca 2026).", "report"],
    ["Należy przynieść ten list i listę leków.", "bring"],
    ["Należy przyjść 15 minut wcześniej.", "arrive"],
    ["Należy przerwać kontakt w takim przypadku.",
      "stop, and the kontakt NOUN alone must not trip the light branch"],
    ["Jeśli pobierasz zasiłek mieszkaniowy, urząd musi zostać poinformowany o nowej kwocie czynszu.",
      "notify"]
  ]
};

// The hedge and the negation, the two hazards Polish measurement surfaced.
const MUST_KEEP = {
  pl: [
    ["To jest pilne. Być może trzeba działać jeszcze dziś.",
      "THE BANK LINE the first draft fired on: hedged may-need-to-act, which English keeps"],
    ["Nie musisz nic robić, polisa odnowi się automatycznie.",
      "negated reassurance, measured"],
    ["Nie musisz płacić teraz.",
      "CONSTRUCTED: negation with an in-family verb, the shape the lookbehind exists for"],
    ["Płatność nie musi nastąpić natychmiast.",
      "CONSTRUCTED: negation inside the light branch"]
  ]
};

// Attributed or subordinate: reports of an obligation, exempt as in English.
const EXEMPT = {
  pl: [
    ["Sprawdź, czy musisz odpowiedzieć lub skontaktować się z zespołem mieszkaniowym.",
      "check-whether, the shape the English whether clause exempts"],
    ["Na koncie jest zaległość czynszowa £1,245.60, która musi być uregulowana.",
      "relative clause under która, as the Spanish que decision"],
    ["Jeśli objawy się zmienią, należy skontaktować się z lekarzem rodzinnym.",
      "subordinate jeśli"],
    ["Jeśli sytuacja się zmieni, należy o tym poinformować nadawcę.",
      "subordinate jeśli"]
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
      // In Polish this assertion did real work: it caught the hedge fire on
      // the bank's own urgency line. No exemption set exists; every
      // engine-authored sentence passes on its own merits.
      global.window = global;
      require(path.join(__dirname, "..", "public", "i18n", "templates-" + lang + ".js"));
      const B = global["NORTHCUE_TEMPLATES_" + lang.toUpperCase()];
      const bank = Object.values(B.exact || {}).concat(Object.values(B.patterns || {}))
        .filter((s) => typeof s === "string");
      assert.ok(bank.length > 300, "premise: the bank loaded, got " + bank.length);
      assert.deepEqual(bank.filter((s) => P[lang].test(s)), [],
        "the guard fires on Northcue's own " + lang);
    });
  });
});

test("the counts a reviewer is asked to check", async (t) => {
  await t.test("pinned, so the report cannot drift from the file", () => {
    assert.equal(CFG.pl.stems.length, 48);
    assert.equal(CFG.pl.modals.length, 14);
    assert.equal(CFG.pl.endings.length, 26);
    assert.equal(CFG.pl.lightNouns.length, 8);
  });
});
