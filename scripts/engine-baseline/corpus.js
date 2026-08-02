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
  },
  {
    id: "school_periodic",
    label: "School trip consent form, with a competes word hidden inside a longer one",
    intent: "The competes half of the word-boundary rule. 'period' matched inside " +
      "'periodic' on the line above the deadline, so isClaimedByCompetingDateLabel " +
      "reported the date as claimed and the reading-aid path dropped it. Before " +
      "the boundaries this said 'These dates appear in the document' about the one " +
      "date the letter asks the reader to act on.",
    text: [
      "Fairfield Community School",
      "School office",
      "Reference: SW-TRIP-2026",
      "Date: 12 August 2026",
      "",
      "Dear Parent or Carer",
      "",
      "Your child has been offered a place on the residential trip.",
      "A periodic charge applies to the trip account.",
      "Please return the signed consent form by 3 September 2026.",
      "The school office can answer questions on 0114 273 8890."
    ].join("\n")
  },

  // --------------------------------------------- dates with no single reading
  //
  // These two carry a date the engine shows the reader and refuses to reason
  // about, and they exist BEFORE the card wording that will explain that, so
  // the wording change has something to move. Both are recorded as D-9 and
  // D-10: the extractor accepts a date string with more than one reading, and
  // deadline_iso refuses it, but card 4 still asserts "Due by" over it.
  //
  // Nothing about their current output is correct. They are here so it is
  // visible.
  {
    id: "ambiguous_numeric_date",
    label: "Phone bill printing its due date in numerals",
    intent: "D-9. isPlausibleNumericDate accepts both readings of 03/06/2026 and " +
      "chooses neither, so main_date shows a date that is 3 June or 6 March, 95 " +
      "days apart. deadline_iso is null, correctly. Card 4 still says 'Due by'.",
    text: [
      "Vodafone UK",
      "Your phone bill",
      "Account number: 5518042",
      "Bill date: 06/05/2026",
      "",
      "Dear Customer",
      "",
      "Thank you for being a Vodafone customer.",
      "Amount to pay: £41.99",
      "Please pay by 03/06/2026.",
      "You can pay online or by calling 0333 304 0191.",
      "If you have already paid, please ignore this bill."
    ].join("\n")
  },
  {
    id: "short_year_date",
    label: "Council tax bill printing a two digit year",
    intent: "D-10. LONG_DATE ends in \\d{2,4}, so '28 May 26' is accepted with no " +
      "century rule. deadline_iso is null, correctly. Card 4 still says 'Due by'.",
    text: [
      "Hounslow Borough Council",
      "Council Tax Bill 2026/2027",
      "Account number: 4471028866",
      "Bill date: 12 Mar 26",
      "Council Tax band: D",
      "",
      "Dear Occupier",
      "",
      "Amount to pay: £1,381.50",
      "Please pay by 28 May 26.",
      "If you do not pay by the date shown, you may lose the right to pay by instalments.",
      "If you think this bill is wrong, contact us on 020 8583 4242."
    ].join("\n")
  },

  // ------------------------------------------------------------- non English
  //
  // Added 1 August 2026 for D3 tier 1. These are NOT translations of the
  // entries above. Each is its own letter, with its own sender, reference,
  // amounts, dates and structure, so a shared phrasing cannot make the engine
  // look better or worse than it is on a document it has never seen.
  //
  // MONEY IS DELIBERATELY IN UK FORMAT on all four. A Polish letter from a UK
  // landlord about a UK tenancy prints £1,245.60, not £1 245,60, and writing
  // continental separators here would change two variables at once. Dates are
  // written in the document's own language, because that IS the variable.
  //
  // All four are the shapes a UK reader actually receives: UK organisations do
  // send translated notices, and people do photograph letters written in their
  // own language. The phishing entry is written in Polish for the same reason
  // real phishing is: the people it targets read Polish.
  {
    id: "polish_rent_arrears",
    label: "Rent arrears letter written in Polish",
    intent: "D3 tier 1. Carries a deadline, a stated consequence (court, then eviction), " +
      "an amount and a contact number. The engine reads none of them: no deadline, " +
      "has_consequence false, severity low. Not a translation of arrears_past_and_future; " +
      "different sender, tenancy rather than council tax, weekly rent figure.",
    text: [
      "Brightside Housing Association",
      "Dział Czynszów",
      "Numer konta najemcy: BH-44712",
      "",
      "Data pisma: 6 sierpnia 2026",
      "",
      "Szanowni Państwo,",
      "",
      "Informujemy, że na Państwa koncie czynszowym powstała zaległość.",
      "Zaległość na dzień dzisiejszy: £1,245.60",
      "Czynsz tygodniowy: £142.30",
      "",
      "Prosimy o uregulowanie zaległości do dnia 4 września 2026.",
      "Jeżeli zaległość nie zostanie uregulowana, wystąpimy do sądu rejonowego o nakaz eksmisji.",
      "Może to doprowadzić do utraty mieszkania oraz obciążenia Państwa kosztami sądowymi.",
      "",
      "W przypadku trudności finansowych prosimy o kontakt z naszym zespołem pod numerem 020 8890 4100."
    ].join("\n")
  },
  {
    id: "spanish_water_final_notice",
    label: "Water final notice written in Spanish",
    intent: "D3 tier 1. A final notice with a payment deadline and a stated consequence " +
      "(supply restricted under warrant). Also carries a billing PERIOD, which is the " +
      "shape that made the engine pick a period start as the date that matters on an " +
      "earlier Spanish probe.",
    text: [
      "Thames Water",
      "Aviso final de pago",
      "Número de cuenta: TW-8830921",
      "",
      "Fecha del aviso: 18 de mayo de 2026",
      "",
      "Estimado cliente,",
      "",
      "Periodo facturado: 1 de febrero de 2026 al 30 de abril de 2026",
      "Importe pendiente: £312.44",
      "",
      "El pago debe realizarse antes del 15 de junio de 2026.",
      "Si no recibimos el pago, podremos solicitar una orden judicial para instalar un limitador de caudal en su domicilio.",
      "",
      "Si ya ha pagado, no tenga en cuenta este aviso.",
      "Para hablar de un plan de pago, llame al 0800 316 9800."
    ].join("\n")
  },
  {
    id: "french_hospital_appointment",
    label: "Hospital appointment letter written in French",
    intent: "D3 tier 1. An appointment date, a time, a department and a number to ring if " +
      "the reader cannot attend. No money and no consequence, so it is the calm shape: " +
      "the failure here is a wrong topic rather than a missed threat.",
    text: [
      "West Middlesex University Hospital",
      "Service de Dermatologie",
      "Référence patient: WM-8842177",
      "",
      "Le 5 juin 2026",
      "",
      "Madame, Monsieur,",
      "",
      "Nous vous confirmons votre rendez-vous au service de dermatologie.",
      "Date du rendez-vous: mardi 7 juillet 2026",
      "Heure: 10h30",
      "Lieu: Clinique 4, rez-de-chaussée",
      "",
      "Merci de vous présenter quinze minutes avant l'heure indiquée.",
      "Veuillez apporter ce courrier et la liste de vos médicaments.",
      "",
      "Si vous ne pouvez pas vous présenter, veuillez téléphoner au 020 8321 5000."
    ].join("\n")
  },
  {
    id: "polish_phishing",
    label: "Phishing message written in Polish",
    intent: "D3 tier 1, and the sharpest of the four. Carries the same shapes " +
      "detectScamSignals catches in English: a refund lure, a 24 hour window, a link, " +
      "and a request for card number, PIN and password together. The English " +
      "scam_phishing entry raises six signals. This raises none, so processing_mode is " +
      "caution rather than verification_only and the refusal path never fires.",
    text: [
      "HMRC Zwrot Podatku",
      "",
      "Szanowny Kliencie,",
      "",
      "Po weryfikacji Państwa rozliczenia przysługuje zwrot podatku w wysokości £482.30.",
      "",
      "Aby otrzymać zwrot, prosimy potwierdzić dane w ciągu 24 godzin.",
      "Prosimy kliknąć w poniższy link i podać numer karty oraz kod PIN.",
      "Prosimy również potwierdzić pełne hasło do konta bankowego.",
      "https://hmrc-zwrot-podatku.example.com/potwierdz",
      "",
      "Brak potwierdzenia danych w podanym terminie spowoduje zablokowanie konta."
    ].join("\n")
  },

  // ------------------------------------------------------- scam corpus (P0)
  //
  // Added 1 August 2026. F3, splitting detectScamSignals into a decisive tier
  // and an advisory one, has been blocked since 31 July on a single sentence:
  // the false-positive side was proven across thirty genuine letters and the
  // false-negative side against ONE adversary. This is that second side.
  //
  // Two halves, and the second matters as much as the first:
  //
  //   SCAMS, in the shapes UK readers actually receive, across the languages
  //   Northcue supports. Several carry NO credential ask at all, because a
  //   link-only lure is currently caught by "click this link" and "act now",
  //   which are two of the nine needles F3 demotes. If nothing else catches
  //   them, F3 opens a hole and the corpus has to be able to say so.
  //
  //   NEAR-MISS GENUINE LETTERS, each written around one of the nine misfiring
  //   needles, in the phrasing a real sender uses. These are what F3 is FOR.
  //   Every one of them is a letter a reader would be badly served by having
  //   replaced with a scam warning.
  //
  // Nothing here is a real message. The link hosts are all under example.com
  // so nothing in the tree resolves anywhere.

  // --- scams: link-only lures, the shape with no credential ask -------------
  {
    id: "smish_parcel_link_only",
    label: "Parcel redelivery smish, English, no credential ask",
    intent: "THE GAP F3 OPENS. A link, a tiny fee and a deadline, and nothing that " +
      "asks for a credential. Today this is caught only by needles F3 demotes, so it " +
      "is the document that decides whether the demotion needs a replacement.",
    text: [
      "Royal Mail",
      "",
      "Your parcel is being held at our depot.",
      "A redelivery fee of £2.99 is outstanding.",
      "",
      "Please settle the fee within 48 hours or the parcel will be returned to sender.",
      "Pay here: royalmail-redelivery-fee.example.com/pay",
      "",
      "Thank you for using Royal Mail."
    ].join("\n")
  },
  {
    id: "smish_parcel_link_only_pl",
    label: "Parcel redelivery smish, Polish, no credential ask",
    intent: "The same shape in Polish, so the gap can be measured with the language " +
      "held constant against smish_parcel_link_only.",
    text: [
      "Poczta Polska",
      "",
      "Państwa przesyłka oczekuje w magazynie.",
      "Do zapłaty pozostała opłata za ponowne doręczenie w wysokości £2.99.",
      "",
      "Prosimy uregulować opłatę w ciągu 48 godzin, w przeciwnym razie przesyłka wróci do nadawcy.",
      "Zapłać tutaj: poczta-doreczenie-oplata.example.com/platnosc",
      "",
      "Dziękujemy."
    ].join("\n")
  },
  {
    id: "scam_council_refund_link_only",
    label: "Council tax refund lure, English, no credential ask",
    intent: "A refund lure rather than a threat, so nothing in the pressure tier fires " +
      "either. Tests whether a scam with neither urgency wording nor a credential ask " +
      "is visible to anything at all.",
    text: [
      "Hounslow Borough Council",
      "Council Tax Refund",
      "",
      "Dear Resident",
      "",
      "Our records show you are due a council tax refund of £184.60.",
      "",
      "To claim your refund please complete the short form at",
      "hounslow-counciltax-refund.example.com/claim",
      "",
      "Refunds are processed within five working days."
    ].join("\n")
  },

  // --- scams: credential asks, across languages -----------------------------
  {
    id: "scam_dvla_vehicle_tax",
    label: "DVLA vehicle tax lure, English, card details",
    intent: "The commonest UK phishing shape after parcels. Carries a card ask but " +
      "never the word PIN or password, so it tests the credential tier's reach beyond " +
      "the three needles scam_phishing exercises.",
    text: [
      "DVLA",
      "Vehicle Tax Notification",
      "",
      "Vehicle registration: AB12 CDE",
      "",
      "Your latest vehicle tax payment failed.",
      "To avoid a penalty of £80.00 please update your payment details.",
      "",
      "Update at dvla-vehicletax-update.example.com/details",
      "You will need your card number, expiry date and the three digit CVV."
    ].join("\n")
  },
  {
    id: "scam_hmrc_refund_es",
    label: "HMRC refund lure, Spanish, card and PIN",
    intent: "The Spanish twin of scam_phishing's shape. Credential needles are English, " +
      "so this is expected to raise nothing and reach caution rather than " +
      "verification_only.",
    text: [
      "HMRC Devolución de Impuestos",
      "",
      "Estimado cliente,",
      "",
      "Tras revisar su declaración, le corresponde una devolución de £482.30.",
      "",
      "Para recibir el importe, confirme sus datos en las próximas 24 horas.",
      "Introduzca el número de su tarjeta y su PIN en el siguiente enlace:",
      "hmrc-devolucion-impuestos.example.com/confirmar",
      "",
      "Si no confirma en el plazo indicado, su cuenta será bloqueada."
    ].join("\n")
  },
  {
    id: "scam_bank_security_fr",
    label: "Bank security lure, French, CVV",
    intent: "Uses CVV rather than PIN. CVV is borrowed unchanged into every language " +
      "the bank supports, and no needle in the list mentions it in any language.",
    text: [
      "Sécurité Bancaire",
      "",
      "Madame, Monsieur,",
      "",
      "Une activité inhabituelle a été détectée sur votre compte.",
      "",
      "Merci de confirmer votre identité sous 24 heures.",
      "Rendez vous sur securite-banque-verification.example.com/connexion",
      "Munissez vous de votre carte bancaire et de votre code CVV.",
      "",
      "Sans confirmation, votre compte sera suspendu."
    ].join("\n")
  },
  {
    id: "scam_crypto_investment_pl",
    label: "Crypto investment lure, Polish",
    intent: "The one needle that already works in every language: crypto and bitcoin " +
      "are borrowed unchanged. Expected to raise a signal even in Polish, which makes " +
      "it the control that proves the list CAN work language independently.",
    text: [
      "Platforma Inwestycyjna",
      "",
      "Szanowny Kliencie,",
      "",
      "Państwa konto inwestycyjne wymaga potwierdzenia.",
      "",
      "Prosimy przelać 250 funtów w bitcoin na poniższy adres w ciągu 12 godzin,",
      "aby aktywować konto i odebrać premię powitalną.",
      "Szczegóły: krypto-inwestycje-konto.example.com/aktywacja"
    ].join("\n")
  },
  {
    id: "scam_energy_refund_pt",
    label: "Energy refund lure, Portuguese, full password",
    intent: "A refund lure asking for a full account password. The English needle " +
      "'full password' is the highest precision entry in the list and it cannot see " +
      "'senha completa'.",
    text: [
      "Fornecedor de Energia",
      "",
      "Caro cliente,",
      "",
      "Tem um reembolso de £96.14 disponível na sua conta.",
      "",
      "Para receber o reembolso, confirme os seus dados nas próximas 24 horas em",
      "energia-reembolso-cliente.example.com/confirmar",
      "Será necessário introduzir a sua senha completa e o PIN do cartão.",
      "",
      "Sem confirmação, o reembolso será cancelado."
    ].join("\n")
  },

  // --- near-miss genuine letters, one per misfiring needle ------------------
  {
    id: "genuine_bank_fraud_advice",
    label: "Bank anti-fraud advice, English",
    intent: "THE SHARPEST FALSE POSITIVE. A genuine bank letter whose entire purpose is " +
      "telling the reader never to share a password or PIN. It names every credential " +
      "word on purpose, so it trips 'share your password' today, and a structural " +
      "detector reading credential tokens would flag it too.",
    text: [
      "Barclays",
      "Important security information",
      "Account ending 6411",
      "",
      "Dear Customer",
      "",
      "We are writing to remind you how to keep your account safe.",
      "We will never ask you to share your password, your PIN, or your full card number.",
      "If anyone contacts you asking for these, it is a scam and you should stop.",
      "",
      "You can report a suspicious message at barclays.co.uk/security",
      "or by calling the number on the back of your card."
    ].join("\n")
  },
  {
    id: "genuine_nhs_booking_link",
    label: "NHS appointment with an online booking link, English",
    intent: "Trips 'click this link' today. A genuine NHS letter carrying a link on the " +
      "NHS's own domain, which is the shape that makes link presence useless as a " +
      "signal on its own.",
    text: [
      "West Middlesex University Hospital",
      "Dermatology Department",
      "Reference: WM-8842177",
      "",
      "Dear Mr Vaidya",
      "",
      "You have an appointment on Tuesday 7 July 2026 at 10:30am.",
      "Please arrive fifteen minutes early.",
      "",
      "Click this link to confirm or change your appointment online: nhs.uk/myappointments",
      "If you cannot attend, please telephone 020 8321 5000."
    ].join("\n")
  },
  {
    id: "genuine_school_final_warning",
    label: "School attendance letter using the words final warning, English",
    intent: "Trips 'final warning'. A genuine school letter before a penalty notice, " +
      "which is exactly the wording the documented sweep found misfiring.",
    text: [
      "Fairfield Community School",
      "Attendance Team",
      "Pupil: J Vaidya, Year 9",
      "",
      "Dear Parent or Carer",
      "",
      "This is a final warning before a penalty notice is issued for unauthorised absence.",
      "Attendance this term is 82 per cent against a required 95 per cent.",
      "",
      "Please contact the attendance team on 020 8583 1188 to discuss support available.",
      "A meeting can be arranged before 18 September 2026."
    ].join("\n")
  },
  {
    id: "genuine_dwp_identity_check",
    label: "Benefits identity verification, English",
    intent: "Trips 'verify your identity within'. A genuine DWP letter asking the reader " +
      "to confirm identity within a stated window, which is ordinary process rather " +
      "than manufactured urgency.",
    text: [
      "Department for Work and Pensions",
      "Universal Credit",
      "National Insurance number: on your award letter",
      "",
      "Dear Mr Vaidya",
      "",
      "We need to confirm your identity before we can continue with your claim.",
      "You must verify your identity within 30 days or we cannot process your claim.",
      "",
      "You can do this at your local Jobcentre Plus, or by post using the enclosed form.",
      "If you need help, call us on 0800 328 5644."
    ].join("\n")
  },
  {
    id: "genuine_court_account_freeze",
    label: "Court third party debt order letter, English",
    intent: "Trips 'account will be frozen'. A genuine county court letter explaining " +
      "what a third party debt order does. The phrase describes a real legal " +
      "consequence rather than a threat made by the sender.",
    text: [
      "County Court Business Centre",
      "Claim number: F2QZ4471",
      "",
      "Dear Mr Vaidya",
      "",
      "An application has been made for a third party debt order against you.",
      "If the order is granted your bank account will be frozen up to the amount owed of £742.19.",
      "",
      "A hearing is listed for 22 September 2026.",
      "You may attend and explain your circumstances to the judge.",
      "Free advice is available from a trusted advice service."
    ].join("\n")
  },
  {
    id: "genuine_post_office_card_payment",
    label: "Council bill naming card payment at the Post Office, English",
    intent: "Trips 'enter your pin'. An ordinary payment instruction, and the case that " +
      "makes a credential-token detector unusable on its own.",
    text: [
      "Hounslow Borough Council",
      "Council Tax Bill 2026/2027",
      "Account number: 4471028866",
      "",
      "Dear Occupier",
      "",
      "Amount to pay: £486.20",
      "Please pay by 3 September 2026.",
      "",
      "You can pay online at hounslow.gov.uk/counciltax, by direct debit, or at any",
      "Post Office by debit card, where you will need to enter your PIN.",
      "If you think this bill is wrong, contact us on 020 8583 4242."
    ].join("\n")
  },

  // ------------------------------------------- numbers written the other way
  //
  // Every one of the 54 documents above prints its phone number in UK national
  // format, starting with a zero. hasTelephoneNumber and coLocation's PHONE are
  // both /\b0\d[\d\s]{7,12}\d\b/, so the corpus had never once asked what
  // happens to +44, +48, +351 or +40, which is how the people this product is
  // for actually write a number down.
  //
  // ALL SIX ARE GENUINE. None is a scam. They are here as findings, not as a
  // fix: each one records something the engine gets wrong TODAY, so the fix has
  // something to be measured against. See KNOWN_ENGINE_DEFECTS.md.
  {
    id: "intl_energy_bill_plus44",
    label: "Energy bill, English, number written as +44",
    intent: "Fully supported type, nothing else unusual. Records that a bill Northcue " +
      "reads perfectly loses its contact_number, so card 3 drops 'The document gives " +
      "this phone number' for no reason the reader can see. 4 structural signals, so " +
      "the non-document gate is not involved: this is the contact field alone.",
    text: [
      "Northfield Energy Ltd",
      "Registered office: 4 Cranmer Way, Leeds",
      "",
      "Account number: NE-77410",
      "Bill date: 9 July 2026",
      "",
      "Dear Mr Adeyemi",
      "",
      "Electricity and gas statement for 1 April to 30 June 2026",
      "",
      "Previous balance: £84.10",
      "Payments received: -£84.10",
      "Charges this period: £246.85",
      "Amount due: £246.85",
      "",
      "Please pay by 6 August 2026.",
      "",
      "If you have a question about this bill you can call us on +44 113 496 2200.",
      "Our lines are open Monday to Friday, 8am to 6pm.",
      "",
      "If you do not pay by the date shown we may add a late payment charge."
    ].join("\n")
  },
  {
    id: "intl_water_arrears_00_prefix",
    label: "Water arrears letter, English, number written with the 00 international prefix",
    intent: "THE WORST OF THE SIX, and the only one where the reader is actively " +
      "misled rather than merely underserved. 0044 118 273 4567 has 14 digits, above " +
      "the 10-11 cap, but the pattern is global so it matches the 10-digit PREFIX " +
      "'0044 118 273' and the cap never sees the whole number. That value reaches " +
      "contact_number and is printed on card 3. The comment on PHONE says a candidate " +
      "outside the range is declined whole because 'a wrong number is a call to a " +
      "stranger'; this is the case where that does not happen.",
    text: [
      "Thames Valley Water",
      "Customer Services, PO Box 442, Reading",
      "",
      "Account number: 8842-0076",
      "Date: 14 July 2026",
      "",
      "Dear Ms Kowalska",
      "",
      "Your water account is in arrears and we have not been able to reach you.",
      "",
      "Amount outstanding: £312.44",
      "Payment due by 28 August 2026.",
      "",
      "If you are having difficulty paying, please call 0044 118 273 4567 and ask for",
      "the affordability team. We can agree a payment plan with you.",
      "",
      "If we do not hear from you we may pass the account to a collection agency."
    ].join("\n")
  },
  {
    id: "intl_polish_clinic_appointment",
    label: "Clinic appointment reminder written in Polish, number written as +48",
    intent: "THE REFUSAL. A real appointment reminder carries a date, a room, a time " +
      "and a number to ring, and no patient reference, because the letter is the " +
      "reference. It scores date_any_script and labelled_fields and nothing else, so " +
      "it sits at 2 of the 3 structural signals and is refused outright as a non " +
      "document. The phone number is the third signal it should have. Polish is " +
      "deliberate: the gate's English month list accidentally matches septembrie, " +
      "septiembre and septembre, so a Romance-language letter is rescued by a " +
      "coincidence that Polish does not get.",
    text: [
      "Przychodnia Zdrowia Rodzinnego",
      "ul. Marszałkowska 18, Warszawa",
      "",
      "Data pisma: 20 lipca 2026",
      "",
      "Szanowna Pani Nowak,",
      "",
      "Potwierdzamy termin wizyty w naszej poradni.",
      "",
      "Termin wizyty: 11 sierpnia 2026, godzina 14:30",
      "Gabinet: 4, pierwsze piętro",
      "",
      "Prosimy o przybycie 10 minut wcześniej.",
      "W razie potrzeby zmiany terminu prosimy o kontakt pod numerem +48 22 512 44 90.",
      "",
      "Nieodwołana wizyta może skutkować skreśleniem z listy oczekujących."
    ].join("\n")
  },
  {
    id: "intl_portuguese_energy_final_notice",
    label: "Energy disconnection notice written in Portuguese, number written as +351",
    intent: "Not refused, because it carries a client number, so it records the milder " +
      "half: a final notice with a deadline and a stated consequence that keeps its " +
      "cards and loses only the number a worried reader would want most.",
    text: [
      "Energia Atlântico, S.A.",
      "Apartado 118, Lisboa",
      "",
      "Número de cliente: PT-90244",
      "Data: 3 de julho de 2026",
      "",
      "Exmo. Senhor Ferreira,",
      "",
      "Aviso de corte por falta de pagamento.",
      "",
      "Valor em dívida: £188.60",
      "Data limite de pagamento: 21 de agosto de 2026.",
      "",
      "Para regularizar a situação contacte-nos através do +351 21 447 8802.",
      "",
      "Se o pagamento não for efetuado até à data indicada o fornecimento será interrompido."
    ].join("\n")
  },
  {
    id: "intl_sole_trader_invoice",
    label: "Sole trader invoice, English, payment link and a +44 number",
    intent: "THE Q3 FALSE POSITIVE, named in KNOWN_ENGINE_DEFECTS.md before it existed " +
      "and now written down. A link, a total, no reference code and a phone number the " +
      "engine cannot see, so lureShape fires on a genuine invoice from a plumber. It " +
      "was drafted with a mobile first and cleared the rule for the wrong reason: the " +
      "six-digit run in 07700 900412 matched REFERENCE_CODE, so the number counted as " +
      "a reference. The landline avoids that artefact and shows the real behaviour.",
    text: [
      "J. Whelan Plumbing and Heating",
      "",
      "Invoice for work completed at 14 Sutton Court Road",
      "Date: 22 July 2026",
      "",
      "Replace hot water cylinder and fit new thermostatic valve",
      "Labour and parts",
      "",
      "Total: £486.00",
      "",
      "Payment due within 14 days. You can pay online at jwhelanplumbing.example.com",
      "or by bank transfer. Thank you very much for your business.",
      "",
      "Jim Whelan, +44 113 496 2200"
    ].join("\n")
  },
  {
    id: "intl_romanian_school_meeting",
    label: "Parents' evening notice written in Romanian, number written as +40",
    intent: "The counterexample to the Polish one, and the reason that entry says " +
      "Polish is deliberate. Two structural signals, same as the clinic letter, but " +
      "NOT refused, because '15 septembrie 2026' matches the gate's English month " +
      "list through the shared 'sep' stem. It is rescued by an accident, and 'setembro' " +
      "or 'listopada' in the same letter would not be.",
    text: [
      "Școala Gimnazială Nr. 7",
      "Strada Zorilor 12, Cluj-Napoca",
      "",
      "Elev: Andrei Popescu",
      "Clasa: 6B",
      "",
      "Ședința cu părinții va avea loc pe 15 septembrie 2026, ora 18:00.",
      "",
      "Vă rugăm să confirmați prezența la +40 264 591 220.",
      "",
      "Vă așteptăm cu drag."
    ].join("\n")
  },

  // ------------------------------------------ one document, more than one page
  //
  // Added 2 August 2026 after a real British Gas bill was uploaded to the live
  // product and ALL SIX CARDS DECLINED. Until now every one of the 60 documents
  // was a single page, so the corpus had never asked what happens when a letter
  // continues onto a second one, which is the ordinary shape of most of the
  // post Northcue exists for.
  //
  // ALL THREE ARE GENUINE, ORDINARY, SINGLE DOCUMENTS. All three currently come
  // back "This upload appears to contain more than one letter." with every
  // amount, date and sentence withheld. They are here as findings, not fixes.
  //
  // THE CAUSE, confirmed rather than assumed: hasRepeatedLetterhead in
  // src/utils/splitDocuments.js. extractTextFromPdf joins pages with "\n\n" and
  // emits no page marker, so no separator and no pagination signal exists. What
  // fires is the sender's name standing alone at the top of each page, which is
  // what a running header IS.
  {
    id: "bill_with_contacts_page",
    label: "Energy bill whose second page is a standalone contacts panel",
    intent: "THE LIVE FAILURE, reproduced. Page one is an ordinary bill: sender, " +
      "addressee, account number, bill date, covering period, a credit-then-debit " +
      "account summary, a stated collection, tariff and usage. Page two is a contacts " +
      "panel with its own heading, eight phone numbers, no addressee and no date. " +
      "Fires on the line 'British Gas' appearing standalone twice. Should read: " +
      "British Gas, £187.82, collected on or just after 6 May 2026.",
    text: [
      "British Gas",
      "",
      "Your electricity bill",
      "",
      "Mr J Harding",
      "42 Ashgrove Terrace",
      "Leeds LS8 3PQ",
      "",
      "Supply address: 42 Ashgrove Terrace, Leeds LS8 3PQ",
      "Customer account number: 8842 0076 1194",
      "Bill date: 22 Apr 2026",
      "Covering: 22 Jan 2026 to 22 Apr 2026",
      "",
      "Account summary",
      "Previous balance: £142.60",
      "Payment received 04 Feb 2026: -£142.60",
      "Charges this period: £187.82",
      "Balance now due: £187.82",
      "",
      "We're collecting £187.82 on or just after 6 May 2026.",
      "",
      "Your tariff",
      "Tariff name: Standard Variable",
      "Unit rate: 24.50p per kWh",
      "Standing charge: 60.10p per day",
      "",
      "Your usage",
      "Meter reading 22 Jan 2026: 41882",
      "Meter reading 22 Apr 2026: 42611",
      "Electricity used: 729 kWh",
      "",
      "British Gas Trading Limited is registered in England and Wales.",
      "",
      "British Gas",
      "",
      "Helpful contacts",
      "",
      "Billing enquiries: 0333 202 9802",
      "Meter readings: 0333 202 9532",
      "Moving home: 0333 202 9532",
      "Smell gas: 0800 111 999",
      "Energy Ombudsman: 0330 440 1624",
      "Citizens Advice consumer helpline: 0808 223 1133",
      "Priority Services Register: 0800 072 8625",
      "Supply network operator: 0800 375 675",
      "",
      "Lines are open Monday to Friday, 8am to 6pm."
    ].join("\n")
  },
  {
    id: "letter_with_terms_on_back",
    label: "Insurance renewal with terms and conditions on the back",
    intent: "The same failure by a different route, and the one where the reader is " +
      "worst served: the letter says 'You do not need to do anything', which is exactly " +
      "the reassurance a worried reader needs, and the decline withholds it. The back " +
      "page is terms, a cancellation right and a complaints route, with no addressee " +
      "and no date. Fires on 'Shelter Mutual Insurance' standing alone twice.",
    text: [
      "Shelter Mutual Insurance",
      "",
      "Home insurance renewal",
      "",
      "Mrs P Okonkwo",
      "8 Fernbank Avenue",
      "Nottingham NG5 2LT",
      "",
      "Policy number: SM-4471028",
      "Letter date: 12 May 2026",
      "",
      "Dear Mrs Okonkwo",
      "",
      "Your home insurance is due for renewal on 30 June 2026.",
      "",
      "Your premium for the coming year: £342.80",
      "Last year you paid: £311.40",
      "",
      "You do not need to do anything. Your policy will renew automatically",
      "and the premium will be taken from the card we hold on file.",
      "",
      "Shelter Mutual Insurance",
      "",
      "Terms and conditions",
      "",
      "Your right to cancel",
      "You may cancel this policy within 14 days of the renewal date shown above.",
      "If you cancel we will refund the premium less a charge for cover provided.",
      "",
      "How to complain",
      "Write to the address shown on the front of this letter.",
      "If you are not satisfied you may refer the matter to the Financial Ombudsman Service.",
      "",
      "Shelter Mutual Insurance is authorised and regulated by the Financial Conduct Authority."
    ].join("\n")
  },
  {
    id: "statement_with_transactions_page",
    label: "Account statement with a transactions page",
    intent: "The third shape, and the one carrying the most numbers to get wrong: six " +
      "dated transactions, four amounts that are not owed, and a closing balance that " +
      "is not a demand. Fires on 'Northbridge Building Society' standing alone twice. " +
      "Also records a SEPARATE defect not caused by the split: detectDocumentCategory " +
      "returns 'housing', because one transaction line says Rent.",
    text: [
      "Northbridge Building Society",
      "",
      "Statement of account",
      "",
      "Mr R Patel",
      "31 Halton Road",
      "Coventry CV6 4NS",
      "",
      "Account number: 4471 0288",
      "Statement date: 1 May 2026",
      "Covering: 1 April 2026 to 30 April 2026",
      "",
      "Opening balance: £1,204.18",
      "Money in: £1,860.00",
      "Money out: £2,651.52",
      "Closing balance: £412.66",
      "",
      "Northbridge Building Society",
      "",
      "Your transactions",
      "",
      "03 Apr  Direct debit  Severn Trent Water  £48.20",
      "07 Apr  Card payment  Sainsburys  £62.14",
      "11 Apr  Salary  Coventry City Council  £1,860.00",
      "18 Apr  Direct debit  British Gas  £187.82",
      "24 Apr  Standing order  Rent  £925.00",
      "29 Apr  Card payment  Trainline  £28.36",
      "",
      "Northbridge Building Society is a member of the Financial Services Compensation Scheme."
    ].join("\n")
  }
];

module.exports = { CORPUS };
