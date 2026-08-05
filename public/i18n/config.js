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
//
// Per language behaviour lives here as data, never as code branches in app.js
// (see docs/i18n/engineering-standards.md). invertedNumberFormat marks the
// languages that write 1.234,56 where the UK writes 1,234.56, so an amount
// copied verbatim off a UK letter is ambiguous and the money format note must
// show. Languages without the flag never see the note.
(function (root) {
  var config = {
    defaultLanguage: "en",

    // THE SINGLE LAUNCH SWITCH. Flipping open to true, in one commit the
    // founder approves, does two things AT ONCE and nothing before it:
    // the server opens the AI phrasing pass to every enabled language
    // (providerSkipReason reads this file), and the client swaps in the
    // launch privacy wording (i18n.js reads data-i18n-launch and
    // data-launch-reveal). Gates and copy cannot ship apart because they
    // are the same flag in the same file. False today, deliberately:
    // nothing opens until the founder says open.
    launch: { open: false },

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
        enabled: true,
        invertedNumberFormat: true,
        bannerOffer: "Northcue jest dostępne po polsku.",
        bannerSwitch: "Przełącz na polski",
        bannerDismiss: "Nie, dziękuję"
      },
      {
        code: "ro",
        nativeName: "Română",
        enabled: true,
        invertedNumberFormat: true,
        bannerOffer: "Northcue este disponibil în limba română.",
        bannerSwitch: "Comută la română",
        bannerDismiss: "Nu, mulțumesc"
      },
      {
        code: "gu",
        nativeName: "ગુજરાતી",
        enabled: true,
        bannerOffer: "Northcue ગુજરાતીમાં ઉપલબ્ધ છે.",
        bannerSwitch: "ગુજરાતીમાં બદલો",
        bannerDismiss: "ના, આભાર"
      },
      {
        code: "hi",
        nativeName: "हिन्दी",
        enabled: true,
        bannerOffer: "Northcue हिन्दी में उपलब्ध है.",
        bannerSwitch: "हिन्दी में बदलें",
        bannerDismiss: "नहीं, धन्यवाद"
      },
      {
        code: "bn",
        nativeName: "বাংলা",
        enabled: true,
        bannerOffer: "Northcue বাংলায় উপলব্ধ.",
        bannerSwitch: "বাংলায় পরিবর্তন করুন",
        bannerDismiss: "না, ধন্যবাদ"
      },
      {
        code: "pt",
        nativeName: "Português",
        enabled: true,
        invertedNumberFormat: true,
        bannerOffer: "O Northcue está disponível em português.",
        bannerSwitch: "Mudar para português",
        bannerDismiss: "Não, obrigado"
      },
      {
        code: "es",
        nativeName: "Español",
        enabled: true,
        invertedNumberFormat: true,
        bannerOffer: "Northcue está disponible en español.",
        bannerSwitch: "Cambiar a español",
        bannerDismiss: "No, gracias"
      },
      {
        code: "fr",
        nativeName: "Français",
        enabled: true,
        invertedNumberFormat: true,
        bannerOffer: "Northcue est disponible en français.",
        bannerSwitch: "Passer au français",
        bannerDismiss: "Non, merci"
      },
      {
        code: "pa",
        nativeName: "ਪੰਜਾਬੀ",
        enabled: true,
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
