# Hindi pattern samples for Northcue

DRAFT PENDING HUMAN REVIEW.

All 51 sentence templates from `public/i18n/templates-hi.js`, each with the
English original, the Hindi draft, and two filled examples using realistic
UK values. Slot values (names, amounts, dates) stay exactly as the app
would insert them, in English letters. Read the Hindi examples aloud to
check they sound natural, calm, and respectful.

No em or en dashes appear anywhere in this file.

---

## 1. tpl.deadline.appointment

- EN: `Your appointment is on {date}.`
- HI: `आपका अपॉइंटमेंट {date} को है.`

Example A:
- EN: Your appointment is on 24 June 2026.
- HI: आपका अपॉइंटमेंट 24 June 2026 को है.

Example B:
- EN: Your appointment is on 3 March 2026.
- HI: आपका अपॉइंटमेंट 3 March 2026 को है.

## 2. tpl.deadline.due

- EN: `Due by {date}.`
- HI: `{date} तक देय.`

Example A:
- EN: Due by 24 June 2026.
- HI: 24 June 2026 तक देय.

Example B:
- EN: Due by 1 September 2026.
- HI: 1 September 2026 तक देय.

## 3. tpl.summary.bill_full

- EN: `{sender} appears to be asking you to pay {amount} by {date}.`
- HI: `ऐसा लगता है कि {sender} आपसे {date} तक {amount} चुकाने के लिए कह रहा है.`

Example A:
- EN: Thames Water appears to be asking you to pay £187.42 by 24 June 2026.
- HI: ऐसा लगता है कि Thames Water आपसे 24 June 2026 तक £187.42 चुकाने के लिए कह रहा है.

Example B:
- EN: British Gas appears to be asking you to pay £56.10 by 3 March 2026.
- HI: ऐसा लगता है कि British Gas आपसे 3 March 2026 तक £56.10 चुकाने के लिए कह रहा है.

## 4. tpl.summary.bill_amount_date

- EN: `This appears to be a payment request for {amount}, due by {date}.`
- HI: `यह {amount} के भुगतान का अनुरोध लगता है, जो {date} तक देय है.`

Example A:
- EN: This appears to be a payment request for £187.42, due by 24 June 2026.
- HI: यह £187.42 के भुगतान का अनुरोध लगता है, जो 24 June 2026 तक देय है.

Example B:
- EN: This appears to be a payment request for £32.80, due by 12 August 2026.
- HI: यह £32.80 के भुगतान का अनुरोध लगता है, जो 12 August 2026 तक देय है.

## 5. tpl.summary.bill_sender_amount

- EN: `{sender} appears to be asking you to pay {amount}.`
- HI: `ऐसा लगता है कि {sender} आपसे {amount} चुकाने के लिए कह रहा है.`

Example A:
- EN: Thames Water appears to be asking you to pay £187.42.
- HI: ऐसा लगता है कि Thames Water आपसे £187.42 चुकाने के लिए कह रहा है.

Example B:
- EN: British Gas appears to be asking you to pay £56.10.
- HI: ऐसा लगता है कि British Gas आपसे £56.10 चुकाने के लिए कह रहा है.

## 6. tpl.summary.bill_sender_date

- EN: `This appears to be a bill from {sender}, dated {date}.`
- HI: `यह {sender} का बिल लगता है, जिस पर {date} की तारीख है.`

Example A:
- EN: This appears to be a bill from Thames Water, dated 24 June 2026.
- HI: यह Thames Water का बिल लगता है, जिस पर 24 June 2026 की तारीख है.

Example B:
- EN: This appears to be a bill from EE, dated 3 March 2026.
- HI: यह EE का बिल लगता है, जिस पर 3 March 2026 की तारीख है.

## 7. tpl.summary.bill_amount

- EN: `This appears to be a payment request for {amount}.`
- HI: `यह {amount} के भुगतान का अनुरोध लगता है.`

Example A:
- EN: This appears to be a payment request for £187.42.
- HI: यह £187.42 के भुगतान का अनुरोध लगता है.

Example B:
- EN: This appears to be a payment request for £1,245.00.
- HI: यह £1,245.00 के भुगतान का अनुरोध लगता है.

## 8. tpl.summary.bill_sender

- EN: `This appears to be a bill from {sender}.`
- HI: `यह {sender} का बिल लगता है.`

Example A:
- EN: This appears to be a bill from Thames Water.
- HI: यह Thames Water का बिल लगता है.

Example B:
- EN: This appears to be a bill from British Gas.
- HI: यह British Gas का बिल लगता है.

## 9. tpl.summary.bill_in_credit_sender

- EN: `This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
- HI: `यह {sender} का बिल लगता है. ऐसा लगता है कि आपका अकाउंट क्रेडिट में हो सकता है, इसलिए शायद कुछ भी चुकाना न हो. पक्का करने के लिए मूल दस्तावेज़ जाँचें.`

Example A:
- EN: This appears to be a bill from British Gas. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
- HI: यह British Gas का बिल लगता है. ऐसा लगता है कि आपका अकाउंट क्रेडिट में हो सकता है, इसलिए शायद कुछ भी चुकाना न हो. पक्का करने के लिए मूल दस्तावेज़ जाँचें.

Example B:
- EN: This appears to be a bill from Octopus Energy. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
- HI: यह Octopus Energy का बिल लगता है. ऐसा लगता है कि आपका अकाउंट क्रेडिट में हो सकता है, इसलिए शायद कुछ भी चुकाना न हो. पक्का करने के लिए मूल दस्तावेज़ जाँचें.

## 10. tpl.summary.gov_sender_amount

- EN: `{sender} appears to have sent an official notice mentioning {amount}.`
- HI: `ऐसा लगता है कि {sender} ने एक आधिकारिक नोटिस भेजा है जिसमें {amount} का ज़िक्र है.`

Example A:
- EN: Manchester City Council appears to have sent an official notice mentioning £187.42.
- HI: ऐसा लगता है कि Manchester City Council ने एक आधिकारिक नोटिस भेजा है जिसमें £187.42 का ज़िक्र है.

Example B:
- EN: HMRC appears to have sent an official notice mentioning £1,245.00.
- HI: ऐसा लगता है कि HMRC ने एक आधिकारिक नोटिस भेजा है जिसमें £1,245.00 का ज़िक्र है.

## 11. tpl.summary.gov_sender

- EN: `This appears to be an official notice from {sender}.`
- HI: `यह {sender} का एक आधिकारिक नोटिस लगता है.`

Example A:
- EN: This appears to be an official notice from Manchester City Council.
- HI: यह Manchester City Council का एक आधिकारिक नोटिस लगता है.

Example B:
- EN: This appears to be an official notice from HMRC.
- HI: यह HMRC का एक आधिकारिक नोटिस लगता है.

## 12. tpl.summary.gov_amount

- EN: `This appears to be an official notice mentioning {amount}.`
- HI: `यह एक आधिकारिक नोटिस लगता है जिसमें {amount} का ज़िक्र है.`

Example A:
- EN: This appears to be an official notice mentioning £187.42.
- HI: यह एक आधिकारिक नोटिस लगता है जिसमें £187.42 का ज़िक्र है.

Example B:
- EN: This appears to be an official notice mentioning £32.80.
- HI: यह एक आधिकारिक नोटिस लगता है जिसमें £32.80 का ज़िक्र है.

## 13. tpl.summary.appt_sender_date

- EN: `This appears to be an appointment from {sender} on {date}.`
- HI: `यह {sender} की ओर से {date} के अपॉइंटमेंट का पत्र लगता है.`

Example A:
- EN: This appears to be an appointment from NHS on 24 June 2026.
- HI: यह NHS की ओर से 24 June 2026 के अपॉइंटमेंट का पत्र लगता है.

Example B:
- EN: This appears to be an appointment from Leeds Dental Practice on 3 March 2026.
- HI: यह Leeds Dental Practice की ओर से 3 March 2026 के अपॉइंटमेंट का पत्र लगता है.

## 14. tpl.summary.appt_sender

- EN: `This appears to be an appointment from {sender}.`
- HI: `यह {sender} की ओर से एक अपॉइंटमेंट लगता है.`

Example A:
- EN: This appears to be an appointment from NHS.
- HI: यह NHS की ओर से एक अपॉइंटमेंट लगता है.

Example B:
- EN: This appears to be an appointment from Jobcentre Plus.
- HI: यह Jobcentre Plus की ओर से एक अपॉइंटमेंट लगता है.

## 15. tpl.summary.appt_date

- EN: `This appears to be an appointment on {date}.`
- HI: `यह {date} का एक अपॉइंटमेंट लगता है.`

Example A:
- EN: This appears to be an appointment on 24 June 2026.
- HI: यह 24 June 2026 का एक अपॉइंटमेंट लगता है.

Example B:
- EN: This appears to be an appointment on 12 August 2026.
- HI: यह 12 August 2026 का एक अपॉइंटमेंट लगता है.

## 16. tpl.summary.generic_full

- EN: `This appears to be from {sender}, mentioning {amount} and a date of {date}.`
- HI: `यह {sender} की ओर से लगता है, जिसमें {amount} और {date} की तारीख का ज़िक्र है.`

Example A:
- EN: This appears to be from Thames Water, mentioning £187.42 and a date of 24 June 2026.
- HI: यह Thames Water की ओर से लगता है, जिसमें £187.42 और 24 June 2026 की तारीख का ज़िक्र है.

Example B:
- EN: This appears to be from Barclays, mentioning £56.10 and a date of 3 March 2026.
- HI: यह Barclays की ओर से लगता है, जिसमें £56.10 और 3 March 2026 की तारीख का ज़िक्र है.

## 17. tpl.summary.generic_amount_date

- EN: `This document appears to mention {amount} and a date of {date}.`
- HI: `इस दस्तावेज़ में {amount} और {date} की तारीख का ज़िक्र दिखता है.`

Example A:
- EN: This document appears to mention £187.42 and a date of 24 June 2026.
- HI: इस दस्तावेज़ में £187.42 और 24 June 2026 की तारीख का ज़िक्र दिखता है.

Example B:
- EN: This document appears to mention £1,245.00 and a date of 1 September 2026.
- HI: इस दस्तावेज़ में £1,245.00 और 1 September 2026 की तारीख का ज़िक्र दिखता है.

## 18. tpl.summary.generic_sender_amount

- EN: `This appears to be from {sender}, mentioning {amount}.`
- HI: `यह {sender} की ओर से लगता है, जिसमें {amount} का ज़िक्र है.`

Example A:
- EN: This appears to be from Thames Water, mentioning £187.42.
- HI: यह Thames Water की ओर से लगता है, जिसमें £187.42 का ज़िक्र है.

Example B:
- EN: This appears to be from Aviva, mentioning £32.80.
- HI: यह Aviva की ओर से लगता है, जिसमें £32.80 का ज़िक्र है.

## 19. tpl.summary.generic_sender_date

- EN: `This appears to be from {sender}, with a date of {date}.`
- HI: `यह {sender} की ओर से लगता है, जिस पर {date} की तारीख है.`

Example A:
- EN: This appears to be from Thames Water, with a date of 24 June 2026.
- HI: यह Thames Water की ओर से लगता है, जिस पर 24 June 2026 की तारीख है.

Example B:
- EN: This appears to be from DWP, with a date of 3 March 2026.
- HI: यह DWP की ओर से लगता है, जिस पर 3 March 2026 की तारीख है.

## 20. tpl.summary.generic_sender

- EN: `This appears to be from {sender}.`
- HI: `यह {sender} की ओर से लगता है.`

Example A:
- EN: This appears to be from Thames Water.
- HI: यह Thames Water की ओर से लगता है.

Example B:
- EN: This appears to be from Manchester City Council.
- HI: यह Manchester City Council की ओर से लगता है.

## 21. tpl.summary.garbled_sender

- EN: `{sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- HI: `ऐसा लगता है कि {sender} ने {category_label} भेजा है. टेक्स्ट की गुणवत्ता इतनी कम है कि सटीक रकम या तारीखें भरोसे से पढ़ी नहीं जा सकतीं. इन ब्यौरों के लिए मूल दस्तावेज़ जाँचें.`

Example A:
- EN: Thames Water appears to have sent a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- HI: ऐसा लगता है कि Thames Water ने a bill or payment request भेजा है. टेक्स्ट की गुणवत्ता इतनी कम है कि सटीक रकम या तारीखें भरोसे से पढ़ी नहीं जा सकतीं. इन ब्यौरों के लिए मूल दस्तावेज़ जाँचें.

Example B:
- EN: HMRC appears to have sent an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- HI: ऐसा लगता है कि HMRC ने an official notice भेजा है. टेक्स्ट की गुणवत्ता इतनी कम है कि सटीक रकम या तारीखें भरोसे से पढ़ी नहीं जा सकतीं. इन ब्यौरों के लिए मूल दस्तावेज़ जाँचें.

Note for the checker: in the live app the {category_label} slot is filled
with the Hindi label from the bank (for example "एक बिल या भुगतान का अनुरोध"),
so the mixed language above only appears in this sample file.

## 22. tpl.summary.garbled

- EN: `This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- HI: `यह {category_label} लगता है. टेक्स्ट की गुणवत्ता इतनी कम है कि सटीक रकम या तारीखें भरोसे से पढ़ी नहीं जा सकतीं. इन ब्यौरों के लिए मूल दस्तावेज़ जाँचें.`

Example A:
- EN: This appears to be a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- HI: यह a bill or payment request लगता है. टेक्स्ट की गुणवत्ता इतनी कम है कि सटीक रकम या तारीखें भरोसे से पढ़ी नहीं जा सकतीं. इन ब्यौरों के लिए मूल दस्तावेज़ जाँचें.

Example B:
- EN: This appears to be a medical document. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
- HI: यह a medical document लगता है. टेक्स्ट की गुणवत्ता इतनी कम है कि सटीक रकम या तारीखें भरोसे से पढ़ी नहीं जा सकतीं. इन ब्यौरों के लिए मूल दस्तावेज़ जाँचें.

Note for the checker: as in sample 21, the live app fills {category_label}
with the Hindi label, so the sentence reads fully in Hindi.

## 23. tpl.readable.summary_sender

- EN: `This appears to be {type_label} from {sender}.`
- HI: `यह {sender} की ओर से {type_label} लगता है.`

Example A:
- EN: This appears to be a housing letter from Leeds City Council.
- HI: यह Leeds City Council की ओर से a housing letter लगता है.

Example B:
- EN: This appears to be a bank or finance letter from Barclays.
- HI: यह Barclays की ओर से a bank or finance letter लगता है.

Note for the checker: the live app fills {type_label} with the Hindi label
(for example "एक हाउसिंग पत्र"), so the sentence reads fully in Hindi.

## 24. tpl.readable.summary

- EN: `This appears to be {type_label}.`
- HI: `यह {type_label} लगता है.`

Example A:
- EN: This appears to be a work letter.
- HI: यह a work letter लगता है. (live app: यह काम का एक पत्र लगता है.)

Example B:
- EN: This appears to be an insurance letter.
- HI: यह an insurance letter लगता है. (live app: यह एक बीमा पत्र लगता है.)

## 25. tpl.readable.summary_topic

- EN: `This appears to be {type_label} about {topic}.`
- HI: `यह {topic} के बारे में {type_label} लगता है.`

Example A:
- EN: This appears to be an official letter about tax or HMRC.
- HI: यह tax or HMRC के बारे में an official letter लगता है. (live app: यह टैक्स या HMRC के बारे में एक आधिकारिक पत्र लगता है.)

Example B:
- EN: This appears to be a housing letter about housing or rent.
- HI: यह housing or rent के बारे में a housing letter लगता है. (live app: यह आवास या किराए के बारे में एक हाउसिंग पत्र लगता है.)

## 26. tpl.benefits.summary_sender

- EN: `This appears to be a benefits letter from {sender}.`
- HI: `यह {sender} की ओर से एक बेनिफ़िट्स पत्र लगता है.`

Example A:
- EN: This appears to be a benefits letter from DWP.
- HI: यह DWP की ओर से एक बेनिफ़िट्स पत्र लगता है.

Example B:
- EN: This appears to be a benefits letter from Manchester City Council.
- HI: यह Manchester City Council की ओर से एक बेनिफ़िट्स पत्र लगता है.

## 27. tpl.readable.sender_card

- EN: `This appears to be from {sender}. Check the original document to confirm.`
- HI: `यह {sender} की ओर से लगता है. पुष्टि के लिए मूल दस्तावेज़ जाँचें.`

Example A:
- EN: This appears to be from Thames Water. Check the original document to confirm.
- HI: यह Thames Water की ओर से लगता है. पुष्टि के लिए मूल दस्तावेज़ जाँचें.

Example B:
- EN: This appears to be from NHS. Check the original document to confirm.
- HI: यह NHS की ओर से लगता है. पुष्टि के लिए मूल दस्तावेज़ जाँचें.

## 28. tpl.readable.mip_deadline

- EN: `This may include a deadline about {topic}. Check the original before acting.`
- HI: `इसमें {topic} से जुड़ी कोई आखिरी तारीख हो सकती है. कदम उठाने से पहले मूल दस्तावेज़ जाँचें.`

Example A:
- EN: This may include a deadline about housing or rent. Check the original before acting.
- HI: इसमें housing or rent से जुड़ी कोई आखिरी तारीख हो सकती है. कदम उठाने से पहले मूल दस्तावेज़ जाँचें. (live app: इसमें आवास या किराए से जुड़ी कोई आखिरी तारीख हो सकती है...)

Example B:
- EN: This may include a deadline about tax or HMRC. Check the original before acting.
- HI: इसमें tax or HMRC से जुड़ी कोई आखिरी तारीख हो सकती है. कदम उठाने से पहले मूल दस्तावेज़ जाँचें. (live app: इसमें टैक्स या HMRC से जुड़ी कोई आखिरी तारीख हो सकती है...)

## 29. tpl.readable.mip_response

- EN: `This may ask for a response about {topic}. Check the original document.`
- HI: `यह {topic} के बारे में कोई जवाब माँग सकता है. मूल दस्तावेज़ जाँचें.`

Example A:
- EN: This may ask for a response about benefits support. Check the original document.
- HI: यह benefits support के बारे में कोई जवाब माँग सकता है. मूल दस्तावेज़ जाँचें. (live app: यह बेनिफ़िट्स सहायता के बारे में कोई जवाब माँग सकता है...)

Example B:
- EN: This may ask for a response about an appointment. Check the original document.
- HI: यह an appointment के बारे में कोई जवाब माँग सकता है. मूल दस्तावेज़ जाँचें. (live app: यह किसी अपॉइंटमेंट के बारे में कोई जवाब माँग सकता है...)

## 30. tpl.readable.mip_topic

- EN: `The clearest topic appears to be {topic}. Check the original for details.`
- HI: `सबसे साफ विषय {topic} लगता है. ब्यौरे के लिए मूल दस्तावेज़ जाँचें.`

Example A:
- EN: The clearest topic appears to be school or education. Check the original for details.
- HI: सबसे साफ विषय school or education लगता है. ब्यौरे के लिए मूल दस्तावेज़ जाँचें. (live app: सबसे साफ विषय स्कूल या शिक्षा लगता है...)

Example B:
- EN: The clearest topic appears to be insurance. Check the original for details.
- HI: सबसे साफ विषय insurance लगता है. ब्यौरे के लिए मूल दस्तावेज़ जाँचें. (live app: सबसे साफ विषय बीमा लगता है...)

## 31. tpl.date.letter_dated

- EN: `No clear due date was found. The letter is dated {header_date}.`
- HI: `कोई साफ देय तारीख नहीं मिली. पत्र पर {header_date} की तारीख है.`

Example A:
- EN: No clear due date was found. The letter is dated 24 June 2026.
- HI: कोई साफ देय तारीख नहीं मिली. पत्र पर 24 June 2026 की तारीख है.

Example B:
- EN: No clear due date was found. The letter is dated 3 March 2026.
- HI: कोई साफ देय तारीख नहीं मिली. पत्र पर 3 March 2026 की तारीख है.

## 32. tpl.date.important_dates

- EN: `These may be important dates: {dates}. Check what they refer to.`
- HI: `ये ज़रूरी तारीखें हो सकती हैं: {dates}. जाँचें कि ये किस बारे में हैं.`

Example A:
- EN: These may be important dates: 24 June 2026, 8 July 2026. Check what they refer to.
- HI: ये ज़रूरी तारीखें हो सकती हैं: 24 June 2026, 8 July 2026. जाँचें कि ये किस बारे में हैं.

Example B:
- EN: These may be important dates: 3 March 2026, 1 September 2026. Check what they refer to.
- HI: ये ज़रूरी तारीखें हो सकती हैं: 3 March 2026, 1 September 2026. जाँचें कि ये किस बारे में हैं.

## 33. tpl.date.dates_appear

- EN: `These dates appear in the document: {dates}. Check what they refer to.`
- HI: `दस्तावेज़ में ये तारीखें दिखती हैं: {dates}. जाँचें कि ये किस बारे में हैं.`

Example A:
- EN: These dates appear in the document: 24 June 2026, 8 July 2026. Check what they refer to.
- HI: दस्तावेज़ में ये तारीखें दिखती हैं: 24 June 2026, 8 July 2026. जाँचें कि ये किस बारे में हैं.

Example B:
- EN: These dates appear in the document: 12 August 2026. Check what they refer to.
- HI: दस्तावेज़ में ये तारीखें दिखती हैं: 12 August 2026. जाँचें कि ये किस बारे में हैं.

## 34. tpl.date.no_due_dates_appear

- EN: `No clear due date. These dates appear in the document: {dates}. Check what they refer to.`
- HI: `कोई साफ देय तारीख नहीं. दस्तावेज़ में ये तारीखें दिखती हैं: {dates}. जाँचें कि ये किस बारे में हैं.`

Example A:
- EN: No clear due date. These dates appear in the document: 24 June 2026, 8 July 2026. Check what they refer to.
- HI: कोई साफ देय तारीख नहीं. दस्तावेज़ में ये तारीखें दिखती हैं: 24 June 2026, 8 July 2026. जाँचें कि ये किस बारे में हैं.

Example B:
- EN: No clear due date. These dates appear in the document: 1 September 2026. Check what they refer to.
- HI: कोई साफ देय तारीख नहीं. दस्तावेज़ में ये तारीखें दिखती हैं: 1 September 2026. जाँचें कि ये किस बारे में हैं.

## 35. tpl.check.sender

- EN: `Check the sender: {sender}.`
- HI: `भेजने वाले को जाँचें: {sender}.`

Example A:
- EN: Check the sender: Thames Water.
- HI: भेजने वाले को जाँचें: Thames Water.

Example B:
- EN: Check the sender: HMRC.
- HI: भेजने वाले को जाँचें: HMRC.

## 36. tpl.check.topic

- EN: `Check the topic: {topic}.`
- HI: `विषय जाँचें: {topic}.`

Example A:
- EN: Check the topic: housing or rent.
- HI: विषय जाँचें: housing or rent. (live app: विषय जाँचें: आवास या किराए.)

Example B:
- EN: Check the topic: benefits support.
- HI: विषय जाँचें: benefits support. (live app: विषय जाँचें: बेनिफ़िट्स सहायता.)

## 37. tpl.check.dates

- EN: `Check these visible dates: {dates}.`
- HI: `ये दिखने वाली तारीखें जाँचें: {dates}.`

Example A:
- EN: Check these visible dates: 24 June 2026, 8 July 2026.
- HI: ये दिखने वाली तारीखें जाँचें: 24 June 2026, 8 July 2026.

Example B:
- EN: Check these visible dates: 3 March 2026.
- HI: ये दिखने वाली तारीखें जाँचें: 3 March 2026.

## 38. tpl.check.date_on_original

- EN: `Check this date on the original document: {date}.`
- HI: `मूल दस्तावेज़ पर यह तारीख जाँचें: {date}.`

Example A:
- EN: Check this date on the original document: 24 June 2026.
- HI: मूल दस्तावेज़ पर यह तारीख जाँचें: 24 June 2026.

Example B:
- EN: Check this date on the original document: 12 August 2026.
- HI: मूल दस्तावेज़ पर यह तारीख जाँचें: 12 August 2026.

## 39. tpl.check.amount_and_date

- EN: `Check the amount ({amount}) and the date ({date}) on the original document.`
- HI: `मूल दस्तावेज़ पर रकम ({amount}) और तारीख ({date}) जाँचें.`

Example A:
- EN: Check the amount (£187.42) and the date (24 June 2026) on the original document.
- HI: मूल दस्तावेज़ पर रकम (£187.42) और तारीख (24 June 2026) जाँचें.

Example B:
- EN: Check the amount (£56.10) and the date (3 March 2026) on the original document.
- HI: मूल दस्तावेज़ पर रकम (£56.10) और तारीख (3 March 2026) जाँचें.

## 40. tpl.check.amount_any_dates

- EN: `Check the amount ({amount}) and any dates on the original document.`
- HI: `मूल दस्तावेज़ पर रकम ({amount}) और सभी तारीखें जाँचें.`

Example A:
- EN: Check the amount (£187.42) and any dates on the original document.
- HI: मूल दस्तावेज़ पर रकम (£187.42) और सभी तारीखें जाँचें.

Example B:
- EN: Check the amount (£1,245.00) and any dates on the original document.
- HI: मूल दस्तावेज़ पर रकम (£1,245.00) और सभी तारीखें जाँचें.

## 41. tpl.check.date_any_amounts

- EN: `Check the date ({date}) and any amounts on the original document.`
- HI: `मूल दस्तावेज़ पर तारीख ({date}) और सभी रकमें जाँचें.`

Example A:
- EN: Check the date (24 June 2026) and any amounts on the original document.
- HI: मूल दस्तावेज़ पर तारीख (24 June 2026) और सभी रकमें जाँचें.

Example B:
- EN: Check the date (1 September 2026) and any amounts on the original document.
- HI: मूल दस्तावेज़ पर तारीख (1 September 2026) और सभी रकमें जाँचें.

## 42. tpl.check.kp_date

- EN: `Date: {date}.`
- HI: `तारीख: {date}.`

Example A:
- EN: Date: 24 June 2026.
- HI: तारीख: 24 June 2026.

Example B:
- EN: Date: 3 March 2026.
- HI: तारीख: 3 March 2026.

## 43. tpl.check.kp_amount

- EN: `Amount shown: {amount}.`
- HI: `दिखाई गई रकम: {amount}.`

Example A:
- EN: Amount shown: £187.42.
- HI: दिखाई गई रकम: £187.42.

Example B:
- EN: Amount shown: £32.80.
- HI: दिखाई गई रकम: £32.80.

## 44. tpl.consequence.avoid

- EN: `The document says {consequence} if a payment is not made. Check the original document.`
- HI: `दस्तावेज़ कहता है कि भुगतान न होने पर {consequence} हो सकता है. मूल दस्तावेज़ जाँचें.`

Example A:
- EN: The document says a late payment fee if a payment is not made. Check the original document.
- HI: दस्तावेज़ कहता है कि भुगतान न होने पर a late payment fee हो सकता है. मूल दस्तावेज़ जाँचें.

Example B:
- EN: The document says further recovery action if a payment is not made. Check the original document.
- HI: दस्तावेज़ कहता है कि भुगतान न होने पर further recovery action हो सकता है. मूल दस्तावेज़ जाँचें.

Note for the checker: {consequence} carries text taken from the uploaded
letter, so in real use it stays in the letter's own language.

## 45. tpl.consequence.reported

- EN: `The document states that {sentence_body}.`
- HI: `दस्तावेज़ में लिखा है कि {sentence_body}.`

Example A:
- EN: The document states that the account may be passed to a collection agency.
- HI: दस्तावेज़ में लिखा है कि the account may be passed to a collection agency.

Example B:
- EN: The document states that a reminder will be sent after 14 days.
- HI: दस्तावेज़ में लिखा है कि a reminder will be sent after 14 days.

Note for the checker: {sentence_body} is quoted from the letter itself.

## 46. tpl.consequence.may_follow

- EN: `{consequence_clause} may follow`
- HI: `इसके बाद {consequence_clause} हो सकता है`

Example A:
- EN: court action may follow
- HI: इसके बाद court action हो सकता है

Example B:
- EN: a late fee may follow
- HI: इसके बाद a late fee हो सकता है

## 47. tpl.action.check_wrap

- EN: `Check {action_sentence}`
- HI: `यह जाँचें: {action_sentence}`

Example A:
- EN: Check whether a response is needed by 24 June 2026
- HI: यह जाँचें: whether a response is needed by 24 June 2026

Example B:
- EN: Check the payment reference before paying
- HI: यह जाँचें: the payment reference before paying

Note for the checker: {action_sentence} carries text from the engine, so
in the Hindi app it arrives already translated where possible.

## 48. tpl.composite.read_aloud

- EN: `{title}. {explanation}. {key_points}`
- HI: `{title}. {explanation}. {key_points}`

Example A:
- EN: What is this?. This looks like a formal document.. Date: 24 June 2026.
- HI: यह क्या है?. यह एक औपचारिक दस्तावेज़ लगता है.. तारीख: 24 June 2026.

Example B:
- EN: When is it due?. Use this date before making a reminder.. Due by 3 March 2026.
- HI: यह कब तक देय है?. रिमाइंडर बनाने से पहले यह तारीख जाँच लें.. 3 March 2026 तक देय.

Note for the checker: this template only glues already translated card
parts together for read aloud, so the slots arrive in Hindi.

## 49. tpl.composite.display_text

- EN: `{title} {short_answer}`
- HI: `{title} {short_answer}`

Example A:
- EN: What is this? This looks like a formal document.
- HI: यह क्या है? यह एक औपचारिक दस्तावेज़ लगता है.

Example B:
- EN: Amount shown: £187.42. (as a key point line)
- HI: दिखाई गई रकम: £187.42.

## 50. tpl.composite.tts

- EN: `{title}. {short_answer}`
- HI: `{title}. {short_answer}`

Example A:
- EN: What is this?. This looks like a formal document.
- HI: यह क्या है?. यह एक औपचारिक दस्तावेज़ लगता है.

Example B:
- EN: What matters most?. This may need checking soon.
- HI: सबसे ज़रूरी क्या है?. इसे जल्द जाँचने की ज़रूरत हो सकती है.

## 51. tpl.api.unknown_analytics_fields

- EN: `Unknown analytics fields: {field_list}`
- HI: `अनजान analytics फ़ील्ड: {field_list}`

Example A:
- EN: Unknown analytics fields: page_view, click_id
- HI: अनजान analytics फ़ील्ड: page_view, click_id

Example B:
- EN: Unknown analytics fields: session_time
- HI: अनजान analytics फ़ील्ड: session_time

Note for the checker: this is a developer facing message, users never see
it, so the mixed wording is acceptable.
