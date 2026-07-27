# Polish pattern samples

DRAFT PENDING HUMAN REVIEW. One section per pattern in the sentence bank.
Each shows the English template, the Polish draft template, and two example
sentences filled with realistic UK values. Slot values stay verbatim English
in the Polish sentences, exactly as the runtime inserts them.

### 1. `tpl.deadline.appointment`

- EN template: `Your appointment is on {date}.`
- PL template: `Twoja wizyta jest zaplanowana na {date}.`
- Example 1
  - EN: Your appointment is on 24 June 2026.
  - PL: Twoja wizyta jest zaplanowana na 24 June 2026.
- Example 2
  - EN: Your appointment is on 3 August 2026.
  - PL: Twoja wizyta jest zaplanowana na 3 August 2026.

### 2. `tpl.deadline.due`

- EN template: `Due by {date}.`
- PL template: `Termin: do {date}.`
- Example 1
  - EN: Due by 24 June 2026.
  - PL: Termin: do 24 June 2026.
- Example 2
  - EN: Due by 3 August 2026.
  - PL: Termin: do 3 August 2026.

### 3. `tpl.summary.bill_full`

- EN template: `{sender} appears to be asking you to pay {amount} by {date}.`
- PL template: `{sender} wydaje się prosić o zapłatę {amount} do {date}.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42 by 24 June 2026.
  - PL: Thames Water wydaje się prosić o zapłatę £187.42 do 24 June 2026.
- Example 2
  - EN: British Gas appears to be asking you to pay £56.10 by 3 August 2026.
  - PL: British Gas wydaje się prosić o zapłatę £56.10 do 3 August 2026.

### 4. `tpl.summary.bill_amount_date`

- EN template: `This appears to be a payment request for {amount}, due by {date}.`
- PL template: `To wygląda na prośbę o zapłatę kwoty {amount}, z terminem do {date}.`
- Example 1
  - EN: This appears to be a payment request for £187.42, due by 24 June 2026.
  - PL: To wygląda na prośbę o zapłatę kwoty £187.42, z terminem do 24 June 2026.
- Example 2
  - EN: This appears to be a payment request for £56.10, due by 3 August 2026.
  - PL: To wygląda na prośbę o zapłatę kwoty £56.10, z terminem do 3 August 2026.

### 5. `tpl.summary.bill_sender_amount`

- EN template: `{sender} appears to be asking you to pay {amount}.`
- PL template: `{sender} wydaje się prosić o zapłatę {amount}.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42.
  - PL: Thames Water wydaje się prosić o zapłatę £187.42.
- Example 2
  - EN: British Gas appears to be asking you to pay £56.10.
  - PL: British Gas wydaje się prosić o zapłatę £56.10.

### 6. `tpl.summary.bill_sender_date`

- EN template: `This appears to be a bill from {sender}, dated {date}.`
- PL template: `To wygląda na rachunek od {sender}, z datą {date}.`
- Example 1
  - EN: This appears to be a bill from Thames Water, dated 24 June 2026.
  - PL: To wygląda na rachunek od Thames Water, z datą 24 June 2026.
- Example 2
  - EN: This appears to be a bill from British Gas, dated 3 August 2026.
  - PL: To wygląda na rachunek od British Gas, z datą 3 August 2026.

### 7. `tpl.summary.bill_amount`

- EN template: `This appears to be a payment request for {amount}.`
- PL template: `To wygląda na prośbę o zapłatę kwoty {amount}.`
- Example 1
  - EN: This appears to be a payment request for £187.42.
  - PL: To wygląda na prośbę o zapłatę kwoty £187.42.
- Example 2
  - EN: This appears to be a payment request for £56.10.
  - PL: To wygląda na prośbę o zapłatę kwoty £56.10.

### 8. `tpl.summary.bill_sender`

- EN template: `This appears to be a bill from {sender}.`
- PL template: `To wygląda na rachunek od {sender}.`
- Example 1
  - EN: This appears to be a bill from Thames Water.
  - PL: To wygląda na rachunek od Thames Water.
- Example 2
  - EN: This appears to be a bill from British Gas.
  - PL: To wygląda na rachunek od British Gas.

### 9. `tpl.summary.bill_in_credit_sender`

- EN template: `This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
- PL template: `To wygląda na rachunek od {sender}. Wygląda na to, że Twoje konto może mieć nadpłatę, więc może nie być nic do zapłaty. Sprawdź oryginalny dokument, aby mieć pewność.`
- Example 1
  - EN: This appears to be a bill from Thames Water. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - PL: To wygląda na rachunek od Thames Water. Wygląda na to, że Twoje konto może mieć nadpłatę, więc może nie być nic do zapłaty. Sprawdź oryginalny dokument, aby mieć pewność.
- Example 2
  - EN: This appears to be a bill from British Gas. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - PL: To wygląda na rachunek od British Gas. Wygląda na to, że Twoje konto może mieć nadpłatę, więc może nie być nic do zapłaty. Sprawdź oryginalny dokument, aby mieć pewność.

### 10. `tpl.summary.gov_sender_amount`

- EN template: `{sender} appears to have sent an official notice mentioning {amount}.`
- PL template: `Wygląda na to, że nadawcą urzędowego zawiadomienia jest {sender}, a w treści pojawia się kwota {amount}.`
- Example 1
  - EN: Barnet Council appears to have sent an official notice mentioning £187.42.
  - PL: Wygląda na to, że nadawcą urzędowego zawiadomienia jest Barnet Council, a w treści pojawia się kwota £187.42.
- Example 2
  - EN: HMRC appears to have sent an official notice mentioning £56.10.
  - PL: Wygląda na to, że nadawcą urzędowego zawiadomienia jest HMRC, a w treści pojawia się kwota £56.10.

### 11. `tpl.summary.gov_sender`

- EN template: `This appears to be an official notice from {sender}.`
- PL template: `To wygląda na urzędowe zawiadomienie od {sender}.`
- Example 1
  - EN: This appears to be an official notice from Barnet Council.
  - PL: To wygląda na urzędowe zawiadomienie od Barnet Council.
- Example 2
  - EN: This appears to be an official notice from HMRC.
  - PL: To wygląda na urzędowe zawiadomienie od HMRC.

### 12. `tpl.summary.gov_amount`

- EN template: `This appears to be an official notice mentioning {amount}.`
- PL template: `To wygląda na urzędowe zawiadomienie, w którym pojawia się kwota {amount}.`
- Example 1
  - EN: This appears to be an official notice mentioning £187.42.
  - PL: To wygląda na urzędowe zawiadomienie, w którym pojawia się kwota £187.42.
- Example 2
  - EN: This appears to be an official notice mentioning £56.10.
  - PL: To wygląda na urzędowe zawiadomienie, w którym pojawia się kwota £56.10.

### 13. `tpl.summary.appt_sender_date`

- EN template: `This appears to be an appointment from {sender} on {date}.`
- PL template: `To wygląda na zawiadomienie o wizycie od {sender}, z datą {date}.`
- Example 1
  - EN: This appears to be an appointment from NHS Dental Services on 24 June 2026.
  - PL: To wygląda na zawiadomienie o wizycie od NHS Dental Services, z datą 24 June 2026.
- Example 2
  - EN: This appears to be an appointment from Royal Free Hospital on 3 August 2026.
  - PL: To wygląda na zawiadomienie o wizycie od Royal Free Hospital, z datą 3 August 2026.

### 14. `tpl.summary.appt_sender`

- EN template: `This appears to be an appointment from {sender}.`
- PL template: `To wygląda na zawiadomienie o wizycie od {sender}.`
- Example 1
  - EN: This appears to be an appointment from NHS Dental Services.
  - PL: To wygląda na zawiadomienie o wizycie od NHS Dental Services.
- Example 2
  - EN: This appears to be an appointment from Royal Free Hospital.
  - PL: To wygląda na zawiadomienie o wizycie od Royal Free Hospital.

### 15. `tpl.summary.appt_date`

- EN template: `This appears to be an appointment on {date}.`
- PL template: `To wygląda na zawiadomienie o wizycie w dniu {date}.`
- Example 1
  - EN: This appears to be an appointment on 24 June 2026.
  - PL: To wygląda na zawiadomienie o wizycie w dniu 24 June 2026.
- Example 2
  - EN: This appears to be an appointment on 3 August 2026.
  - PL: To wygląda na zawiadomienie o wizycie w dniu 3 August 2026.

### 16. `tpl.summary.generic_full`

- EN template: `This appears to be from {sender}, mentioning {amount} and a date of {date}.`
- PL template: `To wygląda na dokument od {sender}, w którym pojawia się kwota {amount} i data {date}.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42 and a date of 24 June 2026.
  - PL: To wygląda na dokument od Thames Water, w którym pojawia się kwota £187.42 i data 24 June 2026.
- Example 2
  - EN: This appears to be from British Gas, mentioning £56.10 and a date of 3 August 2026.
  - PL: To wygląda na dokument od British Gas, w którym pojawia się kwota £56.10 i data 3 August 2026.

### 17. `tpl.summary.generic_amount_date`

- EN template: `This document appears to mention {amount} and a date of {date}.`
- PL template: `Ten dokument wydaje się wspominać kwotę {amount} i datę {date}.`
- Example 1
  - EN: This document appears to mention £187.42 and a date of 24 June 2026.
  - PL: Ten dokument wydaje się wspominać kwotę £187.42 i datę 24 June 2026.
- Example 2
  - EN: This document appears to mention £56.10 and a date of 3 August 2026.
  - PL: Ten dokument wydaje się wspominać kwotę £56.10 i datę 3 August 2026.

### 18. `tpl.summary.generic_sender_amount`

- EN template: `This appears to be from {sender}, mentioning {amount}.`
- PL template: `To wygląda na dokument od {sender}, w którym pojawia się kwota {amount}.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42.
  - PL: To wygląda na dokument od Thames Water, w którym pojawia się kwota £187.42.
- Example 2
  - EN: This appears to be from British Gas, mentioning £56.10.
  - PL: To wygląda na dokument od British Gas, w którym pojawia się kwota £56.10.

### 19. `tpl.summary.generic_sender_date`

- EN template: `This appears to be from {sender}, with a date of {date}.`
- PL template: `To wygląda na dokument od {sender}, z datą {date}.`
- Example 1
  - EN: This appears to be from Thames Water, with a date of 24 June 2026.
  - PL: To wygląda na dokument od Thames Water, z datą 24 June 2026.
- Example 2
  - EN: This appears to be from British Gas, with a date of 3 August 2026.
  - PL: To wygląda na dokument od British Gas, z datą 3 August 2026.

### 20. `tpl.summary.generic_sender`

- EN template: `This appears to be from {sender}.`
- PL template: `To wygląda na dokument od {sender}.`
- Example 1
  - EN: This appears to be from Thames Water.
  - PL: To wygląda na dokument od Thames Water.
- Example 2
  - EN: This appears to be from British Gas.
  - PL: To wygląda na dokument od British Gas.

### 21. `tpl.summary.garbled_sender`

- EN template: `{sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- PL template: `Wygląda na to, że nadawcą jest {sender}, a dokument to {category_label}. Jakość tekstu jest zbyt niska, aby wiarygodnie odczytać konkretne kwoty lub daty. Sprawdź te szczegóły w oryginalnym dokumencie.`
- Example 1
  - EN: Thames Water appears to have sent a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - PL: Wygląda na to, że nadawcą jest Thames Water, a dokument to a bill or payment request. Jakość tekstu jest zbyt niska, aby wiarygodnie odczytać konkretne kwoty lub daty. Sprawdź te szczegóły w oryginalnym dokumencie.
- Example 2
  - EN: British Gas appears to have sent an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - PL: Wygląda na to, że nadawcą jest British Gas, a dokument to an official notice. Jakość tekstu jest zbyt niska, aby wiarygodnie odczytać konkretne kwoty lub daty. Sprawdź te szczegóły w oryginalnym dokumencie.

### 22. `tpl.summary.garbled`

- EN template: `This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- PL template: `To wygląda na {category_label}. Jakość tekstu jest zbyt niska, aby wiarygodnie odczytać konkretne kwoty lub daty. Sprawdź te szczegóły w oryginalnym dokumencie.`
- Example 1
  - EN: This appears to be a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - PL: To wygląda na a bill or payment request. Jakość tekstu jest zbyt niska, aby wiarygodnie odczytać konkretne kwoty lub daty. Sprawdź te szczegóły w oryginalnym dokumencie.
- Example 2
  - EN: This appears to be an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - PL: To wygląda na an official notice. Jakość tekstu jest zbyt niska, aby wiarygodnie odczytać konkretne kwoty lub daty. Sprawdź te szczegóły w oryginalnym dokumencie.

### 23. `tpl.readable.summary_sender`

- EN template: `This appears to be {type_label} from {sender}.`
- PL template: `To wygląda na {type_label} od {sender}.`
- Example 1
  - EN: This appears to be a housing letter from Thames Water.
  - PL: To wygląda na a housing letter od Thames Water.
- Example 2
  - EN: This appears to be an official letter from British Gas.
  - PL: To wygląda na an official letter od British Gas.

### 24. `tpl.readable.summary`

- EN template: `This appears to be {type_label}.`
- PL template: `To wygląda na {type_label}.`
- Example 1
  - EN: This appears to be a housing letter.
  - PL: To wygląda na a housing letter.
- Example 2
  - EN: This appears to be an official letter.
  - PL: To wygląda na an official letter.

### 25. `tpl.readable.summary_topic`

- EN template: `This appears to be {type_label} about {topic}.`
- PL template: `To wygląda na {type_label}. Temat: {topic}.`
- Example 1
  - EN: This appears to be a housing letter about housing or rent.
  - PL: To wygląda na a housing letter. Temat: housing or rent.
- Example 2
  - EN: This appears to be an official letter about tax or HMRC.
  - PL: To wygląda na an official letter. Temat: tax or HMRC.

### 26. `tpl.benefits.summary_sender`

- EN template: `This appears to be a benefits letter from {sender}.`
- PL template: `To wygląda na list o świadczeniach od {sender}.`
- Example 1
  - EN: This appears to be a benefits letter from Department for Work and Pensions.
  - PL: To wygląda na list o świadczeniach od Department for Work and Pensions.
- Example 2
  - EN: This appears to be a benefits letter from HMRC.
  - PL: To wygląda na list o świadczeniach od HMRC.

### 27. `tpl.readable.sender_card`

- EN template: `This appears to be from {sender}. Check the original document to confirm.`
- PL template: `Nadawcą wydaje się być {sender}. Sprawdź oryginalny dokument, aby to potwierdzić.`
- Example 1
  - EN: This appears to be from Thames Water. Check the original document to confirm.
  - PL: Nadawcą wydaje się być Thames Water. Sprawdź oryginalny dokument, aby to potwierdzić.
- Example 2
  - EN: This appears to be from British Gas. Check the original document to confirm.
  - PL: Nadawcą wydaje się być British Gas. Sprawdź oryginalny dokument, aby to potwierdzić.

### 28. `tpl.readable.mip_deadline`

- EN template: `This may include a deadline about {topic}. Check the original before acting.`
- PL template: `To może zawierać termin dotyczący tematu: {topic}. Sprawdź oryginał, zanim podejmiesz działanie.`
- Example 1
  - EN: This may include a deadline about housing or rent. Check the original before acting.
  - PL: To może zawierać termin dotyczący tematu: housing or rent. Sprawdź oryginał, zanim podejmiesz działanie.
- Example 2
  - EN: This may include a deadline about tax or HMRC. Check the original before acting.
  - PL: To może zawierać termin dotyczący tematu: tax or HMRC. Sprawdź oryginał, zanim podejmiesz działanie.

### 29. `tpl.readable.mip_response`

- EN template: `This may ask for a response about {topic}. Check the original document.`
- PL template: `To może prosić o odpowiedź w sprawie: {topic}. Sprawdź oryginalny dokument.`
- Example 1
  - EN: This may ask for a response about housing or rent. Check the original document.
  - PL: To może prosić o odpowiedź w sprawie: housing or rent. Sprawdź oryginalny dokument.
- Example 2
  - EN: This may ask for a response about tax or HMRC. Check the original document.
  - PL: To może prosić o odpowiedź w sprawie: tax or HMRC. Sprawdź oryginalny dokument.

### 30. `tpl.readable.mip_topic`

- EN template: `The clearest topic appears to be {topic}. Check the original for details.`
- PL template: `Najwyraźniejszy temat to: {topic}. Sprawdź szczegóły w oryginale.`
- Example 1
  - EN: The clearest topic appears to be housing or rent. Check the original for details.
  - PL: Najwyraźniejszy temat to: housing or rent. Sprawdź szczegóły w oryginale.
- Example 2
  - EN: The clearest topic appears to be tax or HMRC. Check the original for details.
  - PL: Najwyraźniejszy temat to: tax or HMRC. Sprawdź szczegóły w oryginale.

### 31. `tpl.date.letter_dated`

- EN template: `No clear due date was found. The letter is dated {header_date}.`
- PL template: `Nie znaleziono wyraźnego terminu. List nosi datę {header_date}.`
- Example 1
  - EN: No clear due date was found. The letter is dated 18 June 2026.
  - PL: Nie znaleziono wyraźnego terminu. List nosi datę 18 June 2026.
- Example 2
  - EN: No clear due date was found. The letter is dated 29 July 2026.
  - PL: Nie znaleziono wyraźnego terminu. List nosi datę 29 July 2026.

### 32. `tpl.date.important_dates`

- EN template: `These may be important dates: {dates}. Check what they refer to.`
- PL template: `To mogą być ważne daty: {dates}. Sprawdź, czego dotyczą.`
- Example 1
  - EN: These may be important dates: 12 May 2026, 30 May 2026. Check what they refer to.
  - PL: To mogą być ważne daty: 12 May 2026, 30 May 2026. Sprawdź, czego dotyczą.
- Example 2
  - EN: These may be important dates: 1 July 2026, 15 July 2026. Check what they refer to.
  - PL: To mogą być ważne daty: 1 July 2026, 15 July 2026. Sprawdź, czego dotyczą.

### 33. `tpl.date.dates_appear`

- EN template: `These dates appear in the document: {dates}. Check what they refer to.`
- PL template: `W dokumencie pojawiają się te daty: {dates}. Sprawdź, czego dotyczą.`
- Example 1
  - EN: These dates appear in the document: 12 May 2026, 30 May 2026. Check what they refer to.
  - PL: W dokumencie pojawiają się te daty: 12 May 2026, 30 May 2026. Sprawdź, czego dotyczą.
- Example 2
  - EN: These dates appear in the document: 1 July 2026, 15 July 2026. Check what they refer to.
  - PL: W dokumencie pojawiają się te daty: 1 July 2026, 15 July 2026. Sprawdź, czego dotyczą.

### 34. `tpl.date.no_due_dates_appear`

- EN template: `No clear due date. These dates appear in the document: {dates}. Check what they refer to.`
- PL template: `Brak wyraźnego terminu. W dokumencie pojawiają się te daty: {dates}. Sprawdź, czego dotyczą.`
- Example 1
  - EN: No clear due date. These dates appear in the document: 12 May 2026, 30 May 2026. Check what they refer to.
  - PL: Brak wyraźnego terminu. W dokumencie pojawiają się te daty: 12 May 2026, 30 May 2026. Sprawdź, czego dotyczą.
- Example 2
  - EN: No clear due date. These dates appear in the document: 1 July 2026, 15 July 2026. Check what they refer to.
  - PL: Brak wyraźnego terminu. W dokumencie pojawiają się te daty: 1 July 2026, 15 July 2026. Sprawdź, czego dotyczą.

### 35. `tpl.check.sender`

- EN template: `Check the sender: {sender}.`
- PL template: `Sprawdź nadawcę: {sender}.`
- Example 1
  - EN: Check the sender: Thames Water.
  - PL: Sprawdź nadawcę: Thames Water.
- Example 2
  - EN: Check the sender: British Gas.
  - PL: Sprawdź nadawcę: British Gas.

### 36. `tpl.check.topic`

- EN template: `Check the topic: {topic}.`
- PL template: `Sprawdź temat: {topic}.`
- Example 1
  - EN: Check the topic: housing or rent.
  - PL: Sprawdź temat: housing or rent.
- Example 2
  - EN: Check the topic: tax or HMRC.
  - PL: Sprawdź temat: tax or HMRC.

### 37. `tpl.check.dates`

- EN template: `Check these visible dates: {dates}.`
- PL template: `Sprawdź te widoczne daty: {dates}.`
- Example 1
  - EN: Check these visible dates: 12 May 2026, 30 May 2026.
  - PL: Sprawdź te widoczne daty: 12 May 2026, 30 May 2026.
- Example 2
  - EN: Check these visible dates: 1 July 2026, 15 July 2026.
  - PL: Sprawdź te widoczne daty: 1 July 2026, 15 July 2026.

### 38. `tpl.check.date_on_original`

- EN template: `Check this date on the original document: {date}.`
- PL template: `Sprawdź tę datę w oryginalnym dokumencie: {date}.`
- Example 1
  - EN: Check this date on the original document: 24 June 2026.
  - PL: Sprawdź tę datę w oryginalnym dokumencie: 24 June 2026.
- Example 2
  - EN: Check this date on the original document: 3 August 2026.
  - PL: Sprawdź tę datę w oryginalnym dokumencie: 3 August 2026.

### 39. `tpl.check.amount_and_date`

- EN template: `Check the amount ({amount}) and the date ({date}) on the original document.`
- PL template: `Sprawdź kwotę ({amount}) i datę ({date}) w oryginalnym dokumencie.`
- Example 1
  - EN: Check the amount (£187.42) and the date (24 June 2026) on the original document.
  - PL: Sprawdź kwotę (£187.42) i datę (24 June 2026) w oryginalnym dokumencie.
- Example 2
  - EN: Check the amount (£56.10) and the date (3 August 2026) on the original document.
  - PL: Sprawdź kwotę (£56.10) i datę (3 August 2026) w oryginalnym dokumencie.

### 40. `tpl.check.amount_any_dates`

- EN template: `Check the amount ({amount}) and any dates on the original document.`
- PL template: `Sprawdź kwotę ({amount}) i wszystkie daty w oryginalnym dokumencie.`
- Example 1
  - EN: Check the amount (£187.42) and any dates on the original document.
  - PL: Sprawdź kwotę (£187.42) i wszystkie daty w oryginalnym dokumencie.
- Example 2
  - EN: Check the amount (£56.10) and any dates on the original document.
  - PL: Sprawdź kwotę (£56.10) i wszystkie daty w oryginalnym dokumencie.

### 41. `tpl.check.date_any_amounts`

- EN template: `Check the date ({date}) and any amounts on the original document.`
- PL template: `Sprawdź datę ({date}) i wszystkie kwoty w oryginalnym dokumencie.`
- Example 1
  - EN: Check the date (24 June 2026) and any amounts on the original document.
  - PL: Sprawdź datę (24 June 2026) i wszystkie kwoty w oryginalnym dokumencie.
- Example 2
  - EN: Check the date (3 August 2026) and any amounts on the original document.
  - PL: Sprawdź datę (3 August 2026) i wszystkie kwoty w oryginalnym dokumencie.

### 42. `tpl.check.kp_date`

- EN template: `Date: {date}.`
- PL template: `Data: {date}.`
- Example 1
  - EN: Date: 24 June 2026.
  - PL: Data: 24 June 2026.
- Example 2
  - EN: Date: 3 August 2026.
  - PL: Data: 3 August 2026.

### 43. `tpl.check.kp_amount`

- EN template: `Amount shown: {amount}.`
- PL template: `Widoczna kwota: {amount}.`
- Example 1
  - EN: Amount shown: £187.42.
  - PL: Widoczna kwota: £187.42.
- Example 2
  - EN: Amount shown: £56.10.
  - PL: Widoczna kwota: £56.10.

### 44. `tpl.consequence.avoid`

- EN template: `The document says {consequence} if a payment is not made. Check the original document.`
- PL template: `Dokument informuje, że jeśli płatność nie zostanie dokonana, może nastąpić: {consequence}. Sprawdź oryginalny dokument.`
- Example 1
  - EN: The document says further recovery action if a payment is not made. Check the original document.
  - PL: Dokument informuje, że jeśli płatność nie zostanie dokonana, może nastąpić: further recovery action. Sprawdź oryginalny dokument.
- Example 2
  - EN: The document says a late payment fee if a payment is not made. Check the original document.
  - PL: Dokument informuje, że jeśli płatność nie zostanie dokonana, może nastąpić: a late payment fee. Sprawdź oryginalny dokument.

### 45. `tpl.consequence.reported`

- EN template: `The document states that {sentence_body}.`
- PL template: `W dokumencie napisano: {sentence_body}.`
- Example 1
  - EN: The document states that the balance may be passed to a collection agency.
  - PL: W dokumencie napisano: the balance may be passed to a collection agency.
- Example 2
  - EN: The document states that your service may be interrupted.
  - PL: W dokumencie napisano: your service may be interrupted.

### 46. `tpl.consequence.may_follow`

- EN template: `{consequence_clause} may follow`
- PL template: `może nastąpić {consequence_clause}`
- Example 1
  - EN: further action may follow
  - PL: może nastąpić further action
- Example 2
  - EN: a penalty may follow
  - PL: może nastąpić a penalty

### 47. `tpl.action.check_wrap`

- EN template: `Check {action_sentence}`
- PL template: `Sprawdź {action_sentence}`
- Example 1
  - EN: Check the payment amount and due date.
  - PL: Sprawdź the payment amount and due date.
- Example 2
  - EN: Check the reference number on your council tax bill.
  - PL: Sprawdź the reference number on your council tax bill.

### 48. `tpl.composite.read_aloud`

- EN template: `{title}. {explanation}. {key_points}`
- PL template: `{title}. {explanation}. {key_points}`
- Example 1
  - EN: What is this?. It can be read clearly, so we can pull out the key points. Date: 24 June 2026.
  - PL: What is this?. It can be read clearly, so we can pull out the key points. Date: 24 June 2026.
- Example 2
  - EN: When is it due?. The letter shows one clear date. Amount shown: £56.10.
  - PL: When is it due?. The letter shows one clear date. Amount shown: £56.10.

### 49. `tpl.composite.display_text`

- EN template: `{title} {short_answer}`
- PL template: `{title} {short_answer}`
- Example 1
  - EN: What is this? This looks like a formal document.
  - PL: What is this? This looks like a formal document.
- Example 2
  - EN: When is it due? Due by 3 August 2026.
  - PL: When is it due? Due by 3 August 2026.

### 50. `tpl.composite.tts`

- EN template: `{title}. {short_answer}`
- PL template: `{title}. {short_answer}`
- Example 1
  - EN: What is this?. This looks like a formal document.
  - PL: What is this?. This looks like a formal document.
- Example 2
  - EN: When is it due?. Due by 3 August 2026.
  - PL: When is it due?. Due by 3 August 2026.

### 51. `tpl.api.unknown_analytics_fields`

- EN template: `Unknown analytics fields: {field_list}`
- PL template: `Nieznane pola analityczne: {field_list}`
- Example 1
  - EN: Unknown analytics fields: page_view, card_seen
  - PL: Nieznane pola analityczne: page_view, card_seen
- Example 2
  - EN: Unknown analytics fields: session_id, mood
  - PL: Nieznane pola analityczne: session_id, mood
