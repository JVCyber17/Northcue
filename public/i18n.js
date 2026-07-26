// Northcue i18n runtime.
//
// Deterministic lookup only, never generation. Tier 1 strings resolve through
// t(key) against the active language dictionary with automatic English
// fallback. Static markup is tagged with data-i18n attributes and rewritten by
// applyTranslations(); text built in app.js calls t() directly at render time,
// so it always reflects the active language with no re walking.
//
// English mode is inert on first load: no DOM rewriting happens until a non
// English language is chosen, so English behaviour is byte identical to the
// untagged site. Switching back to English rewrites from the English
// dictionary, whose entries are generated verbatim from the markup.
//
// Dictionaries are plain scripts assigning window.NORTHCUE_STRINGS_<CODE>.
// English ships in the page; other languages load on demand by script
// injection and are cached for the session.
(function (root) {
  var STORAGE_KEY = "northcue_language";
  var BANNER_DISMISS_KEY = "northcue_language_banner_dismissed";
  var VERSION = "i18n-20260714a";

  function config() {
    return root.NORTHCUE_I18N_CONFIG || { defaultLanguage: "en", languages: [{ code: "en", nativeName: "English", enabled: true }] };
  }

  function languageList() {
    return config().languages.filter(function (entry) { return entry.enabled; });
  }

  function isSupported(code) {
    return languageList().some(function (entry) { return entry.code === code; });
  }

  function dictionaryFor(code) {
    return root["NORTHCUE_STRINGS_" + String(code || "").toUpperCase()] || null;
  }

  var activeLanguage = "en";

  function storedLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function getLanguage() {
    return activeLanguage;
  }

  function interpolate(text, params) {
    if (!params) return text;
    return String(text).replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match;
    });
  }

  // Tier 1 lookup: active dictionary, then English, then the key itself so a
  // missing entry is visible in testing rather than silently blank.
  function t(key, params) {
    var dict = dictionaryFor(activeLanguage);
    var english = dictionaryFor("en") || {};
    var value = dict && Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : english[key];
    if (value === undefined) value = key;
    return interpolate(value, params);
  }

  var ATTRIBUTE_MAP = [
    ["data-i18n-aria-label", "aria-label"],
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-alt", "alt"],
    ["data-i18n-content", "content"],
    ["data-i18n-value", "value"]
  ];

  function applyTranslations(rootNode) {
    var scope = rootNode || document;
    scope.querySelectorAll("[data-i18n]").forEach(function (element) {
      var key = element.getAttribute("data-i18n");
      if (key) element.textContent = t(key);
    });
    ATTRIBUTE_MAP.forEach(function (pair) {
      scope.querySelectorAll("[" + pair[0] + "]").forEach(function (element) {
        var key = element.getAttribute(pair[0]);
        if (key) element.setAttribute(pair[1], t(key));
      });
    });
    if (!rootNode) {
      document.title = t("meta.title");
    }
  }

  function markDocumentLanguage(code) {
    document.documentElement.setAttribute("lang", code);
    document.body.dataset.lang = code;
  }

  var loadedLanguages = { en: true };

  function injectScript(src, onDone) {
    var script = document.createElement("script");
    script.src = src;
    script.onload = function () { onDone(true); };
    script.onerror = function () { onDone(false); };
    document.head.appendChild(script);
  }

  // Loads both files for a language: the Tier 1 dictionary (required) and
  // the Tier 2 template bank (optional; a missing bank simply means engine
  // sentences fall back to English with the notice). The bank matcher's
  // caches are reset so newly arrived templates are picked up.
  function loadLanguageFile(code, onReady) {
    if (loadedLanguages[code] || dictionaryFor(code)) {
      loadedLanguages[code] = true;
      onReady(true);
      return;
    }
    injectScript("/i18n/" + code + ".js?v=" + VERSION, function (dictionaryOk) {
      injectScript("/i18n/templates-" + code + ".js?v=" + VERSION, function () {
        if (root.NorthcueTemplateBank) {
          root.NorthcueTemplateBank.resetCaches();
        }
        loadedLanguages[code] = dictionaryOk;
        onReady(dictionaryOk);
      });
    });
  }

  // Applies a language: loads its dictionary if needed, rewrites tagged
  // markup, updates html lang, and remembers the choice. Falls back to
  // English if the file cannot be loaded.
  function setLanguage(code, options) {
    var settings = options || {};
    var target = isSupported(code) ? code : "en";
    loadLanguageFile(target, function (ok) {
      activeLanguage = ok ? target : "en";
      markDocumentLanguage(activeLanguage);
      applyTranslations();
      if (settings.remember !== false) {
        try { localStorage.setItem(STORAGE_KEY, activeLanguage); } catch (error) { /* private mode */ }
      }
      document.dispatchEvent(new CustomEvent("northcue:languagechange", { detail: { language: activeLanguage } }));
    });
  }

  // First visit detection: browser language matches a supported non English
  // language, no stored choice, banner not previously dismissed. The banner
  // itself is wired in app.js through this state object.
  function detectionState() {
    if (storedLanguage()) return null;
    var dismissed = "";
    try { dismissed = localStorage.getItem(BANNER_DISMISS_KEY) || ""; } catch (error) { /* private mode */ }
    if (dismissed === "1") return null;
    var candidates = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]);
    for (var i = 0; i < candidates.length; i++) {
      var base = String(candidates[i] || "").toLowerCase().split("-")[0];
      if (base && base !== "en" && isSupported(base)) {
        return { language: base };
      }
    }
    return null;
  }

  function dismissDetectionBanner() {
    try { localStorage.setItem(BANNER_DISMISS_KEY, "1"); } catch (error) { /* private mode */ }
  }

  // Initial state: apply a stored non English choice before app.js renders.
  // In English nothing is rewritten, keeping the site identical to today.
  function initialise() {
    var stored = storedLanguage();
    if (stored && stored !== "en" && isSupported(stored)) {
      setLanguage(stored, { remember: false });
    } else {
      activeLanguage = "en";
      markDocumentLanguage("en");
    }
  }

  var api = {
    t: t,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    applyTranslations: applyTranslations,
    languageList: languageList,
    detectionState: detectionState,
    dismissDetectionBanner: dismissDetectionBanner,
    isSupported: isSupported
  };

  root.NorthcueI18n = api;
  root.t = t;

  if (typeof document !== "undefined" && document.body) {
    initialise();
  } else if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initialise);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
