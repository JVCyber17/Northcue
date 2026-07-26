// Northcue i18n language configuration.
// The enabled flag per language is the go live control: a language stays off
// in production until its translation files are human checked. English is
// always available and always the fallback.
(function (root) {
  var config = {
    defaultLanguage: "en",
    languages: [
      { code: "en", nativeName: "English", enabled: true },
      { code: "pl", nativeName: "Polski", enabled: true },
      { code: "ro", nativeName: "Română", enabled: true },
      { code: "gu", nativeName: "ગુજરાતી", enabled: true },
      { code: "hi", nativeName: "हिन्दी", enabled: true },
      { code: "bn", nativeName: "বাংলা", enabled: true },
      { code: "pt", nativeName: "Português", enabled: true }
    ]
  };

  root.NORTHCUE_I18N_CONFIG = config;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = config;
  }
})(typeof window !== "undefined" ? window : globalThis);
