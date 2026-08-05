// SPANISH, FRENCH AND PORTUGUESE COMMAND-FAMILY VOCABULARY, PROTOTYPE.
// Not wired into the stripper, exactly as the Hindi prototype is not.
//
// ============================================================================
// THE THREE WORD-ORDER QUESTIONS, answered in writing before any vocabulary,
// per the rule in ENGINE_STATE.md, from the 504-sample sweep:
//
// Q1 WHERE DOES THE MODAL SIT? Not reliably sentence-initial: es 30 of 62
//    first word, fr 25 of 41, pt 31 of 64. A ^ anchor would miss half, so the
//    patterns are position-free.
// Q2 CAN THE VERB BE SPLIT FROM THE MODAL? Yes, by a passive auxiliary:
//    "Le montant doit ÊTRE payé", "deve SER feito". Gap measured: es p90 26
//    max 36, fr max 6, pt max 1. Thirty characters, from the curve.
// Q3 IS THE OBLIGATION MARKER AMBIGUOUS? No. Zero sentences carry both a
//    modal and a future marker; debe/será, doit/sera, deve/será are distinct
//    words. The Hindi correction is not needed here.
//
// ============================================================================
// THE DENOMINATOR, per the recorded rule, derived from NOTHING the guard uses:
// a modal marker plus ANY verb-shaped word within 60 characters, where
// "verb-shaped" is a bare morphological pattern (infinitive or participle
// endings, plus the languages' short irregular participles: hecho, fait,
// feito, pago). The withdrawn 100% was circular because its denominator came
// from the stem list under test; this one counts a sentence whose verb the
// guard lacks as a miss. Measured 5 August 2026 on the sweep slices:
//
//     lang   sentences  denominator  exempt*  in scope  caught   bank fires
//     es     890        54           10       44        30 = 68%   0 of 371
//     fr     694        38            2       36        23 = 64%   0 of 371
//     pt     923        60           10       50        38 = 76%   0 of 371
//
//     *attributed or subordinate, which the ENGLISH guard also exempts
//
// Every residual miss was read and classified: all are verbs the ENGLISH
// command family does not name (arrive, receive, update, notify, give, sign,
// stop, maintain, bring, examine, change). Catching them would make these
// guards STRICTER than English, so a Romance reader would lose sentences an
// English reader keeps. Against the 21 verbs English actually names, recall
// is effectively complete. Zero fires outside the denominator, so the guard
// invents nothing the truth set cannot see.
//
// ============================================================================
// THE PROVENANCE FINDING, carried in as instructed. In English, the engine's
// own quoted obligation ("You must contact us on ...") is spared by the
// provenance exemption, which compares byte-identical strings and DOES NOT
// SURVIVE TRANSLATION: a model's Spanish rendering of an engine sentence
// matches nothing in the English exemption set. So these guards cannot lean
// on provenance at all. What replaces it is verified here directly: the
// attribution and subordinate exceptions carry the load, and the zero-fire
// assertion over each 371-sentence reviewed bank is the proof that every
// engine-authored sentence, as translated, passes WITHOUT provenance.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const OPEN = "(?<![\\p{L}\\p{M}\\p{N}])";
const CLOSE = "(?![\\p{L}\\p{M}\\p{N}])";

// REVIEW_REQUIRED throughout, as with Hindi: a reader confirms each stem is
// the form official post uses and names what is missing. Stems cover the 21
// English verbs only, which is the mirror rule made structural.
const CFG = {
  es: {
    modals: ["debe", "debes", "deben", "deberá", "deberán", "debería", "deberías",
      "tiene\\s+que", "tienen\\s+que", "hay\\s+que", "es\\s+necesario", "es\\s+obligatorio",
      "es\\s+preciso", "debe\\s+de"],
    stems: ["pag", "abon", "liquid", "sald", "contact", "comun[íi]c", "llam", "telefone",
      "respond", "contest", "envi", "remit", "proporcion", "facilit", "confirm",
      "asist", "acud", "complet", "rellen", "cumpliment", "devolv", "retorn",
      "present", "entreg", "actu", "desaloj", "abandon", "retir", "elimin",
      "organiz", "concert", "solicit", "tramit", "notific", "regulariz", "efectu",
      "realiz", "hac", "her", "devuelt", "verific"],
    endings: ["ar", "er", "ir", "arse", "erse", "irse", "arlo", "arla", "arlos", "arlas",
      "ado", "ada", "ados", "adas", "ido", "ida", "idos", "idas", "echo", "echa", "o", "a"],
    passive: "(?:ser|estar|haber\\s+sido)?\\s*",
    attribution: ["la\\s+carta\\s+(?:indica|dice|señala|establece)",
      "el\\s+documento\\s+(?:indica|dice|señala|establece)", "según",
      "el\\s+aviso\\s+(?:indica|dice)", "la\\s+notificación\\s+(?:indica|dice)"],
    subordinate: ["que", "si", "menciona", "cuando"]
  },
  fr: {
    modals: ["doit", "doivent", "devez", "devra", "devront", "devrait", "devriez",
      "il\\s+faut", "il\\s+faudra", "est\\s+nécessaire", "est\\s+obligatoire", "est\\s+requis"],
    stems: ["pay", "régl", "apur", "vers", "contact", "appel", "téléphon", "joign",
      "répond", "envoy", "adress", "transmett", "transmis", "fourni", "confirm",
      "assist", "présent", "rend", "rempli", "complét", "retourn", "renvoy",
      "soumett", "soumis", "dépos", "remett", "remis", "agi", "quitt", "libér",
      "retir", "supprim", "organis", "demand", "effectu", "fait", "fair", "vérifi", "rempl"],
    endings: ["er", "ir", "re", "é", "ée", "és", "ées", "u", "ue", "us", "ues",
      "i", "ie", "is", "ies", "it", "ite", "e"],
    passive: "(?:être|avoir\\s+été)?\\s*",
    attribution: ["la\\s+lettre\\s+(?:indique|précise|stipule)",
      "le\\s+document\\s+(?:indique|précise|stipule)", "selon",
      "l['’]avis\\s+(?:indique|précise)", "le\\s+courrier\\s+(?:indique|précise)"],
    subordinate: ["si", "que", "mentionne", "lorsque"]
  },
  pt: {
    modals: ["deve", "deverá", "devem", "deverão", "deveria", "tem\\s+de", "têm\\s+de",
      "tem\\s+que", "têm\\s+que", "terá\\s+de", "é\\s+necessário", "é\\s+obrigatório",
      "é\\s+preciso", "há\\s+que"],
    stems: ["pag", "liquid", "sald", "regulariz", "contact", "contat", "lig", "telefon",
      "respond", "envi", "remet", "fornec", "confirm", "comparec", "preench",
      "complet", "devolv", "retorn", "submet", "entreg", "apresent", "agi",
      "desocup", "remov", "retir", "organiz", "solicit", "requer", "efetu",
      "realiz", "faz", "feit", "verific"],
    endings: ["ar", "er", "ir", "ar-se", "ado", "ada", "ados", "adas", "ido", "ida",
      "idos", "idas", "eito", "eita", "o", "a"],
    passive: "(?:ser|estar|ter\\s+sido)?\\s*",
    attribution: ["a\\s+carta\\s+(?:indica|refere|menciona)",
      "o\\s+documento\\s+(?:indica|refere|estabelece)", "segundo",
      "de\\s+acordo\\s+com", "o\\s+aviso\\s+(?:indica|refere)"],
    subordinate: ["se", "que", "menciona", "quando"]
  }
};

const GAP = 30;

function obligationPattern(lang) {
  const c = CFG[lang];
  const verbs = "(?:" + c.stems.flatMap((s) => c.endings.map((e) => s + e)).join("|") + ")";
  const modal = "(?:" + c.modals.join("|") + ")";
  const notSub = "(?<!" + OPEN + "(?:" + c.subordinate.join("|") + ")" + CLOSE + "[^.!?]{0,24})";
  const notAttrib = "(?<!(?:" + c.attribution.join("|") + ")[\\s\\S]{0,40})";
  return new RegExp(notAttrib + notSub + OPEN + modal + CLOSE + "\\s*" + c.passive +
    "[^.!?]{0," + GAP + "}?" + OPEN + verbs + CLOSE, "iu");
}

const P = Object.fromEntries(Object.keys(CFG).map((l) => [l, obligationPattern(l)]));

// Every sentence below is MEASURED output from the 504-sample sweep, not
// invented, except where a gloss says otherwise.
const MUST_FIRE = {
  es: [
    ["Debe contactar antes del 3 de septiembre de 2026 para evitar acciones de ejecución.",
      "You must contact before 3 September to avoid enforcement."],
    ["El pago de £486.20 debe hacerse antes del 31 de julio de 2026.",
      "mid-sentence modal, Q1"],
    ["La respuesta debe darse dentro de 14 días a partir de esa fecha.",
      "give is OUT of scope; this pins the DARSE miss stays a miss", false],
    ["El formulario de consentimiento debe ser firmado y devuelto.",
      "signed (out of scope) AND returned (in scope): the in-scope half catches it"],
    ["Debe verificar su identidad en 30 días para que su reclamación continúe.",
      "verify, the stem the first draft lacked"]
  ],
  fr: [
    ["Le montant de £214.63 doit être payé avant le 28 mai 2026.",
      "passive with être between modal and participle, Q2"],
    ["Le formulaire de consentement signé doit être retourné avant le 5 juin 2026.",
      "must be returned"],
    ["Vous devez vérifier votre identité dans les 30 jours pour que la demande continue.",
      "verify, the stem the first draft lacked"],
    ["Toutes les sections doivent être remplies en encre noire.",
      "must be completed, plural participle"]
  ],
  pt: [
    ["O pagamento deve ser feito até 28 de maio de 2026.",
      "the short irregular participle the denominator once missed"],
    ["O valor de £298.53 deve ser pago até 4 de junho de 2026.",
      "pago, five letters, invisible to a three-letter-prefix verb shape"],
    ["A identidade deve ser verificada dentro de 30 dias para processar o pedido.",
      "verify"],
    ["O formulário deve ser devolvido até 5 de junho de 2026.",
      "must be returned"]
  ]
};

// NEVER STRICTER THAN ENGLISH. Real measured sentences whose verbs the
// English list does not name; a Romance reader keeps them because an English
// reader would. notify is the recorded English decision, applied here.
const OUT_OF_SCOPE_BY_DESIGN = {
  es: [
    ["Debe informar cualquier cambio en sus circunstancias dentro de un mes.", "notify"],
    ["Debe llegar quince minutos antes.", "arrive"],
    ["Debe llevar la carta y la lista de medicamentos.", "bring"],
    ["El pago debe recibirse dentro de 14 días a partir de esa fecha.", "receive"]
  ],
  fr: [
    ["Il faut informer immédiatement en cas de changement de situation.", "notify"],
    ["Il faut arriver quinze minutes avant l'heure du rendez-vous.", "arrive"],
    ["Le paiement doit être reçu avant le 15 juin 2026.", "receive"],
    ["Le formulaire doit être signé et daté.", "sign and date, neither in the English list"]
  ],
  pt: [
    ["Deve informar o conselho dentro de 21 dias se a sua renda, poupanças ou composição do agregado familiar mudar.", "notify"],
    ["Deve chegar quinze minutos antes da hora marcada.", "arrive"],
    ["O pagamento deve ser recebido dentro de 14 dias dessa data.", "receive"],
    ["A segurança da conta deve ser mantida sempre.", "maintain"]
  ]
};

// Attributed or subordinate: reports of an obligation, exempt as in English.
const EXEMPT = {
  es: [["La carta indica que el pago debe hacerse antes del 31 July 2026.", "attributed"],
       ["Menciona un formulario que hay que rellenar.", "subordinate, the shape that over-fired before the English fix"],
       ["Hay un saldo pendiente de £486.20 que debe pagarse antes del 31 de julio de 2026.",
        "relative clause under que: reports the obligation, as the English whether clause does"]],
  fr: [["Vérifiez sur le document original, ou auprès de l'expéditeur, si vous devez répondre ou envoyer quelque chose.", "subordinate"]],
  pt: [["Verifique no documento original se é necessário responder ou agir.", "subordinate"]]
};

// Derived from CFG, per the i18n standard: no hand-maintained language list.
Object.keys(CFG).forEach((lang) => {
  test(lang + ": measured obligations fire, out-of-scope and exempt do not", async (t) => {
    for (const [line, gloss, expect] of MUST_FIRE[lang]) {
      const want = expect !== false;
      await t.test((want ? "fires: " : "stays a miss: ") + gloss, () => {
        assert.equal(P[lang].test(line), want, line);
      });
    }
    for (const [line, verb] of OUT_OF_SCOPE_BY_DESIGN[lang]) {
      await t.test("never stricter than English: " + verb, () => {
        assert.equal(P[lang].test(line), false,
          "the " + lang + " guard is stricter than the English one: " + line);
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
      // The English provenance exemption compares byte-identical strings and
      // cannot spare a translation. This is what replaces it: every sentence
      // the engine can author, in this language's reviewed rendering, passes
      // the guard on its own merits, with no exemption set at all.
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
    assert.equal(CFG.es.stems.length, 41);
    assert.equal(CFG.fr.stems.length, 39);
    assert.equal(CFG.pt.stems.length, 33);
    assert.equal(CFG.es.modals.length, 14);
    assert.equal(CFG.fr.modals.length, 12);
    assert.equal(CFG.pt.modals.length, 14);
  });
});
