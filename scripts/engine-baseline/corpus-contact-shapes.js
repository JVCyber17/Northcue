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
  },
  {
    id: "energy_quarterly_footer_sender",
    note: "The founder's live review shape, 6 August 2026, built synthetic and " +
      "extended to production scale the same day: a quarterly energy bill " +
      "whose first page opens with field label blocks before any prose, " +
      "whose sender name appears ONLY in the page footer and inside web " +
      "addresses, and whose contacts all sit on page two under a Helpful " +
      "contacts heading: one customer service number behind a QUESTION-FORM " +
      "label (the real letter's shape, which the verb-and-purpose-noun " +
      "vocabulary did not bind), three emergency numbers, an ombudsman " +
      "number, an independent advice line and a payment help web address. " +
      "Six numbers, one of which the reader needs, none behind a verb. The " +
      "body prose is figure-free by design so the earlier pins hold: no new " +
      "dates, no new amounts, no links beyond the original two. Long enough " +
      "that the redacted outbound text saturates the 8,000-character " +
      "provider cap, which is what any large real document sends. THE WHALE " +
      "SENTENCE, added 6 August 2026 with the clustering window: the " +
      "around-the-clock emergency line, 'open 24 hours, 7 days a week', " +
      "sits with the emergency numbers exactly as the founder's real bill " +
      "prints it. It once refused this document outright (the comma defeats " +
      "the availability lookahead, and the old document-wide co-occurrence " +
      "made three signals of it); under the clustering window the nearest " +
      "amount is over five thousand characters away and the document stays " +
      "normal, so this twin now tests the length-scaling class forever. " +
      "Invented names, addresses, references and numbers throughout.",
    text: [
      "Supply address:",
      "14 Elmswood Drive",
      "Reading RG2 8QT",
      "",
      "Rota letter: C",
      "Supply number: S 01 801 100 22 0142 5566 778",
      "Customer reference: SVE-88413320",
      "Billing period: 1 April 2026 to 30 June 2026",
      "Bill date: 8 July 2026",
      "Page 1 of 2",
      "",
      "Your quarterly electricity bill",
      "",
      "Your charges for this period",
      "",
      "Electricity used: 912 kWh",
      "Unit rate: 27.54p per kWh",
      "Standing charge: 91 days at 60.10p per day",
      "Energy charges: £251.16",
      "Standing charges: £54.69",
      "VAT at 5%: £15.29",
      "Total charges this quarter: £321.14",
      "",
      "Your account balance",
      "",
      "Previous balance: £48.02 in credit",
      "Payments received: £240.00 thank you",
      "Total now due: £129.16",
      "Please pay by 5 August 2026.",
      "",
      "Paying your bill",
      "You can pay by Direct Debit, online, or using the payment slip below.",
      "If you pay by monthly Direct Debit no action is needed and your next",
      "collection date will be shown on your statement.",
      "",
      "About your tariff",
      "You are on our Fixed Saver tariff. The prices that make up this bill",
      "are the unit rate and the daily standing charge shown above. Your unit",
      "rate pays for the electricity you have used. The standing charge is a",
      "fixed daily cost of supplying your home, and it applies even on days",
      "when no electricity is used. These prices are fixed for the length of",
      "your tariff, so they will not rise or fall with the wholesale market",
      "while the tariff lasts. When your tariff comes to an end we will write",
      "to you before anything changes, and you will be free to choose again",
      "at that point.",
      "",
      "How we worked out this bill",
      "This bill is based on the meter reading you gave us at the end of the",
      "billing period shown above. We multiplied the electricity you used by",
      "your unit rate, added the standing charge for each day of the period,",
      "and then added VAT at the reduced domestic rate. The section called",
      "Your charges for this period shows each of those parts on its own",
      "line, so you can see exactly what makes up the total. If a previous",
      "bill was based on an estimate, any difference is corrected",
      "automatically the next time an actual reading reaches us.",
      "",
      "Your meter readings",
      "Your reading this quarter was an actual reading, taken from the meter",
      "itself rather than estimated. Regular readings keep your bills",
      "accurate. If we ever have to estimate, the letter E appears beside the",
      "figure, and the amount is corrected once a real reading arrives. You",
      "can send a reading at any time through your online account, and it",
      "takes about a minute.",
      "",
      "How your usage compares",
      "Your usage this quarter was 6% lower than the same quarter last year.",
      "Comparing like for like helps you see whether changes at home are",
      "making a difference. A milder spring, new appliances, or more people",
      "at home can each move the figure, so treat the comparison as a guide",
      "rather than a judgement.",
      "",
      "Smart meters",
      "A smart meter sends readings automatically, so estimated bills become",
      "a thing of the past. It also lets you see what you are spending as you",
      "go, in pounds rather than in units, on a small display you can keep",
      "anywhere at home. Installation is free and usually takes under an",
      "hour. If you would like one, you can arrange an installation through",
      "your online account and choose a time that suits you.",
      "",
      "Page 2 of 2",
      "",
      "What the words on your bill mean",
      "kWh is a kilowatt hour, the unit electricity is measured in. A",
      "kilowatt hour is roughly one wash cycle, or a few evenings of",
      "television. Unit rate is the price of each kilowatt hour you use.",
      "Standing charge is the fixed daily cost of your connection, which",
      "covers the network of cables and the meter itself. Rota letter is the",
      "letter that tells you which group your home belongs to if planned",
      "power interruptions are ever needed. You only need it in that rare",
      "situation, and you can find yours in the block at the top of page one.",
      "",
      "Moving home",
      "Letting us know before you move means we can close your account on",
      "the day you leave and send a final bill to your new address. It helps",
      "to take a meter reading on moving day and to keep a note of it,",
      "because a forgotten reading leaves the final bill estimated, and an",
      "estimate is harder to challenge later. Whoever lives there next is",
      "responsible for electricity used after you have left.",
      "",
      "The Priority Services Register",
      "The Priority Services Register is a free support service for",
      "households that need extra help, for example because of age, illness,",
      "disability, or a young family. Joining it means we can tell you in",
      "advance about planned interruptions, arrange readings if nobody in the",
      "home can reach the meter, and send bills in large print or braille.",
      "Joining is free and does not affect your prices. You can join through",
      "your online account.",
      "",
      "If something goes wrong",
      "If you think this bill is wrong, or something about your account",
      "worries you, we want to put it right. Most problems are sorted out in",
      "one conversation. If you are not happy with our answer, you can ask",
      "for it to be looked at again by a senior member of the team. If eight",
      "weeks pass without a resolution, or we tell you we cannot take it",
      "further, you can take your complaint to the Energy Ombudsman. The",
      "ombudsman service is free to use and independent of us, and its",
      "decisions are binding on us but not on you.",
      "",
      "Help with paying",
      "If paying this bill is difficult, the sooner we know the more we can",
      "do. There is more we can do early than late. We can spread what you owe over",
      "instalments that fit your budget, move your payment date, or check",
      "whether you qualify for support schemes. Details of every option are",
      "on the payment help page shown under Helpful contacts below. Nobody's",
      "supply is switched off without every other route being tried first,",
      "and never where a household is on the Priority Services Register",
      "during the colder months.",
      "",
      "Helpful contacts",
      "",
      "Questions about your bill? 0345 201 8812",
      "(Monday to Friday, 8am to 6pm)",
      "",
      "Power cut: 0800 909 8081",
      "Gas emergency: 0800 909 8082",
      "Electricity emergency: 0800 909 8083",
      "Our gas emergency line is open 24 hours, 7 days a week.",
      "",
      "Energy Ombudsman: 0330 908 1462",
      "Independent advice line: 0808 909 1133",
      "Help paying your bill: www.severnvale-energy.co.uk/payment-help",
      "",
      "Ways to save energy: www.severnvale-energy.co.uk/save",
      "",
      "Saving energy at home",
      "Small changes add up. Washing at a lower temperature, letting dishes",
      "drain rather than using the hot tap, and turning appliances off at the",
      "wall rather than leaving them on standby each shave a little from the",
      "next bill. Draught proofing doors and windows keeps warmth in without",
      "any running cost. The energy saving page shown above collects the tips",
      "our customers say made the biggest difference, along with the support",
      "schemes open this year.",
      "",
      "About this document",
      "This bill is worth keeping somewhere safe. Some support schemes and",
      "local services accept a recent energy bill as proof of address, and",
      "comparing bills from the same quarter of different years is the",
      "fairest way to watch your usage over time. If you manage someone",
      "else's affairs and need us to write to you instead, we can arrange",
      "that with the right authority in place.",
      "",
      "Switching supplier",
      "You are free to move to another supplier whenever you choose, and",
      "switching does not interrupt your supply for a moment. If you are in",
      "credit when you leave, the balance is returned to you after your",
      "final bill. We would rather keep you, but a market that lets people",
      "leave easily keeps every supplier honest, including us.",
      "",
      "How we protect your information",
      "We use your details to run your account, work out your bills, and",
      "meet our obligations as an energy supplier. We do not sell your",
      "information. Where we share it, for example with the network operator",
      "that maintains the cables in your area, it is because the supply",
      "itself depends on it. You can ask us at any time for a copy of the",
      "information we hold about you.",
      "",
      "Our fuel mix",
      "The electricity we supply comes from a blend of sources that changes",
      "across the year: renewables such as wind and solar, together with",
      "gas-fired generation and a share of nuclear. The exact blend for the",
      "most recent reporting year is published on our website, alongside the",
      "average blend for the country as a whole, so you can compare the two",
      "before choosing a tariff.",
      "",
      "Severn Vale Energy Limited, registered in England and Wales.",
      "Registered office: 4 Brindley Court, Gloucester GL1 2FF.",
      "severnvale-energy.co.uk"
    ].join("\n")
  }
];

module.exports = { CONTACT_SHAPES };
