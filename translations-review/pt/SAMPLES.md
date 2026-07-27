# Portuguese (pt) pattern samples

DRAFT PENDING HUMAN REVIEW. All 51 slot templates from
`public/i18n/templates-pt.js`, each with the English source, the Portuguese
draft, and two example sentences filled with plausible UK values.

Slot values stay verbatim in the Portuguese sentences, exactly as the app
inserts them. For label slots such as `{type_label}`, `{category_label}` and
`{topic}`, the live app fills the slot from the translated sentence bank, so
users will see Portuguese labels. These samples keep the inserted values
identical in both sentences to show the verbatim slot rule.

## tpl.deadline.appointment

- EN: `Your appointment is on {date}.`
- PT: `A sua marcação está agendada para {date}.`
- Example 1
  - EN: Your appointment is on 24 June 2026.
  - PT: A sua marcação está agendada para 24 June 2026.
- Example 2
  - EN: Your appointment is on 3 August 2026.
  - PT: A sua marcação está agendada para 3 August 2026.

## tpl.deadline.due

- EN: `Due by {date}.`
- PT: `Prazo até {date}.`
- Example 1
  - EN: Due by 24 June 2026.
  - PT: Prazo até 24 June 2026.
- Example 2
  - EN: Due by 15 July 2026.
  - PT: Prazo até 15 July 2026.

## tpl.summary.bill_full

- EN: `{sender} appears to be asking you to pay {amount} by {date}.`
- PT: `{sender} parece estar a pedir o pagamento de {amount} até {date}.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42 by 24 June 2026.
  - PT: Thames Water parece estar a pedir o pagamento de £187.42 até 24 June 2026.
- Example 2
  - EN: British Gas appears to be asking you to pay £64.20 by 15 July 2026.
  - PT: British Gas parece estar a pedir o pagamento de £64.20 até 15 July 2026.

## tpl.summary.bill_amount_date

- EN: `This appears to be a payment request for {amount}, due by {date}.`
- PT: `Isto parece ser um pedido de pagamento de {amount}, com prazo até {date}.`
- Example 1
  - EN: This appears to be a payment request for £187.42, due by 24 June 2026.
  - PT: Isto parece ser um pedido de pagamento de £187.42, com prazo até 24 June 2026.
- Example 2
  - EN: This appears to be a payment request for £312.75, due by 3 August 2026.
  - PT: Isto parece ser um pedido de pagamento de £312.75, com prazo até 3 August 2026.

## tpl.summary.bill_sender_amount

- EN: `{sender} appears to be asking you to pay {amount}.`
- PT: `{sender} parece estar a pedir o pagamento de {amount}.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42.
  - PT: Thames Water parece estar a pedir o pagamento de £187.42.
- Example 2
  - EN: Manchester City Council appears to be asking you to pay £1,250.00.
  - PT: Manchester City Council parece estar a pedir o pagamento de £1,250.00.

## tpl.summary.bill_sender_date

- EN: `This appears to be a bill from {sender}, dated {date}.`
- PT: `Isto parece ser uma fatura de {sender}, com data de {date}.`
- Example 1
  - EN: This appears to be a bill from Thames Water, dated 24 June 2026.
  - PT: Isto parece ser uma fatura de Thames Water, com data de 24 June 2026.
- Example 2
  - EN: This appears to be a bill from British Gas, dated 15 July 2026.
  - PT: Isto parece ser uma fatura de British Gas, com data de 15 July 2026.

## tpl.summary.bill_amount

- EN: `This appears to be a payment request for {amount}.`
- PT: `Isto parece ser um pedido de pagamento de {amount}.`
- Example 1
  - EN: This appears to be a payment request for £187.42.
  - PT: Isto parece ser um pedido de pagamento de £187.42.
- Example 2
  - EN: This appears to be a payment request for £64.20.
  - PT: Isto parece ser um pedido de pagamento de £64.20.

## tpl.summary.bill_sender

- EN: `This appears to be a bill from {sender}.`
- PT: `Isto parece ser uma fatura de {sender}.`
- Example 1
  - EN: This appears to be a bill from Thames Water.
  - PT: Isto parece ser uma fatura de Thames Water.
- Example 2
  - EN: This appears to be a bill from British Gas.
  - PT: Isto parece ser uma fatura de British Gas.

## tpl.summary.bill_in_credit_sender

- EN: `This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
- PT: `Isto parece ser uma fatura de {sender}. A conta parece estar com saldo a favor, por isso pode não haver nada a pagar. Verifique o documento original para ter a certeza.`
- Example 1
  - EN: This appears to be a bill from Thames Water. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - PT: Isto parece ser uma fatura de Thames Water. A conta parece estar com saldo a favor, por isso pode não haver nada a pagar. Verifique o documento original para ter a certeza.
- Example 2
  - EN: This appears to be a bill from British Gas. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - PT: Isto parece ser uma fatura de British Gas. A conta parece estar com saldo a favor, por isso pode não haver nada a pagar. Verifique o documento original para ter a certeza.

## tpl.summary.gov_sender_amount

- EN: `{sender} appears to have sent an official notice mentioning {amount}.`
- PT: `{sender} parece ter enviado um aviso oficial que menciona {amount}.`
- Example 1
  - EN: HMRC appears to have sent an official notice mentioning £187.42.
  - PT: HMRC parece ter enviado um aviso oficial que menciona £187.42.
- Example 2
  - EN: Manchester City Council appears to have sent an official notice mentioning £1,250.00.
  - PT: Manchester City Council parece ter enviado um aviso oficial que menciona £1,250.00.

## tpl.summary.gov_sender

- EN: `This appears to be an official notice from {sender}.`
- PT: `Isto parece ser um aviso oficial de {sender}.`
- Example 1
  - EN: This appears to be an official notice from HMRC.
  - PT: Isto parece ser um aviso oficial de HMRC.
- Example 2
  - EN: This appears to be an official notice from Manchester City Council.
  - PT: Isto parece ser um aviso oficial de Manchester City Council.

## tpl.summary.gov_amount

- EN: `This appears to be an official notice mentioning {amount}.`
- PT: `Isto parece ser um aviso oficial que menciona {amount}.`
- Example 1
  - EN: This appears to be an official notice mentioning £187.42.
  - PT: Isto parece ser um aviso oficial que menciona £187.42.
- Example 2
  - EN: This appears to be an official notice mentioning £312.75.
  - PT: Isto parece ser um aviso oficial que menciona £312.75.

## tpl.summary.appt_sender_date

- EN: `This appears to be an appointment from {sender} on {date}.`
- PT: `Isto parece ser uma marcação de {sender} para {date}.`
- Example 1
  - EN: This appears to be an appointment from St Mary's Hospital on 24 June 2026.
  - PT: Isto parece ser uma marcação de St Mary's Hospital para 24 June 2026.
- Example 2
  - EN: This appears to be an appointment from NHS Dental Services on 3 August 2026.
  - PT: Isto parece ser uma marcação de NHS Dental Services para 3 August 2026.

## tpl.summary.appt_sender

- EN: `This appears to be an appointment from {sender}.`
- PT: `Isto parece ser uma marcação de {sender}.`
- Example 1
  - EN: This appears to be an appointment from St Mary's Hospital.
  - PT: Isto parece ser uma marcação de St Mary's Hospital.
- Example 2
  - EN: This appears to be an appointment from NHS Dental Services.
  - PT: Isto parece ser uma marcação de NHS Dental Services.

## tpl.summary.appt_date

- EN: `This appears to be an appointment on {date}.`
- PT: `Isto parece ser uma marcação para {date}.`
- Example 1
  - EN: This appears to be an appointment on 24 June 2026.
  - PT: Isto parece ser uma marcação para 24 June 2026.
- Example 2
  - EN: This appears to be an appointment on 3 August 2026.
  - PT: Isto parece ser uma marcação para 3 August 2026.

## tpl.summary.generic_full

- EN: `This appears to be from {sender}, mentioning {amount} and a date of {date}.`
- PT: `Isto parece ser de {sender}, mencionando {amount} e a data {date}.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42 and a date of 24 June 2026.
  - PT: Isto parece ser de Thames Water, mencionando £187.42 e a data 24 June 2026.
- Example 2
  - EN: This appears to be from Barclays, mentioning £312.75 and a date of 15 July 2026.
  - PT: Isto parece ser de Barclays, mencionando £312.75 e a data 15 July 2026.

## tpl.summary.generic_amount_date

- EN: `This document appears to mention {amount} and a date of {date}.`
- PT: `Este documento parece mencionar {amount} e a data {date}.`
- Example 1
  - EN: This document appears to mention £187.42 and a date of 24 June 2026.
  - PT: Este documento parece mencionar £187.42 e a data 24 June 2026.
- Example 2
  - EN: This document appears to mention £64.20 and a date of 3 August 2026.
  - PT: Este documento parece mencionar £64.20 e a data 3 August 2026.

## tpl.summary.generic_sender_amount

- EN: `This appears to be from {sender}, mentioning {amount}.`
- PT: `Isto parece ser de {sender}, mencionando {amount}.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42.
  - PT: Isto parece ser de Thames Water, mencionando £187.42.
- Example 2
  - EN: This appears to be from Barclays, mentioning £1,250.00.
  - PT: Isto parece ser de Barclays, mencionando £1,250.00.

## tpl.summary.generic_sender_date

- EN: `This appears to be from {sender}, with a date of {date}.`
- PT: `Isto parece ser de {sender}, com data de {date}.`
- Example 1
  - EN: This appears to be from Thames Water, with a date of 24 June 2026.
  - PT: Isto parece ser de Thames Water, com data de 24 June 2026.
- Example 2
  - EN: This appears to be from HMRC, with a date of 15 July 2026.
  - PT: Isto parece ser de HMRC, com data de 15 July 2026.

## tpl.summary.generic_sender

- EN: `This appears to be from {sender}.`
- PT: `Isto parece ser de {sender}.`
- Example 1
  - EN: This appears to be from Thames Water.
  - PT: Isto parece ser de Thames Water.
- Example 2
  - EN: This appears to be from HMRC.
  - PT: Isto parece ser de HMRC.

## tpl.summary.garbled_sender

- EN: `{sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- PT: `{sender} parece ter enviado {category_label}. A qualidade do texto é demasiado baixa para ler valores ou datas com fiabilidade. Verifique estes detalhes no documento original.`
- Example 1
  - EN: Thames Water appears to have sent a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - PT: Thames Water parece ter enviado a bill or payment request. A qualidade do texto é demasiado baixa para ler valores ou datas com fiabilidade. Verifique estes detalhes no documento original.
- Example 2
  - EN: HMRC appears to have sent an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - PT: HMRC parece ter enviado an official notice. A qualidade do texto é demasiado baixa para ler valores ou datas com fiabilidade. Verifique estes detalhes no documento original.

## tpl.summary.garbled

- EN: `This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- PT: `Isto parece ser {category_label}. A qualidade do texto é demasiado baixa para ler valores ou datas com fiabilidade. Verifique estes detalhes no documento original.`
- Example 1
  - EN: This appears to be a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - PT: Isto parece ser a bill or payment request. A qualidade do texto é demasiado baixa para ler valores ou datas com fiabilidade. Verifique estes detalhes no documento original.
- Example 2
  - EN: This appears to be an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - PT: Isto parece ser an official notice. A qualidade do texto é demasiado baixa para ler valores ou datas com fiabilidade. Verifique estes detalhes no documento original.

## tpl.readable.summary_sender

- EN: `This appears to be {type_label} from {sender}.`
- PT: `Isto parece ser {type_label} de {sender}.`
- Example 1
  - EN: This appears to be an official letter from HMRC.
  - PT: Isto parece ser an official letter de HMRC.
- Example 2
  - EN: This appears to be a housing letter from Manchester City Council.
  - PT: Isto parece ser a housing letter de Manchester City Council.

## tpl.readable.summary

- EN: `This appears to be {type_label}.`
- PT: `Isto parece ser {type_label}.`
- Example 1
  - EN: This appears to be an official letter.
  - PT: Isto parece ser an official letter.
- Example 2
  - EN: This appears to be a housing letter.
  - PT: Isto parece ser a housing letter.

## tpl.readable.summary_topic

- EN: `This appears to be {type_label} about {topic}.`
- PT: `Isto parece ser {type_label} sobre {topic}.`
- Example 1
  - EN: This appears to be an official letter about tax or HMRC.
  - PT: Isto parece ser an official letter sobre tax or HMRC.
- Example 2
  - EN: This appears to be a housing letter about housing or rent.
  - PT: Isto parece ser a housing letter sobre housing or rent.

## tpl.benefits.summary_sender

- EN: `This appears to be a benefits letter from {sender}.`
- PT: `Isto parece ser uma carta de benefícios de {sender}.`
- Example 1
  - EN: This appears to be a benefits letter from the Department for Work and Pensions.
  - PT: Isto parece ser uma carta de benefícios de the Department for Work and Pensions.
- Example 2
  - EN: This appears to be a benefits letter from Manchester City Council.
  - PT: Isto parece ser uma carta de benefícios de Manchester City Council.

## tpl.readable.sender_card

- EN: `This appears to be from {sender}. Check the original document to confirm.`
- PT: `Isto parece ser de {sender}. Confirme no documento original.`
- Example 1
  - EN: This appears to be from Thames Water. Check the original document to confirm.
  - PT: Isto parece ser de Thames Water. Confirme no documento original.
- Example 2
  - EN: This appears to be from HMRC. Check the original document to confirm.
  - PT: Isto parece ser de HMRC. Confirme no documento original.

## tpl.readable.mip_deadline

- EN: `This may include a deadline about {topic}. Check the original before acting.`
- PT: `Isto pode incluir um prazo sobre {topic}. Verifique o original antes de agir.`
- Example 1
  - EN: This may include a deadline about tax or HMRC. Check the original before acting.
  - PT: Isto pode incluir um prazo sobre tax or HMRC. Verifique o original antes de agir.
- Example 2
  - EN: This may include a deadline about housing or rent. Check the original before acting.
  - PT: Isto pode incluir um prazo sobre housing or rent. Verifique o original antes de agir.

## tpl.readable.mip_response

- EN: `This may ask for a response about {topic}. Check the original document.`
- PT: `Isto pode pedir uma resposta sobre {topic}. Verifique o documento original.`
- Example 1
  - EN: This may ask for a response about benefits support. Check the original document.
  - PT: Isto pode pedir uma resposta sobre benefits support. Verifique o documento original.
- Example 2
  - EN: This may ask for a response about work or employment. Check the original document.
  - PT: Isto pode pedir uma resposta sobre work or employment. Verifique o documento original.

## tpl.readable.mip_topic

- EN: `The clearest topic appears to be {topic}. Check the original for details.`
- PT: `O tema mais claro parece ser {topic}. Verifique os detalhes no original.`
- Example 1
  - EN: The clearest topic appears to be insurance. Check the original for details.
  - PT: O tema mais claro parece ser insurance. Verifique os detalhes no original.
- Example 2
  - EN: The clearest topic appears to be school or education. Check the original for details.
  - PT: O tema mais claro parece ser school or education. Verifique os detalhes no original.

## tpl.date.letter_dated

- EN: `No clear due date was found. The letter is dated {header_date}.`
- PT: `Não foi encontrada uma data limite clara. A carta tem data de {header_date}.`
- Example 1
  - EN: No clear due date was found. The letter is dated 12 June 2026.
  - PT: Não foi encontrada uma data limite clara. A carta tem data de 12 June 2026.
- Example 2
  - EN: No clear due date was found. The letter is dated 1 September 2026.
  - PT: Não foi encontrada uma data limite clara. A carta tem data de 1 September 2026.

## tpl.date.important_dates

- EN: `These may be important dates: {dates}. Check what they refer to.`
- PT: `Estas datas podem ser importantes: {dates}. Verifique a que se referem.`
- Example 1
  - EN: These may be important dates: 24 June 2026, 3 August 2026. Check what they refer to.
  - PT: Estas datas podem ser importantes: 24 June 2026, 3 August 2026. Verifique a que se referem.
- Example 2
  - EN: These may be important dates: 15 July 2026. Check what they refer to.
  - PT: Estas datas podem ser importantes: 15 July 2026. Verifique a que se referem.

## tpl.date.dates_appear

- EN: `These dates appear in the document: {dates}. Check what they refer to.`
- PT: `Estas datas aparecem no documento: {dates}. Verifique a que se referem.`
- Example 1
  - EN: These dates appear in the document: 24 June 2026, 3 August 2026. Check what they refer to.
  - PT: Estas datas aparecem no documento: 24 June 2026, 3 August 2026. Verifique a que se referem.
- Example 2
  - EN: These dates appear in the document: 15 July 2026, 1 September 2026. Check what they refer to.
  - PT: Estas datas aparecem no documento: 15 July 2026, 1 September 2026. Verifique a que se referem.

## tpl.date.no_due_dates_appear

- EN: `No clear due date. These dates appear in the document: {dates}. Check what they refer to.`
- PT: `Sem data limite clara. Estas datas aparecem no documento: {dates}. Verifique a que se referem.`
- Example 1
  - EN: No clear due date. These dates appear in the document: 24 June 2026, 3 August 2026. Check what they refer to.
  - PT: Sem data limite clara. Estas datas aparecem no documento: 24 June 2026, 3 August 2026. Verifique a que se referem.
- Example 2
  - EN: No clear due date. These dates appear in the document: 15 July 2026. Check what they refer to.
  - PT: Sem data limite clara. Estas datas aparecem no documento: 15 July 2026. Verifique a que se referem.

## tpl.check.sender

- EN: `Check the sender: {sender}.`
- PT: `Verifique o remetente: {sender}.`
- Example 1
  - EN: Check the sender: Thames Water.
  - PT: Verifique o remetente: Thames Water.
- Example 2
  - EN: Check the sender: HMRC.
  - PT: Verifique o remetente: HMRC.

## tpl.check.topic

- EN: `Check the topic: {topic}.`
- PT: `Verifique o tema: {topic}.`
- Example 1
  - EN: Check the topic: housing or rent.
  - PT: Verifique o tema: housing or rent.
- Example 2
  - EN: Check the topic: tax or HMRC.
  - PT: Verifique o tema: tax or HMRC.

## tpl.check.dates

- EN: `Check these visible dates: {dates}.`
- PT: `Verifique estas datas visíveis: {dates}.`
- Example 1
  - EN: Check these visible dates: 24 June 2026, 3 August 2026.
  - PT: Verifique estas datas visíveis: 24 June 2026, 3 August 2026.
- Example 2
  - EN: Check these visible dates: 15 July 2026.
  - PT: Verifique estas datas visíveis: 15 July 2026.

## tpl.check.date_on_original

- EN: `Check this date on the original document: {date}.`
- PT: `Verifique esta data no documento original: {date}.`
- Example 1
  - EN: Check this date on the original document: 24 June 2026.
  - PT: Verifique esta data no documento original: 24 June 2026.
- Example 2
  - EN: Check this date on the original document: 3 August 2026.
  - PT: Verifique esta data no documento original: 3 August 2026.

## tpl.check.amount_and_date

- EN: `Check the amount ({amount}) and the date ({date}) on the original document.`
- PT: `Verifique o valor ({amount}) e a data ({date}) no documento original.`
- Example 1
  - EN: Check the amount (£187.42) and the date (24 June 2026) on the original document.
  - PT: Verifique o valor (£187.42) e a data (24 June 2026) no documento original.
- Example 2
  - EN: Check the amount (£64.20) and the date (15 July 2026) on the original document.
  - PT: Verifique o valor (£64.20) e a data (15 July 2026) no documento original.

## tpl.check.amount_any_dates

- EN: `Check the amount ({amount}) and any dates on the original document.`
- PT: `Verifique o valor ({amount}) e quaisquer datas no documento original.`
- Example 1
  - EN: Check the amount (£187.42) and any dates on the original document.
  - PT: Verifique o valor (£187.42) e quaisquer datas no documento original.
- Example 2
  - EN: Check the amount (£1,250.00) and any dates on the original document.
  - PT: Verifique o valor (£1,250.00) e quaisquer datas no documento original.

## tpl.check.date_any_amounts

- EN: `Check the date ({date}) and any amounts on the original document.`
- PT: `Verifique a data ({date}) e quaisquer valores no documento original.`
- Example 1
  - EN: Check the date (24 June 2026) and any amounts on the original document.
  - PT: Verifique a data (24 June 2026) e quaisquer valores no documento original.
- Example 2
  - EN: Check the date (3 August 2026) and any amounts on the original document.
  - PT: Verifique a data (3 August 2026) e quaisquer valores no documento original.

## tpl.check.kp_date

- EN: `Date: {date}.`
- PT: `Data: {date}.`
- Example 1
  - EN: Date: 24 June 2026.
  - PT: Data: 24 June 2026.
- Example 2
  - EN: Date: 15 July 2026.
  - PT: Data: 15 July 2026.

## tpl.check.kp_amount

- EN: `Amount shown: {amount}.`
- PT: `Valor indicado: {amount}.`
- Example 1
  - EN: Amount shown: £187.42.
  - PT: Valor indicado: £187.42.
- Example 2
  - EN: Amount shown: £64.20.
  - PT: Valor indicado: £64.20.

## tpl.consequence.avoid

- EN: `The document says {consequence} if a payment is not made. Check the original document.`
- PT: `O documento indica {consequence} se um pagamento não for feito. Verifique o documento original.`
- Example 1
  - EN: The document says a late fee may be added if a payment is not made. Check the original document.
  - PT: O documento indica a late fee may be added se um pagamento não for feito. Verifique o documento original.
- Example 2
  - EN: The document says the service may be restricted if a payment is not made. Check the original document.
  - PT: O documento indica the service may be restricted se um pagamento não for feito. Verifique o documento original.

## tpl.consequence.reported

- EN: `The document states that {sentence_body}.`
- PT: `O documento indica que {sentence_body}.`
- Example 1
  - EN: The document states that your supply may be affected if no payment is received.
  - PT: O documento indica que your supply may be affected if no payment is received.
- Example 2
  - EN: The document states that a reminder will be sent after 15 July 2026.
  - PT: O documento indica que a reminder will be sent after 15 July 2026.

## tpl.consequence.may_follow

- EN: `{consequence_clause} may follow`
- PT: `pode seguir-se {consequence_clause}`
- Note: the slot moves after the verb so the Portuguese reads naturally. The slot text itself stays verbatim.
- Example 1
  - EN: further action may follow
  - PT: pode seguir-se further action
- Example 2
  - EN: a late payment charge may follow
  - PT: pode seguir-se a late payment charge

## tpl.action.check_wrap

- EN: `Check {action_sentence}`
- PT: `Verifique {action_sentence}`
- Example 1
  - EN: Check the payment amount and due date on the original document.
  - PT: Verifique the payment amount and due date on the original document.
- Example 2
  - EN: Check whether a response is needed by 15 July 2026.
  - PT: Verifique whether a response is needed by 15 July 2026.

## tpl.composite.read_aloud

- EN: `{title}. {explanation}. {key_points}`
- PT: `{title}. {explanation}. {key_points}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this?. This looks like a formal document.. Amount shown: £187.42.
  - PT: What is this?. This looks like a formal document.. Amount shown: £187.42.
- Example 2
  - EN: When is it due?. Use this date before making a reminder.. Date: 24 June 2026.
  - PT: When is it due?. Use this date before making a reminder.. Date: 24 June 2026.

## tpl.composite.display_text

- EN: `{title} {short_answer}`
- PT: `{title} {short_answer}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this? This looks like a formal document.
  - PT: What is this? This looks like a formal document.
- Example 2
  - EN: Who sent it? This appears to be from Thames Water.
  - PT: Who sent it? This appears to be from Thames Water.

## tpl.composite.tts

- EN: `{title}. {short_answer}`
- PT: `{title}. {short_answer}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this?. This looks like a formal document.
  - PT: What is this?. This looks like a formal document.
- Example 2
  - EN: Who sent it?. This appears to be from Thames Water.
  - PT: Who sent it?. This appears to be from Thames Water.

## tpl.api.unknown_analytics_fields

- EN: `Unknown analytics fields: {field_list}`
- PT: `Campos de análise desconhecidos: {field_list}`
- Example 1
  - EN: Unknown analytics fields: device_id, screen_name
  - PT: Campos de análise desconhecidos: device_id, screen_name
- Example 2
  - EN: Unknown analytics fields: session_length
  - PT: Campos de análise desconhecidos: session_length
