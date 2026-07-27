// Guards the Tier 2 template bank matcher: exact sentence lookup, slot
// pattern extraction with verbatim re insertion, and the English fallback
// path for anything unmatched. The matcher is presentation only and must
// never alter slot values.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

// The bank runtime and the English bank are UMD style browser files that
// attach to globalThis; requiring them in node works the same way.
const bankRuntime = require("../public/i18n/templateBank");
const englishBank = require("../public/i18n/templates-en");

test("template bank matcher", async (t) => {
  // A tiny synthetic target language installed for the test.
  globalThis.NORTHCUE_TEMPLATES_EN = {
    exact: {
      "tpl.test.fixed": "Check the original document.",
      "tpl.test.other": "This looks like a normal document."
    },
    patterns: [
      { id: "tpl.test.due", template: "The document says {amount} is due by {date}." },
      { id: "tpl.test.days", template: "You have {days} days to respond." }
    ]
  };
  globalThis.NORTHCUE_TEMPLATES_XX = {
    exact: {
      "tpl.test.fixed": "XX-CHECK-ORIGINAL"
    },
    patterns: {
      "tpl.test.due": "XX {date} XX {amount} XX"
    }
  };
  bankRuntime.resetCaches();

  await t.test("exact sentences translate by id", () => {
    const result = bankRuntime.translateEngineSentence("Check the original document.", "xx");
    assert.equal(result.translated, true);
    assert.equal(result.text, "XX-CHECK-ORIGINAL");
    assert.equal(result.templateId, "tpl.test.fixed");
  });

  await t.test("slot values are extracted and re inserted verbatim", () => {
    const result = bankRuntime.translateEngineSentence(
      "The document says £187.42 is due by 24 June 2026.",
      "xx"
    );
    assert.equal(result.translated, true);
    // Values appear exactly as in the document, never converted.
    assert.equal(result.text, "XX 24 June 2026 XX £187.42 XX");
  });

  await t.test("an exact sentence missing from the target language falls back to English", () => {
    const result = bankRuntime.translateEngineSentence("This looks like a normal document.", "xx");
    assert.equal(result.translated, false);
    assert.equal(result.text, "This looks like a normal document.");
  });

  await t.test("a pattern missing from the target language falls back to English", () => {
    const result = bankRuntime.translateEngineSentence("You have 14 days to respond.", "xx");
    assert.equal(result.translated, false);
    assert.equal(result.text, "You have 14 days to respond.");
    assert.equal(result.templateId, "tpl.test.days");
  });

  await t.test("an unknown sentence falls back to English with no template id", () => {
    const result = bankRuntime.translateEngineSentence("Entirely novel wording from an AI pass.", "xx");
    assert.equal(result.translated, false);
    assert.equal(result.templateId, null);
  });

  await t.test("English passes through untouched", () => {
    const result = bankRuntime.translateEngineSentence("Anything at all.", "en");
    assert.equal(result.translated, true);
    assert.equal(result.text, "Anything at all.");
  });

  // Restore the real English bank for the remaining checks.
  globalThis.NORTHCUE_TEMPLATES_EN = englishBank;
  delete globalThis.NORTHCUE_TEMPLATES_XX;
  bankRuntime.resetCaches();

  await t.test("the real English bank loads with exact entries and patterns", () => {
    assert.ok(Object.keys(englishBank.exact).length >= 200);
    assert.ok(Array.isArray(englishBank.patterns) && englishBank.patterns.length >= 30);
  });

  await t.test("no bank string contains an em or en dash", () => {
    const offenders = [];
    Object.entries(englishBank.exact).forEach(([id, value]) => {
      if (/[–—]/.test(value)) offenders.push(id);
    });
    englishBank.patterns.forEach((entry) => {
      if (/[–—]/.test(entry.template)) offenders.push(entry.id);
    });
    assert.deepEqual(offenders, []);
  });

  await t.test("Northcue's own vocabulary translates inside a sentence, document values do not", () => {
    // Document type and category labels are Northcue's wording, so leaving
    // them in English produces a half translated sentence. Amounts, dates and
    // sender names come off the reader's letter and must stay verbatim so
    // they still match the paper in their hand.
    const languages = ["pl", "ro", "gu", "hi", "bn", "pt", "es", "fr", "pa"];
    const vocabularyValues = {
      type_label: "an official letter",
      category_label: "a bill or payment request",
      topic: "housing or rent"
    };
    const vocabularyPatterns = englishBank.patterns.filter((entry) =>
      /\{(type_label|category_label|topic)\}/.test(entry.template)
    );
    assert.ok(vocabularyPatterns.length > 0, "expected patterns that embed a label");

    const leaks = [];
    const lostValues = [];
    languages.forEach((code) => {
      const targetBank = require(path.join(__dirname, "..", "public", "i18n", "templates-" + code));
      globalThis["NORTHCUE_TEMPLATES_" + code.toUpperCase()] = targetBank;
      vocabularyPatterns.forEach((entry) => {
        let sentence = entry.template;
        Object.entries(vocabularyValues).forEach(([slot, value]) => {
          sentence = sentence.split("{" + slot + "}").join(value);
        });
        sentence = sentence.replace(/\{\w+\}/g, "Hounslow Council");
        const result = bankRuntime.translateEngineSentence(sentence, code);
        if (!result.translated) return;
        Object.values(vocabularyValues).forEach((value) => {
          if (result.text.includes(value)) leaks.push(code + ":" + entry.id);
        });
        // Only patterns that actually carry a document value can be checked
        // for verbatim survival; several of these embed a label and nothing
        // else. The value came off the reader's letter, so it must survive.
        const carriesDocumentValue = /\{(?!type_label|category_label|topic)\w+\}/.test(entry.template);
        if (carriesDocumentValue && !result.text.includes("Hounslow Council")) {
          lostValues.push(code + ":" + entry.id);
        }
      });
    });
    assert.deepEqual(leaks, [], "Northcue labels must not render in English");
    assert.deepEqual(lostValues, [], "document values must be inserted verbatim");
  });

  await t.test("amounts and dates are never rewritten by the vocabulary lookup", () => {
    globalThis.NORTHCUE_TEMPLATES_PT = require(path.join(__dirname, "..", "public", "i18n", "templates-pt"));
    const result = bankRuntime.translateEngineSentence(
      "Hounslow Council appears to have sent an official notice mentioning £142.50.",
      "pt"
    );
    assert.equal(result.translated, true);
    assert.ok(result.text.includes("£142.50"), "amount must stay exactly as printed on the letter");
    assert.ok(result.text.includes("Hounslow Council"), "sender must stay exactly as printed");
  });

  await t.test("pure assembly templates never act as catch all matchers", () => {
    // "{title} {short_answer}" and friends are the engine's internal assembly
    // templates. If they were matchable they would swallow any unmatched
    // sentence, return it unchanged, and wrongly report it as translated,
    // hiding the shown in English notice from the reader.
    const assemblyIds = englishBank.patterns
      .filter((entry) => entry.template.replace(/\{\w+\}/g, "").trim().length < 4)
      .map((entry) => entry.id);
    assert.ok(assemblyIds.length > 0, "expected some pure assembly templates in the bank");

    globalThis.NORTHCUE_TEMPLATES_YY = { exact: {}, patterns: {} };
    try {
      const result = bankRuntime.translateEngineSentence(
        "A sentence the bank has never seen before.",
        "yy"
      );
      assert.equal(result.translated, false, "an unknown sentence must not report success");
      assert.equal(result.text, "A sentence the bank has never seen before.");
      assert.ok(
        !assemblyIds.includes(result.templateId),
        "an assembly template must never claim an unknown sentence"
      );
    } finally {
      delete globalThis.NORTHCUE_TEMPLATES_YY;
      bankRuntime.resetCaches();
    }
  });

  await t.test("every pattern template compiles and matches its own example", () => {
    // Fill each template's slots with sample values and confirm the compiled
    // pattern matches its own output, which proves the regex round trip. An
    // empty target bank forces the matcher through pattern identification.
    globalThis.NORTHCUE_TEMPLATES_ZZ = { exact: {}, patterns: {} };
    try {
      englishBank.patterns
        // Pure assembly templates are deliberately not matchable, see the
        // catch all test above.
        .filter((entry) => entry.template.replace(/\{\w+\}/g, "").trim().length >= 4)
        .forEach((entry) => {
          const sample = entry.template.replace(/\{(\w+)\}/g, "SAMPLEVALUE");
          const result = bankRuntime.translateEngineSentence(sample, "zz");
          assert.equal(result.templateId, entry.id, "pattern should match its own sample: " + entry.id);
        });
    } finally {
      delete globalThis.NORTHCUE_TEMPLATES_ZZ;
    }
  });
});
