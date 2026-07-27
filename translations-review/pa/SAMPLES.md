# Panjabi (Gurmukhi) pattern samples for Northcue

DRAFT PENDING HUMAN REVIEW.

All 51 sentence templates from `public/i18n/templates-pa.js`, each with the
English original, the Panjabi draft, and two filled examples using realistic
UK values. Slot values (names, amounts, dates) stay exactly as the app would
insert them, in English letters, never transliterated into Gurmukhi. Read the
Panjabi examples aloud to check they sound natural, calm, and respectful.

No em or en dashes and no danda appear anywhere in this file.

---

## 1. tpl.deadline.appointment

- EN: `Your appointment is on {date}.`
- PA: `ਤੁਹਾਡੀ ਅਪੌਇੰਟਮੈਂਟ {date} ਨੂੰ ਹੈ.`

Example A:
- EN: Your appointment is on 24 June 2026.
- PA: ਤੁਹਾਡੀ ਅਪੌਇੰਟਮੈਂਟ 24 June 2026 ਨੂੰ ਹੈ.

Example B:
- EN: Your appointment is on 3 September 2026.
- PA: ਤੁਹਾਡੀ ਅਪੌਇੰਟਮੈਂਟ 3 September 2026 ਨੂੰ ਹੈ.

## 2. tpl.deadline.due

- EN: `Due by {date}.`
- PA: `{date} ਤੱਕ ਦੇਣਾ ਹੈ.`

Example A:
- EN: Due by 24 June 2026.
- PA: 24 June 2026 ਤੱਕ ਦੇਣਾ ਹੈ.

Example B:
- EN: Due by 3 September 2026.
- PA: 3 September 2026 ਤੱਕ ਦੇਣਾ ਹੈ.

## 3. tpl.summary.bill_full

- EN: `{sender} appears to be asking you to pay {amount} by {date}.`
- PA: `ਲੱਗਦਾ ਹੈ ਕਿ {sender} ਤੁਹਾਨੂੰ {date} ਤੱਕ {amount} ਦੇਣ ਲਈ ਕਹਿ ਰਿਹਾ ਹੈ.`

Example A:
- EN: Thames Water appears to be asking you to pay £187.42 by 24 June 2026.
- PA: ਲੱਗਦਾ ਹੈ ਕਿ Thames Water ਤੁਹਾਨੂੰ 24 June 2026 ਤੱਕ £187.42 ਦੇਣ ਲਈ ਕਹਿ ਰਿਹਾ ਹੈ.

Example B:
- EN: Birmingham City Council appears to be asking you to pay £64.00 by 3 September 2026.
- PA: ਲੱਗਦਾ ਹੈ ਕਿ Birmingham City Council ਤੁਹਾਨੂੰ 3 September 2026 ਤੱਕ £64.00 ਦੇਣ ਲਈ ਕਹਿ ਰਿਹਾ ਹੈ.

## 4. tpl.summary.bill_amount_date

- EN: `This appears to be a payment request for {amount}, due by {date}.`
- PA: `ਇਹ {amount} ਦੀ ਅਦਾਇਗੀ ਦੀ ਬੇਨਤੀ ਲੱਗਦੀ ਹੈ, ਜੋ {date} ਤੱਕ ਦੇਣੀ ਹੈ.`

Example A:
- EN: This appears to be a payment request for £187.42, due by 24 June 2026.
- PA: ਇਹ £187.42 ਦੀ ਅਦਾਇਗੀ ਦੀ ਬੇਨਤੀ ਲੱਗਦੀ ਹੈ, ਜੋ 24 June 2026 ਤੱਕ ਦੇਣੀ ਹੈ.

Example B:
- EN: This appears to be a payment request for £64.00, due by 3 September 2026.
- PA: ਇਹ £64.00 ਦੀ ਅਦਾਇਗੀ ਦੀ ਬੇਨਤੀ ਲੱਗਦੀ ਹੈ, ਜੋ 3 September 2026 ਤੱਕ ਦੇਣੀ ਹੈ.

## 5. tpl.summary.bill_sender_amount

- EN: `{sender} appears to be asking you to pay {amount}.`
- PA: `ਲੱਗਦਾ ਹੈ ਕਿ {sender} ਤੁਹਾਨੂੰ {amount} ਦੇਣ ਲਈ ਕਹਿ ਰਿਹਾ ਹੈ.`

Example A:
- EN: Thames Water appears to be asking you to pay £187.42.
- PA: ਲੱਗਦਾ ਹੈ ਕਿ Thames Water ਤੁਹਾਨੂੰ £187.42 ਦੇਣ ਲਈ ਕਹਿ ਰਿਹਾ ਹੈ.

Example B:
- EN: British Gas appears to be asking you to pay £64.00.
- PA: ਲੱਗਦਾ ਹੈ ਕਿ British Gas ਤੁਹਾਨੂੰ £64.00 ਦੇਣ ਲਈ ਕਹਿ ਰਿਹਾ ਹੈ.

## 6. tpl.summary.bill_sender_date

- EN: `This appears to be a bill from {sender}, dated {date}.`
- PA: `ਇਹ {sender} ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਉੱਤੇ {date} ਦੀ ਤਾਰੀਖ਼ ਹੈ.`

Example A:
- EN: This appears to be a bill from Thames Water, dated 24 June 2026.
- PA: ਇਹ Thames Water ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਉੱਤੇ 24 June 2026 ਦੀ ਤਾਰੀਖ਼ ਹੈ.

Example B:
- EN: This appears to be a bill from British Gas, dated 3 September 2026.
- PA: ਇਹ British Gas ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਉੱਤੇ 3 September 2026 ਦੀ ਤਾਰੀਖ਼ ਹੈ.

## 7. tpl.summary.bill_amount

- EN: `This appears to be a payment request for {amount}.`
- PA: `ਇਹ {amount} ਦੀ ਅਦਾਇਗੀ ਦੀ ਬੇਨਤੀ ਲੱਗਦੀ ਹੈ.`

Example A:
- EN: This appears to be a payment request for £187.42.
- PA: ਇਹ £187.42 ਦੀ ਅਦਾਇਗੀ ਦੀ ਬੇਨਤੀ ਲੱਗਦੀ ਹੈ.

Example B:
- EN: This appears to be a payment request for £64.00.
- PA: ਇਹ £64.00 ਦੀ ਅਦਾਇਗੀ ਦੀ ਬੇਨਤੀ ਲੱਗਦੀ ਹੈ.

## 8. tpl.summary.bill_sender

- EN: `This appears to be a bill from {sender}.`
- PA: `ਇਹ {sender} ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ.`

Example A:
- EN: This appears to be a bill from Thames Water.
- PA: ਇਹ Thames Water ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ.

Example B:
- EN: This appears to be a bill from British Gas.
- PA: ਇਹ British Gas ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ.

## 9. tpl.summary.bill_in_credit_sender

- EN: `This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
- PA: `ਇਹ {sender} ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ. ਲੱਗਦਾ ਹੈ ਕਿ ਤੁਹਾਡਾ ਅਕਾਊਂਟ ਕ੍ਰੈਡਿਟ ਵਿੱਚ ਹੋ ਸਕਦਾ ਹੈ, ਇਸ ਲਈ ਸ਼ਾਇਦ ਕੁਝ ਦੇਣਾ ਨਾ ਹੋਵੇ. ਪੱਕਾ ਕਰਨ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.`

Example A:
- EN: This appears to be a bill from Thames Water. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
- PA: ਇਹ Thames Water ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ. ਲੱਗਦਾ ਹੈ ਕਿ ਤੁਹਾਡਾ ਅਕਾਊਂਟ ਕ੍ਰੈਡਿਟ ਵਿੱਚ ਹੋ ਸਕਦਾ ਹੈ, ਇਸ ਲਈ ਸ਼ਾਇਦ ਕੁਝ ਦੇਣਾ ਨਾ ਹੋਵੇ. ਪੱਕਾ ਕਰਨ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

Example B:
- EN: This appears to be a bill from British Gas. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
- PA: ਇਹ British Gas ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ. ਲੱਗਦਾ ਹੈ ਕਿ ਤੁਹਾਡਾ ਅਕਾਊਂਟ ਕ੍ਰੈਡਿਟ ਵਿੱਚ ਹੋ ਸਕਦਾ ਹੈ, ਇਸ ਲਈ ਸ਼ਾਇਦ ਕੁਝ ਦੇਣਾ ਨਾ ਹੋਵੇ. ਪੱਕਾ ਕਰਨ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

## 10. tpl.summary.gov_sender_amount

- EN: `{sender} appears to have sent an official notice mentioning {amount}.`
- PA: `ਲੱਗਦਾ ਹੈ ਕਿ {sender} ਨੇ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਭੇਜਿਆ ਹੈ ਜਿਸ ਵਿੱਚ {amount} ਦਾ ਜ਼ਿਕਰ ਹੈ.`

Example A:
- EN: Birmingham City Council appears to have sent an official notice mentioning £187.42.
- PA: ਲੱਗਦਾ ਹੈ ਕਿ Birmingham City Council ਨੇ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਭੇਜਿਆ ਹੈ ਜਿਸ ਵਿੱਚ £187.42 ਦਾ ਜ਼ਿਕਰ ਹੈ.

Example B:
- EN: HMRC appears to have sent an official notice mentioning £64.00.
- PA: ਲੱਗਦਾ ਹੈ ਕਿ HMRC ਨੇ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਭੇਜਿਆ ਹੈ ਜਿਸ ਵਿੱਚ £64.00 ਦਾ ਜ਼ਿਕਰ ਹੈ.

## 11. tpl.summary.gov_sender

- EN: `This appears to be an official notice from {sender}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਲੱਗਦਾ ਹੈ.`

Example A:
- EN: This appears to be an official notice from Birmingham City Council.
- PA: ਇਹ Birmingham City Council ਵੱਲੋਂ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਲੱਗਦਾ ਹੈ.

Example B:
- EN: This appears to be an official notice from HMRC.
- PA: ਇਹ HMRC ਵੱਲੋਂ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਲੱਗਦਾ ਹੈ.

## 12. tpl.summary.gov_amount

- EN: `This appears to be an official notice mentioning {amount}.`
- PA: `ਇਹ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਲੱਗਦਾ ਹੈ ਜਿਸ ਵਿੱਚ {amount} ਦਾ ਜ਼ਿਕਰ ਹੈ.`

Example A:
- EN: This appears to be an official notice mentioning £187.42.
- PA: ਇਹ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਲੱਗਦਾ ਹੈ ਜਿਸ ਵਿੱਚ £187.42 ਦਾ ਜ਼ਿਕਰ ਹੈ.

Example B:
- EN: This appears to be an official notice mentioning £64.00.
- PA: ਇਹ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਲੱਗਦਾ ਹੈ ਜਿਸ ਵਿੱਚ £64.00 ਦਾ ਜ਼ਿਕਰ ਹੈ.

## 13. tpl.summary.appt_sender_date

- EN: `This appears to be an appointment from {sender} on {date}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ {date} ਦੀ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.`

Example A:
- EN: This appears to be an appointment from Royal Free Hospital on 24 June 2026.
- PA: ਇਹ Royal Free Hospital ਵੱਲੋਂ 24 June 2026 ਦੀ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.

Example B:
- EN: This appears to be an appointment from Sandwell Dental Practice on 3 September 2026.
- PA: ਇਹ Sandwell Dental Practice ਵੱਲੋਂ 3 September 2026 ਦੀ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.

## 14. tpl.summary.appt_sender

- EN: `This appears to be an appointment from {sender}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ ਇੱਕ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.`

Example A:
- EN: This appears to be an appointment from Royal Free Hospital.
- PA: ਇਹ Royal Free Hospital ਵੱਲੋਂ ਇੱਕ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.

Example B:
- EN: This appears to be an appointment from Sandwell Dental Practice.
- PA: ਇਹ Sandwell Dental Practice ਵੱਲੋਂ ਇੱਕ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.

## 15. tpl.summary.appt_date

- EN: `This appears to be an appointment on {date}.`
- PA: `ਇਹ {date} ਦੀ ਇੱਕ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.`

Example A:
- EN: This appears to be an appointment on 24 June 2026.
- PA: ਇਹ 24 June 2026 ਦੀ ਇੱਕ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.

Example B:
- EN: This appears to be an appointment on 3 September 2026.
- PA: ਇਹ 3 September 2026 ਦੀ ਇੱਕ ਅਪੌਇੰਟਮੈਂਟ ਲੱਗਦੀ ਹੈ.

## 16. tpl.summary.generic_full

- EN: `This appears to be from {sender}, mentioning {amount} and a date of {date}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਵਿੱਚ {amount} ਅਤੇ {date} ਦੀ ਤਾਰੀਖ਼ ਦਾ ਜ਼ਿਕਰ ਹੈ.`

Example A:
- EN: This appears to be from Thames Water, mentioning £187.42 and a date of 24 June 2026.
- PA: ਇਹ Thames Water ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਵਿੱਚ £187.42 ਅਤੇ 24 June 2026 ਦੀ ਤਾਰੀਖ਼ ਦਾ ਜ਼ਿਕਰ ਹੈ.

Example B:
- EN: This appears to be from Birmingham City Council, mentioning £64.00 and a date of 3 September 2026.
- PA: ਇਹ Birmingham City Council ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਵਿੱਚ £64.00 ਅਤੇ 3 September 2026 ਦੀ ਤਾਰੀਖ਼ ਦਾ ਜ਼ਿਕਰ ਹੈ.

## 17. tpl.summary.generic_amount_date

- EN: `This document appears to mention {amount} and a date of {date}.`
- PA: `ਇਸ ਦਸਤਾਵੇਜ਼ ਵਿੱਚ {amount} ਅਤੇ {date} ਦੀ ਤਾਰੀਖ਼ ਦਾ ਜ਼ਿਕਰ ਦਿਖਦਾ ਹੈ.`

Example A:
- EN: This document appears to mention £187.42 and a date of 24 June 2026.
- PA: ਇਸ ਦਸਤਾਵੇਜ਼ ਵਿੱਚ £187.42 ਅਤੇ 24 June 2026 ਦੀ ਤਾਰੀਖ਼ ਦਾ ਜ਼ਿਕਰ ਦਿਖਦਾ ਹੈ.

Example B:
- EN: This document appears to mention £64.00 and a date of 3 September 2026.
- PA: ਇਸ ਦਸਤਾਵੇਜ਼ ਵਿੱਚ £64.00 ਅਤੇ 3 September 2026 ਦੀ ਤਾਰੀਖ਼ ਦਾ ਜ਼ਿਕਰ ਦਿਖਦਾ ਹੈ.

## 18. tpl.summary.generic_sender_amount

- EN: `This appears to be from {sender}, mentioning {amount}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਵਿੱਚ {amount} ਦਾ ਜ਼ਿਕਰ ਹੈ.`

Example A:
- EN: This appears to be from Thames Water, mentioning £187.42.
- PA: ਇਹ Thames Water ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਵਿੱਚ £187.42 ਦਾ ਜ਼ਿਕਰ ਹੈ.

Example B:
- EN: This appears to be from Birmingham City Council, mentioning £64.00.
- PA: ਇਹ Birmingham City Council ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਵਿੱਚ £64.00 ਦਾ ਜ਼ਿਕਰ ਹੈ.

## 19. tpl.summary.generic_sender_date

- EN: `This appears to be from {sender}, with a date of {date}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਉੱਤੇ {date} ਦੀ ਤਾਰੀਖ਼ ਹੈ.`

Example A:
- EN: This appears to be from Thames Water, with a date of 24 June 2026.
- PA: ਇਹ Thames Water ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਉੱਤੇ 24 June 2026 ਦੀ ਤਾਰੀਖ਼ ਹੈ.

Example B:
- EN: This appears to be from Birmingham City Council, with a date of 3 September 2026.
- PA: ਇਹ Birmingham City Council ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ, ਜਿਸ ਉੱਤੇ 3 September 2026 ਦੀ ਤਾਰੀਖ਼ ਹੈ.

## 20. tpl.summary.generic_sender

- EN: `This appears to be from {sender}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ.`

Example A:
- EN: This appears to be from Thames Water.
- PA: ਇਹ Thames Water ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ.

Example B:
- EN: This appears to be from Birmingham City Council.
- PA: ਇਹ Birmingham City Council ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ.

## 21. tpl.summary.garbled_sender

- EN: `{sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- PA: `ਲੱਗਦਾ ਹੈ ਕਿ {sender} ਨੇ {category_label} ਭੇਜਿਆ ਹੈ. ਟੈਕਸਟ ਦੀ ਗੁਣਵੱਤਾ ਇੰਨੀ ਘੱਟ ਹੈ ਕਿ ਸਹੀ ਰਕਮਾਂ ਜਾਂ ਤਾਰੀਖ਼ਾਂ ਭਰੋਸੇ ਨਾਲ ਪੜ੍ਹੀਆਂ ਨਹੀਂ ਜਾ ਸਕਦੀਆਂ. ਇਨ੍ਹਾਂ ਵੇਰਵਿਆਂ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.`

Example A (category_label = a bill or payment request):
- EN: Thames Water appears to have sent a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- PA: ਲੱਗਦਾ ਹੈ ਕਿ Thames Water ਨੇ ਇੱਕ ਬਿੱਲ ਜਾਂ ਅਦਾਇਗੀ ਦੀ ਬੇਨਤੀ ਭੇਜਿਆ ਹੈ. ਟੈਕਸਟ ਦੀ ਗੁਣਵੱਤਾ ਇੰਨੀ ਘੱਟ ਹੈ ਕਿ ਸਹੀ ਰਕਮਾਂ ਜਾਂ ਤਾਰੀਖ਼ਾਂ ਭਰੋਸੇ ਨਾਲ ਪੜ੍ਹੀਆਂ ਨਹੀਂ ਜਾ ਸਕਦੀਆਂ. ਇਨ੍ਹਾਂ ਵੇਰਵਿਆਂ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

Example B (category_label = an official notice):
- EN: Birmingham City Council appears to have sent an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- PA: ਲੱਗਦਾ ਹੈ ਕਿ Birmingham City Council ਨੇ ਇੱਕ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਭੇਜਿਆ ਹੈ. ਟੈਕਸਟ ਦੀ ਗੁਣਵੱਤਾ ਇੰਨੀ ਘੱਟ ਹੈ ਕਿ ਸਹੀ ਰਕਮਾਂ ਜਾਂ ਤਾਰੀਖ਼ਾਂ ਭਰੋਸੇ ਨਾਲ ਪੜ੍ਹੀਆਂ ਨਹੀਂ ਜਾ ਸਕਦੀਆਂ. ਇਨ੍ਹਾਂ ਵੇਰਵਿਆਂ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

## 22. tpl.summary.garbled

- EN: `This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- PA: `ਇਹ {category_label} ਲੱਗਦਾ ਹੈ. ਟੈਕਸਟ ਦੀ ਗੁਣਵੱਤਾ ਇੰਨੀ ਘੱਟ ਹੈ ਕਿ ਸਹੀ ਰਕਮਾਂ ਜਾਂ ਤਾਰੀਖ਼ਾਂ ਭਰੋਸੇ ਨਾਲ ਪੜ੍ਹੀਆਂ ਨਹੀਂ ਜਾ ਸਕਦੀਆਂ. ਇਨ੍ਹਾਂ ਵੇਰਵਿਆਂ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.`

Example A (category_label = a medical document):
- EN: This appears to be a medical document. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- PA: ਇਹ ਇੱਕ ਮੈਡੀਕਲ ਦਸਤਾਵੇਜ਼ ਲੱਗਦਾ ਹੈ. ਟੈਕਸਟ ਦੀ ਗੁਣਵੱਤਾ ਇੰਨੀ ਘੱਟ ਹੈ ਕਿ ਸਹੀ ਰਕਮਾਂ ਜਾਂ ਤਾਰੀਖ਼ਾਂ ਭਰੋਸੇ ਨਾਲ ਪੜ੍ਹੀਆਂ ਨਹੀਂ ਜਾ ਸਕਦੀਆਂ. ਇਨ੍ਹਾਂ ਵੇਰਵਿਆਂ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

Example B (category_label = a housing or rent document):
- EN: This appears to be a housing or rent document. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- PA: ਇਹ ਘਰ ਜਾਂ ਕਿਰਾਏ ਦਾ ਇੱਕ ਦਸਤਾਵੇਜ਼ ਲੱਗਦਾ ਹੈ. ਟੈਕਸਟ ਦੀ ਗੁਣਵੱਤਾ ਇੰਨੀ ਘੱਟ ਹੈ ਕਿ ਸਹੀ ਰਕਮਾਂ ਜਾਂ ਤਾਰੀਖ਼ਾਂ ਭਰੋਸੇ ਨਾਲ ਪੜ੍ਹੀਆਂ ਨਹੀਂ ਜਾ ਸਕਦੀਆਂ. ਇਨ੍ਹਾਂ ਵੇਰਵਿਆਂ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

## 23. tpl.readable.summary_sender

- EN: `This appears to be {type_label} from {sender}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ {type_label} ਲੱਗਦੀ ਹੈ.`

Example A (type_label = an official letter):
- EN: This appears to be an official letter from Birmingham City Council.
- PA: ਇਹ Birmingham City Council ਵੱਲੋਂ ਇੱਕ ਅਧਿਕਾਰਤ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.

Example B (type_label = a health letter):
- EN: This appears to be a health letter from Royal Free Hospital.
- PA: ਇਹ Royal Free Hospital ਵੱਲੋਂ ਸਿਹਤ ਬਾਰੇ ਇੱਕ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.

## 24. tpl.readable.summary

- EN: `This appears to be {type_label}.`
- PA: `ਇਹ {type_label} ਲੱਗਦੀ ਹੈ.`

Example A (type_label = a work letter):
- EN: This appears to be a work letter.
- PA: ਇਹ ਕੰਮ ਦੀ ਇੱਕ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.

Example B (type_label = a formal letter):
- EN: This appears to be a formal letter.
- PA: ਇਹ ਇੱਕ ਰਸਮੀ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.

## 25. tpl.readable.summary_topic

- EN: `This appears to be {type_label} about {topic}.`
- PA: `ਇਹ {topic} ਬਾਰੇ {type_label} ਲੱਗਦੀ ਹੈ.`

Example A (type_label = an official letter, topic = tax or HMRC):
- EN: This appears to be an official letter about tax or HMRC.
- PA: ਇਹ ਟੈਕਸ ਜਾਂ HMRC ਬਾਰੇ ਇੱਕ ਅਧਿਕਾਰਤ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.

Example B (type_label = a housing letter, topic = housing or rent):
- EN: This appears to be a housing letter about housing or rent.
- PA: ਇਹ ਘਰ ਜਾਂ ਕਿਰਾਇਆ ਬਾਰੇ ਘਰ ਬਾਰੇ ਇੱਕ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.

## 26. tpl.benefits.summary_sender

- EN: `This appears to be a benefits letter from {sender}.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ Benefits (ਸਰਕਾਰੀ ਮਦਦ) ਦੀ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.`

Example A:
- EN: This appears to be a benefits letter from Department for Work and Pensions.
- PA: ਇਹ Department for Work and Pensions ਵੱਲੋਂ Benefits (ਸਰਕਾਰੀ ਮਦਦ) ਦੀ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.

Example B:
- EN: This appears to be a benefits letter from Birmingham City Council.
- PA: ਇਹ Birmingham City Council ਵੱਲੋਂ Benefits (ਸਰਕਾਰੀ ਮਦਦ) ਦੀ ਚਿੱਠੀ ਲੱਗਦੀ ਹੈ.

## 27. tpl.readable.sender_card

- EN: `This appears to be from {sender}. Check the original document to confirm.`
- PA: `ਇਹ {sender} ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ. ਪੁਸ਼ਟੀ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.`

Example A:
- EN: This appears to be from Thames Water. Check the original document to confirm.
- PA: ਇਹ Thames Water ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ. ਪੁਸ਼ਟੀ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

Example B:
- EN: This appears to be from HMRC. Check the original document to confirm.
- PA: ਇਹ HMRC ਵੱਲੋਂ ਲੱਗਦਾ ਹੈ. ਪੁਸ਼ਟੀ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

## 28. tpl.readable.mip_deadline

- EN: `This may include a deadline about {topic}. Check the original before acting.`
- PA: `ਇਸ ਵਿੱਚ {topic} ਬਾਰੇ ਕੋਈ ਆਖ਼ਰੀ ਤਾਰੀਖ਼ ਹੋ ਸਕਦੀ ਹੈ. ਕਦਮ ਚੁੱਕਣ ਤੋਂ ਪਹਿਲਾਂ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.`

Example A (topic = tax or HMRC):
- EN: This may include a deadline about tax or HMRC. Check the original before acting.
- PA: ਇਸ ਵਿੱਚ ਟੈਕਸ ਜਾਂ HMRC ਬਾਰੇ ਕੋਈ ਆਖ਼ਰੀ ਤਾਰੀਖ਼ ਹੋ ਸਕਦੀ ਹੈ. ਕਦਮ ਚੁੱਕਣ ਤੋਂ ਪਹਿਲਾਂ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

Example B (topic = school or education):
- EN: This may include a deadline about school or education. Check the original before acting.
- PA: ਇਸ ਵਿੱਚ ਸਕੂਲ ਜਾਂ ਪੜ੍ਹਾਈ ਬਾਰੇ ਕੋਈ ਆਖ਼ਰੀ ਤਾਰੀਖ਼ ਹੋ ਸਕਦੀ ਹੈ. ਕਦਮ ਚੁੱਕਣ ਤੋਂ ਪਹਿਲਾਂ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

## 29. tpl.readable.mip_response

- EN: `This may ask for a response about {topic}. Check the original document.`
- PA: `ਇਹ {topic} ਬਾਰੇ ਕੋਈ ਜਵਾਬ ਮੰਗ ਸਕਦਾ ਹੈ. ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.`

Example A (topic = work or employment):
- EN: This may ask for a response about work or employment. Check the original document.
- PA: ਇਹ ਕੰਮ ਜਾਂ ਨੌਕਰੀ ਬਾਰੇ ਕੋਈ ਜਵਾਬ ਮੰਗ ਸਕਦਾ ਹੈ. ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

Example B (topic = benefits support):
- EN: This may ask for a response about benefits support. Check the original document.
- PA: ਇਹ Benefits (ਸਰਕਾਰੀ ਮਦਦ) ਬਾਰੇ ਕੋਈ ਜਵਾਬ ਮੰਗ ਸਕਦਾ ਹੈ. ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

## 30. tpl.readable.mip_topic

- EN: `The clearest topic appears to be {topic}. Check the original for details.`
- PA: `ਸਭ ਤੋਂ ਸਾਫ਼ ਵਿਸ਼ਾ {topic} ਲੱਗਦਾ ਹੈ. ਵੇਰਵੇ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.`

Example A (topic = healthcare services):
- EN: The clearest topic appears to be healthcare services. Check the original for details.
- PA: ਸਭ ਤੋਂ ਸਾਫ਼ ਵਿਸ਼ਾ ਸਿਹਤ ਸੇਵਾਵਾਂ ਲੱਗਦਾ ਹੈ. ਵੇਰਵੇ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

Example B (topic = a council or local authority matter):
- EN: The clearest topic appears to be a council or local authority matter. Check the original for details.
- PA: ਸਭ ਤੋਂ ਸਾਫ਼ ਵਿਸ਼ਾ ਕੌਂਸਲ ਜਾਂ ਸਥਾਨਕ ਅਥਾਰਟੀ ਦਾ ਮਾਮਲਾ ਲੱਗਦਾ ਹੈ. ਵੇਰਵੇ ਲਈ ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

## 31. tpl.date.letter_dated

- EN: `No clear due date was found. The letter is dated {header_date}.`
- PA: `ਕੋਈ ਸਾਫ਼ ਦੇਣ ਦੀ ਤਾਰੀਖ਼ ਨਹੀਂ ਮਿਲੀ. ਚਿੱਠੀ ਉੱਤੇ {header_date} ਦੀ ਤਾਰੀਖ਼ ਹੈ.`

Example A:
- EN: No clear due date was found. The letter is dated 24 June 2026.
- PA: ਕੋਈ ਸਾਫ਼ ਦੇਣ ਦੀ ਤਾਰੀਖ਼ ਨਹੀਂ ਮਿਲੀ. ਚਿੱਠੀ ਉੱਤੇ 24 June 2026 ਦੀ ਤਾਰੀਖ਼ ਹੈ.

Example B:
- EN: No clear due date was found. The letter is dated 3 September 2026.
- PA: ਕੋਈ ਸਾਫ਼ ਦੇਣ ਦੀ ਤਾਰੀਖ਼ ਨਹੀਂ ਮਿਲੀ. ਚਿੱਠੀ ਉੱਤੇ 3 September 2026 ਦੀ ਤਾਰੀਖ਼ ਹੈ.

## 32. tpl.date.important_dates

- EN: `These may be important dates: {dates}. Check what they refer to.`
- PA: `ਇਹ ਜ਼ਰੂਰੀ ਤਾਰੀਖ਼ਾਂ ਹੋ ਸਕਦੀਆਂ ਹਨ: {dates}. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.`

Example A:
- EN: These may be important dates: 24 June 2026, 8 July 2026. Check what they refer to.
- PA: ਇਹ ਜ਼ਰੂਰੀ ਤਾਰੀਖ਼ਾਂ ਹੋ ਸਕਦੀਆਂ ਹਨ: 24 June 2026, 8 July 2026. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.

Example B:
- EN: These may be important dates: 3 September 2026. Check what they refer to.
- PA: ਇਹ ਜ਼ਰੂਰੀ ਤਾਰੀਖ਼ਾਂ ਹੋ ਸਕਦੀਆਂ ਹਨ: 3 September 2026. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.

## 33. tpl.date.dates_appear

- EN: `These dates appear in the document: {dates}. Check what they refer to.`
- PA: `ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਇਹ ਤਾਰੀਖ਼ਾਂ ਦਿਖਦੀਆਂ ਹਨ: {dates}. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.`

Example A:
- EN: These dates appear in the document: 24 June 2026, 8 July 2026. Check what they refer to.
- PA: ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਇਹ ਤਾਰੀਖ਼ਾਂ ਦਿਖਦੀਆਂ ਹਨ: 24 June 2026, 8 July 2026. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.

Example B:
- EN: These dates appear in the document: 3 September 2026. Check what they refer to.
- PA: ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਇਹ ਤਾਰੀਖ਼ਾਂ ਦਿਖਦੀਆਂ ਹਨ: 3 September 2026. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.

## 34. tpl.date.no_due_dates_appear

- EN: `No clear due date. These dates appear in the document: {dates}. Check what they refer to.`
- PA: `ਕੋਈ ਸਾਫ਼ ਦੇਣ ਦੀ ਤਾਰੀਖ਼ ਨਹੀਂ. ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਇਹ ਤਾਰੀਖ਼ਾਂ ਦਿਖਦੀਆਂ ਹਨ: {dates}. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.`

Example A:
- EN: No clear due date. These dates appear in the document: 24 June 2026, 8 July 2026. Check what they refer to.
- PA: ਕੋਈ ਸਾਫ਼ ਦੇਣ ਦੀ ਤਾਰੀਖ਼ ਨਹੀਂ. ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਇਹ ਤਾਰੀਖ਼ਾਂ ਦਿਖਦੀਆਂ ਹਨ: 24 June 2026, 8 July 2026. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.

Example B:
- EN: No clear due date. These dates appear in the document: 3 September 2026. Check what they refer to.
- PA: ਕੋਈ ਸਾਫ਼ ਦੇਣ ਦੀ ਤਾਰੀਖ਼ ਨਹੀਂ. ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਇਹ ਤਾਰੀਖ਼ਾਂ ਦਿਖਦੀਆਂ ਹਨ: 3 September 2026. ਜਾਂਚੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਹਨ.

## 35. tpl.check.sender

- EN: `Check the sender: {sender}.`
- PA: `ਭੇਜਣ ਵਾਲੇ ਨੂੰ ਜਾਂਚੋ: {sender}.`

Example A:
- EN: Check the sender: Thames Water.
- PA: ਭੇਜਣ ਵਾਲੇ ਨੂੰ ਜਾਂਚੋ: Thames Water.

Example B:
- EN: Check the sender: Birmingham City Council.
- PA: ਭੇਜਣ ਵਾਲੇ ਨੂੰ ਜਾਂਚੋ: Birmingham City Council.

## 36. tpl.check.topic

- EN: `Check the topic: {topic}.`
- PA: `ਵਿਸ਼ਾ ਜਾਂਚੋ: {topic}.`

Example A (topic = housing or rent):
- EN: Check the topic: housing or rent.
- PA: ਵਿਸ਼ਾ ਜਾਂਚੋ: ਘਰ ਜਾਂ ਕਿਰਾਇਆ.

Example B (topic = an appointment):
- EN: Check the topic: an appointment.
- PA: ਵਿਸ਼ਾ ਜਾਂਚੋ: ਇੱਕ ਅਪੌਇੰਟਮੈਂਟ.

## 37. tpl.check.dates

- EN: `Check these visible dates: {dates}.`
- PA: `ਇਹ ਦਿਖਣ ਵਾਲੀਆਂ ਤਾਰੀਖ਼ਾਂ ਜਾਂਚੋ: {dates}.`

Example A:
- EN: Check these visible dates: 24 June 2026, 8 July 2026.
- PA: ਇਹ ਦਿਖਣ ਵਾਲੀਆਂ ਤਾਰੀਖ਼ਾਂ ਜਾਂਚੋ: 24 June 2026, 8 July 2026.

Example B:
- EN: Check these visible dates: 3 September 2026.
- PA: ਇਹ ਦਿਖਣ ਵਾਲੀਆਂ ਤਾਰੀਖ਼ਾਂ ਜਾਂਚੋ: 3 September 2026.

## 38. tpl.check.date_on_original

- EN: `Check this date on the original document: {date}.`
- PA: `ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਇਹ ਤਾਰੀਖ਼ ਜਾਂਚੋ: {date}.`

Example A:
- EN: Check this date on the original document: 24 June 2026.
- PA: ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਇਹ ਤਾਰੀਖ਼ ਜਾਂਚੋ: 24 June 2026.

Example B:
- EN: Check this date on the original document: 3 September 2026.
- PA: ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਇਹ ਤਾਰੀਖ਼ ਜਾਂਚੋ: 3 September 2026.

## 39. tpl.check.amount_and_date

- EN: `Check the amount ({amount}) and the date ({date}) on the original document.`
- PA: `ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਰਕਮ ({amount}) ਅਤੇ ਤਾਰੀਖ਼ ({date}) ਜਾਂਚੋ.`

Example A:
- EN: Check the amount (£187.42) and the date (24 June 2026) on the original document.
- PA: ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਰਕਮ (£187.42) ਅਤੇ ਤਾਰੀਖ਼ (24 June 2026) ਜਾਂਚੋ.

Example B:
- EN: Check the amount (£64.00) and the date (3 September 2026) on the original document.
- PA: ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਰਕਮ (£64.00) ਅਤੇ ਤਾਰੀਖ਼ (3 September 2026) ਜਾਂਚੋ.

## 40. tpl.check.amount_any_dates

- EN: `Check the amount ({amount}) and any dates on the original document.`
- PA: `ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਰਕਮ ({amount}) ਅਤੇ ਸਾਰੀਆਂ ਤਾਰੀਖ਼ਾਂ ਜਾਂਚੋ.`

Example A:
- EN: Check the amount (£187.42) and any dates on the original document.
- PA: ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਰਕਮ (£187.42) ਅਤੇ ਸਾਰੀਆਂ ਤਾਰੀਖ਼ਾਂ ਜਾਂਚੋ.

Example B:
- EN: Check the amount (£64.00) and any dates on the original document.
- PA: ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਰਕਮ (£64.00) ਅਤੇ ਸਾਰੀਆਂ ਤਾਰੀਖ਼ਾਂ ਜਾਂਚੋ.

## 41. tpl.check.date_any_amounts

- EN: `Check the date ({date}) and any amounts on the original document.`
- PA: `ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਤਾਰੀਖ਼ ({date}) ਅਤੇ ਸਾਰੀਆਂ ਰਕਮਾਂ ਜਾਂਚੋ.`

Example A:
- EN: Check the date (24 June 2026) and any amounts on the original document.
- PA: ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਤਾਰੀਖ਼ (24 June 2026) ਅਤੇ ਸਾਰੀਆਂ ਰਕਮਾਂ ਜਾਂਚੋ.

Example B:
- EN: Check the date (3 September 2026) and any amounts on the original document.
- PA: ਅਸਲ ਦਸਤਾਵੇਜ਼ ਉੱਤੇ ਤਾਰੀਖ਼ (3 September 2026) ਅਤੇ ਸਾਰੀਆਂ ਰਕਮਾਂ ਜਾਂਚੋ.

## 42. tpl.check.kp_date

- EN: `Date: {date}.`
- PA: `ਤਾਰੀਖ਼: {date}.`

Example A:
- EN: Date: 24 June 2026.
- PA: ਤਾਰੀਖ਼: 24 June 2026.

Example B:
- EN: Date: 3 September 2026.
- PA: ਤਾਰੀਖ਼: 3 September 2026.

## 43. tpl.check.kp_amount

- EN: `Amount shown: {amount}.`
- PA: `ਦਿਖਾਈ ਗਈ ਰਕਮ: {amount}.`

Example A:
- EN: Amount shown: £187.42.
- PA: ਦਿਖਾਈ ਗਈ ਰਕਮ: £187.42.

Example B:
- EN: Amount shown: £64.00.
- PA: ਦਿਖਾਈ ਗਈ ਰਕਮ: £64.00.

## 44. tpl.consequence.avoid

- EN: `The document says {consequence} if a payment is not made. Check the original document.`
- PA: `ਦਸਤਾਵੇਜ਼ ਕਹਿੰਦਾ ਹੈ ਕਿ ਅਦਾਇਗੀ ਨਾ ਹੋਣ ਉੱਤੇ {consequence} ਹੋ ਸਕਦਾ ਹੈ. ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.`

Example A (consequence = court action):
- EN: The document says court action if a payment is not made. Check the original document.
- PA: ਦਸਤਾਵੇਜ਼ ਕਹਿੰਦਾ ਹੈ ਕਿ ਅਦਾਇਗੀ ਨਾ ਹੋਣ ਉੱਤੇ ਅਦਾਲਤੀ ਕਾਰਵਾਈ ਹੋ ਸਕਦਾ ਹੈ. ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

Example B (consequence = disconnection):
- EN: The document says disconnection if a payment is not made. Check the original document.
- PA: ਦਸਤਾਵੇਜ਼ ਕਹਿੰਦਾ ਹੈ ਕਿ ਅਦਾਇਗੀ ਨਾ ਹੋਣ ਉੱਤੇ ਕੁਨੈਕਸ਼ਨ ਕੱਟਿਆ ਜਾਣਾ ਹੋ ਸਕਦਾ ਹੈ. ਅਸਲ ਦਸਤਾਵੇਜ਼ ਜਾਂਚੋ.

## 45. tpl.consequence.reported

- EN: `The document states that {sentence_body}.`
- PA: `ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਲਿਖਿਆ ਹੈ ਕਿ {sentence_body}.`

Example A:
- EN: The document states that a late payment charge may be added.
- PA: ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਲਿਖਿਆ ਹੈ ਕਿ ਦੇਰੀ ਦਾ ਚਾਰਜ ਜੋੜਿਆ ਜਾ ਸਕਦਾ ਹੈ.

Example B:
- EN: The document states that your account may be passed to a collection agency.
- PA: ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਲਿਖਿਆ ਹੈ ਕਿ ਤੁਹਾਡਾ ਅਕਾਊਂਟ ਵਸੂਲੀ ਏਜੰਸੀ ਨੂੰ ਦਿੱਤਾ ਜਾ ਸਕਦਾ ਹੈ.

## 46. tpl.consequence.may_follow

- EN: `{consequence_clause} may follow`
- PA: `ਇਸ ਤੋਂ ਬਾਅਦ {consequence_clause} ਹੋ ਸਕਦਾ ਹੈ`

Example A (consequence_clause = a late payment charge):
- EN: a late payment charge may follow
- PA: ਇਸ ਤੋਂ ਬਾਅਦ ਦੇਰੀ ਦਾ ਚਾਰਜ ਹੋ ਸਕਦਾ ਹੈ

Example B (consequence_clause = further action):
- EN: further action may follow
- PA: ਇਸ ਤੋਂ ਬਾਅਦ ਹੋਰ ਕਾਰਵਾਈ ਹੋ ਸਕਦਾ ਹੈ

## 47. tpl.action.check_wrap

- EN: `Check {action_sentence}`
- PA: `ਇਹ ਜਾਂਚੋ: {action_sentence}`

Example A (action_sentence = the payment amount and due date.):
- EN: Check the payment amount and due date.
- PA: ਇਹ ਜਾਂਚੋ: ਅਦਾਇਗੀ ਦੀ ਰਕਮ ਅਤੇ ਦੇਣ ਦੀ ਤਾਰੀਖ਼.

Example B (action_sentence = who sent the letter.):
- EN: Check who sent the letter.
- PA: ਇਹ ਜਾਂਚੋ: ਚਿੱਠੀ ਕਿਸਨੇ ਭੇਜੀ.

## 48. tpl.composite.read_aloud

- EN: `{title}. {explanation}. {key_points}`
- PA: `{title}. {explanation}. {key_points}`

This template only joins three pieces of text that are already translated
elsewhere, so it stays the same in Panjabi.

Example A:
- EN: What is this?. This looks like a formal document. Amount shown: £187.42.
- PA: ਇਹ ਕੀ ਹੈ?. ਇਹ ਇੱਕ ਰਸਮੀ ਦਸਤਾਵੇਜ਼ ਲੱਗਦਾ ਹੈ. ਦਿਖਾਈ ਗਈ ਰਕਮ: £187.42.

Example B:
- EN: When is it due?. Use this date before making a reminder. Date: 24 June 2026.
- PA: ਇਹ ਕਦੋਂ ਦੇਣਾ ਹੈ?. ਰਿਮਾਈਂਡਰ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਇਹ ਤਾਰੀਖ਼ ਜਾਂਚ ਲਓ. ਤਾਰੀਖ਼: 24 June 2026.

## 49. tpl.composite.display_text

- EN: `{title} {short_answer}`
- PA: `{title} {short_answer}`

Joining template only, unchanged in Panjabi.

Example A:
- EN: What is this? This appears to be a bill from Thames Water.
- PA: ਇਹ ਕੀ ਹੈ? ਇਹ Thames Water ਦਾ ਬਿੱਲ ਲੱਗਦਾ ਹੈ.

Example B:
- EN: When is it due? Due by 3 September 2026.
- PA: ਇਹ ਕਦੋਂ ਦੇਣਾ ਹੈ? 3 September 2026 ਤੱਕ ਦੇਣਾ ਹੈ.

## 50. tpl.composite.tts

- EN: `{title}. {short_answer}`
- PA: `{title}. {short_answer}`

Joining template only, unchanged in Panjabi. This one is read aloud by the
screen reader, so the full stop matters for the pause.

Example A:
- EN: What matters most?. This is important, but not an emergency.
- PA: ਸਭ ਤੋਂ ਜ਼ਰੂਰੀ ਕੀ ਹੈ?. ਇਹ ਜ਼ਰੂਰੀ ਹੈ, ਪਰ ਕੋਈ ਐਮਰਜੈਂਸੀ ਨਹੀਂ.

Example B:
- EN: What should I check?. Check the sender: Thames Water.
- PA: ਮੈਨੂੰ ਕੀ ਜਾਂਚਣਾ ਚਾਹੀਦਾ ਹੈ?. ਭੇਜਣ ਵਾਲੇ ਨੂੰ ਜਾਂਚੋ: Thames Water.

## 51. tpl.api.unknown_analytics_fields

- EN: `Unknown analytics fields: {field_list}`
- PA: `ਅਣਜਾਣ analytics ਫ਼ੀਲਡ: {field_list}`

This is a developer message, not something a reader normally sees.

Example A:
- EN: Unknown analytics fields: sessionRef, pageHint
- PA: ਅਣਜਾਣ analytics ਫ਼ੀਲਡ: sessionRef, pageHint

Example B:
- EN: Unknown analytics fields: deviceTag
- PA: ਅਣਜਾਣ analytics ਫ਼ੀਲਡ: deviceTag
