// THE SHAPES THAT FOUND THE WEEK OF 4 AUGUST 2026. Permanent, and used by the
// English benchmark capture and test rather than the display corpus.
//
// Small documents hid every failure that week: the 1KB communal-bill synthetic
// served 8/10 while the real 702KB bill failed 2 in 5 uploads, and it took four
// diagnosis rounds to learn that scale was the variable. These documents keep
// the failing shapes reproducible forever:
//
//   DD/MM/YY billing periods and a DD/MM/YYYY issue date, the notation that
//   the canonicaliser could not read and that cost readers all six cards
//
//   enough length to produce production-sized prose, which is where the date
//   volume lives: the two production failures were the two SLOWEST generations
//
// NOT in scripts/engine-baseline/corpus.js, deliberately. That corpus feeds the
// card-height fixture and the display baseline, and these documents exist to
// exercise the GUARD STACK, not card layout. Promoting them to the display
// corpus requires a browser height-measurement session and is flagged in
// ENGINE_STATE.md as follow-up work, not silently skipped.

"use strict";

const BIG_COMMUNAL_BILL = [
  "Switchpoint Energy Services Limited",
  "Communal Heating and Hot Water Statement",
  "Property Reference No. 4471028",
  "",
  "Mr D Kowalczyk",
  "Flat 62, Marlowe Court",
  "Wembley Park HA9 0FT",
  "",
  "Invoice number: SW-4471028-11",
  "Issue date: 02/06/2026",
  "Billing period: 01/05/26 to 31/05/26",
  "Previous statement: 01/04/26 to 30/04/26",
  "Payment due date: 30/06/26",
  "Managing agent: Quintain Living",
  "",
  "Dear Mr Kowalczyk",
  "",
  "This statement covers your communal heating and hot water charges for the",
  "period shown above. Your account is billed monthly in arrears.",
  "",
  "SUMMARY OF CHARGES",
  "Heat and hot water consumption charge         £184.22",
  "Standing charge (31 days at £0.4823 per day)   £14.95",
  "Balance brought forward from 01/04/26           £61.40",
  "Less payment received 12/05/26                 -£20.35",
  "Total now due                                  £240.22",
  "",
  "Amount now due: £240.22",
  "Please pay by 30/06/26.",
  "",
  "YOUR DIRECT DEBIT",
  "Your monthly Direct Debit is currently £75.00, collected on or just after the",
  "1st of each month. Following this statement your Direct Debit will be adjusted",
  "to £96.40 from 01/07/26 to reflect your recent consumption. If you would",
  "prefer to keep your current amount, contact us before 24/06/26.",
  "",
  "METER READINGS",
  "Previous reading 30/04/26 (actual)      41,208 kWh",
  "Current reading 31/05/26 (actual)       42,700 kWh",
  "Consumption this period                  1,492 kWh",
  "Unit rate                            7.42p per kWh",
  "",
  "TARIFF DETAIL",
  "Your tariff is Communal Heat Variable. The unit rate is reviewed twice yearly,",
  "on 01/04/26 and 01/10/26. The standing charge covers maintenance of the",
  "communal plant, pipework and heat interface units, and is payable whether or",
  "not heat is used during the period.",
  "",
  "IF YOU ARE HAVING DIFFICULTY PAYING",
  "If you are having difficulty paying, please contact us as soon as possible on",
  "0333 321 2010. We can discuss a payment arrangement spread over a longer",
  "period. Lines are open Monday to Friday, 8am to 6pm.",
  "",
  "Free and independent debt advice",
  "You can get free help with money worries. These services are independent of",
  "Switchpoint Energy Services and do not charge:",
  "StepChange Debt Charity: 0800 138 1111",
  "Citizens Advice: 0808 223 1133",
  "National Debtline: 0808 808 4000",
  "",
  "WHAT HAPPENS IF YOU DO NOT PAY",
  "If payment is not received by 30/06/26, your account may be passed to a",
  "collection agency and reasonable costs may be added to your balance. We will",
  "write to you again before that happens.",
  "",
  "PRIORITY SERVICES REGISTER",
  "If you or someone in your household needs extra support, you can ask to be",
  "added to our Priority Services Register at no cost.",
  "",
  "HOW YOUR BILL IS CALCULATED",
  "Heat charges are calculated from the difference between your opening and",
  "closing meter readings, multiplied by the unit rate applying during the",
  "period. Where a reading is estimated it is marked (estimated) above. If you",
  "believe a reading is wrong, submit your own reading and we will recalculate.",
  "",
  "COMPLAINTS",
  "If you are unhappy with this statement, write to the address below. If we",
  "cannot resolve matters within eight weeks you may refer the complaint to the",
  "Energy Ombudsman.",
  "",
  "Switchpoint Energy Services Limited, PO Box 4410, Manchester M1 3BN.",
  "Registered in England and Wales. VAT registration 442 7108 63."
].join("\n");

// The same bill roughly doubled with the annexes a real statement carries, so
// the model generates for long enough to probe the timeout boundary: the two
// production failures were the two slowest generations, and the corpus had no
// document that pushed generation past 30 seconds until this one.
const BIG_COMMUNAL_BILL_WITH_ANNEX = BIG_COMMUNAL_BILL + "\n\n" + [
  "ANNEX A: YOUR PAYMENT HISTORY THIS YEAR",
  "05/01/26  Direct Debit received                 £75.00",
  "03/02/26  Direct Debit received                 £75.00",
  "03/03/26  Direct Debit received                 £75.00",
  "01/04/26  Direct Debit received                 £75.00",
  "12/05/26  Direct Debit received                 £20.35",
  "A payment of £75.00 due 01/05/26 was returned unpaid by your bank on",
  "03/05/26. No fee has been applied on this occasion.",
  "",
  "ANNEX B: HOW YOUR COMMUNAL HEAT NETWORK WORKS",
  "Your home is served by a communal heat network. A central plant room heats",
  "water which is circulated to every property through insulated pipework. Your",
  "heat interface unit transfers heat into your own radiators and hot water",
  "supply, and your meter records only the heat you draw. This is why your bill",
  "has no gas standing charge: the network buys gas centrally, and the cost is",
  "shared through the unit rate and standing charge shown overleaf.",
  "",
  "The network is regulated under the Heat Networks (Metering and Billing)",
  "Regulations. Bills must be based on actual consumption wherever a meter is",
  "fitted and working. If your meter fails, we may bill on a fair estimate based",
  "on your past use and must correct the account when a reading is next taken.",
  "",
  "ANNEX C: MOVING HOME",
  "If you are moving out, tell us your moving date and provide a forwarding",
  "address at least five working days in advance. We will take a closing reading",
  "on the day and send a final statement to your new address within fourteen",
  "days. Your landlord or the managing agent becomes responsible for charges",
  "from the day after your tenancy ends.",
  "",
  "ANNEX D: OUR SERVICE STANDARDS",
  "We aim to answer calls within five minutes, respond to written complaints",
  "within ten working days, and restore heat within twenty-four hours of a",
  "reported network fault. Where we fail these standards you may be entitled to",
  "a goodwill payment under our published customer charter, available on",
  "request. Compensation is credited to your account rather than paid in cash.",
  "",
  "ANNEX E: DATA PROTECTION",
  "We hold your name, address, meter readings and payment history to operate",
  "your account. We share data with the managing agent, our meter reading",
  "contractor and, where an account is in arrears, a licensed collection agency.",
  "You may request a copy of the data we hold at any time."
].join("\n");

const BENCHMARK_DOCS = [
  { id: "benchmark_communal_bill_scale", text: BIG_COMMUNAL_BILL },
  { id: "benchmark_communal_bill_annex", text: BIG_COMMUNAL_BILL_WITH_ANNEX }
];

module.exports = { BENCHMARK_DOCS };
