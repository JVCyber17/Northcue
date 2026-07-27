# Gujarati pattern samples

DRAFT PENDING HUMAN REVIEW. One section per pattern in the sentence bank.
Each shows the English template, the Gujarati draft template, and two example
sentences filled with realistic UK values. Slot values stay verbatim English
in the Gujarati sentences, exactly as the runtime inserts them.

### 1. `tpl.deadline.appointment`

- EN template: `Your appointment is on {date}.`
- GU template: `તમારી એપોઇન્ટમેન્ટ {date} ના રોજ છે.`
- Example 1
  - EN: Your appointment is on 24 June 2026.
  - GU: તમારી એપોઇન્ટમેન્ટ 24 June 2026 ના રોજ છે.
- Example 2
  - EN: Your appointment is on 3 August 2026.
  - GU: તમારી એપોઇન્ટમેન્ટ 3 August 2026 ના રોજ છે.

### 2. `tpl.deadline.due`

- EN template: `Due by {date}.`
- GU template: `છેલ્લી તારીખ: {date}.`
- Example 1
  - EN: Due by 24 June 2026.
  - GU: છેલ્લી તારીખ: 24 June 2026.
- Example 2
  - EN: Due by 3 August 2026.
  - GU: છેલ્લી તારીખ: 3 August 2026.

### 3. `tpl.summary.bill_full`

- EN template: `{sender} appears to be asking you to pay {amount} by {date}.`
- GU template: `{sender} તમને {date} સુધીમાં {amount} ભરવાનું કહેતું હોય એવું જણાય છે.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42 by 24 June 2026.
  - GU: Thames Water તમને 24 June 2026 સુધીમાં £187.42 ભરવાનું કહેતું હોય એવું જણાય છે.
- Example 2
  - EN: British Gas appears to be asking you to pay £56.10 by 3 August 2026.
  - GU: British Gas તમને 3 August 2026 સુધીમાં £56.10 ભરવાનું કહેતું હોય એવું જણાય છે.

### 4. `tpl.summary.bill_amount_date`

- EN template: `This appears to be a payment request for {amount}, due by {date}.`
- GU template: `આ {amount} ની ચુકવણીની વિનંતી હોવાનું જણાય છે, જેની છેલ્લી તારીખ {date} છે.`
- Example 1
  - EN: This appears to be a payment request for £187.42, due by 24 June 2026.
  - GU: આ £187.42 ની ચુકવણીની વિનંતી હોવાનું જણાય છે, જેની છેલ્લી તારીખ 24 June 2026 છે.
- Example 2
  - EN: This appears to be a payment request for £56.10, due by 3 August 2026.
  - GU: આ £56.10 ની ચુકવણીની વિનંતી હોવાનું જણાય છે, જેની છેલ્લી તારીખ 3 August 2026 છે.

### 5. `tpl.summary.bill_sender_amount`

- EN template: `{sender} appears to be asking you to pay {amount}.`
- GU template: `{sender} તમને {amount} ભરવાનું કહેતું હોય એવું જણાય છે.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42.
  - GU: Thames Water તમને £187.42 ભરવાનું કહેતું હોય એવું જણાય છે.
- Example 2
  - EN: British Gas appears to be asking you to pay £56.10.
  - GU: British Gas તમને £56.10 ભરવાનું કહેતું હોય એવું જણાય છે.

### 6. `tpl.summary.bill_sender_date`

- EN template: `This appears to be a bill from {sender}, dated {date}.`
- GU template: `આ {sender} તરફથી આવેલું બિલ હોવાનું જણાય છે, જેની તારીખ {date} છે.`
- Example 1
  - EN: This appears to be a bill from Thames Water, dated 24 June 2026.
  - GU: આ Thames Water તરફથી આવેલું બિલ હોવાનું જણાય છે, જેની તારીખ 24 June 2026 છે.
- Example 2
  - EN: This appears to be a bill from British Gas, dated 3 August 2026.
  - GU: આ British Gas તરફથી આવેલું બિલ હોવાનું જણાય છે, જેની તારીખ 3 August 2026 છે.

### 7. `tpl.summary.bill_amount`

- EN template: `This appears to be a payment request for {amount}.`
- GU template: `આ {amount} ની ચુકવણીની વિનંતી હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be a payment request for £187.42.
  - GU: આ £187.42 ની ચુકવણીની વિનંતી હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be a payment request for £56.10.
  - GU: આ £56.10 ની ચુકવણીની વિનંતી હોવાનું જણાય છે.

### 8. `tpl.summary.bill_sender`

- EN template: `This appears to be a bill from {sender}.`
- GU template: `આ {sender} તરફથી આવેલું બિલ હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be a bill from Thames Water.
  - GU: આ Thames Water તરફથી આવેલું બિલ હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be a bill from British Gas.
  - GU: આ British Gas તરફથી આવેલું બિલ હોવાનું જણાય છે.

### 9. `tpl.summary.bill_in_credit_sender`

- EN template: `This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
- GU template: `આ {sender} તરફથી આવેલું બિલ હોવાનું જણાય છે. એવું લાગે છે કે તમારા ખાતામાં જમા રકમ હોઈ શકે છે, તેથી કદાચ કંઈ ભરવાનું ન પણ હોય. ખાતરી માટે અસલ દસ્તાવેજ તપાસો.`
- Example 1
  - EN: This appears to be a bill from Thames Water. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - GU: આ Thames Water તરફથી આવેલું બિલ હોવાનું જણાય છે. એવું લાગે છે કે તમારા ખાતામાં જમા રકમ હોઈ શકે છે, તેથી કદાચ કંઈ ભરવાનું ન પણ હોય. ખાતરી માટે અસલ દસ્તાવેજ તપાસો.
- Example 2
  - EN: This appears to be a bill from British Gas. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - GU: આ British Gas તરફથી આવેલું બિલ હોવાનું જણાય છે. એવું લાગે છે કે તમારા ખાતામાં જમા રકમ હોઈ શકે છે, તેથી કદાચ કંઈ ભરવાનું ન પણ હોય. ખાતરી માટે અસલ દસ્તાવેજ તપાસો.

### 10. `tpl.summary.gov_sender_amount`

- EN template: `{sender} appears to have sent an official notice mentioning {amount}.`
- GU template: `{sender} એ {amount} નો ઉલ્લેખ કરતી સત્તાવાર નોટિસ મોકલી હોય એવું જણાય છે.`
- Example 1
  - EN: Thames Water appears to have sent an official notice mentioning £187.42.
  - GU: Thames Water એ £187.42 નો ઉલ્લેખ કરતી સત્તાવાર નોટિસ મોકલી હોય એવું જણાય છે.
- Example 2
  - EN: British Gas appears to have sent an official notice mentioning £56.10.
  - GU: British Gas એ £56.10 નો ઉલ્લેખ કરતી સત્તાવાર નોટિસ મોકલી હોય એવું જણાય છે.

### 11. `tpl.summary.gov_sender`

- EN template: `This appears to be an official notice from {sender}.`
- GU template: `આ {sender} તરફથી આવેલી સત્તાવાર નોટિસ હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be an official notice from Thames Water.
  - GU: આ Thames Water તરફથી આવેલી સત્તાવાર નોટિસ હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be an official notice from British Gas.
  - GU: આ British Gas તરફથી આવેલી સત્તાવાર નોટિસ હોવાનું જણાય છે.

### 12. `tpl.summary.gov_amount`

- EN template: `This appears to be an official notice mentioning {amount}.`
- GU template: `આ {amount} નો ઉલ્લેખ કરતી સત્તાવાર નોટિસ હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be an official notice mentioning £187.42.
  - GU: આ £187.42 નો ઉલ્લેખ કરતી સત્તાવાર નોટિસ હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be an official notice mentioning £56.10.
  - GU: આ £56.10 નો ઉલ્લેખ કરતી સત્તાવાર નોટિસ હોવાનું જણાય છે.

### 13. `tpl.summary.appt_sender_date`

- EN template: `This appears to be an appointment from {sender} on {date}.`
- GU template: `આ {sender} તરફથી {date} ના રોજની એપોઇન્ટમેન્ટ હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be an appointment from Thames Water on 24 June 2026.
  - GU: આ Thames Water તરફથી 24 June 2026 ના રોજની એપોઇન્ટમેન્ટ હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be an appointment from British Gas on 3 August 2026.
  - GU: આ British Gas તરફથી 3 August 2026 ના રોજની એપોઇન્ટમેન્ટ હોવાનું જણાય છે.

### 14. `tpl.summary.appt_sender`

- EN template: `This appears to be an appointment from {sender}.`
- GU template: `આ {sender} તરફથી આવેલી એપોઇન્ટમેન્ટ હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be an appointment from Thames Water.
  - GU: આ Thames Water તરફથી આવેલી એપોઇન્ટમેન્ટ હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be an appointment from British Gas.
  - GU: આ British Gas તરફથી આવેલી એપોઇન્ટમેન્ટ હોવાનું જણાય છે.

### 15. `tpl.summary.appt_date`

- EN template: `This appears to be an appointment on {date}.`
- GU template: `આ {date} ના રોજની એપોઇન્ટમેન્ટ હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be an appointment on 24 June 2026.
  - GU: આ 24 June 2026 ના રોજની એપોઇન્ટમેન્ટ હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be an appointment on 3 August 2026.
  - GU: આ 3 August 2026 ના રોજની એપોઇન્ટમેન્ટ હોવાનું જણાય છે.

### 16. `tpl.summary.generic_full`

- EN template: `This appears to be from {sender}, mentioning {amount} and a date of {date}.`
- GU template: `આ {sender} તરફથી આવેલું જણાય છે, જેમાં {amount} અને {date} તારીખનો ઉલ્લેખ છે.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42 and a date of 24 June 2026.
  - GU: આ Thames Water તરફથી આવેલું જણાય છે, જેમાં £187.42 અને 24 June 2026 તારીખનો ઉલ્લેખ છે.
- Example 2
  - EN: This appears to be from British Gas, mentioning £56.10 and a date of 3 August 2026.
  - GU: આ British Gas તરફથી આવેલું જણાય છે, જેમાં £56.10 અને 3 August 2026 તારીખનો ઉલ્લેખ છે.

### 17. `tpl.summary.generic_amount_date`

- EN template: `This document appears to mention {amount} and a date of {date}.`
- GU template: `આ દસ્તાવેજમાં {amount} અને {date} તારીખનો ઉલ્લેખ હોય એવું જણાય છે.`
- Example 1
  - EN: This document appears to mention £187.42 and a date of 24 June 2026.
  - GU: આ દસ્તાવેજમાં £187.42 અને 24 June 2026 તારીખનો ઉલ્લેખ હોય એવું જણાય છે.
- Example 2
  - EN: This document appears to mention £56.10 and a date of 3 August 2026.
  - GU: આ દસ્તાવેજમાં £56.10 અને 3 August 2026 તારીખનો ઉલ્લેખ હોય એવું જણાય છે.

### 18. `tpl.summary.generic_sender_amount`

- EN template: `This appears to be from {sender}, mentioning {amount}.`
- GU template: `આ {sender} તરફથી આવેલું જણાય છે, જેમાં {amount} નો ઉલ્લેખ છે.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42.
  - GU: આ Thames Water તરફથી આવેલું જણાય છે, જેમાં £187.42 નો ઉલ્લેખ છે.
- Example 2
  - EN: This appears to be from British Gas, mentioning £56.10.
  - GU: આ British Gas તરફથી આવેલું જણાય છે, જેમાં £56.10 નો ઉલ્લેખ છે.

### 19. `tpl.summary.generic_sender_date`

- EN template: `This appears to be from {sender}, with a date of {date}.`
- GU template: `આ {sender} તરફથી આવેલું જણાય છે, જેની તારીખ {date} છે.`
- Example 1
  - EN: This appears to be from Thames Water, with a date of 24 June 2026.
  - GU: આ Thames Water તરફથી આવેલું જણાય છે, જેની તારીખ 24 June 2026 છે.
- Example 2
  - EN: This appears to be from British Gas, with a date of 3 August 2026.
  - GU: આ British Gas તરફથી આવેલું જણાય છે, જેની તારીખ 3 August 2026 છે.

### 20. `tpl.summary.generic_sender`

- EN template: `This appears to be from {sender}.`
- GU template: `આ {sender} તરફથી આવેલું જણાય છે.`
- Example 1
  - EN: This appears to be from Thames Water.
  - GU: આ Thames Water તરફથી આવેલું જણાય છે.
- Example 2
  - EN: This appears to be from British Gas.
  - GU: આ British Gas તરફથી આવેલું જણાય છે.

### 21. `tpl.summary.garbled_sender`

- EN template: `{sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- GU template: `{sender} એ {category_label} મોકલ્યો હોય એવું જણાય છે. લખાણની ગુણવત્તા એટલી ઓછી છે કે ચોક્કસ રકમ કે તારીખો ભરોસાપાત્ર રીતે વાંચી શકાતી નથી. આ વિગતો માટે અસલ દસ્તાવેજ તપાસો.`
- Example 1
  - EN: Thames Water appears to have sent a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - GU: Thames Water એ બિલ કે ચુકવણીની વિનંતી મોકલ્યો હોય એવું જણાય છે. લખાણની ગુણવત્તા એટલી ઓછી છે કે ચોક્કસ રકમ કે તારીખો ભરોસાપાત્ર રીતે વાંચી શકાતી નથી. આ વિગતો માટે અસલ દસ્તાવેજ તપાસો.
- Example 2
  - EN: British Gas appears to have sent an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - GU: British Gas એ સત્તાવાર નોટિસ મોકલ્યો હોય એવું જણાય છે. લખાણની ગુણવત્તા એટલી ઓછી છે કે ચોક્કસ રકમ કે તારીખો ભરોસાપાત્ર રીતે વાંચી શકાતી નથી. આ વિગતો માટે અસલ દસ્તાવેજ તપાસો.

### 22. `tpl.summary.garbled`

- EN template: `This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- GU template: `આ {category_label} હોવાનું જણાય છે. લખાણની ગુણવત્તા એટલી ઓછી છે કે ચોક્કસ રકમ કે તારીખો ભરોસાપાત્ર રીતે વાંચી શકાતી નથી. આ વિગતો માટે અસલ દસ્તાવેજ તપાસો.`
- Example 1
  - EN: This appears to be a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - GU: આ બિલ કે ચુકવણીની વિનંતી હોવાનું જણાય છે. લખાણની ગુણવત્તા એટલી ઓછી છે કે ચોક્કસ રકમ કે તારીખો ભરોસાપાત્ર રીતે વાંચી શકાતી નથી. આ વિગતો માટે અસલ દસ્તાવેજ તપાસો.
- Example 2
  - EN: This appears to be an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - GU: આ સત્તાવાર નોટિસ હોવાનું જણાય છે. લખાણની ગુણવત્તા એટલી ઓછી છે કે ચોક્કસ રકમ કે તારીખો ભરોસાપાત્ર રીતે વાંચી શકાતી નથી. આ વિગતો માટે અસલ દસ્તાવેજ તપાસો.

### 23. `tpl.readable.summary_sender`

- EN template: `This appears to be {type_label} from {sender}.`
- GU template: `આ {sender} તરફથી આવેલો {type_label} હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be a housing letter from Thames Water.
  - GU: આ Thames Water તરફથી આવેલો હાઉસિંગ પત્ર હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be an official letter from British Gas.
  - GU: આ British Gas તરફથી આવેલો સત્તાવાર પત્ર હોવાનું જણાય છે.

### 24. `tpl.readable.summary`

- EN template: `This appears to be {type_label}.`
- GU template: `આ {type_label} હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be a housing letter.
  - GU: આ હાઉસિંગ પત્ર હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be an official letter.
  - GU: આ સત્તાવાર પત્ર હોવાનું જણાય છે.

### 25. `tpl.readable.summary_topic`

- EN template: `This appears to be {type_label} about {topic}.`
- GU template: `આ {type_label} હોવાનું જણાય છે. વિષય: {topic}.`
- Example 1
  - EN: This appears to be a housing letter about housing or rent.
  - GU: આ હાઉસિંગ પત્ર હોવાનું જણાય છે. વિષય: ઘર કે ભાડું.
- Example 2
  - EN: This appears to be an official letter about tax or HMRC.
  - GU: આ સત્તાવાર પત્ર હોવાનું જણાય છે. વિષય: ટેક્સ કે HMRC.

### 26. `tpl.benefits.summary_sender`

- EN template: `This appears to be a benefits letter from {sender}.`
- GU template: `આ {sender} તરફથી આવેલો બેનિફિટ્સ પત્ર હોવાનું જણાય છે.`
- Example 1
  - EN: This appears to be a benefits letter from Thames Water.
  - GU: આ Thames Water તરફથી આવેલો બેનિફિટ્સ પત્ર હોવાનું જણાય છે.
- Example 2
  - EN: This appears to be a benefits letter from British Gas.
  - GU: આ British Gas તરફથી આવેલો બેનિફિટ્સ પત્ર હોવાનું જણાય છે.

### 27. `tpl.readable.sender_card`

- EN template: `This appears to be from {sender}. Check the original document to confirm.`
- GU template: `આ {sender} તરફથી આવેલું જણાય છે. ખાતરી કરવા અસલ દસ્તાવેજ તપાસો.`
- Example 1
  - EN: This appears to be from Thames Water. Check the original document to confirm.
  - GU: આ Thames Water તરફથી આવેલું જણાય છે. ખાતરી કરવા અસલ દસ્તાવેજ તપાસો.
- Example 2
  - EN: This appears to be from British Gas. Check the original document to confirm.
  - GU: આ British Gas તરફથી આવેલું જણાય છે. ખાતરી કરવા અસલ દસ્તાવેજ તપાસો.

### 28. `tpl.readable.mip_deadline`

- EN template: `This may include a deadline about {topic}. Check the original before acting.`
- GU template: `આમાં {topic} વિશે કોઈ છેલ્લી તારીખ હોઈ શકે છે. પગલું લેતાં પહેલાં અસલ દસ્તાવેજ તપાસો.`
- Example 1
  - EN: This may include a deadline about housing or rent. Check the original before acting.
  - GU: આમાં ઘર કે ભાડું વિશે કોઈ છેલ્લી તારીખ હોઈ શકે છે. પગલું લેતાં પહેલાં અસલ દસ્તાવેજ તપાસો.
- Example 2
  - EN: This may include a deadline about tax or HMRC. Check the original before acting.
  - GU: આમાં ટેક્સ કે HMRC વિશે કોઈ છેલ્લી તારીખ હોઈ શકે છે. પગલું લેતાં પહેલાં અસલ દસ્તાવેજ તપાસો.

### 29. `tpl.readable.mip_response`

- EN template: `This may ask for a response about {topic}. Check the original document.`
- GU template: `આમાં {topic} વિશે જવાબ માગવામાં આવ્યો હોઈ શકે છે. અસલ દસ્તાવેજ તપાસો.`
- Example 1
  - EN: This may ask for a response about housing or rent. Check the original document.
  - GU: આમાં ઘર કે ભાડું વિશે જવાબ માગવામાં આવ્યો હોઈ શકે છે. અસલ દસ્તાવેજ તપાસો.
- Example 2
  - EN: This may ask for a response about tax or HMRC. Check the original document.
  - GU: આમાં ટેક્સ કે HMRC વિશે જવાબ માગવામાં આવ્યો હોઈ શકે છે. અસલ દસ્તાવેજ તપાસો.

### 30. `tpl.readable.mip_topic`

- EN template: `The clearest topic appears to be {topic}. Check the original for details.`
- GU template: `સૌથી સ્પષ્ટ વિષય {topic} હોવાનું જણાય છે. વિગતો માટે અસલ દસ્તાવેજ તપાસો.`
- Example 1
  - EN: The clearest topic appears to be housing or rent. Check the original for details.
  - GU: સૌથી સ્પષ્ટ વિષય ઘર કે ભાડું હોવાનું જણાય છે. વિગતો માટે અસલ દસ્તાવેજ તપાસો.
- Example 2
  - EN: The clearest topic appears to be tax or HMRC. Check the original for details.
  - GU: સૌથી સ્પષ્ટ વિષય ટેક્સ કે HMRC હોવાનું જણાય છે. વિગતો માટે અસલ દસ્તાવેજ તપાસો.

### 31. `tpl.date.letter_dated`

- EN template: `No clear due date was found. The letter is dated {header_date}.`
- GU template: `કોઈ સ્પષ્ટ નિયત તારીખ મળી નથી. પત્રની તારીખ {header_date} છે.`
- Example 1
  - EN: No clear due date was found. The letter is dated 24 June 2026.
  - GU: કોઈ સ્પષ્ટ નિયત તારીખ મળી નથી. પત્રની તારીખ 24 June 2026 છે.
- Example 2
  - EN: No clear due date was found. The letter is dated 3 August 2026.
  - GU: કોઈ સ્પષ્ટ નિયત તારીખ મળી નથી. પત્રની તારીખ 3 August 2026 છે.

### 32. `tpl.date.important_dates`

- EN template: `These may be important dates: {dates}. Check what they refer to.`
- GU template: `આ તારીખો મહત્વની હોઈ શકે છે: {dates}. તે શેના વિશે છે તે તપાસો.`
- Example 1
  - EN: These may be important dates: 24 June 2026, 8 July 2026. Check what they refer to.
  - GU: આ તારીખો મહત્વની હોઈ શકે છે: 24 June 2026, 8 July 2026. તે શેના વિશે છે તે તપાસો.
- Example 2
  - EN: These may be important dates: 3 August 2026. Check what they refer to.
  - GU: આ તારીખો મહત્વની હોઈ શકે છે: 3 August 2026. તે શેના વિશે છે તે તપાસો.

### 33. `tpl.date.dates_appear`

- EN template: `These dates appear in the document: {dates}. Check what they refer to.`
- GU template: `દસ્તાવેજમાં આ તારીખો દેખાય છે: {dates}. તે શેના વિશે છે તે તપાસો.`
- Example 1
  - EN: These dates appear in the document: 24 June 2026, 8 July 2026. Check what they refer to.
  - GU: દસ્તાવેજમાં આ તારીખો દેખાય છે: 24 June 2026, 8 July 2026. તે શેના વિશે છે તે તપાસો.
- Example 2
  - EN: These dates appear in the document: 3 August 2026. Check what they refer to.
  - GU: દસ્તાવેજમાં આ તારીખો દેખાય છે: 3 August 2026. તે શેના વિશે છે તે તપાસો.

### 34. `tpl.date.no_due_dates_appear`

- EN template: `No clear due date. These dates appear in the document: {dates}. Check what they refer to.`
- GU template: `કોઈ સ્પષ્ટ નિયત તારીખ નથી. દસ્તાવેજમાં આ તારીખો દેખાય છે: {dates}. તે શેના વિશે છે તે તપાસો.`
- Example 1
  - EN: No clear due date. These dates appear in the document: 24 June 2026, 8 July 2026. Check what they refer to.
  - GU: કોઈ સ્પષ્ટ નિયત તારીખ નથી. દસ્તાવેજમાં આ તારીખો દેખાય છે: 24 June 2026, 8 July 2026. તે શેના વિશે છે તે તપાસો.
- Example 2
  - EN: No clear due date. These dates appear in the document: 3 August 2026. Check what they refer to.
  - GU: કોઈ સ્પષ્ટ નિયત તારીખ નથી. દસ્તાવેજમાં આ તારીખો દેખાય છે: 3 August 2026. તે શેના વિશે છે તે તપાસો.

### 35. `tpl.check.sender`

- EN template: `Check the sender: {sender}.`
- GU template: `મોકલનાર તપાસો: {sender}.`
- Example 1
  - EN: Check the sender: Thames Water.
  - GU: મોકલનાર તપાસો: Thames Water.
- Example 2
  - EN: Check the sender: British Gas.
  - GU: મોકલનાર તપાસો: British Gas.

### 36. `tpl.check.topic`

- EN template: `Check the topic: {topic}.`
- GU template: `વિષય તપાસો: {topic}.`
- Example 1
  - EN: Check the topic: housing or rent.
  - GU: વિષય તપાસો: ઘર કે ભાડું.
- Example 2
  - EN: Check the topic: tax or HMRC.
  - GU: વિષય તપાસો: ટેક્સ કે HMRC.

### 37. `tpl.check.dates`

- EN template: `Check these visible dates: {dates}.`
- GU template: `આ દેખાતી તારીખો તપાસો: {dates}.`
- Example 1
  - EN: Check these visible dates: 24 June 2026, 8 July 2026.
  - GU: આ દેખાતી તારીખો તપાસો: 24 June 2026, 8 July 2026.
- Example 2
  - EN: Check these visible dates: 3 August 2026.
  - GU: આ દેખાતી તારીખો તપાસો: 3 August 2026.

### 38. `tpl.check.date_on_original`

- EN template: `Check this date on the original document: {date}.`
- GU template: `અસલ દસ્તાવેજ પર આ તારીખ તપાસો: {date}.`
- Example 1
  - EN: Check this date on the original document: 24 June 2026.
  - GU: અસલ દસ્તાવેજ પર આ તારીખ તપાસો: 24 June 2026.
- Example 2
  - EN: Check this date on the original document: 3 August 2026.
  - GU: અસલ દસ્તાવેજ પર આ તારીખ તપાસો: 3 August 2026.

### 39. `tpl.check.amount_and_date`

- EN template: `Check the amount ({amount}) and the date ({date}) on the original document.`
- GU template: `અસલ દસ્તાવેજ પર રકમ ({amount}) અને તારીખ ({date}) તપાસો.`
- Example 1
  - EN: Check the amount (£187.42) and the date (24 June 2026) on the original document.
  - GU: અસલ દસ્તાવેજ પર રકમ (£187.42) અને તારીખ (24 June 2026) તપાસો.
- Example 2
  - EN: Check the amount (£56.10) and the date (3 August 2026) on the original document.
  - GU: અસલ દસ્તાવેજ પર રકમ (£56.10) અને તારીખ (3 August 2026) તપાસો.

### 40. `tpl.check.amount_any_dates`

- EN template: `Check the amount ({amount}) and any dates on the original document.`
- GU template: `અસલ દસ્તાવેજ પર રકમ ({amount}) અને કોઈ પણ તારીખો તપાસો.`
- Example 1
  - EN: Check the amount (£187.42) and any dates on the original document.
  - GU: અસલ દસ્તાવેજ પર રકમ (£187.42) અને કોઈ પણ તારીખો તપાસો.
- Example 2
  - EN: Check the amount (£56.10) and any dates on the original document.
  - GU: અસલ દસ્તાવેજ પર રકમ (£56.10) અને કોઈ પણ તારીખો તપાસો.

### 41. `tpl.check.date_any_amounts`

- EN template: `Check the date ({date}) and any amounts on the original document.`
- GU template: `અસલ દસ્તાવેજ પર તારીખ ({date}) અને કોઈ પણ રકમ તપાસો.`
- Example 1
  - EN: Check the date (24 June 2026) and any amounts on the original document.
  - GU: અસલ દસ્તાવેજ પર તારીખ (24 June 2026) અને કોઈ પણ રકમ તપાસો.
- Example 2
  - EN: Check the date (3 August 2026) and any amounts on the original document.
  - GU: અસલ દસ્તાવેજ પર તારીખ (3 August 2026) અને કોઈ પણ રકમ તપાસો.

### 42. `tpl.check.kp_date`

- EN template: `Date: {date}.`
- GU template: `તારીખ: {date}.`
- Example 1
  - EN: Date: 24 June 2026.
  - GU: તારીખ: 24 June 2026.
- Example 2
  - EN: Date: 3 August 2026.
  - GU: તારીખ: 3 August 2026.

### 43. `tpl.check.kp_amount`

- EN template: `Amount shown: {amount}.`
- GU template: `દર્શાવેલી રકમ: {amount}.`
- Example 1
  - EN: Amount shown: £187.42.
  - GU: દર્શાવેલી રકમ: £187.42.
- Example 2
  - EN: Amount shown: £56.10.
  - GU: દર્શાવેલી રકમ: £56.10.

### 44. `tpl.consequence.avoid`

- EN template: `The document says {consequence} if a payment is not made. Check the original document.`
- GU template: `દસ્તાવેજમાં લખ્યું છે કે જો ચુકવણી ન થાય તો આવું થઈ શકે છે: {consequence}. અસલ દસ્તાવેજ તપાસો.`
- Example 1
  - EN: The document says further recovery action if a payment is not made. Check the original document.
  - GU: દસ્તાવેજમાં લખ્યું છે કે જો ચુકવણી ન થાય તો આવું થઈ શકે છે: further recovery action. અસલ દસ્તાવેજ તપાસો.
- Example 2
  - EN: The document says a late payment fee if a payment is not made. Check the original document.
  - GU: દસ્તાવેજમાં લખ્યું છે કે જો ચુકવણી ન થાય તો આવું થઈ શકે છે: a late payment fee. અસલ દસ્તાવેજ તપાસો.

### 45. `tpl.consequence.reported`

- EN template: `The document states that {sentence_body}.`
- GU template: `દસ્તાવેજમાં જણાવ્યું છે કે: {sentence_body}.`
- Example 1
  - EN: The document states that the balance may be passed to a collection agency.
  - GU: દસ્તાવેજમાં જણાવ્યું છે કે: the balance may be passed to a collection agency.
- Example 2
  - EN: The document states that your service may be interrupted.
  - GU: દસ્તાવેજમાં જણાવ્યું છે કે: your service may be interrupted.

### 46. `tpl.consequence.may_follow`

- EN template: `{consequence_clause} may follow`
- GU template: `{consequence_clause} થઈ શકે છે`
- Example 1
  - EN: further action may follow
  - GU: further action થઈ શકે છે
- Example 2
  - EN: a penalty may follow
  - GU: a penalty થઈ શકે છે

### 47. `tpl.action.check_wrap`

- EN template: `Check {action_sentence}`
- GU template: `{action_sentence} તપાસો`
- Example 1
  - EN: Check the payment amount and due date.
  - GU: the payment amount and due date. તપાસો
- Example 2
  - EN: Check the reference number on your council tax bill.
  - GU: the reference number on your council tax bill. તપાસો

### 48. `tpl.composite.read_aloud`

- EN template: `{title}. {explanation}. {key_points}`
- GU template: `{title}. {explanation}. {key_points}`
- Example 1
  - EN: What is this?. It can be read clearly, so we can pull out the key points. Date: 24 June 2026.
  - GU: આ શું છે?. તે સ્પષ્ટ વાંચી શકાય છે, તેથી અમે મુખ્ય મુદ્દા કાઢી શકીએ છીએ. તારીખ: 24 June 2026.
- Example 2
  - EN: When is it due?. The letter shows one clear date. Amount shown: £56.10.
  - GU: તેની છેલ્લી તારીખ ક્યારે છે?. પત્રમાં એક સ્પષ્ટ તારીખ દેખાય છે. દર્શાવેલી રકમ: £56.10.

### 49. `tpl.composite.display_text`

- EN template: `{title} {short_answer}`
- GU template: `{title} {short_answer}`
- Example 1
  - EN: What is this? This looks like a formal document.
  - GU: આ શું છે? આ ઔપચારિક દસ્તાવેજ જેવું લાગે છે.
- Example 2
  - EN: When is it due? Due by 3 August 2026.
  - GU: તેની છેલ્લી તારીખ ક્યારે છે? છેલ્લી તારીખ: 3 August 2026.

### 50. `tpl.composite.tts`

- EN template: `{title}. {short_answer}`
- GU template: `{title}. {short_answer}`
- Example 1
  - EN: What is this?. This looks like a formal document.
  - GU: આ શું છે?. આ ઔપચારિક દસ્તાવેજ જેવું લાગે છે.
- Example 2
  - EN: When is it due?. Due by 3 August 2026.
  - GU: તેની છેલ્લી તારીખ ક્યારે છે?. છેલ્લી તારીખ: 3 August 2026.

### 51. `tpl.api.unknown_analytics_fields`

- EN template: `Unknown analytics fields: {field_list}`
- GU template: `અજાણ્યાં એનાલિટિક્સ ફીલ્ડ: {field_list}`
- Example 1
  - EN: Unknown analytics fields: page_view, card_seen
  - GU: અજાણ્યાં એનાલિટિક્સ ફીલ્ડ: page_view, card_seen
- Example 2
  - EN: Unknown analytics fields: session_id, mood
  - GU: અજાણ્યાં એનાલિટિક્સ ફીલ્ડ: session_id, mood

## Notes for the checker

- Pattern 47 `tpl.action.check_wrap` wraps an English sentence that already ends in a full stop, so the Gujarati verb lands after that stop. If that reads badly, moving `તપાસો` to the front is an option, but it then reads as a command rather than a suggestion.
- Patterns 21, 22, 23, 24, 25, 28, 29, 30, 36 insert a label or topic that is itself translated in the bank (`category_label`, `type_label`, `topic`), so the examples show the Gujarati label inside the Gujarati sentence.
- Patterns 44, 45, 46, 47 insert raw English fragments lifted from the letter. They stay English by design.

