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

  // Compile each English template into an anchored regex with named slot
  // captures. "{amount} is due by {date}" becomes ^(?<amount>.+?) is due by
  // (?<date>.+?)$ with literals escaped. Lazy captures keep boundaries at the
  // literal text between slots. Patterns are tried most specific first, by
  // descending literal character count, so a general template can never
  // shadow a more specific one whose extra words a lazy slot would absorb.
  function compilePatterns() {
    if (compiledPatterns) return compiledPatterns;
    compiledPatterns = englishBank().patterns.map(function (entry) {
      var source = "^" + escapeRegex(entry.template).replace(/\\\{(\w+)\\\}/g, function (m, name) {
        return "(?<" + name + ">.+?)";
      }) + "$";
      var literalLength = entry.template.replace(/\{\w+\}/g, "").length;
      return { id: entry.id, template: entry.template, regex: new RegExp(source), literalLength: literalLength };
    }).sort(function (a, b) { return b.literalLength - a.literalLength; });
    return compiledPatterns;
  }

  function fillTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match;
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
            text: fillTemplate(translatedTemplate, match.groups || {}),
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
