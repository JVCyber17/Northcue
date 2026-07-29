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
const LANGUAGE_CODES = ["pl", "ro", "gu", "hi", "bn", "pt", "es", "fr", "pa"];

// Directories that can contain scanners. src/ is deliberately excluded: the
// rules engine and the AI stripper run over English document text, where \b is
// correct and switching it would change matching behaviour on real documents.
const SEARCH_DIRS = ["scripts", "tests", "public"];

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
  if (/templates-(pl|ro|gu|hi|bn|pt|es|fr|pa)/.test(source)) return true;
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

function findWordBoundaryUse(source) {
  const offenders = [];
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    const withoutComment = line.replace(/^\s*(\/\/|\*).*$/, "");
    if (!withoutComment) return;
    // regex literal containing \b, or a RegExp( "..." ) containing \\b
    const hasBoundary =
      /\/[^/\n]*\\b[^/\n]*\/[gimsuy]*/.test(withoutComment) ||
      /RegExp\([^)]*\\\\b/.test(withoutComment);
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
    files.forEach((rel) => {
      const source = fs.readFileSync(path.join(REPO, rel), "utf8");
      if (!readsTranslatedContent(source, rel)) return;
      findWordBoundaryUse(source).forEach((hit) => {
        violations.push(rel + ":" + hit.line + "  " + hit.text);
      });
    });

    assert.deepEqual(violations, [],
      "\\b is ASCII only and silently gives wrong answers on translated text. " +
      "Use (?<!\\p{L})term(?!\\p{L}) with the u flag instead. Offenders:\n" +
      violations.join("\n"));
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

  await t.test("the guard would catch a reintroduction", () => {
    // Proof the detector is not vacuous: a file that reads translated content
    // and uses \b must be reported.
    const bad = 'const b = require("../public/i18n/templates-pl");\nconst re = /\\bSprawdź\\b/;\n';
    assert.equal(readsTranslatedContent(bad, "tests/fake.js"), true);
    assert.ok(findWordBoundaryUse(bad).length > 0, "detector must flag the regex literal");
  });
});
