// Guards the contract between how a string is NORMALISED before a template
// bank lookup and how it is INDEXED in the bank.
//
// THE BUG THIS EXISTS FOR. checkWhyChips() in app.js stripped the trailing
// full stop off each scam and severity signal before translating it, because
// chips read better without one. The bank indexes every sentence exactly as
// the engine emits it, stop included, so the lookup missed every time and all
// 55 signal labels fell back to English in all nine languages. A Polish reader
// opening Document check on a suspected scam saw "Uses pressure wording", on
// the panel whose entire job is explaining why the document was flagged.
//
// WHY NOTHING ELSE CAUGHT IT.
//   Parity tests compare KEYS between language files. Every key was present
//   and every translation existed, so parity was green.
//   Content scans read the VALUES in the files. The Polish translation of
//   every one of those labels was sitting there, correct, unused.
//   The severity ladder test compares bank entries to each other, never
//   through the call path.
// The defect lived entirely in the gap between caller and index, which is a
// place none of those look. This file looks exactly there.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const REPO = path.join(__dirname, "..");
const I18N = path.join(REPO, "public", "i18n");
// Languages come from config so a newly added language is covered by this
// contract automatically, never silently exempt.
const LANGS = require(path.join(I18N, "config.js")).languages
  .map((entry) => entry.code)
  .filter((code) => code !== "en");

const enBank = require(path.join(I18N, "templates-en.js"));
const bank = require(path.join(I18N, "templateBank.js"));
LANGS.forEach((code) => require(path.join(I18N, "templates-" + code + ".js")));
bank.resetCaches();

const APP_SOURCE = fs.readFileSync(path.join(REPO, "public", "app.js"), "utf8");

// Transforms that look harmless and are not, because the bank index is keyed
// on the exact string. Each is something a developer might reasonably apply
// for presentation before realising it happens on the wrong side of a lookup.
const LOSSY_NORMALISATIONS = [
  { name: "strip trailing full stop", fn: (s) => s.replace(/[.।]+$/, "") },
  { name: "lowercase", fn: (s) => s.toLowerCase() },
  { name: "strip all punctuation", fn: (s) => s.replace(/[.,;:!?]/g, "") },
  { name: "collapse to single line", fn: (s) => s.replace(/\s+/g, " ") + "" },
  { name: "straighten curly apostrophes", fn: (s) => s.replace(/[‘’]/g, "'") }
];

test("template bank lookup contract", async (t) => {
  await t.test("every exact bank sentence resolves in every language", () => {
    // Index integrity. If this fails the bank and the translations have
    // drifted apart and every caller is affected, not just one.
    const failures = [];
    Object.entries(enBank.exact).forEach(([id, english]) => {
      LANGS.forEach((code) => {
        const result = bank.translateEngineSentence(english, code);
        if (!result.translated) failures.push(code + " " + id);
      });
    });
    assert.deepEqual(failures.slice(0, 20), [], failures.length + " lookups fell back");
  });

  await t.test("the signal labels the bug hit resolve in every language", () => {
    // The specific regression, stated as data rather than as a source check so
    // it keeps working if the function is refactored or renamed.
    const signalIds = Object.keys(enBank.exact).filter((id) => id.startsWith("tpl.label.signal."));
    assert.ok(signalIds.length >= 50, "expected the full signal label set, found " + signalIds.length);

    const failures = [];
    signalIds.forEach((id) => {
      LANGS.forEach((code) => {
        const result = bank.translateEngineSentence(enBank.exact[id], code);
        if (!result.translated) failures.push(code + " " + id);
      });
    });
    assert.deepEqual(failures, [], "signal labels must never fall back to English");
  });

  await t.test("the lossy normalisations really are lossy", () => {
    // A guard whose premise is never checked is worth nothing. Each transform
    // below must actually break lookups, or the test that forbids them proves
    // nothing. Trailing stop removal is the one that shipped.
    const sample = Object.values(enBank.exact).slice(0, 60);
    LOSSY_NORMALISATIONS.forEach((norm) => {
      const broken = sample.filter((english) => {
        const changed = norm.fn(english);
        if (changed === english) return false;
        return !bank.translateEngineSentence(changed, "pl").translated;
      });
      if (norm.name === "collapse to single line" || norm.name === "straighten curly apostrophes") {
        return;   // may legitimately be a no op on this corpus
      }
      assert.ok(broken.length > 0,
        "\"" + norm.name + "\" should break at least one lookup, or it is not worth forbidding");
    });
  });

  await t.test("no caller normalises a value before handing it to the bank", () => {
    // The structural half. Split app.js into top level functions, then for
    // each function that performs a lookup, check that the value it passes was
    // not produced by one of the lossy transforms inside that same function.
    const functions = APP_SOURCE.split(/\n(?=function )/);
    const LOSSY_CALL = /\.(replace|toLowerCase|toUpperCase|normalize|slice|substring|trim)\s*\(/;
    const violations = [];

    functions.forEach((body) => {
      const nameMatch = /^function\s+(\w+)/.exec(body);
      if (!nameMatch) return;
      const fnName = nameMatch[1];

      const lookups = [...body.matchAll(/translatedEngineText\(\s*([^)]*?)\s*\)/g)];
      lookups.forEach((call) => {
        const argument = call[1].trim();

        // Case one: the transform is inline in the argument.
        // trim() alone is safe, it cannot change a bank value that is already
        // trimmed, so it is allowed on its own.
        const inlineLossy = LOSSY_CALL.test(argument) && !/^[\w.]+\.trim\(\)$/.test(argument);
        if (inlineLossy) {
          violations.push(fnName + ": lookup on a transformed expression -> " + argument);
          return;
        }

        // Case two: the argument is a plain identifier that was assigned from
        // a lossy transform earlier in the same function.
        if (/^[A-Za-z_$][\w$]*$/.test(argument)) {
          const assignment = new RegExp(
            "(?:const|let|var)\\s+" + argument + "\\s*=\\s*([^;]+);"
          ).exec(body);
          if (assignment && LOSSY_CALL.test(assignment[1])) {
            const assigned = assignment[1].replace(/\s+/g, " ").trim();
            // Assignments that only trim are safe.
            if (!/^String\([^)]*\)\.trim\(\)$/.test(assigned) && !/^[\w.]+\.trim\(\)$/.test(assigned)) {
              violations.push(fnName + ": \"" + argument + "\" was normalised before lookup -> " + assigned);
            }
          }
        }
      });
    });

    assert.deepEqual(violations, [],
      "A value must be translated as the bank indexes it, and reshaped for display only afterwards. " +
      "Offenders:\n" + violations.join("\n"));
  });

  await t.test("the caller check would catch the bug it was written for", () => {
    // The exact shape that shipped, so the detector cannot silently rot.
    const shipped = [
      "function checkWhyChips(trust) {",
      '  const text = String(signal || "").trim().replace(/\\.+$/, "");',
      "  chips.push(translatedEngineText(text).text);",
      "}"
    ].join("\n");

    const LOSSY_CALL = /\.(replace|toLowerCase|toUpperCase|normalize|slice|substring|trim)\s*\(/;
    const argument = /translatedEngineText\(\s*([^)]*?)\s*\)/.exec(shipped)[1].trim();
    const assignment = new RegExp("(?:const|let|var)\\s+" + argument + "\\s*=\\s*([^;]+);").exec(shipped);

    assert.ok(assignment, "detector must find where the argument was assigned");
    assert.ok(LOSSY_CALL.test(assignment[1]), "detector must see the transform");
    assert.ok(!/^String\([^)]*\)\.trim\(\)$/.test(assignment[1].trim()),
      "and must not excuse it as a bare trim");
  });

  await t.test("the bank call-site census matches the inventory", () => {
    // docs/i18n/caller-to-bank-inventory.md lists every place text crosses
    // into the bank and what may happen to it on the way. A new call site is
    // fine, but it must be a conscious decision: check its argument against
    // the contract (raw value or String(x).trim() only), add it to the
    // inventory, then update this count.
    const calls = APP_SOURCE.match(/translatedEngineText\(/g) || [];
    assert.equal(calls.length, 16,
      "translatedEngineText call count changed (15 call sites + 1 definition). " +
      "Verify the new or removed site against docs/i18n/caller-to-bank-inventory.md, " +
      "update the inventory, then update this census.");
  });

  await t.test("chips are stripped for display, after translation", () => {
    // The fix, checked at the level that matters: the reader must not see a
    // full stop on a chip, and must not see English.
    const stripSentenceStop = (value) => String(value).trim().replace(/[.।]+$/, "").trim();
    const signalIds = Object.keys(enBank.exact).filter((id) => id.startsWith("tpl.label.signal."));

    LANGS.forEach((code) => {
      signalIds.forEach((id) => {
        const english = enBank.exact[id];
        const rendered = stripSentenceStop(bank.translateEngineSentence(english, code).text);
        assert.ok(!/[.।]$/.test(rendered), code + " " + id + " kept a sentence stop on a chip");
        assert.notEqual(rendered, stripSentenceStop(english),
          code + " " + id + " rendered the English text");
      });
    });
  });
});

// ---------------------------------------------------------------- 7 August
// A RAW SLOT NEVER REACHES A READER. The Panjabi pack's row 7 showed a
// translated template rendering with its literal {consequence} token
// visible. An unfilled render is a MISS: the reader gets the untranslated
// English sentence, never a template artefact.
test("an unfilled slot renders as a miss, not a token", () => {
  const savedTemplates = globalThis.NORTHCUE_TEMPLATES_XX;
  globalThis.NORTHCUE_TEMPLATES_XX = {
    exact: {},
    patterns: {
      // The target template carries a slot the English pattern does not
      // capture, which is exactly the pa-07 shape.
      "tpl.deadline.due": "XX due {date} extra {consequence} XX"
    }
  };
  try {
    bank.resetCaches();
    const result = bank.translateEngineSentence("Due by 3 September 2026.", "xx");
    assert.equal(result.translated, false,
      "a render still carrying a slot token must fall back untranslated");
    assert.ok(!/\{\w+\}/.test(result.text), "no token may reach the reader");
    assert.equal(result.text, "Due by 3 September 2026.");
  } finally {
    globalThis.NORTHCUE_TEMPLATES_XX = savedTemplates;
    bank.resetCaches();
  }
});

// THE ANY-LANGUAGE SLOT AUDIT, the founder's batched word: no unfilled slot
// can ever reach a reader card in any language. The runtime miss-guard above
// is the belt; this is the braces: a translated template may never use a
// slot its English source pattern does not capture, because that is the only
// way a slot can arrive unfilled from a real match. Audited across every
// language bank in config, so a new language joins the contract on arrival.
test("no language template uses a slot its English pattern cannot fill", () => {
  const slotsIn = (template) => {
    const found = new Set();
    String(template).replace(/\{(\w+)\}/g, (m, name) => { found.add(name); return m; });
    return found;
  };
  const english = enBank.patterns || [];
  const englishSlots = new Map();
  (Array.isArray(english) ? english : Object.entries(english).map(([id, template]) => ({ id, template })))
    .forEach((entry) => englishSlots.set(entry.id, slotsIn(entry.template)));
  LANGS.forEach((code) => {
    const bankData = globalThis["NORTHCUE_TEMPLATES_" + code.toUpperCase()];
    const patterns = (bankData && bankData.patterns) || {};
    Object.entries(patterns).forEach(([id, template]) => {
      const allowed = englishSlots.get(id);
      slotsIn(template).forEach((slot) => {
        assert.ok(allowed && allowed.has(slot),
          code + " " + id + " uses {" + slot + "} which the English pattern does not capture");
      });
    });
  });
});

// APP-INTERNAL STRINGS NEVER REACH CARDS, the founder's batched word on
// pa-21: the error namespace exists for interface panels. The bank only
// translates engine card sentences, and no engine card across the whole
// corpus may ever carry an error-namespace English source string.
test("no corpus card carries an error-namespace string", () => {
  const { runClearStepsEngine } = require(path.join(REPO, "src", "services", "clearStepsEngine"));
  const { CORPUS } = require(path.join(REPO, "scripts", "engine-baseline", "corpus"));
  const errorStrings = Object.entries(enBank.exact || {})
    .filter(([id]) => id.startsWith("tpl.error."))
    .map(([, text]) => text)
    .filter((text) => typeof text === "string" && text.length > 0);
  assert.ok(errorStrings.length > 0, "premise: the error namespace exists");
  CORPUS.forEach((entry) => {
    const cards = runClearStepsEngine({
      extractedText: entry.text,
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "error-sweep" }
    }).api_output.structured_result.cards;
    const blob = JSON.stringify(cards);
    errorStrings.forEach((text) => {
      assert.ok(!blob.includes(text), entry.id + " carries an interface error string");
    });
  });
});
