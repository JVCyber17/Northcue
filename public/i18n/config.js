// Northcue i18n language configuration.
// The enabled flag per language is the go live control: a language stays off
// in production until its translation files are human checked. English is
// always available and always the fallback.
//
// The banner strings live here rather than in the per language dictionaries
// because the first visit banner must speak the DETECTED language before its
// dictionary has loaded. DRAFT PENDING HUMAN REVIEW: every non English banner
// string below is a machine draft awaiting a human check, like the language
// files themselves. No em or en dashes anywhere.
(function (root) {
  var config = {
    defaultLanguage: "en",
    languages: [
      {
        code: "en",
        nativeName: "English",
        enabled: true,
        bannerOffer: "Northcue is available in English.",
        bannerSwitch: "Switch to English",
        bannerDismiss: "No thanks"
      },
      {
        code: "pl",
        nativeName: "Polski",
        enabled: false,
        bannerOffer: "Northcue jest dostępne po polsku.",
        bannerSwitch: "Przełącz na polski",
        bannerDismiss: "Nie, dziękuję"
      },
      {
        code: "ro",
        nativeName: "Română",
        enabled: false,
        bannerOffer: "Northcue este disponibil în limba română.",
        bannerSwitch: "Comută la română",
        bannerDismiss: "Nu, mulțumesc"
      },
      {
        code: "gu",
        nativeName: "ગુજરાતી",
        enabled: false,
        bannerOffer: "Northcue ગુજરાતીમાં ઉપલબ્ધ છે.",
        bannerSwitch: "ગુજરાતીમાં બદલો",
        bannerDismiss: "ના, આભાર"
      },
      {
        code: "hi",
        nativeName: "हिन्दी",
        enabled: false,
        bannerOffer: "Northcue हिन्दी में उपलब्ध है.",
        bannerSwitch: "हिन्दी में बदलें",
        bannerDismiss: "नहीं, धन्यवाद"
      },
      {
        code: "bn",
        nativeName: "বাংলা",
        enabled: false,
        bannerOffer: "Northcue বাংলায় উপলব্ধ.",
        bannerSwitch: "বাংলায় পরিবর্তন করুন",
        bannerDismiss: "না, ধন্যবাদ"
      },
      {
        code: "pt",
        nativeName: "Português",
        enabled: false,
        bannerOffer: "O Northcue está disponível em português.",
        bannerSwitch: "Mudar para português",
        bannerDismiss: "Não, obrigado"
      },
      {
        code: "es",
        nativeName: "Español",
        enabled: false,
        bannerOffer: "Northcue está disponible en español.",
        bannerSwitch: "Cambiar a español",
        bannerDismiss: "No, gracias"
      },
      {
        code: "fr",
        nativeName: "Français",
        enabled: false,
        bannerOffer: "Northcue est disponible en français.",
        bannerSwitch: "Passer au français",
        bannerDismiss: "Non, merci"
      },
      {
        code: "pa",
        nativeName: "ਪੰਜਾਬੀ",
        enabled: false,
        bannerOffer: "Northcue ਪੰਜਾਬੀ ਵਿੱਚ ਉਪਲਬਧ ਹੈ.",
        bannerSwitch: "ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲੋ",
        bannerDismiss: "ਨਹੀਂ, ਧੰਨਵਾਦ"
      }
    ]
  };

  root.NORTHCUE_I18N_CONFIG = config;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = config;
  }
})(typeof window !== "undefined" ? window : globalThis);
