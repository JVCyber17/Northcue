// Guards card 2's key points: why the engine called a document serious.
//
// severity_signals holds keyword matches from detectSeveritySignals. The stakes
// floor raises severity from detectSeriousDocumentSignals, a DIFFERENT list, and
// never writes to the first one. So card 2 rendered "This is urgent. You may
// need to act today." with nothing under it on three high stakes documents,
// while serious_document_signals held exactly the explanation, read by nothing.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "serious-signals-test" }
  });
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

test("a serious document explains itself on card 2", async (t) => {
  await t.test("no document may hold serious signals and show an empty card 2", () => {
    // The property this work exists for, stated across the whole corpus rather
    // than as a list of documents.
    const offenders = [];
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      const trust = run.structured_output.trust_internal;
      if (!(trust.serious_document_signals || []).length) return;
      if (!["high", "urgent"].includes(trust.severity_level)) return;
      const keyPoints = run.api_output.structured_result.cards[1].key_points;
      if (!keyPoints.length) {
        offenders.push(entry.id + ": signals " +
          JSON.stringify(trust.serious_document_signals) + " but card 2 has no key points");
      }
    });
    assert.deepEqual(offenders, []);
  });

  await t.test("the three that were empty now say why", () => {
    const EXPECTED = {
      bailiff_enforcement: "This mentions enforcement action or bailiffs.",
      ocr_enforcement: "This mentions enforcement action or bailiffs.",
      legal_solicitor: "This mentions court action."
    };
    Object.entries(EXPECTED).forEach(([id, sentence]) => {
      assert.deepEqual(analyse(byId(id)).api_output.structured_result.cards[1].key_points,
        [sentence], id);
    });
  });

  await t.test("nothing raw from the document reaches the card", () => {
    // The signals are matched phrases, not sentences. Showing them verbatim
    // would read as debug output, and on a damaged document it would be the
    // damage.
    CORPUS.forEach((entry) => {
      const run = analyse(entry.text);
      const signals = run.structured_output.trust_internal.serious_document_signals || [];
      const keyPoints = run.api_output.structured_result.cards[1].key_points;
      signals.forEach((phrase) => {
        assert.ok(!keyPoints.includes(phrase),
          entry.id + ": the raw phrase " + JSON.stringify(phrase) + " reached the card");
      });
    });
  });
});

test("the same thing is never said twice on card 2", async (t) => {
  await t.test("a theme already covered by a severity signal is not repeated", () => {
    // court_fine matches "bailiff", which severity_signals already reports as
    // "Mentions bailiff action." Adding "This mentions enforcement action or
    // bailiffs." beside it would be the redundancy themes exist to remove,
    // arriving from the other list.
    const keyPoints = analyse(byId("court_fine")).api_output.structured_result.cards[1].key_points;
    assert.deepEqual(keyPoints, ["Mentions bailiff action."]);
  });

  await t.test("two phrases in one theme produce one sentence", () => {
    // bailiff_enforcement matches both "notice of enforcement" and
    // "enforcement agent".
    const run = analyse(byId("bailiff_enforcement"));
    assert.equal(run.structured_output.trust_internal.serious_document_signals.length, 2,
      "premise: two phrases matched");
    assert.equal(run.api_output.structured_result.cards[1].key_points.length, 1,
      "one theme, one sentence");
  });

  await t.test("distinct themes each get their own sentence", () => {
    const keyPoints = analyse(byId("eviction_possession")).api_output.structured_result.cards[1].key_points;
    assert.deepEqual(keyPoints, ["Mentions eviction risk.", "This mentions court action."]);
  });

  await t.test("cards stay short: never more than four key points", () => {
    CORPUS.forEach((entry) => {
      const keyPoints = analyse(entry.text).api_output.structured_result.cards[1].key_points;
      assert.ok(keyPoints.length <= 4, entry.id + ": " + keyPoints.length + " key points");
    });
  });
});

test("every theme sentence is in the bank, in every language", async (t) => {
  await t.test("all seven, all ten files", () => {
    // adding-a-bank-sentence.md: an engine sentence not in the bank renders in
    // English for every other language.
    const THEMES = ["enforcement", "possession", "insolvency", "court", "debt", "supply", "immigration"];
    const languages = require(path.join(__dirname, "..", "public", "i18n", "config.js"))
      .languages.map((entry) => entry.code);
    languages.forEach((code) => {
      const bank = require(path.join(__dirname, "..", "public", "i18n", "templates-" + code + ".js"));
      THEMES.forEach((theme) => {
        const sentence = bank.exact["tpl.serious." + theme];
        assert.ok(sentence, code + " is missing tpl.serious." + theme);
        assert.doesNotMatch(sentence, /[–—]/, code + " tpl.serious." + theme + " has a dash");
      });
    });
  });

  await t.test("every theme the engine can emit has a sentence", () => {
    // A phrase mapped to a theme with no sentence would render as undefined.
    const source = require("node:fs").readFileSync(
      path.join(__dirname, "..", "src", "services", "clearStepsEngine.js"), "utf8");
    const themes = source.match(/const SERIOUS_SIGNAL_THEMES = \{([\s\S]*?)\n\};/);
    const sentences = source.match(/const SERIOUS_SIGNAL_SENTENCES = \{([\s\S]*?)\n\};/);
    assert.ok(themes && sentences, "both maps must exist in the engine");
    const themeKeys = (themes[1].match(/^\s{2}(\w+):/gm) || []).map((m) => m.trim().replace(":", ""));
    themeKeys.forEach((key) => {
      assert.ok(sentences[1].includes(key + ":"), "theme " + key + " has no sentence");
    });
  });
});
