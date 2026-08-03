// Three shapes reported from the live product, where the contact number never
// reached the reader. None existed in the corpus, and all three are ordinary UK
// post.
//
// WHY THEY ARE HERE. The engine surfaces a phone number on card 3 for 17 of 60
// corpus documents, which reads like the feature works. Every one of those 17
// has exactly ONE number that binds. These three are what real post looks like:
// four to ten numbers, one of which the reader needs.
//
// Each one fails at a DIFFERENT gate, which is why one fix was never going to
// cover them:
//
//   contacts panel      the pattern finds all four numbers and no purpose
//                       phrase binds any, because PHONE_GOVERNS knows verbs
//                       ("telephone", "call") and a contacts panel labels by
//                       purpose noun ("Billing enquiries:", "Meter readings:")
//
//   debt-help block     the supplier number binds correctly and alone. The four
//                       charity numbers are a separate concept and must never
//                       enter the contest
//
//   caseworker letter   BOTH numbers bind, "Phone 03000 511899" at the top and
//                       "call the VAT helpline on 0300 200 3700" in the body,
//                       so the two-candidate decline fires and the reader gets
//                       neither, on the letter that says "phone me on the above
//                       number"
//
// Invented names, addresses, references and numbers throughout. The structure
// and the arrangement of numbers are what is being reproduced.

"use strict";

const CONTACT_SHAPES = [
  {
    id: "energy_bill_contacts_panel",
    note: "An energy bill with a billing number, a separate meter-reading " +
      "number, a moving-home number, a power-cut number and a third-party " +
      "advice line, all in a contacts panel labelled by purpose noun. Four " +
      "numbers the pattern finds and no purpose phrase that binds any of them.",
    text: [
      "Brightpath Energy Limited",
      "Your electricity bill",
      "",
      "Mrs A Oyelaran",
      "24 Fernbank Road",
      "Leeds LS7 2QH",
      "",
      "Account number: 8842 0076 1194",
      "Supply address: 24 Fernbank Road, Leeds LS7 2QH",
      "Bill date: 14 May 2026",
      "Billing period: 14 February 2026 to 13 May 2026",
      "",
      "Dear Mrs Oyelaran",
      "",
      "Amount now due: £298.53",
      "Please pay by 4 June 2026.",
      "",
      "If you pay by monthly Direct Debit you do not need to do anything. We will",
      "collect £99.51 on or just after 4 June 2026.",
      "",
      "Your meter readings",
      "Previous reading 14 February 2026: 38112",
      "Current reading 13 May 2026: 39604",
      "Electricity used: 1,492 kWh",
      "",
      "Helpful contacts",
      "Billing enquiries: 0330 808 3880",
      "Meter readings: 0330 054 5340",
      "Moving home: 0330 808 3881",
      "Citizens Advice consumer helpline: 0808 223 1133",
      "",
      "Lines are open Monday to Friday, 8am to 6pm.",
      "Brightpath Energy Limited is registered in England and Wales."
    ].join("\n")
  },
  {
    id: "communal_bill_debt_help_block",
    note: "A communal heating bill with one supplier number at the top and a " +
      "four-entry debt-help block at the foot. The supplier number binds and " +
      "is correct. The block is a card 6 concept and must not compete: the " +
      "letter itself says those services are independent of the sender.",
    text: [
      "Switchpoint Energy Services",
      "Communal heating and hot water",
      "Telephone 0333 321 2010",
      "",
      "Mr D Kowalczyk",
      "Flat 62, Marlowe Court",
      "Wembley Park HA9 0FT",
      "",
      "Customer reference: SW-4471028",
      "Property managed by: Quintain Living",
      "Statement date: 2 June 2026",
      "Period: 1 March 2026 to 31 May 2026",
      "",
      "Dear Mr Kowalczyk",
      "",
      "Heat and hot water charges for the period: £184.22",
      "Balance brought forward: £61.40",
      "Total now due: £245.62",
      "",
      "Please pay by 30 June 2026. If you do not pay, your account may be passed to",
      "a collection agency and further charges may be added.",
      "",
      "Free and independent debt advice",
      "You can get free help with money worries. These services are independent of",
      "Switchpoint Energy Services and do not charge:",
      "StepChange Debt Charity: 0800 138 1111",
      "Citizens Advice: 0808 223 1133",
      "National Debtline: 0808 808 4000",
      "Priority Services Register: ask us to add you if you need extra support.",
      "",
      "Switchpoint Energy Services, PO Box 4410, Manchester M1 3BN."
    ].join("\n")
  },
  {
    id: "official_letter_caseworker_number",
    note: "An official letter with a named caseworker's direct number and " +
      "opening hours at the top, and a general helpline in the body. Both " +
      "bind, so the two-candidate decline fires and the reader gets neither, " +
      "on a letter whose own instruction is to phone the number at the top. " +
      "It also states two consequences of inaction the engine does not read: " +
      "documents destroyed after 50 days, and an address change.",
    text: [
      "HM Revenue and Customs",
      "VAT Compliance",
      "BX9 1WR",
      "",
      "Phone 03000 511899",
      "Open Monday to Thursday 8am to 5pm, Friday 8am to 4.30pm",
      "",
      "Mr S Bhatti",
      "Bhatti Electrical Services Ltd",
      "14 Rowan Way",
      "Coventry CV5 8JN",
      "",
      "VAT registration number: 442 7108 63",
      "Our reference: VC/2026/44710",
      "Date: 3 June 2026",
      "",
      "Dear Mr Bhatti",
      "",
      "Visit to check your VAT records",
      "",
      "I have arranged to visit your business to check your VAT records. The visits",
      "are booked for 12 and 13 June 2026 at 09:30.",
      "",
      "If the dates, times or place need changing, please phone me on the above",
      "number as soon as possible.",
      "",
      "Please have your VAT records ready for the periods shown. I will need to see",
      "your sales invoices, purchase invoices and bank statements.",
      "",
      "If you have a general query about VAT you can call the VAT helpline on",
      "0300 200 3700.",
      "",
      "Any documents you give me may be securely destroyed after 50 days unless you",
      "ask for them to be returned.",
      "",
      "Please note our address has changed. Post sent to the old address may not",
      "reach us.",
      "",
      "Yours sincerely",
      "J Whelan",
      "VAT Compliance Officer"
    ].join("\n")
  }
];

module.exports = { CONTACT_SHAPES };
