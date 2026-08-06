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

    // THE LAUNCH SWITCH, per language since the founder's two-wave decision
    // of 6 August 2026: open lists the language codes whose AI phrasing
    // pass is live. Adding a code, in one commit the founder approves, does
    // two things AT ONCE and nothing before it: the server opens the
    // phrasing pass for that language (providerSkipReason reads this file),
    // and the client swaps in the launch privacy wording FOR THAT LANGUAGE
    // (i18n.js reads data-i18n-launch and data-launch-reveal for the active
    // language only, so a reader whose language is not yet open never sees
    // wording that is not yet true for them). Gates and copy cannot ship
    // apart because they are the same list in the same file. Empty today:
    // wave one adds gu and hi in the founder-approved flag commit; wave two
    // adds each remaining language on its verified pack and his word.
    // proseArchitecture decides HOW a launched reader's prose is produced,
    // uniformly for every launched non-English language, Latin and Indic
    // script alike:
    //   "generate"   the model writes the cards in the reader's language
    //                directly (wave one's original path)
    //   "translate"  the model writes the cards in English, the full English
    //                guard stack runs on them, then a second call translates
    //                the guarded cards into the reader's language and that
    //                language's guard vocabulary runs on the translation
    // Approved by the founder on 6 August 2026 after reading Gujarati and
    // Hindi side-by-side samples; the value flips to "translate" in one
    // founder-approved commit, exactly as launch.open entries do, and wave
    // two languages open onto whatever this says, which after that commit
    // is the only non-English path.
    launch: { open: ["gu", "hi"], proseArchitecture: "translate" },

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
