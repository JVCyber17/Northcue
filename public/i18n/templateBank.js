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
      var map = new Map();
      var prefix = "tpl.label." + slot + ".";
      Object.keys(exact).forEach(function (id) {
        if (id.indexOf(prefix) === 0) {
          map.set(String(exact[id]).toLowerCase(), id);
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
    var id = index[slotName] ? index[slotName].get(needle) : undefined;
    if (!id) {
      for (var i = 0; i < VOCABULARY_SLOTS.length && !id; i++) {
        var slotMap = index[VOCABULARY_SLOTS[i]];
        id = slotMap ? slotMap.get(needle) : undefined;
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

  // English sentence to template id, built once and consulted as a Map so an
  // exact lookup is constant time no matter how large the bank grows.
  var exactIndex = null;

  function exactIdFor(text) {
    if (!exactIndex) {
      exactIndex = new Map();
      var exact = englishBank().exact;
      Object.keys(exact).forEach(function (id) {
        exactIndex.set(exact[id], id);
      });
    }
    return exactIndex.has(text) ? exactIndex.get(text) : null;
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
          var filled = fillTemplate(translatedTemplate, match.groups || {}, target);
          // A RAW SLOT NEVER REACHES A READER. Found by the Panjabi
          // verification pack, 7 August 2026: a translated template whose
          // slot the English pattern did not capture rendered with the
          // literal token visible, "... ਇਹ ਹੋਵੇਗਾ: {consequence}." on a
          // reader-facing line. fillTemplate deliberately leaves an
          // unfilled slot in place rather than guessing; this is the
          // matching rule that an unfilled render is a MISS, so the reader
          // gets the untranslated English sentence, the bank's honest
          // fallback, instead of a template artefact.
          if (/\{\w+\}/.test(filled)) {
            return { text: source, translated: false, templateId: patterns[i].id };
          }
          return {
            text: filled,
            translated: true,
            templateId: patterns[i].id
          };
        }
        return { text: source, translated: false, templateId: patterns[i].id };
      }
    }

    return { text: source, translated: false, templateId: null };
  }

  // Which English sentence this is, or null, independent of the active
  // language. translateEngineSentence cannot answer this: it returns early for
  // English with templateId null, so a caller that needs to know WHICH sentence
  // the engine wrote would get an answer that changed with the language switch.
  //
  // The caller is the card 4 passed-deadline line, which may appear under
  // "Due by {date}." and "Your appointment is on {date}." and must not appear
  // under the reading-aid path's "The document shows {date} as the date that
  // matters." Those three ids ARE that distinction, so asking the bank is both
  // more precise and more durable than matching the sentences as strings.
  function templateIdFor(text) {
    var source = String(text == null ? "" : text);
    if (!source) return null;

    var exactId = exactIdFor(source);
    if (exactId) return exactId;

    var patterns = compilePatterns();
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].regex.test(source)) return patterns[i].id;
    }
    return null;
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
    templateIdFor: templateIdFor,
    resetCaches: resetCaches
  };

  root.NorthcueTemplateBank = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
