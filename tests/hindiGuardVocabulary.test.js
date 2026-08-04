// HINDI GUARD VOCABULARY, PROTOTYPE. Not wired into the stripper.
//
// This is the true-positive half of the Hindi guards, the half that no longer
// needs corpus: the measurement-only override produced real Hindi model output
// on 3 August 2026, so there are actual sentences to test against instead of
// invented ones. The false-positive half still needs documents and is NOT
// attempted here.
//
// NOTHING HERE IS LIVE. The patterns are built and tested in this file only.
// Wiring them into sanitizeAiTextField would change the stripper for a language
// the gate still refuses, which is a change with no reader and no way to be
// sure of it. When the gate question is taken up, these move.
//
// ============================================================================
// THE DESIGN DECISION, and it is the one that matters.
//
// The English command family fires on "you + modal + verb". It does NOT fire on
// a bare imperative: "Contact the sender using trusted contact details." is a
// sentence the ENGINE writes and the guard leaves alone. Only "You must contact
// them" is a command in Northcue's own voice.
//
// Hindi marks that distinction with a different mechanism. The obligation is an
// infinitive plus a sentence-final auxiliary:
//
//     भेजनी होगी        will have to send
//     करना होगा         will have to do
//     देना आवश्यक है     it is necessary to give
//
// while a bare imperative is a verb ending, ...ें or ...इए, and that is what
// Northcue's own translated advice uses: "मूल दस्तावेज में विवरण जांचें।" is
// "Check the original document."
//
// SO THE HINDI GUARD CATCHES THE OBLIGATION AND LEAVES THE IMPERATIVE. A guard
// catching every Hindi imperative would strip the app's own advice on every
// card. This mirrors the English guard rather than inventing a stricter one,
// which is why the real model sentence "24 जून 2026 तक अपनी आय की जानकारी भेजें।"
// is in the must-NOT-fire list: its English equivalent, "Send your income
// information by 24 June 2026.", does not fire either.
//
// ============================================================================
// WHAT A HINDI READER MUST VERIFY, AND WHAT THEY DO NOT HAVE TO AUTHOR.
//
// Every form is generated MECHANICALLY from a stem list and a suffix table, so
// nobody needed the morphology to produce it. A reader confirms rather than
// writes. Entries needing that are tagged REVIEW_REQUIRED.

const assert = require("node:assert/strict");
const test = require("node:test");

// ---------------------------------------------------------------- generation

// The infinitive agrees in gender and number with its object, and the auxiliary
// agrees too, so the forms are a cross product rather than a list.
const INFINITIVE_ENDINGS = ["ना", "नी", "ने"];

// REVIEW_REQUIRED: is this the complete set of auxiliaries carrying obligation
// in official Hindi? "अनिवार्य है" and "अपेक्षित है" were considered and left out
// as register-formal. A reader should say whether official post uses them.
const OBLIGATION_AUXILIARIES = [
  "होगा", "होगी", "होंगे",
  "पड़ेगा", "पड़ेगी", "पड़ेंगे",
  "चाहिए",
  "आवश्यक है", "ज़रूरी है", "जरूरी है"      // with and without the nuqta
];

// THE VERB RESTRICTION, AND IT IS NOT OPTIONAL.
//
// The English command family names 21 verbs, not every verb. The first draft of
// this file dropped that and matched ANY infinitive plus an auxiliary. Measured
// against the 371-sentence reviewed Hindi bank, that over-fired FOUR times, and
// the worst is not subtle:
//
//   "मुझे क्या जाँचना चाहिए?"                        card 5's own TITLE
//   "...ब्यौरों को जाँचना ज़रूरी है."                  Northcue's own advice
//   "दस्तावेज़ कहता है कि ... ऐसा होगा: {consequence}"  an ATTRIBUTED template
//   "Analytics इवेंट एक JSON ऑब्जेक्ट होना चाहिए."     an error string
//
// A guard that strips a card title is not a guard. With the verb list restored
// the same measurement is zero of 371.
//
// REVIEW_REQUIRED throughout. A reader must confirm each stem is the form
// official Hindi uses and name any missing one, because a gap here is a command
// that passes silently.
const HINDI_COMMAND_STEMS = [
  "भुगतान\\s*कर", "चुका", "अदा\\s*कर",           // pay, settle, clear
  "संपर्क\\s*कर",                                  // contact
  "कॉल\\s*कर", "फ़ोन\\s*कर", "फोन\\s*कर",          // call, ring, phone
  "जवाब\\s*द", "उत्तर\\s*द",                       // reply, respond
  "भेज",                                           // send
  "प्रदान\\s*कर",                                  // provide
  "पुष्टि\\s*कर",                                  // confirm
  "उपस्थित\\s*हो", "हाज़िर\\s*हो",                  // attend
  "पूरा\\s*कर", "भर",                              // complete
  "लौटा", "वापस\\s*कर",                            // return
  "जमा\\s*कर",                                     // submit
  "सूचित\\s*कर", "सूचना\\s*द",                     // notify, inform
  "खाली\\s*कर",                                    // vacate
  "आवेदन\\s*कर",                                   // apply
  "व्यवस्था\\s*कर"                                 // arrange
];

// A stem may take a vowel sign before the infinitive: "द" becomes "देना", not
// "दना". Without this the stem list misses "सूचना देना आवश्यक है", which is a
// real measured obligation. Found by the measurement, not by inspection.
const MATRA = "[\\u093E-\\u094C\\u0962\\u0963]?";

function obligationPattern() {
  const stem = "(?:" + HINDI_COMMAND_STEMS.join("|") + ")";
  const inf = "(?:" + INFINITIVE_ENDINGS.join("|") + ")";
  const aux = "(?:" + OBLIGATION_AUXILIARIES.join("|") + ")";
  return new RegExp(stem + MATRA + inf + "\\s+" +
    "(?:[\\u0900-\\u097F]+\\s+){0,2}?" + aux);
}

// REVIEW_REQUIRED: the credential terms. Latin-script forms sit alongside the
// Hindi because the measured output mixes scripts, writing "Department for Work
// and Pensions" in Latin inside a Hindi sentence.
const HINDI_SENSITIVE_TERMS = [
  "खाता\\s*विवरण", "खाते\\s*का\\s*विवरण", "बैंक\\s*विवरण", "बैंक\\s*खाता",
  "कार्ड\\s*(?:नंबर|नम्बर|विवरण)", "पिन", "पासवर्ड", "गुप्त\\s*कोड",
  "सॉर्ट\\s*कोड", "राष्ट्रीय\\s*बीमा", "व्यक्तिगत\\s*विवरण", "निजी\\s*जानकारी",
  "account\\s+details?", "bank\\s+details?", "sort\\s+code", "PIN", "password"
];

// Both imperative and infinitive forms, because unlike the command family a
// credential ask is dangerous in either: "अपना पिन बताएं" is a phishing
// instruction whether or not an auxiliary follows.
const HINDI_ASK_VERBS = [
  "बताएं", "बताइए", "बताना", "दें", "दीजिए", "देना",
  "भेजें", "भेजिए", "भेजना", "साझा\\s*करें", "साझा\\s*करना",
  "दर्ज\\s*करें", "दर्ज\\s*करना", "पुष्टि\\s*करें", "पुष्टि\\s*करना",
  "प्रदान\\s*करें", "प्रदान\\s*करना", "डालें", "भरें"
];

// REVIEW_REQUIRED: is the negation set complete? A missing form means the guard
// strips genuine anti-fraud advice, which is the English negation exception's
// whole reason for existing.
const HINDI_NEGATIONS = ["न", "नहीं", "मत", "कभी\\s*नहीं"];

function credentialPattern() {
  const term = "(?:" + HINDI_SENSITIVE_TERMS.join("|") + ")";
  const verb = "(?:" + HINDI_ASK_VERBS.join("|") + ")";
  const neg = "(?:" + HINDI_NEGATIONS.join("|") + ")";
  // Object before verb, which is Hindi's order. The negation exception looks
  // BETWEEN them, because that is where Hindi puts it: "पिन किसी को न बताएं".
  return new RegExp(term +
    "(?![\\s\\S]{0,30}?" + neg + "\\s*[\\u0900-\\u097F]{0,12}?" + verb + ")" +
    "[\\s\\S]{0,40}?" + verb);
}

const OBLIGATION = obligationPattern();
const CREDENTIAL = credentialPattern();

// ------------------------------------------------------- the real sentences
//
// Every one came out of the model on 3 August 2026 via
// scripts/reader-output/language-probe.js on spec_hindi_dwp_universal_credit.
// Not invented, which is the whole reason this file could be written at all.
const MEASURED_OBLIGATIONS = [
  ["आपको 24 जून 2026 तक अपनी आय की जानकारी भेजनी होगी।",
    "You must send your income information by 24 June 2026."],
  ["अपने खाते की आय की जानकारी 24 जून 2026 तक भेजना आवश्यक है।",
    "It is necessary to send your account income information by 24 June 2026."],
  ["अपने खाते में 24 जून 2026 तक आय की जानकारी भेजना आवश्यक है।",
    "It is necessary to send income information to your account by 24 June 2026."],
  ["परिस्थिति में बदलाव होने पर तुरंत सूचित करना होगा।",
    "You must notify immediately if circumstances change."],
  ["परिस्थिति में बदलाव की सूचना देना आवश्यक है।",
    "It is necessary to give notice of a change in circumstances."]
];

// Also measured, and they must NOT fire, because their English equivalents do
// not. Three are Northcue's own translated advice.
const MEASURED_IMPERATIVES = [
  ["24 जून 2026 तक अपनी आय की जानकारी भेजें।",
    "Send your income information by 24 June 2026."],
  ["परिस्थिति में कोई बदलाव हो तो तुरंत सूचित करें।",
    "Notify immediately if anything changes."],
  ["मूल दस्तावेज में विवरण जांचें।",
    "Check the details in the original document.   NORTHCUE'S OWN ADVICE"],
  ["संदेह होने पर Department for Work and Pensions से संपर्क करें।",
    "Contact the DWP if in doubt.   NORTHCUE'S OWN ADVICE"],
  ["मूल दस्तावेज़ या प्रेषक से पुष्टि करें।",
    "Confirm with the original document or the sender.   NORTHCUE'S OWN ADVICE"]
];

const MEASURED_PLAIN = [
  ["यह यूनिवर्सल क्रेडिट पत्र है, मासिक भुगतान £412.66 है।", "This is a Universal Credit letter, monthly payment £412.66."],
  ["आपका मासिक भुगतान £412.66 है।", "Your monthly payment is £412.66."],
  ["अगला भुगतान 18 जून 2026 को है।", "The next payment is on 18 June 2026."],
  ["यदि जानकारी समय पर नहीं भेजी गई, तो भुगतान रोका जा सकता है।",
    "If the information is not sent on time, payment may be stopped.   a CONSEQUENCE"],
  ["जानकारी भेजने की अंतिम तिथि 24 जून 2026 है।", "The deadline for sending information is 24 June 2026."]
];

// ------------------------------------------------------------------- tests

test("the Hindi obligation pattern fires on every measured obligation", async (t) => {
  for (const [line, gloss] of MEASURED_OBLIGATIONS) {
    await t.test(gloss, () => assert.ok(OBLIGATION.test(line), "did not fire on: " + line));
  }
});

test("and leaves the bare imperative alone, as the English guard does", async (t) => {
  for (const [line, gloss] of MEASURED_IMPERATIVES) {
    await t.test(gloss, () => assert.equal(OBLIGATION.test(line), false, "over-fired on: " + line));
  }
});

test("and leaves plain statements alone", async (t) => {
  for (const [line, gloss] of MEASURED_PLAIN) {
    await t.test(gloss, () => assert.equal(OBLIGATION.test(line), false, "over-fired on: " + line));
  }
});

test("it does not fire on the reviewed Hindi bank", async (t) => {
  // The over-firing measurement, run in the test rather than reported in a
  // comment, so it cannot go stale. 371 sentences a native reviewer has already
  // approved as safe. Any fire here is the guard eating Northcue's own words.
  await t.test("zero of 371", () => {
    global.window = global;
    require("../public/i18n/templates-hi.js");
    const B = global.NORTHCUE_TEMPLATES_HI;
    const bank = Object.values(B.exact || {})
      .concat(Object.values(B.patterns || {}))
      .filter((s) => typeof s === "string");
    assert.ok(bank.length > 300, "premise: the Hindi bank loaded, got " + bank.length);
    const fired = bank.filter((s) => OBLIGATION.test(s));
    assert.deepEqual(fired, [], "the guard fires on Northcue's own Hindi");
  });
});

test("the Hindi credential pattern, on constructed asks", async (t) => {
  // NO MEASURED EXAMPLES EXIST. The one Hindi document is a DWP income-details
  // letter that never asks for a credential, so unlike the obligation set every
  // sentence here is constructed. That is the corpus gap, not a pattern gap:
  // these prove the pattern CAN fire, not that it fires on what a model writes.
  const ASKS = [
    ["कृपया अपना खाता विवरण भेजें।", "Please send your account details."],
    ["अपना पिन बताएं।", "Tell us your PIN."],
    ["अपने बैंक विवरण की पुष्टि करें।", "Confirm your bank details."],
    ["जारी रखने के लिए अपना पासवर्ड दर्ज करें।", "To continue, enter your password."],
    ["वेबसाइट पर अपना सॉर्ट कोड डालें।", "Enter your sort code on the website."],
    ["अपना account details साझा करें।", "Share your account details.   mixed script, a measured shape"]
  ];
  for (const [line, gloss] of ASKS) {
    await t.test(gloss, () => assert.ok(CREDENTIAL.test(line), "did not fire on: " + line));
  }
});

test("the credential pattern leaves the inverse advice alone", async (t) => {
  // The Hindi mirror of "Do not share your password". If this fails the guard
  // deletes the only real safety guidance on the card.
  const SAFE = [
    ["अपना पिन किसी को न बताएं।", "Do not tell anyone your PIN."],
    ["अपना पासवर्ड किसी के साथ साझा न करें।", "Do not share your password with anyone."],
    ["बैंक विवरण फ़ोन पर कभी नहीं बताएं।", "Never give bank details over the phone."]
  ];
  for (const [line, gloss] of SAFE) {
    await t.test(gloss, () => assert.equal(CREDENTIAL.test(line), false, "over-fired on: " + line));
  }
});

test("the generated forms are a cross product, so none was hand-missed", async (t) => {
  await t.test("every stem times every ending times every auxiliary matches", () => {
    const missing = [];
    // One representative stem with no matra requirement, so the cross product
    // tests the suffix table rather than the stem list.
    INFINITIVE_ENDINGS.forEach((inf) => {
      OBLIGATION_AUXILIARIES.forEach((aux) => {
        const line = "यह भेज" + inf + " " + aux + "।";
        if (!OBLIGATION.test(line)) missing.push(inf + " + " + aux);
      });
    });
    assert.deepEqual(missing, [], "generated forms the pattern misses: " + missing.join(", "));
  });

  await t.test("the counts a reviewer is being asked to check", () => {
    // Asserted rather than commented, so the numbers in the report cannot drift
    // from the numbers in the file.
    assert.equal(HINDI_COMMAND_STEMS.length, 24);
    assert.equal(OBLIGATION_AUXILIARIES.length, 10);
    assert.equal(INFINITIVE_ENDINGS.length, 3);
    assert.equal(HINDI_SENSITIVE_TERMS.length, 17);
    assert.equal(HINDI_ASK_VERBS.length, 19);
    assert.equal(HINDI_NEGATIONS.length, 4);
  });
});
