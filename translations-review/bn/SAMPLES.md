# Bengali (bn) pattern samples

DRAFT PENDING HUMAN REVIEW. All 51 slot patterns from `public/i18n/templates-bn.js`, each with the English template, the Bengali template, and two example sentences filled with plausible UK values. Slot values stay exactly as the app would insert them (Latin letters, English dates, £ amounts), so judge how the Bengali sentence reads around them. No em or en dashes anywhere.

## 1. tpl.deadline.appointment

- EN: `Your appointment is on {date}.`
- BN: `আপনার অ্যাপয়েন্টমেন্ট {date} তারিখে.`
- EN example 1: Your appointment is on 24 June 2026.
- BN example 1: আপনার অ্যাপয়েন্টমেন্ট 24 June 2026 তারিখে.
- EN example 2: Your appointment is on 3 July 2026.
- BN example 2: আপনার অ্যাপয়েন্টমেন্ট 3 July 2026 তারিখে.

## 2. tpl.deadline.due

- EN: `Due by {date}.`
- BN: `{date} এর মধ্যে.`
- EN example 1: Due by 24 June 2026.
- BN example 1: 24 June 2026 এর মধ্যে.
- EN example 2: Due by 1 September 2026.
- BN example 2: 1 September 2026 এর মধ্যে.

## 3. tpl.summary.bill_full

- EN: `{sender} appears to be asking you to pay {amount} by {date}.`
- BN: `মনে হচ্ছে {sender} আপনাকে {date} এর মধ্যে {amount} দিতে বলছে.`
- EN example 1: Thames Water appears to be asking you to pay £187.42 by 24 June 2026.
- BN example 1: মনে হচ্ছে Thames Water আপনাকে 24 June 2026 এর মধ্যে £187.42 দিতে বলছে.
- EN example 2: British Gas appears to be asking you to pay £64.20 by 3 July 2026.
- BN example 2: মনে হচ্ছে British Gas আপনাকে 3 July 2026 এর মধ্যে £64.20 দিতে বলছে.

## 4. tpl.summary.bill_amount_date

- EN: `This appears to be a payment request for {amount}, due by {date}.`
- BN: `এটি {amount} এর একটি পেমেন্টের অনুরোধ বলে মনে হচ্ছে, শেষ তারিখ {date}.`
- EN example 1: This appears to be a payment request for £187.42, due by 24 June 2026.
- BN example 1: এটি £187.42 এর একটি পেমেন্টের অনুরোধ বলে মনে হচ্ছে, শেষ তারিখ 24 June 2026.
- EN example 2: This appears to be a payment request for £52.00, due by 12 August 2026.
- BN example 2: এটি £52.00 এর একটি পেমেন্টের অনুরোধ বলে মনে হচ্ছে, শেষ তারিখ 12 August 2026.

## 5. tpl.summary.bill_sender_amount

- EN: `{sender} appears to be asking you to pay {amount}.`
- BN: `মনে হচ্ছে {sender} আপনাকে {amount} দিতে বলছে.`
- EN example 1: Thames Water appears to be asking you to pay £187.42.
- BN example 1: মনে হচ্ছে Thames Water আপনাকে £187.42 দিতে বলছে.
- EN example 2: British Gas appears to be asking you to pay £64.20.
- BN example 2: মনে হচ্ছে British Gas আপনাকে £64.20 দিতে বলছে.

## 6. tpl.summary.bill_sender_date

- EN: `This appears to be a bill from {sender}, dated {date}.`
- BN: `এটি {sender} এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে, তারিখ {date}.`
- EN example 1: This appears to be a bill from Thames Water, dated 24 June 2026.
- BN example 1: এটি Thames Water এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে, তারিখ 24 June 2026.
- EN example 2: This appears to be a bill from British Gas, dated 3 July 2026.
- BN example 2: এটি British Gas এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে, তারিখ 3 July 2026.

## 7. tpl.summary.bill_amount

- EN: `This appears to be a payment request for {amount}.`
- BN: `এটি {amount} এর একটি পেমেন্টের অনুরোধ বলে মনে হচ্ছে.`
- EN example 1: This appears to be a payment request for £187.42.
- BN example 1: এটি £187.42 এর একটি পেমেন্টের অনুরোধ বলে মনে হচ্ছে.
- EN example 2: This appears to be a payment request for £310.75.
- BN example 2: এটি £310.75 এর একটি পেমেন্টের অনুরোধ বলে মনে হচ্ছে.

## 8. tpl.summary.bill_sender

- EN: `This appears to be a bill from {sender}.`
- BN: `এটি {sender} এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে.`
- EN example 1: This appears to be a bill from Thames Water.
- BN example 1: এটি Thames Water এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে.
- EN example 2: This appears to be a bill from British Gas.
- BN example 2: এটি British Gas এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে.

## 9. tpl.summary.bill_in_credit_sender

- EN: `This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
- BN: `এটি {sender} এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে. মনে হচ্ছে আপনার অ্যাকাউন্টে টাকা জমা (ক্রেডিট) থাকতে পারে, তাই হয়তো কিছু দেওয়ার নেই. নিশ্চিত হতে মূল ডকুমেন্টটি দেখে নিন.`
- EN example 1: This appears to be a bill from Thames Water. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
- BN example 1: এটি Thames Water এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে. মনে হচ্ছে আপনার অ্যাকাউন্টে টাকা জমা (ক্রেডিট) থাকতে পারে, তাই হয়তো কিছু দেওয়ার নেই. নিশ্চিত হতে মূল ডকুমেন্টটি দেখে নিন.
- EN example 2: This appears to be a bill from EDF Energy. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
- BN example 2: এটি EDF Energy এর কাছ থেকে আসা একটি বিল বলে মনে হচ্ছে. মনে হচ্ছে আপনার অ্যাকাউন্টে টাকা জমা (ক্রেডিট) থাকতে পারে, তাই হয়তো কিছু দেওয়ার নেই. নিশ্চিত হতে মূল ডকুমেন্টটি দেখে নিন.

## 10. tpl.summary.gov_sender_amount

- EN: `{sender} appears to have sent an official notice mentioning {amount}.`
- BN: `মনে হচ্ছে {sender} একটি অফিসিয়াল নোটিশ পাঠিয়েছে, যাতে {amount} এর কথা আছে.`
- EN example 1: HMRC appears to have sent an official notice mentioning £310.75.
- BN example 1: মনে হচ্ছে HMRC একটি অফিসিয়াল নোটিশ পাঠিয়েছে, যাতে £310.75 এর কথা আছে.
- EN example 2: Tower Hamlets Council appears to have sent an official notice mentioning £187.42.
- BN example 2: মনে হচ্ছে Tower Hamlets Council একটি অফিসিয়াল নোটিশ পাঠিয়েছে, যাতে £187.42 এর কথা আছে.

## 11. tpl.summary.gov_sender

- EN: `This appears to be an official notice from {sender}.`
- BN: `এটি {sender} এর কাছ থেকে আসা একটি অফিসিয়াল নোটিশ বলে মনে হচ্ছে.`
- EN example 1: This appears to be an official notice from HMRC.
- BN example 1: এটি HMRC এর কাছ থেকে আসা একটি অফিসিয়াল নোটিশ বলে মনে হচ্ছে.
- EN example 2: This appears to be an official notice from Tower Hamlets Council.
- BN example 2: এটি Tower Hamlets Council এর কাছ থেকে আসা একটি অফিসিয়াল নোটিশ বলে মনে হচ্ছে.

## 12. tpl.summary.gov_amount

- EN: `This appears to be an official notice mentioning {amount}.`
- BN: `এটি একটি অফিসিয়াল নোটিশ বলে মনে হচ্ছে, যাতে {amount} এর কথা আছে.`
- EN example 1: This appears to be an official notice mentioning £310.75.
- BN example 1: এটি একটি অফিসিয়াল নোটিশ বলে মনে হচ্ছে, যাতে £310.75 এর কথা আছে.
- EN example 2: This appears to be an official notice mentioning £52.00.
- BN example 2: এটি একটি অফিসিয়াল নোটিশ বলে মনে হচ্ছে, যাতে £52.00 এর কথা আছে.

## 13. tpl.summary.appt_sender_date

- EN: `This appears to be an appointment from {sender} on {date}.`
- BN: `এটি {sender} এর কাছ থেকে {date} তারিখের একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.`
- EN example 1: This appears to be an appointment from NHS Dental Services on 24 June 2026.
- BN example 1: এটি NHS Dental Services এর কাছ থেকে 24 June 2026 তারিখের একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.
- EN example 2: This appears to be an appointment from Royal London Hospital on 3 July 2026.
- BN example 2: এটি Royal London Hospital এর কাছ থেকে 3 July 2026 তারিখের একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.

## 14. tpl.summary.appt_sender

- EN: `This appears to be an appointment from {sender}.`
- BN: `এটি {sender} এর কাছ থেকে আসা একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.`
- EN example 1: This appears to be an appointment from NHS Dental Services.
- BN example 1: এটি NHS Dental Services এর কাছ থেকে আসা একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.
- EN example 2: This appears to be an appointment from Royal London Hospital.
- BN example 2: এটি Royal London Hospital এর কাছ থেকে আসা একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.

## 15. tpl.summary.appt_date

- EN: `This appears to be an appointment on {date}.`
- BN: `এটি {date} তারিখের একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.`
- EN example 1: This appears to be an appointment on 24 June 2026.
- BN example 1: এটি 24 June 2026 তারিখের একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.
- EN example 2: This appears to be an appointment on 12 August 2026.
- BN example 2: এটি 12 August 2026 তারিখের একটি অ্যাপয়েন্টমেন্ট বলে মনে হচ্ছে.

## 16. tpl.summary.generic_full

- EN: `This appears to be from {sender}, mentioning {amount} and a date of {date}.`
- BN: `এটি {sender} এর কাছ থেকে এসেছে বলে মনে হচ্ছে, যাতে {amount} এবং {date} তারিখের কথা আছে.`
- EN example 1: This appears to be from Thames Water, mentioning £187.42 and a date of 24 June 2026.
- BN example 1: এটি Thames Water এর কাছ থেকে এসেছে বলে মনে হচ্ছে, যাতে £187.42 এবং 24 June 2026 তারিখের কথা আছে.
- EN example 2: This appears to be from Barclays Bank, mentioning £310.75 and a date of 1 September 2026.
- BN example 2: এটি Barclays Bank এর কাছ থেকে এসেছে বলে মনে হচ্ছে, যাতে £310.75 এবং 1 September 2026 তারিখের কথা আছে.

## 17. tpl.summary.generic_amount_date

- EN: `This document appears to mention {amount} and a date of {date}.`
- BN: `এই ডকুমেন্টে {amount} এবং {date} তারিখের কথা আছে বলে মনে হচ্ছে.`
- EN example 1: This document appears to mention £187.42 and a date of 24 June 2026.
- BN example 1: এই ডকুমেন্টে £187.42 এবং 24 June 2026 তারিখের কথা আছে বলে মনে হচ্ছে.
- EN example 2: This document appears to mention £52.00 and a date of 3 July 2026.
- BN example 2: এই ডকুমেন্টে £52.00 এবং 3 July 2026 তারিখের কথা আছে বলে মনে হচ্ছে.

## 18. tpl.summary.generic_sender_amount

- EN: `This appears to be from {sender}, mentioning {amount}.`
- BN: `এটি {sender} এর কাছ থেকে এসেছে বলে মনে হচ্ছে, যাতে {amount} এর কথা আছে.`
- EN example 1: This appears to be from Thames Water, mentioning £187.42.
- BN example 1: এটি Thames Water এর কাছ থেকে এসেছে বলে মনে হচ্ছে, যাতে £187.42 এর কথা আছে.
- EN example 2: This appears to be from Barclays Bank, mentioning £310.75.
- BN example 2: এটি Barclays Bank এর কাছ থেকে এসেছে বলে মনে হচ্ছে, যাতে £310.75 এর কথা আছে.

## 19. tpl.summary.generic_sender_date

- EN: `This appears to be from {sender}, with a date of {date}.`
- BN: `এটি {sender} এর কাছ থেকে এসেছে বলে মনে হচ্ছে, তারিখ {date}.`
- EN example 1: This appears to be from Thames Water, with a date of 24 June 2026.
- BN example 1: এটি Thames Water এর কাছ থেকে এসেছে বলে মনে হচ্ছে, তারিখ 24 June 2026.
- EN example 2: This appears to be from HMRC, with a date of 1 September 2026.
- BN example 2: এটি HMRC এর কাছ থেকে এসেছে বলে মনে হচ্ছে, তারিখ 1 September 2026.

## 20. tpl.summary.generic_sender

- EN: `This appears to be from {sender}.`
- BN: `এটি {sender} এর কাছ থেকে এসেছে বলে মনে হচ্ছে.`
- EN example 1: This appears to be from Thames Water.
- BN example 1: এটি Thames Water এর কাছ থেকে এসেছে বলে মনে হচ্ছে.
- EN example 2: This appears to be from HMRC.
- BN example 2: এটি HMRC এর কাছ থেকে এসেছে বলে মনে হচ্ছে.

## 21. tpl.summary.garbled_sender

- EN: `{sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- BN: `মনে হচ্ছে {sender} পাঠিয়েছে {category_label}. লেখার মান এত কম যে নির্দিষ্ট অঙ্ক বা তারিখ নির্ভরযোগ্যভাবে পড়া যাচ্ছে না. এই বিবরণগুলির জন্য মূল ডকুমেন্টটি দেখে নিন.`
- EN example 1: Thames Water appears to have sent a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- BN example 1: মনে হচ্ছে Thames Water পাঠিয়েছে a bill or payment request. লেখার মান এত কম যে নির্দিষ্ট অঙ্ক বা তারিখ নির্ভরযোগ্যভাবে পড়া যাচ্ছে না. এই বিবরণগুলির জন্য মূল ডকুমেন্টটি দেখে নিন.
- EN example 2: HMRC appears to have sent an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- BN example 2: মনে হচ্ছে HMRC পাঠিয়েছে an official notice. লেখার মান এত কম যে নির্দিষ্ট অঙ্ক বা তারিখ নির্ভরযোগ্যভাবে পড়া যাচ্ছে না. এই বিবরণগুলির জন্য মূল ডকুমেন্টটি দেখে নিন.
- Note for checker: in the live app {category_label} is filled with the Bengali label from the same file, so the mixed language above only appears in this sample.

## 22. tpl.summary.garbled

- EN: `This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- BN: `এটি {category_label} বলে মনে হচ্ছে. লেখার মান এত কম যে নির্দিষ্ট অঙ্ক বা তারিখ নির্ভরযোগ্যভাবে পড়া যাচ্ছে না. এই বিবরণগুলির জন্য মূল ডকুমেন্টটি দেখে নিন.`
- EN example 1: This appears to be a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- BN example 1: এটি a bill or payment request বলে মনে হচ্ছে. লেখার মান এত কম যে নির্দিষ্ট অঙ্ক বা তারিখ নির্ভরযোগ্যভাবে পড়া যাচ্ছে না. এই বিবরণগুলির জন্য মূল ডকুমেন্টটি দেখে নিন.
- EN example 2: This appears to be an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- BN example 2: এটি an official notice বলে মনে হচ্ছে. লেখার মান এত কম যে নির্দিষ্ট অঙ্ক বা তারিখ নির্ভরযোগ্যভাবে পড়া যাচ্ছে না. এই বিবরণগুলির জন্য মূল ডকুমেন্টটি দেখে নিন.
- Note for checker: in the live app {category_label} is filled with the Bengali label from the same file.

## 23. tpl.readable.summary_sender

- EN: `This appears to be {type_label} from {sender}.`
- BN: `এটি {sender} এর কাছ থেকে আসা {type_label} বলে মনে হচ্ছে.`
- EN example 1: This appears to be a housing letter from Tower Hamlets Council.
- BN example 1: এটি Tower Hamlets Council এর কাছ থেকে আসা a housing letter বলে মনে হচ্ছে.
- EN example 2: This appears to be a work letter from Tesco.
- BN example 2: এটি Tesco এর কাছ থেকে আসা a work letter বলে মনে হচ্ছে.
- Note for checker: in the live app {type_label} is filled with the Bengali label from the same file.

## 24. tpl.readable.summary

- EN: `This appears to be {type_label}.`
- BN: `এটি {type_label} বলে মনে হচ্ছে.`
- EN example 1: This appears to be a housing letter.
- BN example 1: এটি a housing letter বলে মনে হচ্ছে.
- EN example 2: This appears to be an insurance letter.
- BN example 2: এটি an insurance letter বলে মনে হচ্ছে.

## 25. tpl.readable.summary_topic

- EN: `This appears to be {type_label} about {topic}.`
- BN: `এটি {topic} নিয়ে {type_label} বলে মনে হচ্ছে.`
- EN example 1: This appears to be an official letter about housing or rent.
- BN example 1: এটি housing or rent নিয়ে an official letter বলে মনে হচ্ছে.
- EN example 2: This appears to be a work letter about work or employment.
- BN example 2: এটি work or employment নিয়ে a work letter বলে মনে হচ্ছে.

## 26. tpl.benefits.summary_sender

- EN: `This appears to be a benefits letter from {sender}.`
- BN: `এটি {sender} এর কাছ থেকে আসা একটি বেনিফিটের চিঠি বলে মনে হচ্ছে.`
- EN example 1: This appears to be a benefits letter from DWP.
- BN example 1: এটি DWP এর কাছ থেকে আসা একটি বেনিফিটের চিঠি বলে মনে হচ্ছে.
- EN example 2: This appears to be a benefits letter from Tower Hamlets Council.
- BN example 2: এটি Tower Hamlets Council এর কাছ থেকে আসা একটি বেনিফিটের চিঠি বলে মনে হচ্ছে.

## 27. tpl.readable.sender_card

- EN: `This appears to be from {sender}. Check the original document to confirm.`
- BN: `এটি {sender} এর কাছ থেকে এসেছে বলে মনে হচ্ছে. নিশ্চিত হতে মূল ডকুমেন্টটি দেখে নিন.`
- EN example 1: This appears to be from Thames Water. Check the original document to confirm.
- BN example 1: এটি Thames Water এর কাছ থেকে এসেছে বলে মনে হচ্ছে. নিশ্চিত হতে মূল ডকুমেন্টটি দেখে নিন.
- EN example 2: This appears to be from HMRC. Check the original document to confirm.
- BN example 2: এটি HMRC এর কাছ থেকে এসেছে বলে মনে হচ্ছে. নিশ্চিত হতে মূল ডকুমেন্টটি দেখে নিন.

## 28. tpl.readable.mip_deadline

- EN: `This may include a deadline about {topic}. Check the original before acting.`
- BN: `এতে {topic} নিয়ে একটি শেষ তারিখ থাকতে পারে. পদক্ষেপ নেওয়ার আগে মূলটি দেখে নিন.`
- EN example 1: This may include a deadline about housing or rent. Check the original before acting.
- BN example 1: এতে housing or rent নিয়ে একটি শেষ তারিখ থাকতে পারে. পদক্ষেপ নেওয়ার আগে মূলটি দেখে নিন.
- EN example 2: This may include a deadline about tax or HMRC. Check the original before acting.
- BN example 2: এতে tax or HMRC নিয়ে একটি শেষ তারিখ থাকতে পারে. পদক্ষেপ নেওয়ার আগে মূলটি দেখে নিন.

## 29. tpl.readable.mip_response

- EN: `This may ask for a response about {topic}. Check the original document.`
- BN: `এতে {topic} নিয়ে একটি উত্তর চাওয়া হতে পারে. মূল ডকুমেন্টটি দেখে নিন.`
- EN example 1: This may ask for a response about benefits support. Check the original document.
- BN example 1: এতে benefits support নিয়ে একটি উত্তর চাওয়া হতে পারে. মূল ডকুমেন্টটি দেখে নিন.
- EN example 2: This may ask for a response about school or education. Check the original document.
- BN example 2: এতে school or education নিয়ে একটি উত্তর চাওয়া হতে পারে. মূল ডকুমেন্টটি দেখে নিন.

## 30. tpl.readable.mip_topic

- EN: `The clearest topic appears to be {topic}. Check the original for details.`
- BN: `সবচেয়ে পরিষ্কার বিষয়টি মনে হচ্ছে {topic}. বিস্তারিত জানতে মূলটি দেখে নিন.`
- EN example 1: The clearest topic appears to be housing or rent. Check the original for details.
- BN example 1: সবচেয়ে পরিষ্কার বিষয়টি মনে হচ্ছে housing or rent. বিস্তারিত জানতে মূলটি দেখে নিন.
- EN example 2: The clearest topic appears to be an appointment. Check the original for details.
- BN example 2: সবচেয়ে পরিষ্কার বিষয়টি মনে হচ্ছে an appointment. বিস্তারিত জানতে মূলটি দেখে নিন.

## 31. tpl.date.letter_dated

- EN: `No clear due date was found. The letter is dated {header_date}.`
- BN: `কোনো পরিষ্কার শেষ তারিখ পাওয়া যায়নি. চিঠির তারিখ {header_date}.`
- EN example 1: No clear due date was found. The letter is dated 24 June 2026.
- BN example 1: কোনো পরিষ্কার শেষ তারিখ পাওয়া যায়নি. চিঠির তারিখ 24 June 2026.
- EN example 2: No clear due date was found. The letter is dated 3 July 2026.
- BN example 2: কোনো পরিষ্কার শেষ তারিখ পাওয়া যায়নি. চিঠির তারিখ 3 July 2026.

## 32. tpl.date.important_dates

- EN: `These may be important dates: {dates}. Check what they refer to.`
- BN: `এগুলি গুরুত্বপূর্ণ তারিখ হতে পারে: {dates}. কীসের তারিখ, তা যাচাই করুন.`
- EN example 1: These may be important dates: 24 June 2026, 1 September 2026. Check what they refer to.
- BN example 1: এগুলি গুরুত্বপূর্ণ তারিখ হতে পারে: 24 June 2026, 1 September 2026. কীসের তারিখ, তা যাচাই করুন.
- EN example 2: These may be important dates: 3 July 2026. Check what they refer to.
- BN example 2: এগুলি গুরুত্বপূর্ণ তারিখ হতে পারে: 3 July 2026. কীসের তারিখ, তা যাচাই করুন.

## 33. tpl.date.dates_appear

- EN: `These dates appear in the document: {dates}. Check what they refer to.`
- BN: `ডকুমেন্টে এই তারিখগুলি আছে: {dates}. কীসের তারিখ, তা যাচাই করুন.`
- EN example 1: These dates appear in the document: 24 June 2026, 12 August 2026. Check what they refer to.
- BN example 1: ডকুমেন্টে এই তারিখগুলি আছে: 24 June 2026, 12 August 2026. কীসের তারিখ, তা যাচাই করুন.
- EN example 2: These dates appear in the document: 1 September 2026. Check what they refer to.
- BN example 2: ডকুমেন্টে এই তারিখগুলি আছে: 1 September 2026. কীসের তারিখ, তা যাচাই করুন.

## 34. tpl.date.no_due_dates_appear

- EN: `No clear due date. These dates appear in the document: {dates}. Check what they refer to.`
- BN: `কোনো পরিষ্কার শেষ তারিখ নেই. ডকুমেন্টে এই তারিখগুলি আছে: {dates}. কীসের তারিখ, তা যাচাই করুন.`
- EN example 1: No clear due date. These dates appear in the document: 24 June 2026, 12 August 2026. Check what they refer to.
- BN example 1: কোনো পরিষ্কার শেষ তারিখ নেই. ডকুমেন্টে এই তারিখগুলি আছে: 24 June 2026, 12 August 2026. কীসের তারিখ, তা যাচাই করুন.
- EN example 2: No clear due date. These dates appear in the document: 3 July 2026. Check what they refer to.
- BN example 2: কোনো পরিষ্কার শেষ তারিখ নেই. ডকুমেন্টে এই তারিখগুলি আছে: 3 July 2026. কীসের তারিখ, তা যাচাই করুন.

## 35. tpl.check.sender

- EN: `Check the sender: {sender}.`
- BN: `প্রেরক যাচাই করুন: {sender}.`
- EN example 1: Check the sender: Thames Water.
- BN example 1: প্রেরক যাচাই করুন: Thames Water.
- EN example 2: Check the sender: HMRC.
- BN example 2: প্রেরক যাচাই করুন: HMRC.

## 36. tpl.check.topic

- EN: `Check the topic: {topic}.`
- BN: `বিষয়টি যাচাই করুন: {topic}.`
- EN example 1: Check the topic: housing or rent.
- BN example 1: বিষয়টি যাচাই করুন: housing or rent.
- EN example 2: Check the topic: benefits support.
- BN example 2: বিষয়টি যাচাই করুন: benefits support.

## 37. tpl.check.dates

- EN: `Check these visible dates: {dates}.`
- BN: `এই দেখা যাওয়া তারিখগুলি যাচাই করুন: {dates}.`
- EN example 1: Check these visible dates: 24 June 2026, 1 September 2026.
- BN example 1: এই দেখা যাওয়া তারিখগুলি যাচাই করুন: 24 June 2026, 1 September 2026.
- EN example 2: Check these visible dates: 3 July 2026.
- BN example 2: এই দেখা যাওয়া তারিখগুলি যাচাই করুন: 3 July 2026.

## 38. tpl.check.date_on_original

- EN: `Check this date on the original document: {date}.`
- BN: `মূল ডকুমেন্টে এই তারিখটি যাচাই করুন: {date}.`
- EN example 1: Check this date on the original document: 24 June 2026.
- BN example 1: মূল ডকুমেন্টে এই তারিখটি যাচাই করুন: 24 June 2026.
- EN example 2: Check this date on the original document: 12 August 2026.
- BN example 2: মূল ডকুমেন্টে এই তারিখটি যাচাই করুন: 12 August 2026.

## 39. tpl.check.amount_and_date

- EN: `Check the amount ({amount}) and the date ({date}) on the original document.`
- BN: `মূল ডকুমেন্টে অঙ্ক ({amount}) ও তারিখ ({date}) যাচাই করুন.`
- EN example 1: Check the amount (£187.42) and the date (24 June 2026) on the original document.
- BN example 1: মূল ডকুমেন্টে অঙ্ক (£187.42) ও তারিখ (24 June 2026) যাচাই করুন.
- EN example 2: Check the amount (£52.00) and the date (3 July 2026) on the original document.
- BN example 2: মূল ডকুমেন্টে অঙ্ক (£52.00) ও তারিখ (3 July 2026) যাচাই করুন.

## 40. tpl.check.amount_any_dates

- EN: `Check the amount ({amount}) and any dates on the original document.`
- BN: `মূল ডকুমেন্টে অঙ্ক ({amount}) ও যেকোনো তারিখ যাচাই করুন.`
- EN example 1: Check the amount (£187.42) and any dates on the original document.
- BN example 1: মূল ডকুমেন্টে অঙ্ক (£187.42) ও যেকোনো তারিখ যাচাই করুন.
- EN example 2: Check the amount (£310.75) and any dates on the original document.
- BN example 2: মূল ডকুমেন্টে অঙ্ক (£310.75) ও যেকোনো তারিখ যাচাই করুন.

## 41. tpl.check.date_any_amounts

- EN: `Check the date ({date}) and any amounts on the original document.`
- BN: `মূল ডকুমেন্টে তারিখ ({date}) ও যেকোনো অঙ্ক যাচাই করুন.`
- EN example 1: Check the date (24 June 2026) and any amounts on the original document.
- BN example 1: মূল ডকুমেন্টে তারিখ (24 June 2026) ও যেকোনো অঙ্ক যাচাই করুন.
- EN example 2: Check the date (1 September 2026) and any amounts on the original document.
- BN example 2: মূল ডকুমেন্টে তারিখ (1 September 2026) ও যেকোনো অঙ্ক যাচাই করুন.

## 42. tpl.check.kp_date

- EN: `Date: {date}.`
- BN: `তারিখ: {date}.`
- EN example 1: Date: 24 June 2026.
- BN example 1: তারিখ: 24 June 2026.
- EN example 2: Date: 3 July 2026.
- BN example 2: তারিখ: 3 July 2026.

## 43. tpl.check.kp_amount

- EN: `Amount shown: {amount}.`
- BN: `দেখা যাওয়া অঙ্ক: {amount}.`
- EN example 1: Amount shown: £187.42.
- BN example 1: দেখা যাওয়া অঙ্ক: £187.42.
- EN example 2: Amount shown: £52.00.
- BN example 2: দেখা যাওয়া অঙ্ক: £52.00.

## 44. tpl.consequence.avoid

- EN: `The document says {consequence} if a payment is not made. Check the original document.`
- BN: `ডকুমেন্টটি বলছে পেমেন্ট না করলে {consequence} হতে পারে. মূল ডকুমেন্টটি দেখে নিন.`
- EN example 1: The document says further action if a payment is not made. Check the original document.
- BN example 1: ডকুমেন্টটি বলছে পেমেন্ট না করলে further action হতে পারে. মূল ডকুমেন্টটি দেখে নিন.
- EN example 2: The document says a late fee if a payment is not made. Check the original document.
- BN example 2: ডকুমেন্টটি বলছে পেমেন্ট না করলে a late fee হতে পারে. মূল ডকুমেন্টটি দেখে নিন.
- Note for checker: {consequence} comes from the letter text, so it is often English. The Bengali adds হতে পারে (may happen) to keep the sentence hedged, matching the calm tone.

## 45. tpl.consequence.reported

- EN: `The document states that {sentence_body}.`
- BN: `ডকুমেন্টে লেখা আছে যে {sentence_body}.`
- EN example 1: The document states that your account is overdue.
- BN example 1: ডকুমেন্টে লেখা আছে যে your account is overdue.
- EN example 2: The document states that a response is required by 24 June 2026.
- BN example 2: ডকুমেন্টে লেখা আছে যে a response is required by 24 June 2026.

## 46. tpl.consequence.may_follow

- EN: `{consequence_clause} may follow`
- BN: `{consequence_clause} হতে পারে`
- EN example 1: further recovery action may follow
- BN example 1: further recovery action হতে পারে
- EN example 2: a service charge may follow
- BN example 2: a service charge হতে পারে

## 47. tpl.action.check_wrap

- EN: `Check {action_sentence}`
- BN: `যাচাই করুন {action_sentence}`
- EN example 1: Check the payment amount and due date.
- BN example 1: যাচাই করুন the payment amount and due date.
- EN example 2: Check whether a response is needed.
- BN example 2: যাচাই করুন whether a response is needed.

## 48. tpl.composite.read_aloud

- EN: `{title}. {explanation}. {key_points}`
- BN: `{title}. {explanation}. {key_points}`
- EN example 1: What is this?. This looks like a formal document. Date: 24 June 2026.
- BN example 1: এটি কী?. এটি পরিষ্কারভাবে পড়া যাচ্ছে, তাই আমরা মূল বিষয়গুলি তুলে আনতে পারি. তারিখ: 24 June 2026.
- EN example 2: When is it due?. Use this date before making a reminder. Due by 3 July 2026.
- BN example 2: শেষ তারিখ কবে?. রিমাইন্ডার তৈরির আগে এই তারিখটি মিলিয়ে নিন. 3 July 2026 এর মধ্যে.
- Note for checker: this template only joins already translated pieces, so the Bengali template is identical to the English one.

## 49. tpl.composite.display_text

- EN: `{title} {short_answer}`
- BN: `{title} {short_answer}`
- EN example 1: What is this? This looks like a formal document.
- BN example 1: এটি কী? এটি একটি আনুষ্ঠানিক ডকুমেন্ট বলে মনে হচ্ছে.
- EN example 2: Who sent it? The sender is not clearly stated. Check the original document.
- BN example 2: কে পাঠিয়েছে? প্রেরক পরিষ্কারভাবে লেখা নেই. মূল ডকুমেন্টটি দেখে নিন.
- Note for checker: joins already translated pieces, so the template is unchanged.

## 50. tpl.composite.tts

- EN: `{title}. {short_answer}`
- BN: `{title}. {short_answer}`
- EN example 1: What is this?. This looks like a formal document.
- BN example 1: এটি কী?. এটি একটি আনুষ্ঠানিক ডকুমেন্ট বলে মনে হচ্ছে.
- EN example 2: When is it due?. Due by 24 June 2026.
- BN example 2: শেষ তারিখ কবে?. 24 June 2026 এর মধ্যে.
- Note for checker: joins already translated pieces, so the template is unchanged.

## 51. tpl.api.unknown_analytics_fields

- EN: `Unknown analytics fields: {field_list}`
- BN: `অজানা অ্যানালিটিক্স ফিল্ড: {field_list}`
- EN example 1: Unknown analytics fields: page_color, extra_tag
- BN example 1: অজানা অ্যানালিটিক্স ফিল্ড: page_color, extra_tag
- EN example 2: Unknown analytics fields: session_mood
- BN example 2: অজানা অ্যানালিটিক্স ফিল্ড: session_mood
- Note for checker: this is a technical server message, not shown on cue cards.
