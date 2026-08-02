// Spec-anchored corpus documents in the languages the corpus did not cover.
// CORPUS_STRATEGY.md, Tracks 2 and 5.
//
// WHY THESE EXIST. Before them the corpus had no bilingual document of any kind,
// and NOTHING at all in Gujarati, Hindi, Bengali or Panjabi, while the template
// bank carries 371 translated sentences for each of those four. The engine had
// never once been handed a document in a script it claims to serve.
//
// STRUCTURE IS ANCHORED, LANGUAGE IS DRAFTED. Each document's fields come from a
// real template: an NHS outpatient letter, an NHS screening invitation, a DWP
// decision letter, a social landlord rent variation notice, a Council Tax
// Reduction decision. That part is citable.
//
// THE WORDING IN THE FOUR NON-LATIN DOCUMENTS IS NOT NATIVE-REVIEWED, and is
// flagged in NATIVE_REVIEW.md. They are honest about their own limits: they
// exist so the engine is exercised against these scripts at all, which is
// strictly better than the zero coverage they replace, and they must not be
// treated as evidence about wording until a native speaker has read them.

"use strict";

const SPEC_BILINGUAL_EN_PL = [
  "Meadowbank Borough Council",
  "Council Tax Reduction decision / Decyzja o obnizce podatku Council Tax",
  "",
  "Mr P Nowak",
  "14 Aldergate Road",
  "Meadowbank MB4 2QT",
  "",
  "Council Tax account number / Numer konta Council Tax: 8110 0244 92",
  "Date of this decision / Data decyzji: 12 June 2026",
  "",
  "Dear Mr Nowak",
  "Szanowny Panie Nowak",
  "",
  "We have looked at your application for Council Tax Reduction.",
  "Rozpatrzyliśmy Pańskie podanie o obniżkę podatku Council Tax.",
  "",
  "Your application has been accepted.",
  "Pańskie podanie zostało rozpatrzone pozytywnie.",
  "",
  "Weekly reduction awarded / Przyznana tygodniowa obniżka: £18.40",
  "Period covered / Okres: 1 July 2026 to 31 March 2027",
  "New amount to pay for the year / Nowa kwota do zapłaty za rok: £742.19",
  "",
  "You must pay £74.22 by 1 July 2026.",
  "Musi Pan zapłacić £74.22 do 1 lipca 2026.",
  "",
  "You must tell us within 21 days if your income, savings or household change.",
  "Musi Pan nas powiadomić w ciągu 21 dni, jeśli zmieni się Pański dochód,",
  "oszczędności lub skład gospodarstwa domowego.",
  "",
  "If you disagree with this decision you may ask us for a written statement of",
  "reasons within one month, and you may appeal to the Valuation Tribunal.",
  "Jeśli nie zgadza się Pan z tą decyzją, może Pan w ciągu miesiąca poprosić o",
  "pisemne uzasadnienie oraz odwołać się do Valuation Tribunal.",
  "",
  "Council Tax Reduction enquiries / Zapytania: 0114 273 4570"
].join("\n");

const SPEC_GUJARATI_NHS = [
  "Northbridge Hospital NHS Foundation Trust",
  "બહારના દર્દી વિભાગ",
  "",
  "શ્રીમતી M Patel",
  "31 Halton Road",
  "Coventry CV6 4NS",
  "",
  "દર્દી નંબર: NB-4471028",
  "પત્રની તારીખ: 12 June 2026",
  "",
  "પ્રિય શ્રીમતી Patel,",
  "",
  "તમારી એપોઇન્ટમેન્ટ નક્કી થઈ છે.",
  "",
  "તારીખ: 14 July 2026",
  "સમય: 10:30",
  "વિભાગ: ચામડી વિભાગ, બીજો માળ",
  "",
  "કૃપા કરીને પંદર મિનિટ વહેલા આવો અને આ પત્ર સાથે લાવો.",
  "તમારી દવાઓની યાદી પણ સાથે લાવો.",
  "",
  "જો તમે આવી શકતા ન હો, તો કૃપા કરીને અમને જણાવો.",
  "જો તમે જાણ કર્યા વિના ન આવો, તો તમને યાદીમાંથી દૂર કરવામાં આવી શકે છે.",
  "",
  "ફોન: 024 7666 1200"
].join("\n");

const SPEC_HINDI_DWP = [
  "Department for Work and Pensions",
  "यूनिवर्सल क्रेडिट",
  "",
  "श्री R Sharma",
  "8 Fernbank Avenue",
  "Nottingham NG5 2LT",
  "",
  "राष्ट्रीय बीमा संख्या: QQ 12 34 56 C",
  "पत्र की तारीख: 3 June 2026",
  "",
  "प्रिय श्री Sharma,",
  "",
  "हमने आपके यूनिवर्सल क्रेडिट दावे की समीक्षा की है।",
  "",
  "आपका मासिक भुगतान: £412.66",
  "अगला भुगतान: 18 June 2026",
  "",
  "हमें आपकी आय के बारे में कुछ जानकारी चाहिए।",
  "कृपया 24 June 2026 तक अपने खाते में जानकारी भेजें।",
  "",
  "यदि आप समय पर जानकारी नहीं भेजते हैं, तो आपका भुगतान रोका जा सकता है।",
  "",
  "यदि आपकी परिस्थिति बदलती है तो आपको हमें तुरंत बताना होगा।",
  "",
  "फ़ोन: 0800 328 5644"
].join("\n");

const SPEC_BENGALI_NHS = [
  "Northbridge Hospital NHS Foundation Trust",
  "স্তন স্ক্রিনিং প্রোগ্রাম",
  "",
  "মিসেস F Begum",
  "22 Pinfold Lane",
  "Meadowbank MB3 7HS",
  "",
  "রোগী নম্বর: NB-8842007",
  "চিঠির তারিখ: 5 June 2026",
  "",
  "প্রিয় মিসেস Begum,",
  "",
  "আপনাকে স্তন স্ক্রিনিংয়ের জন্য আমন্ত্রণ জানানো হচ্ছে।",
  "",
  "তারিখ: 9 July 2026",
  "সময়: 14:15",
  "স্থান: স্ক্রিনিং ইউনিট, প্রধান ভবন",
  "",
  "অনুগ্রহ করে দশ মিনিট আগে আসুন এবং এই চিঠিটি সঙ্গে আনুন।",
  "",
  "আপনি যদি আসতে না পারেন, অনুগ্রহ করে আমাদের জানান।",
  "আপনি না জানিয়ে অনুপস্থিত থাকলে আপনাকে আবার আমন্ত্রণ নাও জানানো হতে পারে।",
  "",
  "ফোন: 024 7666 1250"
].join("\n");

const SPEC_PANJABI_COUNCIL = [
  "Meadowbank Borough Council",
  "ਰਿਹਾਇਸ਼ੀ ਸੇਵਾਵਾਂ ਵਿਭਾਗ",
  "",
  "ਸ. J Singh",
  "Flat 6, Carlton House",
  "Meadowbank MB5 0TH",
  "",
  "ਕਿਰਾਏਦਾਰ ਨੰਬਰ: MB-33812",
  "ਪੱਤਰ ਦੀ ਮਿਤੀ: 2 June 2026",
  "",
  "ਸਤਿਕਾਰਯੋਗ ਸ. Singh,",
  "",
  "ਅਸੀਂ ਤੁਹਾਨੂੰ ਦੱਸ ਰਹੇ ਹਾਂ ਕਿ ਤੁਹਾਡਾ ਕਿਰਾਇਆ 1 August 2026 ਤੋਂ ਬਦਲ ਜਾਵੇਗਾ।",
  "",
  "ਮੌਜੂਦਾ ਕਿਰਾਇਆ: £142.30 ਹਰ ਹਫ਼ਤੇ",
  "ਨਵਾਂ ਕਿਰਾਇਆ: £149.80 ਹਰ ਹਫ਼ਤੇ",
  "",
  "ਤੁਹਾਨੂੰ ਕੁਝ ਕਰਨ ਦੀ ਲੋੜ ਨਹੀਂ ਹੈ। ਜੇ ਤੁਸੀਂ ਡਾਇਰੈਕਟ ਡੈਬਿਟ ਨਾਲ ਭੁਗਤਾਨ ਕਰਦੇ ਹੋ",
  "ਤਾਂ ਅਸੀਂ ਰਕਮ ਆਪਣੇ ਆਪ ਬਦਲ ਦੇਵਾਂਗੇ।",
  "",
  "ਜੇ ਤੁਸੀਂ ਹਾਊਸਿੰਗ ਬੈਨੀਫਿਟ ਲੈਂਦੇ ਹੋ ਤਾਂ ਤੁਹਾਨੂੰ ਦਫ਼ਤਰ ਨੂੰ ਦੱਸਣਾ ਪਵੇਗਾ।",
  "",
  "ਫ਼ੋਨ: 0114 273 4567"
].join("\n");

const SPEC_LANGUAGES = [
  {
    id: "spec_bilingual_en_pl_council",
    label: "Bilingual English and Polish Council Tax Reduction decision",
    intent: "TRACK 2. The corpus had no bilingual document of any kind, and English " +
      "councils with large Polish-speaking populations issue exactly this shape. " +
      "Structure from a Council Tax Reduction decision notice: the decision, the " +
      "amount, the period, the duty to report changes within 21 days, and the " +
      "appeal route. EVERY FACT IS STATED TWICE, once per language, which is the " +
      "property no corpus document had.",
    text: SPEC_BILINGUAL_EN_PL
  },
  {
    id: "spec_gujarati_nhs_appointment",
    label: "NHS outpatient appointment letter in Gujarati",
    intent: "TRACK 5, and the first Gujarati document the engine has ever seen. " +
      "Structure from an NHS outpatient template: patient reference, letter date, " +
      "appointment date and time, department, what to bring, and what happens if " +
      "you do not attend. The WORDING is drafted and not native-reviewed.",
    text: SPEC_GUJARATI_NHS
  },
  {
    id: "spec_hindi_dwp_universal_credit",
    label: "DWP Universal Credit letter in Hindi",
    intent: "TRACK 5, and the first Hindi document. Structure from a DWP decision " +
      "letter: the decision, the payment amount and its date, an information " +
      "request carrying its own deadline, and the consequence of missing it. The " +
      "WORDING is drafted and not native-reviewed.",
    text: SPEC_HINDI_DWP
  },
  {
    id: "spec_bengali_nhs_screening",
    label: "NHS breast screening invitation in Bengali",
    intent: "TRACK 5, and the first Bengali document. Structure from an NHS " +
      "screening invitation. The WORDING is drafted and not native-reviewed.",
    text: SPEC_BENGALI_NHS
  },
  {
    id: "spec_panjabi_council_rent",
    label: "Council rent increase notice in Panjabi",
    intent: "TRACK 5, and the first Panjabi document. Structure from a social " +
      "landlord rent variation notice, including the 'you do not need to do " +
      "anything' reassurance and the duty to tell the benefit office. The WORDING " +
      "is drafted and not native-reviewed.",
    text: SPEC_PANJABI_COUNCIL
  }
];

module.exports = { SPEC_LANGUAGES };
