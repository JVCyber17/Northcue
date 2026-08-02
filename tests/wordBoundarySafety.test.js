// Stops the ASCII word boundary bug from coming back.
//
// THE BUG. JavaScript's \b is defined as a transition between [A-Za-z0-9_] and
// anything else. Every letter outside that ASCII range counts as a NON word
// character, which breaks multilingual matching in BOTH directions:
//
//   MISSES a real term, when the term begins or ends with a non ASCII letter,
//   because there is no ASCII boundary to find:
//     /\bSprawdź\b/.test("Prosimy Sprawdź to.")            -> false
//     /\bਤੁਸੀਂ\b/.test("ਇਹ ਤੁਸੀਂ ਲਈ ਹੈ.")                      -> false
//
//   INVENTS a term that is not there, because an accented letter inside a word
//   looks to \b like a word boundary, so word fragments match as whole words:
//     /\btes\b/.test("informations complètes")             -> true
//     /\bes\b/.test("actions masquées")                    -> true
//
// The first direction produced a false all clear on a Polish sweep that
// reported zero informal strings while the rendered card read "Sprawdź
// oryginał". The second inflated the French informal count from 6 to 42.
// Both are silent: nothing throws, the numbers just come out wrong.
//
// THE FIX. (?<!\p{L}) and (?!\p{L}) with the u flag are real boundaries for
// every alphabet.
//
// This file asserts two things: that the failure mode is what the comment says
// it is, and that no file in the repo which reads translated content uses \b
// in a regex.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const REPO = path.join(__dirname, "..");
// Languages come from config so the detection below keeps up when one is
// added, without a hand-maintained copy of the list.
const LANGUAGE_CODES = require("../public/i18n/config.js").languages
  .map((entry) => entry.code)
  .filter((code) => code !== "en");

// Directories that can contain scanners.
//
// SRC/ USED TO BE EXCLUDED, with this reason: "the rules engine and the AI
// stripper run over English document text, where \b is correct and switching it
// would change matching behaviour on real documents."
//
// THAT WAS TRUE ON 29 JULY 2026 AND STOPPED BEING TRUE. The corpus now carries
// documents in nine other languages, and the engine's most important matcher,
// co-location's labelPattern, compiled every label as new RegExp("\\b" + label
// + "\\b"). Four scripts were unmatchable by construction and "até" and "până"
// failed in Latin. The bug was found, fixed and written up as a principle in
// one place, and nobody searched for it in the other, because the exclusion
// said there was nothing to find.
//
// The reason was not wrong when written. It expired, quietly, and an exclusion
// with an expired reason reads exactly like an exclusion with a live one. That
// is the whole lesson and it is why the note stays here rather than being
// deleted with the exclusion.
const SEARCH_DIRS = ["scripts", "tests", "public", "src"];

// src/ is scoped differently from the rest.
//
// A LITERAL REGEX IS ALLOWED THERE. The engine holds around 195 hard-coded \b
// boundaries around English vocabulary: risk phrases, severity keywords,
// obligation patterns. Those are English by design, that limitation is recorded
// in KNOWN_ENGINE_DEFECTS.md, and flagging them would produce 195 alarms and
// teach the reader to ignore this test.
//
// A BOUNDARY WRITTEN INSIDE A STRING IS NOT ALLOWED. A \b in a string is a
// pattern being BUILT, which means the thing it bounds is data rather than
// code, and data is where a non-ASCII term arrives. That is exactly the shape
// labelPattern had. This is the narrowest rule that catches the defect and
// nothing else.
const BUILT_PATTERNS_ONLY = new Set(["src"]);

function collectJsFiles(dir, found) {
  const full = path.join(REPO, dir);
  if (!fs.existsSync(full)) return found;
  fs.readdirSync(full, { withFileTypes: true }).forEach((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") return;
      collectJsFiles(rel, found);
    } else if (entry.name.endsWith(".js")) {
      found.push(rel);
    }
  });
  return found;
}

// A file "reads translated content" if it pulls in a language file for any of
// the nine, either by literal name or by building the path from a code. This
// is deliberately broad: a false alarm here costs a comment, a miss costs a
// silent wrong answer.
function readsTranslatedContent(source, relPath) {
  if (relPath.includes("wordBoundarySafety")) return false;      // this file
  if (/templates-\s*\+/.test(source)) return true;               // "templates-" + code
  if (/i18n[/\\]"\s*\+/.test(source)) return true;               // "i18n/" + code
  // Consuming the bank's output is reading translated content too. This is
  // what keeps app.js in scope: it holds no language list of its own (per
  // the engineering standards) but renders translated sentences everywhere.
  if (/translateEngineSentence|translatedEngineText/.test(source)) return true;
  if (new RegExp("templates-(" + LANGUAGE_CODES.join("|") + ")").test(source)) return true;
  const codesMentioned = LANGUAGE_CODES.filter((c) =>
    new RegExp('["\']' + c + '["\']').test(source)
  );
  return codesMentioned.length >= 3;                             // a language list
}

// Finds \b inside a regex literal or a RegExp string.
//
// A line may opt out with the marker "ascii-boundary-ok:" followed by a
// reason, on the line itself or the line above. That is deliberate friction:
// there are legitimate uses (matching ASCII digits, or reproducing the broken
// behaviour on purpose to measure it), and requiring a written reason is
// better than loosening the detector until it stops catching real mistakes.
const OPT_OUT = /ascii-boundary-ok:\s*\S+/;

function findWordBoundaryUse(source, builtOnly) {
  const offenders = [];
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    const withoutComment = line.replace(/^\s*(\/\/|\*).*$/, "");
    if (!withoutComment) return;
    // A boundary written inside a string: the pattern is being built, so what it
    // bounds is data. This is the shape that must never be ASCII.
    const builtFromAString = /\\\\b/.test(withoutComment);
    // A boundary in a regex literal: hard-coded, so what it bounds is code.
    const inALiteral = /\/[^/\n]*\\b[^/\n]*\/[gimsuy]*/.test(withoutComment);
    const hasBoundary = builtOnly ? builtFromAString : (inALiteral || builtFromAString);
    if (!hasBoundary) return;
    // The marker may sit anywhere in the comment block immediately above, so
    // walk back over contiguous comment lines rather than checking only one.
    let cursor = index - 1;
    let exempt = OPT_OUT.test(line);
    while (!exempt && cursor >= 0 && /^\s*(\/\/|\*|\/\*)/.test(lines[cursor])) {
      if (OPT_OUT.test(lines[cursor])) exempt = true;
      cursor--;
    }
    if (exempt) return;
    offenders.push({ line: index + 1, text: line.trim().slice(0, 110) });
  });
  return offenders;
}

test("word boundary safety", async (t) => {
  await t.test("the failure mode is exactly as documented", () => {
    // Direction one: \b misses terms bounded by non ASCII letters.
    assert.equal(/\bSprawdź\b/.test("Prosimy Sprawdź to."), false,
      "if this passes, V8 changed and the comment above needs revisiting");
    assert.equal(/\bverifică\b/.test("Vă rugăm să verifică."), false);
    assert.equal(/\bआप\b/.test("यह आप के लिए है."), false);
    assert.equal(/\bਤੁਸੀਂ\b/.test("ਇਹ ਤੁਸੀਂ ਲਈ ਹੈ."), false);

    // Direction two: \b invents matches inside accented words.
    assert.equal(/\btes\b/.test("informations complètes"), true,
      "the French false positive that inflated the informal count");
    assert.equal(/\bes\b/.test("actions masquées"), true);
  });

  await t.test("\\p{L} alone is still wrong for Indic scripts", () => {
    // The second order version of the same bug. Indic vowel signs are category
    // M, a combining mark, not L. In વપરાતું ("is used") the sequence તું is
    // preceded by the vowel sign ા (U+0ABE), so a lookbehind that excludes
    // only \p{L} finds a non letter, declares a boundary, and matches the
    // informal pronoun inside an ordinary verb.
    const onlyLetters = (term) => new RegExp("(?<!\\p{L})" + term + "(?!\\p{L})", "u");
    assert.equal(onlyLetters("તું").test("એ વપરાતું નથી."), true,
      "this false positive is why \\p{M} must be in the boundary class");
    assert.equal(/\p{M}/u.test("ા"), true, "the Gujarati vowel sign is a mark, not a letter");
    assert.equal(/\p{L}/u.test("ા"), false);
  });

  await t.test("Unicode lookarounds are correct in both directions", () => {
    const WORD = "[\\p{L}\\p{M}\\p{N}]";
    const bounded = (term) => new RegExp("(?<!" + WORD + ")" + term + "(?!" + WORD + ")", "u");

    // Rejects the Indic mark adjacency that \p{L} alone let through.
    assert.equal(bounded("તું").test("એ વપરાતું નથી."), false);
    assert.equal(bounded("તું").test("તમારું ખાતું બંધ કરે છે."), false);
    assert.equal(bounded("તું").test("તું આ દસ્તાવેજ તપાસ."), true, "the genuine pronoun still matches");

    // Finds the terms \b missed.
    assert.equal(bounded("Sprawdź").test("Prosimy Sprawdź to."), true);
    assert.equal(bounded("verifică").test("Vă rugăm să verifică."), true);
    assert.equal(bounded("आप").test("यह आप के लिए है."), true);
    assert.equal(bounded("ਤੁਸੀਂ").test("ਇਹ ਤੁਸੀਂ ਲਈ ਹੈ."), true);

    // Rejects the fragments \b invented.
    assert.equal(bounded("tes").test("informations complètes"), false);
    assert.equal(bounded("es").test("actions masquées"), false);

    // And rejects the substring false positive from the first Gujarati review,
    // where the pronoun તું appears inside the ordinary verb કરતું.
    assert.equal("તમે કરતું જુઓ.".includes("તું"), true, "the naive check that misfired");
    assert.equal(bounded("તું").test("તમે કરતું જુઓ."), false);
  });

  await t.test("no file that reads translated content uses \\b in a regex", () => {
    const files = SEARCH_DIRS.reduce((acc, dir) => collectJsFiles(dir, acc), []);
    assert.ok(files.length > 5, "expected to find repo javascript files to scan");

    const violations = [];
    const scanned = {};
    files.forEach((rel) => {
      const dir = rel.split(path.sep)[0];
      const builtOnly = BUILT_PATTERNS_ONLY.has(dir);
      const source = fs.readFileSync(path.join(REPO, rel), "utf8");
      if (!builtOnly && !readsTranslatedContent(source, rel)) return;
      scanned[dir] = (scanned[dir] || 0) + 1;
      findWordBoundaryUse(source, builtOnly).forEach((hit) => {
        violations.push(rel + ":" + hit.line + "  " + hit.text);
      });
    });

    // ADDED AFTER A MUTATION. Deleting "src" from SEARCH_DIRS survived the
    // whole suite, which is exactly how the engine went a month without this
    // guard in the first place. A scope this test does not assert is a scope
    // that can be quietly removed again.
    assert.ok(scanned.src > 10,
      "src/ is not being scanned. That exclusion is what let the ASCII boundary " +
      "live in the engine's label matcher for a month. Scanned: " + JSON.stringify(scanned));

    assert.deepEqual(violations, [],
      "\\b is ASCII only and silently gives wrong answers on translated text. " +
      "Use (?<!\\p{L})term(?!\\p{L}) with the u flag instead. Offenders:\n" +
      violations.join("\n"));
  });

  await t.test("the engine's own label matcher is Unicode bounded", () => {
    // The specific thing this test failed to protect for a month. Asserted on
    // BEHAVIOUR, not on the source, so a rewrite that keeps the bug is caught
    // as well as one that reintroduces the old line.
    const co = require(path.join(REPO, "src", "utils", "coLocation"));
    const LABELS = [
      ["Devanagari", "तक", "24 June 2026 तक"],
      ["Gujarati", "તારીખ", "તારીખ: 14 July 2026"],
      ["Bengali", "তারিখ", "তারিখ: 9 July 2026"],
      ["Gurmukhi", "ਮਿਤੀ", "ਪੱਤਰ ਦੀ ਮਿਤੀ: 2 June 2026"],
      ["Portuguese, diacritic final", "até", "pagamento até 24 June 2026"],
      ["Romanian, diacritic final", "până", "plata până la 24 June 2026"],
      ["Polish, diacritic final", "sprawdź", "Prosimy sprawdź to."]
    ];
    LABELS.forEach(([why, label, text]) => {
      assert.equal(co.locateLabels(text, [label]).length, 1,
        why + ": locateLabels cannot see " + JSON.stringify(label));
    });

    // And still rejects a term inside a longer word, in both directions.
    assert.equal(co.locateLabels("એ વપરાતું નથી.", ["તું"]).length, 0,
      "an Indic vowel sign is a mark, not a boundary");
    assert.equal(co.locateLabels("informations complètes", ["tes"]).length, 0,
      "an accented letter is not a boundary either");
  });

  await t.test("a zero-width non-joiner is not a word boundary", () => {
    // Devanagari, Bengali and Gurmukhi use ZWNJ to block a conjunct ligature.
    // It is category Cf, so [\p{L}\p{M}\p{N}] alone reads a single written word
    // as two. Our own translation files carry none, which is why the scanner
    // never met this; a reader's document is not our file.
    const co = require(path.join(REPO, "src", "utils", "coLocation"));
    const ZWNJ = "‌";
    assert.equal(co.locateLabels("अ" + ZWNJ + "तक", ["तक"]).length, 0,
      "a ZWNJ inside a word must not open a boundary");
    assert.equal(co.locateLabels("24 June 2026 तक", ["तक"]).length, 1,
      "and a real boundary must still be found");
  });

  await t.test("the discontiguous matcher is Unicode bounded too", () => {
    // ADDED AFTER A MUTATION. Reverting spanningPattern to \b survived the
    // whole suite, because every entry in DATE_GOVERNS_SPANNING and
    // PHONE_GOVERNS_SPANNING is English and the tests only exercised
    // locateLabels. The machinery has to be ready before the vocabulary is
    // added, or the vocabulary lands and silently does nothing, which is the
    // failure mode this whole commit is about.
    const co = require(path.join(REPO, "src", "utils", "coLocation"));
    const HEADS = [
      ["Portuguese head and tail", "contacte-nos", "até", "contacte-nos pelo 0800 316 9800 até 24 June 2026"],
      ["Polish head", "prosimy o kontakt", "do", "prosimy o kontakt pod numerem 22 512 44 90 do 24 June 2026"],
      ["Hindi head", "संपर्क करें", "तक", "संपर्क करें 0800 316 9800 तक 24 June 2026"]
    ];
    HEADS.forEach(([why, head, tail, text]) => {
      assert.equal(co.locateSpanningLabels(text, [head], tail).length, 1,
        why + ": locateSpanningLabels cannot see " + JSON.stringify(head + " ... " + tail));
    });
    // And the English entries still behave exactly as they did.
    assert.equal(
      co.locateSpanningLabels("You must contact us on 0333 320 122 by 3 September 2026.",
        ["contact us"], "by").length, 1);
    assert.equal(
      co.locateSpanningLabels("Please notify usual contacts by email.", ["notify us"], "by").length, 0,
      "the boundary must still stop a head matching inside a longer word");
  });

  await t.test("the adjacency test is not ASCII either", () => {
    // Worse than the boundary, because it produces a wrong answer rather than a
    // missed one: [A-Za-z0-9] contains no Indic letter, so a whole clause reads
    // as blank and an English label binds a date on the other side of it.
    const co = require(path.join(REPO, "src", "utils", "coLocation"));
    const mixed = "Northbridge Council\nAccount: NC-4471\n\n" +
      "भुगतान की तारीख due by आपके खाते में जमा राशि 3 September 2026";
    assert.equal(co.selectDeadline(mixed, () => true), null,
      "a label may not reach across a clause just because the clause is not ASCII");
  });

  await t.test("the scanner tool itself uses Unicode boundaries", () => {
    const scanner = fs.readFileSync(path.join(REPO, "scripts", "scan-translations.js"), "utf8");
    // The boundary class must cover marks and digits, not just letters, or
    // Indic vowel signs reopen the false positive documented above.
    assert.match(scanner, /\\\\p\{L\}\\\\p\{M\}\\\\p\{N\}/,
      "scanner boundary class must be [\\p{L}\\p{M}\\p{N}]");
    assert.match(scanner, /\(\?<!/, "scanner must use a lookbehind");
    assert.match(scanner, /\(\?!/, "scanner must use a lookahead");
  });

  await t.test("one normalisation, and it is what makes the boundary usable", () => {
    // ADDED AFTER TWO MUTATIONS, both of which survived the whole suite.
    //
    // A Unicode boundary makes the boundary correct AROUND a decomposed accent.
    // It does not make the LABEL match one: "até" composed and "até" decomposed
    // are different strings, and they look identical, so nothing downstream
    // could ever detect the difference.
    const { runClearStepsEngine } = require(path.join(REPO, "src", "services", "clearStepsEngine"));
    const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "nfc" };
    const deadlineOf = (text) => runClearStepsEngine({ extractedText: text, fileMeta: META })
      .structured_output.extractor_internal.deadline;

    // A FIRST VERSION OF THIS TEST PROVED NOTHING, and it is worth saying why.
    // It used a Portuguese letter written without accents, so normalize("NFD")
    // returned the identical string and the assertion passed whether the
    // normalisation ran or not. The case has to carry a character that actually
    // decomposes AND that a pattern actually matches. The month name is the
    // only such thing in the engine today, because every LABEL is still English.
    const letter = [
      "Energia Atlantico",
      "Numero de cliente: PT-90244",
      "",
      "Exmo. Senhor Ferreira,",
      "",
      "Data limite de pagamento: 21 de março de 2026.",
      "Valor em divida: £188.60"
    ].join("\n");

    assert.notEqual(letter.normalize("NFD"), letter,
      "premise: this sample must actually decompose, or the test below is vacuous");
    assert.equal(deadlineOf(letter), "21 de março de 2026", "premise, composed");
    assert.equal(deadlineOf(letter.normalize("NFD")), "21 de março de 2026",
      "a decomposed document must read the same as a composed one. Without the " +
      "normalisation this is null: the month name in monthNames.js is composed " +
      "and the text is not, and the two look identical on screen");

    // And the invisibles. \p{Cf} is in the word-character class so that a ZWNJ
    // inside a Devanagari conjunct is not read as a boundary. That is right for
    // ZWNJ and wrong for a byte-order mark: a label sitting against a leading
    // BOM would be invisible. Stripping the two that never belong inside a word
    // is what makes keeping Cf in the class safe.
    //
    // "Deadline" is the label here because it has no shorter date label inside
    // it. "Amount to pay" cannot show this: "to pay" is a label too, so it
    // matches further along and the answer comes out right for the wrong reason.
    const BOM = "﻿";
    const SOFT_HYPHEN = "­";
    const notice = (head) => [
      head, "Reference: MB-44712", "", "Dear Mr Vaidya", "", "The balance is £412.66."
    ].join("\n");

    assert.equal(deadlineOf(notice("Deadline: 3 September 2026")), "3 September 2026",
      "premise");
    assert.equal(deadlineOf(notice(BOM + "Deadline: 3 September 2026")), "3 September 2026",
      "a leading byte-order mark must not hide the label behind it");
    assert.equal(deadlineOf(notice("Dead" + SOFT_HYPHEN + "line: 3 September 2026")), "3 September 2026",
      "nor a soft hyphen inside one");

    // Both are null without the stripping, and that is the whole point of it.
    const co = require(path.join(REPO, "src", "utils", "coLocation"));
    assert.equal(co.selectDeadline(BOM + "Deadline: 3 September 2026", () => true), null,
      "co-location on its own must NOT see through a BOM; the engine normalises first");
    assert.equal(co.selectDeadline("Dead" + SOFT_HYPHEN + "line: 3 September 2026", () => true), null);
  });

  await t.test("the guard would catch a reintroduction", () => {
    // Proof the detector is not vacuous: a file that reads translated content
    // and uses \b must be reported.
    const bad = 'const b = require("../public/i18n/templates-pl");\nconst re = /\\bSprawdź\\b/;\n';
    assert.equal(readsTranslatedContent(bad, "tests/fake.js"), true);
    assert.ok(findWordBoundaryUse(bad).length > 0, "detector must flag the regex literal");
  });
});
