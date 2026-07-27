// Northcue template bank runtime, Tier 2.
//
// Deterministic translation of engine built card text by lookup only. The
// English bank (templates-en.js) defines every sentence the rules engine can
// emit, as exact strings or slot templates. A translated bank per language
// maps the same ids to reviewed translations. At render time:
//   1. exact match on the whole string, or
//   2. pattern match that extracts slot values, which are re inserted into
//      the translated template verbatim, never converted or localised, or
//   3. no match: the English text is returned unchanged and flagged, so the
//      caller shows it in English with a small translated notice.
// Safety judgement never passes through here; this is presentation only.
(function (root) {
  var compiledPatterns = null;

  function englishBank() {
    return root.NORTHCUE_TEMPLATES_EN || { exact: {}, patterns: [] };
  }

  function bankFor(code) {
    if (!code || code === "en") return null;
    return root["NORTHCUE_TEMPLATES_" + String(code).toUpperCase()] || null;
  }

  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // A template made almost entirely of slots, for example "{title}
  // {short_answer}", would match ANY sentence and hand it back unchanged while
  // reporting success. Those are the engine's internal assembly templates for
  // display_text and the speech script, not card sentences a reader sees, so
  // they are excluded from matching. Without this guard a sentence with no
  // real translation would be silently passed off as translated and the shown
  // in English notice would never appear. Four characters of literal text is
  // enough to keep every genuine template (the shortest real one is
  // "Check {action_sentence}") while excluding the pure assembly ones.
  var MIN_LITERAL_ANCHOR = 4;

  function literalLengthOf(template) {
    return template.replace(/\{\w+\}/g, "").trim().length;
  }

  // Compile each English template into an anchored regex with named slot
  // captures. "{amount} is due by {date}" becomes ^(?<amount>.+?) is due by
  // (?<date>.+?)$ with literals escaped. Lazy captures keep boundaries at the
  // literal text between slots. Patterns are tried most specific first, by
  // descending literal character count, so a general template can never
  // shadow a more specific one whose extra words a lazy slot would absorb.
  function compilePatterns() {
    if (compiledPatterns) return compiledPatterns;
    compiledPatterns = englishBank().patterns
      .filter(function (entry) { return literalLengthOf(entry.template) >= MIN_LITERAL_ANCHOR; })
      .map(function (entry) {
        var source = "^" + escapeRegex(entry.template).replace(/\\\{(\w+)\\\}/g, function (m, name) {
          return "(?<" + name + ">.+?)";
        }) + "$";
        return { id: entry.id, template: entry.template, regex: new RegExp(source), literalLength: literalLengthOf(entry.template) };
      })
      .sort(function (a, b) { return b.literalLength - a.literalLength; });
    return compiledPatterns;
  }

  // Slots whose value is Northcue's OWN vocabulary rather than something read
  // off the reader's letter. These have reviewed translations in the bank
  // under tpl.label.<slot>.*, so leaving them in English produces a sentence
  // that is half translated. Every other slot (amount, date, sender, dates,
  // header_date and the document derived clauses) is inserted verbatim on
  // purpose, so the value still matches the letter in the reader's hand.
  var VOCABULARY_SLOTS = ["type_label", "category_label", "topic"];

  var vocabularyIndex = null;

  // English label value to id, scoped per slot so a value can never resolve
  // to a label from an unrelated namespace. Matching is case insensitive
  // because the engine may capitalise a label at the start of a sentence.
  function buildVocabularyIndex() {
    if (vocabularyIndex) return vocabularyIndex;
    vocabularyIndex = {};
    var exact = englishBank().exact;
    VOCABULARY_SLOTS.forEach(function (slot) {
      var map = {};
      var prefix = "tpl.label." + slot + ".";
      Object.keys(exact).forEach(function (id) {
        if (id.indexOf(prefix) === 0) {
          map[String(exact[id]).toLowerCase()] = id;
        }
      });
      vocabularyIndex[slot] = map;
    });
    return vocabularyIndex;
  }

  function translateVocabularyValue(slotName, value, targetBank) {
    if (VOCABULARY_SLOTS.indexOf(slotName) === -1) return value;
    var index = buildVocabularyIndex();
    var needle = String(value).trim().toLowerCase();
    // Prefer the namespace that matches this slot, then fall back to the
    // other vocabulary namespaces, because the engine can legitimately put a
    // category style label into a type slot. Only ever matches Northcue's own
    // label vocabulary, so a document value can never be rewritten this way.
    var id = (index[slotName] || {})[needle];
    if (!id) {
      for (var i = 0; i < VOCABULARY_SLOTS.length && !id; i++) {
        id = (index[VOCABULARY_SLOTS[i]] || {})[needle];
      }
    }
    if (!id) return value;
    var translated = (targetBank.exact || {})[id];
    return translated === undefined ? value : translated;
  }

  function fillTemplate(template, values, targetBank) {
    return template.replace(/\{(\w+)\}/g, function (match, name) {
      if (!Object.prototype.hasOwnProperty.call(values, name)) return match;
      var value = values[name];
      return targetBank ? translateVocabularyValue(name, value, targetBank) : value;
    });
  }

  var exactIndex = null;

  function exactIdFor(text) {
    if (!exactIndex) {
      exactIndex = {};
      var exact = englishBank().exact;
      Object.keys(exact).forEach(function (id) {
        exactIndex[exact[id]] = id;
      });
    }
    return Object.prototype.hasOwnProperty.call(exactIndex, text) ? exactIndex[text] : null;
  }

  // Translate one engine sentence into the target language. Returns
  // { text, translated, templateId }. When translated is false the caller
  // must keep the English text and may show the shown-in-English notice.
  function translateEngineSentence(text, languageCode) {
    var source = String(text == null ? "" : text);
    if (!source || !languageCode || languageCode === "en") {
      return { text: source, translated: true, templateId: null };
    }
    var target = bankFor(languageCode);
    if (!target) {
      return { text: source, translated: false, templateId: null };
    }

    var exactId = exactIdFor(source);
    if (exactId && Object.prototype.hasOwnProperty.call(target.exact || {}, exactId)) {
      return { text: target.exact[exactId], translated: true, templateId: exactId };
    }

    var patterns = compilePatterns();
    for (var i = 0; i < patterns.length; i++) {
      var match = patterns[i].regex.exec(source);
      if (match) {
        var translatedTemplate = (target.patterns || {})[patterns[i].id];
        if (translatedTemplate) {
          return {
            text: fillTemplate(translatedTemplate, match.groups || {}, target),
            translated: true,
            templateId: patterns[i].id
          };
        }
        return { text: source, translated: false, templateId: patterns[i].id };
      }
    }

    return { text: source, translated: false, templateId: null };
  }

  // Used by tests and by the language file loader to clear caches when a new
  // bank arrives.
  function resetCaches() {
    compiledPatterns = null;
    exactIndex = null;
    vocabularyIndex = null;
  }

  var api = {
    translateEngineSentence: translateEngineSentence,
    resetCaches: resetCaches
  };

  root.NorthcueTemplateBank = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
