// THE ADDRESS GUARD NEEDS NO TRANSLATION, AND THIS PROVES IT RATHER THAN
// ASSERTING IT.
//
// The two address patterns in UNSAFE_ADVICE_PATTERNS exist because the AI put
// "Property involved: 22 Alder House, Feltham." on card one of a possession
// notice, carrying a reader's home address into the output when the engine
// never surfaces one. They are the reason a reader's address does not leak.
//
// WHY THIS FILE EXISTS. When the guards are built for the other nine languages,
// every lexical rule needs a phrase list per language, reviewed, and that is the
// bounded but real cost of opening the language gate. These two are the cheap
// case, and the claim is worth pinning before someone budgets for translating
// them:
//
//   the postcode rule is pure SHAPE. Two letters, digits, a space, a digit and
//   two letters. There is no vocabulary in it at all.
//
//   the street rule carries seventeen English nouns, and they still need no
//   translation, because a UK address is written in English on the paper
//   whatever language the card around it is in. A Polish reader's card says
//   "Ulica" nowhere; the letter says "Alder House" and so does the model.
//
// The second claim is the one that could be wrong, so it is the one tested
// hardest: the same address is asserted to be caught inside a sentence in each
// of the ten interface languages.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { validateStructuredResult } =
  require(path.join(__dirname, "..", "src", "utils", "validateStructuredResult"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const byId = (id) => CORPUS.find((entry) => entry.id === id).text;
const clone = (value) => JSON.parse(JSON.stringify(value));

function rulesResult(id) {
  return runClearStepsEngine({
    extractedText: byId(id),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "addr-" + id }
  }).api_output.structured_result;
}

// The card text a reader would meet, in each interface language, with a UK
// address embedded exactly as it appears on the paper. The surrounding words
// are translated; the address is not, because addresses are not translated.
const SENTENCE_IN_LANGUAGE = {
  en: "The property involved is 22 Alder House, Feltham.",
  pl: "Nieruchomość, której to dotyczy, to 22 Alder House, Feltham.",
  ro: "Proprietatea vizată este 22 Alder House, Feltham.",
  es: "La propiedad afectada es 22 Alder House, Feltham.",
  fr: "Le bien concerné est 22 Alder House, Feltham.",
  pt: "O imóvel em causa é 22 Alder House, Feltham.",
  hi: "इसमें शामिल संपत्ति 22 Alder House, Feltham है.",
  bn: "এই সম্পত্তিটি হল 22 Alder House, Feltham.",
  gu: "સંબંધિત મિલકત 22 Alder House, Feltham છે.",
  pa: "ਸਬੰਧਤ ਜਾਇਦਾਦ 22 Alder House, Feltham ਹੈ."
};

const POSTCODE_IN_LANGUAGE = {
  en: "The address ends TW13 4QP.",
  pl: "Adres kończy się na TW13 4QP.",
  ro: "Adresa se încheie cu TW13 4QP.",
  es: "La dirección termina en TW13 4QP.",
  fr: "L'adresse se termine par TW13 4QP.",
  pt: "O endereço termina em TW13 4QP.",
  hi: "पता TW13 4QP पर समाप्त होता है.",
  bn: "ঠিকানাটি শেষ হয় TW13 4QP দিয়ে.",
  gu: "સરનામું TW13 4QP પર સમાપ્ત થાય છે.",
  pa: "ਪਤਾ TW13 4QP ਤੇ ਖਤਮ ਹੁੰਦਾ ਹੈ."
};

function rejectsWhenPlacedOnACard(sentence) {
  const fallback = rulesResult("eviction_possession");
  const candidate = clone(fallback);
  candidate.cards[0].simple_explanation = sentence;
  return validateStructuredResult(candidate, fallback).valid === false;
}

test("the postcode rule is shape only, so it has nothing to translate", async (t) => {
  await t.test("it fires in all ten interface languages, on the same postcode", () => {
    Object.keys(POSTCODE_IN_LANGUAGE).forEach((code) => {
      assert.ok(rejectsWhenPlacedOnACard(POSTCODE_IN_LANGUAGE[code]),
        code + ": a UK postcode reached a card");
    });
  });

  await t.test("the pattern itself contains no word at all", () => {
    // If a word ever appears in it, the claim in this file's header is no
    // longer true and someone has to budget for translating it. THE ONE COPY
    // moved to documentSignals.js on 6 August 2026, when the sender
    // candidate began gating on the same shape; this pin follows it there.
    const source = require("node:fs")
      .readFileSync(path.join(__dirname, "..", "src", "utils", "documentSignals.js"), "utf8");
    const postcode = source.match(/\/\\b\[A-Z\]\{1,2\}\\d\{1,2\}\[A-Z\]\?\\s\?\\d\[A-Z\]\{2\}\\b\//);
    assert.ok(postcode, "the postcode pattern has changed shape; re-read this file's claim");
  });
});

test("the street rule carries English nouns and still needs no translation", async (t) => {
  await t.test("it fires in all ten interface languages, on the same address", () => {
    // THE CLAIM UNDER TEST. A UK address is printed in English on the paper,
    // so the model reproduces it in English inside a sentence of any language,
    // and an English noun list is the right list everywhere.
    Object.keys(SENTENCE_IN_LANGUAGE).forEach((code) => {
      assert.ok(rejectsWhenPlacedOnACard(SENTENCE_IN_LANGUAGE[code]),
        code + ": a street address reached a card");
    });
  });

  await t.test("every noun in the list is matched, so none is decoration", () => {
    const NOUNS = ["Road", "Street", "Lane", "Avenue", "Close", "Drive", "Court", "House",
      "Way", "Place", "Gardens", "Terrace", "Crescent", "Grove", "Hill", "Park", "Square"];
    NOUNS.forEach((noun) => {
      assert.ok(rejectsWhenPlacedOnACard("The property is 14 Alder " + noun + ", Feltham."),
        noun + " is in the pattern but does not fire");
    });
  });

  await t.test("a translated street word is NOT matched, and that is correct", () => {
    // The counter-case that makes the claim falsifiable. If a model ever wrote
    // "ulica" or "sarak" it would pass, and that would matter only if UK post
    // printed addresses in those languages. It does not. Recorded so the
    // assumption is visible rather than implicit.
    ["Nieruchomość to 22 Alder ulica, Feltham.",
     "संपत्ति 22 Alder सड़क, Feltham है."].forEach((line) => {
      assert.equal(rejectsWhenPlacedOnACard(line), false,
        "a translated street noun now fires; the assumption in this file has changed");
    });
  });
});

test("neither rule fires on the corpus, so nothing legitimate is at risk", async (t) => {
  await t.test("every corpus document validates against itself", () => {
    const failing = [];
    CORPUS.forEach((entry) => {
      const result = rulesResult(entry.id);
      if (!validateStructuredResult(result, result).valid) failing.push(entry.id);
    });
    assert.deepEqual(failing, []);
  });
});
