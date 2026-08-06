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
// injection. Only the active language stays resident: switching away unloads
// the previous language's globals, so memory holds English plus at most one
// other language no matter how many the reader tries. Switching back is a
// re-fetch, served by the HTTP cache or the service worker's runtime cache.
(function (root) {
  var STORAGE_KEY = "northcue_language";
  var BANNER_DISMISS_KEY = "northcue_language_banner_dismissed";
  var VERSION = "i18n-20260730a";

  function config() {
    return root.NORTHCUE_I18N_CONFIG || { defaultLanguage: "en", languages: [{ code: "en", nativeName: "English", enabled: true }] };
  }

  function languageList() {
    return config().languages.filter(function (entry) { return entry.enabled; });
  }

  // Local development only preview.
  //
  // Every language ships disabled, which is correct, but it also means there
  // is no way to look at one rendering without editing config.js, and that
  // edit is exactly the thing that must never reach production by accident.
  // This allows ?lang=fr on localhost and does nothing anywhere else.
  //
  // Deliberately narrow, in four separate ways:
  //   1. The host must match a loopback name exactly, or be a real subdomain
  //      of .localhost. Never a substring or bare suffix test, because
  //      "localhost.example.com" and "notlocalhost" would both pass one.
  //   2. The code must be two ASCII letters AND already listed in config.js.
  //      loadLanguageFile() builds a script src from this value, so anything
  //      looser would be a path injection.
  //   3. The choice is never written to localStorage, so a preview cannot
  //      outlive the tab or contaminate a normal session.
  //   4. The enabled flags are not touched and languageList() is unchanged,
  //      so the switcher stays hidden and the detection banner keeps its
  //      production behaviour.
  var LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];
  var LOCALHOST_SUFFIX = ".localhost";

  function isDevPreviewHost(hostname) {
    var candidate = hostname === undefined
      ? (root.location && root.location.hostname)
      : hostname;
    var host = String(candidate == null ? "" : candidate).toLowerCase();
    if (!host) return false;
    if (LOOPBACK_HOSTS.indexOf(host) !== -1) return true;
    // A named loopback subdomain such as app.localhost also resolves locally.
    // The length test is what stops the bare string ".localhost" and anything
    // that merely ends in those letters, like "evillocalhost".
    return host.length > LOCALHOST_SUFFIX.length &&
      host.slice(-LOCALHOST_SUFFIX.length) === LOCALHOST_SUFFIX;
  }

  function isKnownLanguage(code) {
    return config().languages.some(function (entry) { return entry.code === code; });
  }

  function devPreviewLanguage() {
    if (!isDevPreviewHost()) return "";
    var search = (root.location && root.location.search) || "";
    var match = /[?&]lang=([A-Za-z]{2})(?:&|$)/.exec(search);
    if (!match) return "";
    var code = match[1].toLowerCase();
    return isKnownLanguage(code) ? code : "";
  }

  function isSupported(code) {
    if (languageList().some(function (entry) { return entry.code === code; })) return true;
    // A disabled language counts as supported only for the one code named in
    // the URL, and only on a development host.
    return Boolean(code) && code === devPreviewLanguage();
  }

  function dictionaryFor(code) {
    return root["NORTHCUE_STRINGS_" + String(code || "").toUpperCase()] || null;
  }

  // The config entry for a language, defaulting to the active one. This is
  // how application code reads per language behaviour flags (for example
  // invertedNumberFormat), so language differences stay data in config.js
  // rather than code branches.
  function languageEntry(code) {
    var wanted = code || activeLanguage;
    return config().languages.filter(function (entry) { return entry.code === wanted; })[0] || null;
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
    // THE LAUNCH COPY SWAP, driven by the same per-language list that opens
    // the gates (config.launch.open), so the privacy wording and a
    // language's launch ship as one change or not at all. The swap applies
    // for the ACTIVE language only: a launched language's reader and the
    // English reader see the launch wording, because for them it is true;
    // a reader whose language has not launched keeps today's wording,
    // because "AI phrases it in your language" is not yet true for them.
    var openList = (root.NORTHCUE_I18N_CONFIG &&
      root.NORTHCUE_I18N_CONFIG.launch && root.NORTHCUE_I18N_CONFIG.launch.open) || [];
    var active = activeLanguage;
    var launched = Array.isArray(openList) && openList.length > 0 &&
      (openList.indexOf(active) !== -1 || active === "en");
    if (launched) {
      scope.querySelectorAll("[data-i18n-launch]").forEach(function (element) {
        var key = element.getAttribute("data-i18n-launch");
        if (key) element.textContent = t(key);
      });
      scope.querySelectorAll("[data-launch-reveal]").forEach(function (element) {
        element.hidden = false;
      });
    }
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

  // Removes a non English language from memory: its two window globals and
  // its loaded flag. English never unloads, because it is the canonical key
  // set, the matcher's source keys, and the fallback. The bank caches are
  // English derived, so they survive an unload untouched.
  function unloadLanguage(code) {
    if (!code || code === "en") return;
    var suffix = String(code).toUpperCase();
    delete root["NORTHCUE_STRINGS_" + suffix];
    delete root["NORTHCUE_TEMPLATES_" + suffix];
    delete loadedLanguages[code];
  }

  // Applies a language: loads its dictionary if needed, rewrites tagged
  // markup, updates html lang, and remembers the choice. Falls back to
  // English if the file cannot be loaded. The previously active language is
  // unloaded, so only English plus the active language stay in memory.
  function setLanguage(code, options) {
    var settings = options || {};
    var target = isSupported(code) ? code : "en";
    var previous = activeLanguage;
    loadLanguageFile(target, function (ok) {
      activeLanguage = ok ? target : "en";
      if (previous !== activeLanguage) unloadLanguage(previous);
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
    // A development preview wins over any stored choice, and is never
    // remembered, so removing the query parameter restores normal behaviour
    // on the next load.
    var preview = devPreviewLanguage();
    if (preview && preview !== "en") {
      setLanguage(preview, { remember: false });
      showDevPreviewBadge(preview);
      return;
    }

    var stored = storedLanguage();
    if (stored && stored !== "en" && isSupported(stored)) {
      setLanguage(stored, { remember: false });
    } else {
      activeLanguage = "en";
      markDocumentLanguage("en");
    }
  }

  // Makes it obvious that what is on screen is a preview of an unreleased
  // language, so a disabled language can never be mistaken for shipped state.
  // Only ever created when devPreviewLanguage() has already returned a code,
  // which cannot happen off a development host.
  function showDevPreviewBadge(code) {
    if (!document.body || document.querySelector(".dev-language-preview")) return;
    var entry = config().languages.filter(function (item) { return item.code === code; })[0];
    var badge = document.createElement("div");
    badge.className = "dev-language-preview";
    badge.setAttribute("role", "status");
    badge.textContent = "Local preview: " + ((entry && entry.nativeName) || code) +
      " (" + code + "), disabled in production";
    document.body.appendChild(badge);
  }

  var api = {
    t: t,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    applyTranslations: applyTranslations,
    languageList: languageList,
    languageEntry: languageEntry,
    // Exported so the active-language-only memory policy is testable.
    unloadLanguage: unloadLanguage,
    detectionState: detectionState,
    dismissDetectionBanner: dismissDetectionBanner,
    isSupported: isSupported,
    // Exported for tests. isDevPreviewHost takes an explicit hostname so the
    // predicate can be checked against hostile values without a browser.
    isDevPreviewHost: isDevPreviewHost,
    devPreviewLanguage: devPreviewLanguage
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
