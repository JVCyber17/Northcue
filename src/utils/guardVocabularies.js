// THE NINE COMMAND-FAMILY GUARD VOCABULARIES, compiled for the stripper.
//
// WIRED BY THE FOUNDER'S DECISION OF 6 August 2026, recorded in
// ENGINE_STATE.md: the freeze rule says the product that was verified is
// the product that launches, verifiers are confirming these vocabularies'
// judgement calls, and launching them unwired would make the verified
// guards and the launched guards different things. Release-definition, not
// scope.
//
// EVERY PATTERN HERE IS A TRANSCRIPTION of the committed, measured builder
// in its vocabulary test file (tests/*GuardVocabulary.test.js), which
// remains the measured record: the sweep tables, the denominators, the
// pinned sentences and the REVIEW_REQUIRED tags live there. The wiring
// test (tests/guardWiring.test.js) holds this module to those files'
// pinned sentences per language, so a transcription drift is a red build.
//
// NOTHING HERE RUNS BEFORE LAUNCH: the caller consults launchedLanguage()
// (the launch.open flag) before asking for a pattern.

"use strict";

const OPEN = "(?<![\\p{L}\\p{M}\\p{N}])";
const CLOSE = "(?![\\p{L}\\p{M}\\p{N}])";
const GAP = 30;

// ---------------------------------------------------------------- romance
const ROMANCE = {
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

function romancePattern(c) {
  const verbs = "(?:" + c.stems.flatMap((s) => c.endings.map((e) => s + e)).join("|") + ")";
  const modal = "(?:" + c.modals.join("|") + ")";
  const notSub = "(?<!" + OPEN + "(?:" + c.subordinate.join("|") + ")" + CLOSE + "[^.!?]{0,24})";
  const notAttrib = "(?<!(?:" + c.attribution.join("|") + ")[\\s\\S]{0,40})";
  return new RegExp(notAttrib + notSub + OPEN + modal + CLOSE + "\\s*" + c.passive +
    "[^.!?]{0," + GAP + "}?" + OPEN + verbs + CLOSE, "iu");
}

// --------------------------------------------------------------- romanian
function romanianPattern() {
  const modals = ["trebuie", "va\\s+trebui", "ar\\s+trebui", "este\\s+necesar",
    "este\\s+obligatoriu", "se\\s+impune", "sunte[țt]i\\s+obliga[țt]"];
  const stems = ["pl[ăa]t", "achit", "contact", "sun", "telefon", "apel", "r[ăa]spund",
    "trimi[țts]", "trimis", "furniz", "confirm", "verific", "particip", "prezent",
    "prezint", "complet", "return", "înapoi", "depun", "depus", "ac[țt]ion",
    "eliber", "p[ăa]r[ăa]s", "elimin", "aranj", "program", "solicit", "aplic",
    "efectu", "f[ăa]c", "fac", "pred"];
  const endings = ["a", "e", "i", "eze", "ez", "easc[ăa]", "esc", "a[țt]i", "e[țt]i",
    "[ăa]m", "at", "at[ăa]", "ate", "it", "it[ăa]", "ite", "ut", "ut[ăa]",
    "ute", "u[țt]i", "s[ăa]", "us[ăa]", "us"];
  const subj = "(?:s[ăa]\\s+(?:se\\s+|v[ăa]\\s+|le\\s+|o\\s+|[îi]l\\s+|ne\\s+)?)?";
  const attribution = ["scrisoarea\\s+(?:indic[ăa]|precizeaz[ăa]|men[țt]ioneaz[ăa]|spune)",
    "documentul\\s+(?:indic[ăa]|prevede|men[țt]ioneaz[ăa]|spune)", "conform",
    "potrivit", "avizul\\s+(?:indic[ăa]|precizeaz[ăa])",
    "notificarea\\s+(?:indic[ăa]|precizeaz[ăa])"];
  const subordinate = ["dac[ăa]", "c[ăa]", "men[țt]ioneaz[ăa]", "c[âa]nd", "care"];
  const verbs = "(?:" + stems.flatMap((s) => endings.map((e) => s + e)).join("|") + ")";
  const modal = "(?:" + modals.join("|") + ")";
  const notSub = "(?<!" + OPEN + "(?:" + subordinate.join("|") + ")" + CLOSE + "[^.!?]{0,24})";
  const notAttrib = "(?<!(?:" + attribution.join("|") + ")[\\s\\S]{0,40})";
  return new RegExp(notAttrib + notSub + OPEN + modal + CLOSE + "\\s*" + subj +
    "[^.!?]{0," + GAP + "}?" + OPEN + verbs + CLOSE, "iu");
}

// ----------------------------------------------------------------- polish
function polishPattern() {
  const modals = ["musi", "musz[ąa]", "musisz", "musicie", "powinien", "powinna",
    "powinno", "powinny", "powinni", "nale[żz]y", "trzeba", "jest\\s+wymagane",
    "ma\\s+obowi[ąa]zek", "s[ąa]\\s+zobowi[ąa]zan[ie]"];
  const stems = ["zap[łl]a[ct]", "op[łl]a[ct]", "p[łl]a[ct]", "uregulow", "ureguluj",
    "sp[łl]a[ct]", "skontaktow", "skontaktuj", "kontakt", "zadzwon", "dzwon",
    "telefon", "odpowiedz", "odpowiada", "wys[łl]", "wy[śs]l", "przes[łl]",
    "prze[śs]l", "dostarcz", "przekaz", "przeka[żz]", "poda", "potwierdz",
    "zweryfikow", "zweryfikuj", "weryfik", "staw", "wype[łl]n", "uzupe[łl]n",
    "zwr[óo][ct]", "zwraca", "odes[łl]", "ode[śs]l", "z[łl]o[żz]", "z[łl][óo][żz]",
    "sk[łl]ada", "dzia[łl]a", "podj", "podejm", "opu[śs][ćc]", "opuszcz", "usun",
    "usuwa", "um[óo]w", "umawia", "zorganizow", "dokon", "wykon"];
  const endings = ["a[ćc]", "i[ćc]", "y[ćc]", "[ąa][ćc]", "e[ćc]", "[ćc]",
    "ony", "ona", "one", "eni", "onych", "any", "ana", "ane", "ani", "anych",
    "ty", "ta", "te", "ci", "ie", "iona", "iony", "ione",
    "a[ćc]\\s+si[ęe]", "i[ćc]\\s+si[ęe]"];
  const passive = "(?:by[ćc]|zosta[ćc]|zosta[łl][ay]?)?\\s*";
  const lightNouns = ["p[łl]atno[śs][ćc]", "zap[łl]ata", "wp[łl]ata", "odpowied[źz]",
    "potwierdzenie", "zwrot", "kontakt", "wysy[łl]ka"];
  const lightVerb = "nast[ąa]pi[ćc]?";
  const attribution = ["pismo\\s+(?:m[óo]wi|wskazuje|informuje|stanowi)",
    "list\\s+(?:m[óo]wi|wskazuje|informuje|stanowi)",
    "dokument\\s+(?:m[óo]wi|wskazuje|informuje|stanowi)",
    "zgodnie\\s+z", "wed[łl]ug", "zawiadomienie\\s+(?:m[óo]wi|wskazuje)"];
  const subordinate = ["czy", "[żz]e", "je[śs]li", "je[żz]eli", "gdy", "kt[óo]r[aey]", "wspomina"];
  const verbs = "(?:" + stems.flatMap((s) => endings.map((e) => s + e)).join("|") + ")";
  const modal = "(?:" + modals.join("|") + ")";
  const notSub = "(?<!" + OPEN + "(?:" + subordinate.join("|") + ")" + CLOSE + "[^.!?]{0,24})";
  const notAttrib = "(?<!(?:" + attribution.join("|") + ")[\\s\\S]{0,40})";
  const guardedModal = "(?<!" + OPEN + "mo[żz]e\\s)(?<!" + OPEN + "nie\\s)" +
    OPEN + modal + CLOSE;
  const stemBranch = guardedModal + "\\s*" + passive +
    "[^.!?]{0," + GAP + "}?" + OPEN + verbs + CLOSE;
  const lightBranch = OPEN + "(?:" + lightNouns.join("|") + ")" + CLOSE +
    "[^.!?]{0," + GAP + "}?" + guardedModal + "\\s*" + lightVerb + CLOSE;
  return new RegExp(notAttrib + notSub + "(?:" + stemBranch + "|" + lightBranch + ")", "iu");
}

// ------------------------------------------------------------------ hindi
const HI = {
  D: "[\\u0900-\\u097F]",
  MATRA: "[\\u093E-\\u094C\\u0962\\u0963]?",
  infEndings: ["ना", "नी", "ने"],
  aux: ["होगा", "होगी", "होंगे", "पड़ेगा", "पड़ेगी", "पड़ेंगे", "चाहिए",
    "आवश्यक है", "ज़रूरी है", "जरूरी है"],
  nouns: ["भुगतान", "अदा", "संपर्क", "कॉल", "फ़ोन", "फोन", "जवाब", "उत्तर",
    "प्रदान", "पुष्टि", "सत्यापित", "उपस्थित", "हाज़िर", "पूरा", "वापस", "जमा",
    "खाली", "आवेदन", "व्यवस्था", "साफ", "कार्रवाई", "कदम"],
  light: "(?:कर|द|हो|उठा|ले)",
  simple: ["भेज", "चुका", "लौटा", "भर", "हटा", "निपटा"],
  attribution: ["बताता\\s*है", "बताती\\s*है", "कहता\\s*है", "कहती\\s*है",
    "बताया\\s*गया", "कहा\\s*गया", "के\\s*अनुसार", "उल्लेख\\s*है", "लिखा\\s*है"],
  sensitive: ["खाता\\s*विवरण", "खाते\\s*का\\s*विवरण", "बैंक\\s*विवरण", "बैंक\\s*खाता",
    "कार्ड\\s*(?:नंबर|नम्बर|विवरण)", "पिन", "पासवर्ड", "गुप्त\\s*कोड",
    "सॉर्ट\\s*कोड", "राष्ट्रीय\\s*बीमा", "व्यक्तिगत\\s*विवरण", "निजी\\s*जानकारी",
    "account\\s+details?", "bank\\s+details?", "sort\\s+code", "PIN", "password"],
  askVerbs: ["बताएं", "बताइए", "बताना", "दें", "दीजिए", "देना",
    "भेजें", "भेजिए", "भेजना", "साझा\\s*करें", "साझा\\s*करना",
    "दर्ज\\s*करें", "दर्ज\\s*करना", "पुष्टि\\s*करें", "पुष्टि\\s*करना",
    "प्रदान\\s*करें", "प्रदान\\s*करना", "डालें", "भरें"],
  negations: ["न", "नहीं", "मत", "कभी\\s*नहीं"]
};

function hindiPattern() {
  const notAttributed = "(?<!(?:" + HI.attribution.join("|") + ")\\s*(?:कि)?[\\s\\S]{0,40})";
  const compound = "(?:" + HI.nouns.join("|") + ")" + "[^।?!]{0,30}?\\s*" + HI.light;
  const simple = "(?:" + HI.simple.join("|") + ")";
  const inf = "(?:" + HI.infEndings.join("|") + ")";
  const aux = "(?:" + HI.aux.join("|") + ")";
  return new RegExp(notAttributed + "(?:" + compound + "|" + simple + ")" +
    HI.MATRA + inf + "\\s+(?:" + HI.D + "+\\s+){0,2}?" + aux, "u");
}

function hindiCredentialPattern() {
  const term = "(?:" + HI.sensitive.join("|") + ")";
  const verb = "(?:" + HI.askVerbs.join("|") + ")";
  const neg = "(?:" + HI.negations.join("|") + ")";
  return new RegExp(term +
    "(?![\\s\\S]{0,30}?" + neg + "\\s*[\\u0900-\\u097F]{0,12}?" + verb + ")" +
    "[\\s\\S]{0,40}?" + verb);
}

// ---------------------------------------------------------------- bengali
function bengaliPattern() {
  const B = "[\\u0980-\\u09FF]";
  const MATRA = "[\\u09BE-\\u09CC\\u09D7]?";
  const auxInf = ["হবে"];
  const auxVn = ["উচিত", "আবশ্যক", "প্রয়োজন", "দরকার", "বাধ্যতামূলক"];
  const inf = ["তে"];
  const vnoun = ["ওয়া", "নো", "া"];
  const nouns = ["পরিশোধ", "অর্থপ্রদান", "পেমেন্ট", "প্রদান", "যোগাযোগ", "কল", "ফোন",
    "টেলিফোন", "উত্তর", "জবাব", "জমা", "পূরণ", "ফেরত", "নিশ্চিত",
    "সরবরাহ", "উপস্থিত", "ব্যবস্থা", "আবেদন", "খালি", "সম্পূর্ণ", "সমাধান",
    "তথ্য", "কিস্তি"];
  const light = ["কর", "দি", "দে", "হ", "নি", "নে"];
  const simple = ["পাঠা", "ডাক", "ফেরা", "ভর", "মেটা", "চুকা"];
  const attribution = ["চিঠি(?:তে|টি)?\\s*(?:বল|জানা|উল্লেখ)", "নথি(?:তে|টি)?\\s*(?:বল|উল্লেখ)",
    "ডকুমেন্ট(?:ে|টি|টিতে)?\\s*(?:বল|উল্লেখ)", "অনুযায়ী", "অনুসারে",
    "বলা\\s*হয়েছে", "বলছে"];
  const subordinate = ["যদি", "কিনা", "কি\\s*না"];
  const notAttributed = "(?<!(?:" + attribution.join("|") + ")[\\s\\S]{0,60})";
  const notSub = "(?<!(?:" + subordinate.join("|") + ")[^।?!]{0,24})";
  const compound = "(?:" + nouns.join("|") + ")" + "[^।?!]{0,30}?\\s*" +
    "(?:" + light.join("|") + ")";
  const stem = "(?:" + compound + "|" + "(?:" + simple.join("|") + ")" + ")" + MATRA;
  const keepAfter = "(?!\\s*(?:না(?!\\s*হলে)|নেই|ছিল|কি\\s*না|কিনা|হতে\\s*পারে))";
  const infBranch = stem + "(?:" + inf.join("|") + ")" +
    "\\s+(?:" + B + "+\\s+){0,2}?" + "(?:" + auxInf.join("|") + ")" + keepAfter;
  const vnBranch = stem + "(?:" + vnoun.join("|") + ")" + "র?" +
    "\\s+(?:" + B + "+\\s+){0,2}?" + "(?:" + auxVn.join("|") + ")" + keepAfter;
  return new RegExp(notAttributed + notSub + "(?:" + infBranch + "|" + vnBranch + ")", "u");
}

// --------------------------------------------------------------- gujarati
function gujaratiPattern() {
  const G = "[\\u0A80-\\u0AFF]";
  const MATRA = "[\\u0ABE-\\u0ACC\\u0AD0]?";
  const aux = ["પડશે", "જોઈએ", "જોઇએ", "રહેશે", "જરૂરી\\s*છે", "જરૂર\\s*છે",
    "આવશ્યક\\s*છે", "ફરજિયાત\\s*છે", "જરૂરિયાત\\s*છે"];
  const inf = ["વાનું", "વાની", "વાના", "વું", "વુ", "વી", "વા", "વો", "ેલી", "ેલું", "ેલા"];
  const nouns = ["ચુકવણી", "ચૂકવણી", "ચુકવવા", "સંપર્ક", "કૉલ", "કોલ", "ફોન",
    "જવાબ", "ઉત્તર", "પ્રદાન", "પુષ્ટિ", "હાજર", "પૂર્ણ", "પરત", "સબમિટ",
    "જમા", "ખાલી", "દૂર", "વ્યવસ્થા", "અરજી", "માહિતી", "હપ્તો", "હપ્તા", "સાફ"];
  const light = ["કર", "આપ", "થ", "હ", "લ", "રાખ", "પાડ", "મોકલ", "ભર", "ચૂકવ", "ચુકવ"];
  const simple = ["મોકલ", "ચૂકવ", "ચુકવ", "ભર", "પરત", "પહોંચાડ"];
  const attribution = ["પત્ર(?:માં)?\\s*(?:કહે|જણાવ|લખ|ઉલ્લેખ)",
    "દસ્તાવેજ(?:માં)?\\s*(?:કહે|જણાવ|ઉલ્લેખ)", "મુજબ", "અનુસાર",
    "કહેવામાં\\s*આવ્યું", "જણાવવામાં\\s*આવ્યું", "કહે\\s*છે", "જણાવે\\s*છે"];
  const subordinate = ["જો", "કે\\s*કેમ", "કે\\s*નહીં", "કે\\s*નહિ"];
  const notAttributed = "(?<!(?:" + attribution.join("|") + ")[\\s\\S]{0,60})";
  const notSub = "(?<!(?:" + subordinate.join("|") + ")[^।?!.]{0,24})";
  const compound = "(?:" + nouns.join("|") + ")" + "[^।?!.]{0,30}?\\s*" +
    "(?:" + light.join("|") + ")";
  const stem = "(?:" + compound + "|" + "(?:" + simple.join("|") + ")" + ")" + MATRA;
  const keepAfter = "(?!\\s*(?:નથી|નહીં|નહિ|પડી\\s*શકે|હત|કે\\s*કેમ|કે\\s*નહીં|કે\\s*નહિ))";
  return new RegExp(notAttributed + notSub + stem + "(?:" + inf.join("|") + ")" +
    "\\s+(?:" + G + "+\\s+){0,2}?" + "(?:" + aux.join("|") + ")" + keepAfter, "u");
}

// ---------------------------------------------------------------- panjabi
function panjabiPattern() {
  const K = "[\\u0A00-\\u0A7F]";
  const MATRA = "[\\u0A3E-\\u0A4C\\u0A70\\u0A71]?";
  const aux = ["ਹੋਵੇਗਾ", "ਹੋਵੇਗੀ", "ਹੋਣਗੇ", "ਹੋਣਗੀਆਂ", "ਪਵੇਗਾ", "ਪਵੇਗੀ", "ਪੈਣਗੇ",
    "ਚਾਹੀਦਾ", "ਚਾਹੀਦੀ", "ਚਾਹੀਦੇ", "ਦੀ\\s*ਲੋੜ\\s*ਹੈ", "ਦੀ\\s*ਜ਼ਰੂਰਤ\\s*ਹੈ",
    "ਜ਼ਰੂਰੀ\\s*ਹੈ", "ਜਰੂਰੀ\\s*ਹੈ", "ਲਾਜ਼ਮੀ\\s*ਹੈ", "ਲਾਜ਼ਮੀ\\s*ਹਨ"];
  const inf = ["ਨਾ", "ਨੀ", "ਨੇ", "ਣਾ", "ਣੀ", "ਣੇ", "ਨ", "ਣ", "ੇ"];
  const nouns = ["ਭੁਗਤਾਨ", "ਅਦਾਇਗੀ", "ਅਦਾ", "ਸੰਪਰਕ", "ਕਾਲ", "ਫ਼ੋਨ", "ਫੋਨ",
    "ਜਵਾਬ", "ਉੱਤਰ", "ਜਮ੍ਹਾਂ", "ਜਮ੍ਹਾ", "ਜਮਾ", "ਪੂਰਾ", "ਪੂਰੀ", "ਵਾਪਸ", "ਪੁਸ਼ਟੀ",
    "ਪ੍ਰਦਾਨ", "ਹਾਜ਼ਰ", "ਖਾਲੀ", "ਪ੍ਰਬੰਧ", "ਅਰਜ਼ੀ", "ਕਿਸ਼ਤ", "ਜਾਣਕਾਰੀ", "ਸਾਫ਼", "ਸਾਫ"];
  const light = ["ਕਰ", "ਦੇ", "ਦਿ", "ਹੋ", "ਲੈ", "ਭਰ", "ਭੇਜ", "ਚੁਕਾ", "ਮੋੜ"];
  const simple = ["ਭੇਜ", "ਚੁਕਾ", "ਭਰ", "ਮੋੜ", "ਪਹੁੰਚਾ", "ਪਰਤਾ"];
  const attribution = ["ਪੱਤਰ(?:\\s*ਵਿੱਚ)?\\s*(?:ਕਹਿ|ਦੱਸ|ਲਿਖ|ਜ਼ਿਕਰ)",
    "ਚਿੱਠੀ(?:\\s*ਵਿੱਚ)?\\s*(?:ਕਹਿ|ਦੱਸ|ਲਿਖ)",
    "ਦਸਤਾਵੇਜ਼(?:\\s*ਵਿੱਚ)?\\s*(?:ਕਹਿ|ਦੱਸ|ਜ਼ਿਕਰ)", "ਅਨੁਸਾਰ", "ਮੁਤਾਬਕ",
    "ਕਿਹਾ\\s*(?:ਗਿਆ|ਜਾਂਦਾ)\\s*ਹੈ", "ਦੱਸਿਆ\\s*ਗਿਆ\\s*ਹੈ", "ਕਹਿੰਦਾ\\s*ਹੈ", "ਦੱਸਦਾ\\s*ਹੈ"];
  const subordinate = ["ਜੇਕਰ", "ਜੇ", "ਕਿ"];
  const notAttributed = "(?<!(?:" + attribution.join("|") + ")[\\s\\S]{0,60})";
  const notSub = "(?<!(?:" + subordinate.join("|") + ")[^।?!.]{0,24})";
  const gap = "(?:(?!ਅਨੁਸਾਰ|ਮੁਤਾਬਕ)[^।?!.]){0,30}?";
  const compound = "(?:" + nouns.join("|") + ")" + gap + "\\s*" +
    "(?:" + light.join("|") + ")";
  const stem = "(?:" + compound + "|" + "(?:" + simple.join("|") + ")" + ")" + MATRA;
  const keepAfter = "(?!\\s*(?:ਨਹੀਂ|ਸਕਦ|ਸੀ|ਜਾਂ\\s*ਨਹੀਂ))";
  return new RegExp(notAttributed + notSub + stem + "(?:" + inf.join("|") + ")" +
    "\\s+(?:" + K + "+\\s+){0,2}?" + "(?:" + aux.join("|") + ")" + keepAfter, "u");
}

// ------------------------------------------------------------- the lookup
// Compiled once at require time; the caller gates on the launch flag.
const OBLIGATION = {
  es: romancePattern(ROMANCE.es),
  fr: romancePattern(ROMANCE.fr),
  pt: romancePattern(ROMANCE.pt),
  ro: romanianPattern(),
  pl: polishPattern(),
  hi: hindiPattern(),
  bn: bengaliPattern(),
  gu: gujaratiPattern(),
  pa: panjabiPattern()
};

const CREDENTIAL = {
  hi: hindiCredentialPattern()
};

function obligationPatternFor(language) {
  return OBLIGATION[language] || null;
}

function credentialPatternFor(language) {
  return CREDENTIAL[language] || null;
}

module.exports = { obligationPatternFor, credentialPatternFor };
