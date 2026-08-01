// Engine regression corpus.
//
// One entry per document class the rules engine can take, including the paths
// that only fire on degraded input. Every entry records WHICH engine path it
// exists to exercise, so a future change that silently reroutes a document
// shows up as an intent that no longer matches.
//
// These are hand written documents in the shape of the real thing. No real
// person's letter is stored here, and nothing here is uploaded anywhere: the
// runner calls the engine in process with the AI pass disabled.
//
// The OCR entries matter. Every document used in the 30 July engine diagnosis
// was clean text, so the garble and low quality gates never fired and their
// behaviour was never captured. detectInputQuality returns "borderline" at a
// garble score of 0.06 and "poor" at 0.25, and garbled_by_ocr additionally
// requires 160 characters, so the corrupted entries below are written to sit
// either side of those thresholds on purpose.
//
// The three multi letter entries cover the three shapes separately, because the
// engine treats them differently and only two of them are currently detected:
//   multi_document_greetings  detected, NOT separated, so the attribution rule
//                             declines to compose
//   multi_document_split      detected AND separated, so the first letter's
//                             facts are kept and the reader is told the rest
//                             were not read
//   multi_document            NOT detected at all, because the separator is a
//                             page header rather than a bare rule, so this
//                             entry records the shape that still fuses

"use strict";

const CORPUS = [
  // ---------------------------------------------------------------- supported
  {
    id: "council_tax",
    label: "Council tax notice",
    intent: "Fully supported type. bill_or_payment, instalments, discount, stated consequence.",
    text: [
      "Hounslow Borough Council",
      "Council Tax Bill 2026/2027",
      "Account number: 4471028866",
      "Property: 14 Sutton Court Road, Hounslow, TW3 8SG",
      "Bill date: 12 March 2026",
      "Council Tax band: D",
      "Total charge for the year: £1,842.00",
      "Less single person discount (25%): £460.50",
      "Amount to pay: £1,381.50",
      "Payable in 10 monthly instalments of £138.15.",
      "First instalment due by 1 April 2026.",
      "If you do not pay by the date shown, you may lose the right to pay by instalments",
      "and the full balance for the year will become due.",
      "If you think this bill is wrong, contact us on 020 8583 4242."
    ].join("\n")
  },
  {
    id: "energy_bill",
    label: "Electricity bill",
    intent: "Fully supported type. Previous balance of zero appears before the real amount.",
    text: [
      "EDF Energy",
      "Your electricity bill",
      "Customer number: 220145879",
      "Bill reference: EB-4471028",
      "Supply address: Flat 2, 8 Kingsley Road, Hounslow",
      "Bill date: 4 May 2026",
      "Period covered: 1 February 2026 to 30 April 2026",
      "Previous balance: £0.00",
      "Electricity used this period: 842 kWh",
      "Amount due: £214.63",
      "Please pay by 28 May 2026.",
      "You can pay online or by calling 0333 200 5100.",
      "If you are struggling to pay, please contact us to discuss a payment plan."
    ].join("\n")
  },
  {
    id: "water_bill",
    label: "Water bill",
    intent: "Fully supported utility. Different supplier vocabulary from the energy bill.",
    text: [
      "Thames Water",
      "Your water and wastewater bill",
      "Account number: 8842200761",
      "Bill date: 2 June 2026",
      "Period: 1 March 2026 to 31 May 2026",
      "Water charges: £68.40",
      "Wastewater charges: £74.20",
      "Total amount due: £142.60",
      "Please pay by 30 June 2026.",
      "You can spread payments over the year by setting up a Direct Debit."
    ].join("\n")
  },
  {
    id: "broadband_bill",
    label: "Broadband and phone bill",
    intent: "Fully supported utility, telecoms vocabulary, includes an in-contract price rise line.",
    text: [
      "BT",
      "Your monthly bill",
      "Account number: GB44120983",
      "Bill date: 18 April 2026",
      "Broadband and line rental: £41.99",
      "Calls: £3.20",
      "Total this month: £45.19",
      "This will be taken by Direct Debit on 2 May 2026.",
      "From July 2026 your monthly price will increase by £3.00."
    ].join("\n")
  },
  {
    id: "gov_hmrc",
    label: "HMRC official letter",
    intent: "document_category government. Official notice with a reference and a response window.",
    text: [
      "HM Revenue and Customs",
      "Self Assessment",
      "Unique Taxpayer Reference: 4471 028866",
      "Date: 21 May 2026",
      "We have reviewed your Self Assessment return for the year ending 5 April 2026.",
      "Our records show an amount of £486.20 still to pay.",
      "You must pay by 31 July 2026.",
      "If you do not pay, interest will be charged on the outstanding amount.",
      "If you think this is wrong, write to us at the address above."
    ].join("\n")
  },
  {
    id: "appointment_nhs",
    label: "NHS appointment letter",
    intent: "Appointment path. Letter date and appointment date both present and different.",
    text: [
      "West Middlesex University Hospital",
      "Outpatient Appointment",
      "Patient reference: WM-8842001",
      "Date: 5 June 2026",
      "Dear Patient",
      "You have an appointment in the Dermatology Department.",
      "Clinic: Dermatology",
      "Consultant: Dr A Shah",
      "Date: Tuesday 1 July 2026",
      "Time: 10:40",
      "Location: Outpatients, Level 2, West Middlesex University Hospital",
      "Please arrive fifteen minutes before your appointment time.",
      "If you cannot attend, telephone 020 8321 5000 to rearrange."
    ].join("\n")
  },
  {
    id: "bill_in_credit",
    label: "Energy bill in credit",
    intent: "isInCreditOrNoPayment path. The deadline is deliberately nulled by the engine.",
    text: [
      "British Gas",
      "Your energy statement",
      "Account number: 5510442288",
      "Statement date: 9 May 2026",
      "Electricity and gas used: £96.14",
      "Payments received: £180.00",
      "Your account is in credit by £83.86, so there is nothing to pay.",
      "Your next statement will be issued on 9 August 2026."
    ].join("\n")
  },

  // ------------------------------------------------------------------- urgent
  {
    id: "bailiff_enforcement",
    label: "Bailiff enforcement notice",
    intent: "severity urgent, high stakes tier urgent. Deadline phrased as contact us by.",
    text: [
      "Marston Holdings Enforcement Agents",
      "NOTICE OF ENFORCEMENT",
      "Reference: EN-77120934",
      "Date of notice: 20 August 2026",
      "Liability Order obtained by Hounslow Borough Council on 3 July 2026",
      "Original debt: £1,047.00",
      "Compliance stage fee: £75.00",
      "Amount outstanding: £1,247.00",
      "You must contact us on 0333 320 122 by 3 September 2026.",
      "If payment is not received by this date, an enforcement agent may attend your property",
      "and remove goods belonging to you. Further fees of £235.00 will be added.",
      "Payment can be made online quoting the reference above."
    ].join("\n")
  },
  {
    id: "eviction_possession",
    label: "Notice seeking possession",
    intent: "severity urgent via eviction and possession signals. Housing category.",
    text: [
      "Brightside Housing Association",
      "NOTICE SEEKING POSSESSION OF A PROPERTY LET ON AN ASSURED TENANCY",
      "Reference: POS-2291",
      "Date: 14 August 2026",
      "Property: 22 Alder House, Feltham",
      "Rent arrears as at today: £2,480.00",
      "You must clear the arrears by 12 September 2026.",
      "If the arrears are not cleared we will apply to the county court for possession of your home.",
      "This could lead to eviction and you may be responsible for our court costs.",
      "If you are having difficulty paying, contact your housing officer on 020 8890 4100."
    ].join("\n")
  },
  {
    id: "court_fine",
    label: "Court fine and collection order",
    intent: "severity urgent via prosecution and legal action signals. legal_or_court category.",
    text: [
      "HM Courts and Tribunals Service",
      "NOTICE OF FINE AND COLLECTION ORDER",
      "Reference: CF-8830012",
      "Date: 2 September 2026",
      "Amount of fine: £660.00",
      "Victim surcharge: £66.00",
      "Total to pay: £726.00",
      "You must pay by 30 September 2026.",
      "Failure to pay may result in further legal action, and the account may be passed",
      "to bailiffs for enforcement.",
      "To pay or to ask about a payment plan, contact the Fines Team on 0300 790 9901."
    ].join("\n")
  },

  // -------------------------------------------------- lower confidence class
  {
    id: "housing_letter",
    label: "Council housing services letter",
    intent: "Readable unsupported aid path. Relative deadline of fourteen days.",
    text: [
      "London Borough of Hounslow",
      "Housing Services",
      "Our ref: HS/2026/44871",
      "Date: 9 June 2026",
      "Dear Resident",
      "We are writing about the tenancy at the address above.",
      "Following our recent review, we need some further information from you",
      "so that your records can be brought up to date.",
      "Please respond within 14 days of the date of this letter.",
      "If we do not hear from you, we may need to review your tenancy arrangements.",
      "If you have any questions, please contact the housing team."
    ].join("\n")
  },
  {
    id: "legal_solicitor",
    label: "Solicitor letter before action",
    intent: "legal_or_court category through the aid path. Contains a legal action phrase.",
    text: [
      "Hartley and Grange Solicitors",
      "LETTER BEFORE ACTION",
      "Our ref: HG/DR/22981",
      "Date: 11 July 2026",
      "We act for Wessex Credit Limited in respect of an outstanding balance of £3,410.00.",
      "We are instructed to recover this sum.",
      "Unless payment is received within 14 days, legal action may be commenced without",
      "further notice to you.",
      "You may wish to seek independent legal advice."
    ].join("\n")
  },
  {
    id: "medical_letter",
    label: "Hospital results letter",
    intent: "medical category through the aid path. No amount, soft follow up request.",
    text: [
      "Chelsea and Westminster Hospital",
      "Department of Gastroenterology",
      "NHS number: 449 812 7730",
      "Date: 27 May 2026",
      "Dear Patient",
      "Thank you for attending your recent appointment.",
      "Your test results have now been reviewed by the consultant.",
      "We would like to see you again in the clinic in about three months.",
      "Our booking team will contact you to arrange a suitable date.",
      "If your symptoms change before then, please contact your GP."
    ].join("\n")
  },
  {
    id: "employment_letter",
    label: "Employer HR letter",
    intent: "employment category through the aid path. A meeting with a fixed date.",
    text: [
      "Ravenscourt Logistics Limited",
      "Human Resources",
      "Reference: HR-2026-0912",
      "Date: 3 June 2026",
      "Dear Colleague",
      "We are writing to invite you to a meeting to discuss your recent attendance record.",
      "The meeting will take place on 17 June 2026 at 14:00 in Meeting Room 2.",
      "You may be accompanied by a colleague or a trade union representative.",
      "Please confirm your attendance to your line manager."
    ].join("\n")
  },
  {
    id: "education_letter",
    label: "School letter",
    intent: "education category through the aid path. Consent deadline.",
    text: [
      "Springwell Primary School",
      "Reference: SW/TRIP/2026",
      "Date: 12 May 2026",
      "Dear Parent or Carer",
      "We are writing about the Year 5 residential trip in September.",
      "The total cost is £185.00, payable in three instalments.",
      "Please return the signed consent form by 5 June 2026.",
      "If you would like to discuss financial support, please speak to the school office."
    ].join("\n")
  },
  {
    id: "insurance_letter",
    label: "Insurance renewal notice",
    intent: "insurance category through the aid path. Auto renewal date.",
    text: [
      "Aviva Insurance",
      "Your home insurance renewal",
      "Policy number: AV-77120934",
      "Renewal date: 1 August 2026",
      "Date of this notice: 1 July 2026",
      "Your renewal premium is £324.18 for the year.",
      "Last year you paid £287.50.",
      "Your policy will renew automatically unless you tell us otherwise before 1 August 2026."
    ].join("\n")
  },
  {
    id: "bank_loan_letter",
    label: "Bank arrears letter",
    intent: "bank_or_loan category through the aid path. Mentions credit rating.",
    text: [
      "Halifax",
      "Personal Loan Account",
      "Account number: 8842-0076",
      "Date: 16 June 2026",
      "Your loan account is now two payments in arrears.",
      "The total arrears balance is £418.60.",
      "Please bring the account up to date by 7 July 2026.",
      "Continued arrears may be reported to credit reference agencies and could affect",
      "your credit rating.",
      "If you are in financial difficulty, please call us to discuss your options."
    ].join("\n")
  },
  {
    id: "benefits_dwp",
    label: "DWP Universal Credit letter",
    intent: "Welfare benefits reading aid path. The engine deliberately nulls the deadline here.",
    text: [
      "Department for Work and Pensions",
      "Universal Credit",
      "National Insurance number: QQ 12 34 56 C",
      "Date: 8 July 2026",
      "We have reviewed your Universal Credit award.",
      "Your payment will change from 1 August 2026.",
      "Your new monthly payment will be £742.19.",
      "You must report any change in your circumstances within one month.",
      "If you disagree with this decision you can ask for a mandatory reconsideration",
      "within one month of the date of this letter."
    ].join("\n")
  },

  // ---------------------------------------------------------- special paths
  {
    id: "scam_phishing",
    label: "Phishing letter",
    intent: "verification_only path. The AI is skipped here by design, in English too.",
    text: [
      "Barcllays Security Team",
      "URGENT: Your account is at risk",
      "Reference: SEC-99120",
      "We have detected unusual activity on your account.",
      "You must verify your identity within 24 hours or your account will be frozen.",
      "Act now. Confirm your card number, PIN and full password at:",
      "barclays-secure-verify.com",
      "Failure to respond will result in permanent suspension of your account."
    ].join("\n")
  },
  {
    id: "non_document_recipe",
    label: "Recipe, not a document",
    intent: "is_probable_non_document path. Must never be given a confident summary.",
    text: [
      "mix the flour and the softened butter together in a large bowl until",
      "the mixture looks like fine breadcrumbs",
      "stir in the sugar and a pinch of salt, then add two beaten eggs and",
      "fold everything together gently",
      "spoon the mixture into a lined tin and smooth the top with the back",
      "of a spoon",
      "bake in the middle of the oven for about forty five minutes until",
      "golden and springy to the touch",
      "leave the cake to cool in the tin for ten minutes before turning it",
      "out onto a wire rack",
      "once completely cool, dust with icing sugar and serve in thick",
      "slices with a cup of tea"
    ].join("\n")
  },
  {
    id: "blank_template",
    label: "Blank form template",
    intent: "looksTemplate path. Empty fields must not be read as real values.",
    text: [
      "APPLICATION FOR HOUSING BENEFIT",
      "Name: ____________________",
      "Address: __________________",
      "Date of birth: ____/____/____",
      "National Insurance number: __________",
      "Total weekly income: £________",
      "Signature: ________________  Date: __________",
      "Please complete all sections in black ink and return to the address above."
    ].join("\n")
  },
  {
    id: "outgoing_letter",
    label: "Letter written by the reader",
    intent: "looksOutgoing path. Must be recognised as sent by the user, not received.",
    text: [
      "From: Priya Sharma, 14 Sutton Court Road, Hounslow, TW3 8SG",
      "Date: 4 June 2026",
      "Dear Sir or Madam",
      "I am writing to complain about the handling of my council tax account.",
      "I have attached copies of the payments I have made since January.",
      "I would be grateful if you could review the account and reply to me in writing.",
      "I look forward to hearing from you within 14 days.",
      "Yours faithfully",
      "Priya Sharma"
    ].join("\n")
  },
  {
    id: "multi_document",
    label: "Two letters in one upload, page header separator",
    intent: "Multi letter that splitDocuments does NOT detect at all: the separator is a page header, not a bare rule. Records that this shape still fuses, pending a separate decision on the separator vocabulary.",
    text: [
      "EDF Energy",
      "Your electricity bill",
      "Bill date: 4 May 2026",
      "Amount due: £214.63",
      "Please pay by 28 May 2026.",
      "",
      "--- Page 2 ---",
      "",
      "Hounslow Borough Council",
      "Council Tax Bill 2026/2027",
      "Bill date: 12 March 2026",
      "Amount to pay: £1,381.50",
      "First instalment due by 1 April 2026."
    ].join("\n")
  },

  {
    id: "multi_document_greetings",
    label: "Two letters in one upload, detected by greetings and NOT separated",
    intent: "Multi letter, fused shape. isMultiLetterInput is true while documents.length is 1, so every extractor ran across both letters. The engine must decline to compose a sentence relating a sender, an amount and a date.",
    text: [
      "Dear Ms Sharma",
      "EDF Energy",
      "Your electricity bill",
      "Bill date: 4 May 2026",
      "Amount due: £214.63",
      "Please pay by 28 May 2026.",
      "",
      "Dear Ms Sharma",
      "Hounslow Borough Council",
      "Council Tax Bill 2026/2027",
      "Bill date: 12 March 2026",
      "Amount to pay: £1,381.50",
      "First instalment due by 1 April 2026."
    ].join("\n")
  },
  {
    id: "multi_document_split",
    label: "Two letters in one upload, separated by a rule",
    intent: "Multi letter, first_only shape. The letters were separated, so the first letter's facts are correct and are kept. The reader must be told the other letter was not read.",
    text: [
      "EDF Energy",
      "Your electricity bill",
      "Bill date: 4 May 2026",
      "Amount due: £214.63",
      "Please pay by 28 May 2026.",
      "---",
      "Hounslow Borough Council",
      "Council Tax Bill 2026/2027",
      "Bill date: 12 March 2026",
      "Amount to pay: £1,381.50",
      "First instalment due by 1 April 2026."
    ].join("\n")
  },

  // ------------------------------------------------------- photographed / OCR
  {
    id: "ocr_council_tax",
    label: "Photographed council tax notice, light OCR damage",
    intent: "garbled_by_ocr true, input_quality borderline. Amounts and dates must be suppressed.",
    text: [
      "H0unslow B0rough C0uncil",
      "C0uncil Tax B1ll 2026/2027",
      "Acc0unt number: 4471028866",
      "Pr0perty: 14 Sutt0n C0urt Road, Hounslow",
      "B1ll date: 12March 2026",
      "T0tal charge for the year: £1,842.00",
      "Am0unt to pay: £1,381.50",
      "Payable in 10 monthly 1nstalments of £138.15.",
      "First 1nstalment due by 1April 2026.",
      "If you do not pay by the date shown you may lose the right to pay by instalments",
      "and the full balance for the year will bec0me due."
    ].join("\n")
  },
  {
    id: "ocr_energy_bill",
    label: "Photographed energy bill, light OCR damage",
    intent: "garbled_by_ocr true on a supported type. Deadline is nulled by the garble branch.",
    text: [
      "EDF Ener9y",
      "Your electr1city bill",
      "Cust0mer number: 220145879",
      "B1ll reference: EB-4471028",
      "Supply address: Flat 2, 8 K1ngsley Road, Hounslow",
      "B1ll date: 4May 2026",
      "Peri0d covered: 1 February 2026 to 30 April 2026",
      "Prev1ous balance: £0.00",
      "Am0unt due: £214.63",
      "Please pay by 28May 2026.",
      "If you are struggling to pay please contact us to discuss a payment plan."
    ].join("\n")
  },
  {
    id: "ocr_enforcement",
    label: "Photographed enforcement notice, light OCR damage",
    intent: "garbled_by_ocr true on an urgent document. The most dangerous combination.",
    text: [
      "Marst0n Holdings Enf0rcement Agents",
      "N0TICE OF ENFORCEMENT",
      "Reference: EN-77120934",
      "Date of n0tice: 20August 2026",
      "L1ability Order obtained by Hounslow B0rough Council",
      "0riginal debt: £1,047.00",
      "Am0unt outstanding: £1,247.00",
      "You must c0ntact us on 0333 320 122 by 3September 2026.",
      "If paym3nt is not received by this date an enforcement agent may attend your pr0perty",
      "and rem0ve goods belonging to you."
    ].join("\n")
  },
  {
    id: "ocr_heavy_damage",
    label: "Badly photographed letter, heavy OCR damage",
    intent: "input_quality poor, processing_mode unsupported. The fixed string extractor branch.",
    text: [
      "H0unsl0w B0r0ugh C0unc1l",
      "C0unc1l T4x B1ll 2O26/2O27",
      "Acc0unt numb3r: 447l028866",
      "B1ll d4te: l2March 2O26",
      "T0t4l ch4rge f0r th3 y34r: £l,842.OO",
      "Am0unt t0 p4y: £l,381.5O",
      "F1rst 1nst4lm3nt du3 by lApril 2O26",
      "1f y0u d0 n0t p4y by th3 d4t3 sh0wn y0u m4y l0s3 th3 r1ght t0 p4y by 1nst4lm3nts"
    ].join("\n")
  },
  {
    id: "photo_snippet_short",
    label: "Photograph of one corner of a letter",
    intent: "Very short input. input_quality poor by length, unsupported branch.",
    text: "Amount due: £214.63\nPlease pay by 28 May 2026."
  },

  // ------------------------------------------------- deadline promotion rules
  //
  // The rules that decide WHICH date on a letter is the deadline were all fixed
  // against shapes no corpus document contained, so every one of them was
  // guarded only by unit tests on invented strings. These entries exist so each
  // rule has a whole document behind it and shows up in the rendered baseline.
  //
  // Each one is written so that exactly one rule decides its answer, and each
  // was verified to produce the WRONG answer before the rule that fixed it.
  {
    id: "arrears_before_clause",
    label: "Council tax arrears with a before mention and a before obligation",
    intent: "D-1. Both readings of 'before' in one letter. The mention on line 10 " +
      "must not be promoted; the obligation on line 11 must be. Before the verb " +
      "anchor this reported 3 July 2026, the payments-not-included date.",
    text: [
      "Hounslow Borough Council",
      "Council Tax Recovery",
      "Reference: CT-90114",
      "Date: 4 August 2026",
      "",
      "Dear Occupier",
      "",
      "Your council tax account is in arrears.",
      "Amount to pay: £486.20",
      "Any payments made before 3 July 2026 are not included in this balance.",
      "You must pay the balance before 3 September 2026.",
      "If you do not, the account may be passed to an enforcement agent.",
      "If you cannot pay in full, contact the recovery team on 020 8583 4242."
    ].join("\n")
  },
  {
    id: "failed_direct_debit",
    label: "Returned direct debit, whose only dated clause is a past-tense receipt",
    intent: "D-2. The shape the deleted second keyword pass existed to serve. " +
      "Co-location declines on adjacency, the backward-looking guard fires, and " +
      "the second pass promoted the receipt date anyway. The honest answer is no " +
      "deadline: the letter asks the reader to check with their bank, not to pay " +
      "by a date. Before the second pass was deleted this reported 3 July 2026.",
    text: [
      "Thames Water",
      "Water bill payment",
      "Reference: TW-33827",
      "Date: 20 July 2026",
      "",
      "Dear Customer",
      "",
      "Your payment was due by direct debit on 3 July 2026 and was returned unpaid by your bank.",
      "Amount outstanding: £164.90",
      "Your bank may charge you for the returned payment.",
      "Please check with your bank that the mandate is still in place.",
      "You can talk to us about your account on 0800 980 8800."
    ].join("\n")
  },
  {
    id: "arrears_past_and_future",
    label: "Rent arrears stating the missed payment first and the obligation second",
    intent: "D-2 through co-location. The shape an arrears letter is actually " +
      "written in: the receipt that has already been missed, then the date the " +
      "reader must act by. Co-location bound the first via 'due on' regardless " +
      "of tense, so before the backward-looking guard this reported 3 July 2026.",
    text: [
      "Sheffield City Council",
      "Housing Rent Team",
      "Reference: HR-77420",
      "Date: 6 August 2026",
      "",
      "Dear Tenant",
      "",
      "Your rent account is in arrears.",
      "Your payment was due on 3 July 2026 and has not been received.",
      "Amount outstanding: £312.40",
      "You must pay by 3 September 2026.",
      "If you do not, we may apply to the county court for possession of your home.",
      "If you are struggling to pay, contact the rent team on 0114 273 4567."
    ].join("\n")
  }
];

module.exports = { CORPUS };
