# Spanish (es) pattern samples

DRAFT PENDING HUMAN REVIEW. All 51 slot templates from
`public/i18n/templates-es.js`, each with the English source, the Spanish
draft, and two example sentences filled with plausible UK values.

Slot values stay verbatim in the Spanish sentences, exactly as the app
inserts them. For label slots such as `{type_label}`, `{category_label}` and
`{topic}`, the live app fills the slot from the translated sentence bank, so
users will see Spanish labels. These samples keep the inserted values
identical in both sentences to show the verbatim slot rule.

## tpl.deadline.appointment

- EN: `Your appointment is on {date}.`
- ES: `Su cita es el {date}.`
- Example 1
  - EN: Your appointment is on 24 June 2026.
  - ES: Su cita es el 24 June 2026.
- Example 2
  - EN: Your appointment is on 15 July 2026.
  - ES: Su cita es el 15 July 2026.

## tpl.deadline.due

- EN: `Due by {date}.`
- ES: `Plazo hasta el {date}.`
- Example 1
  - EN: Due by 24 June 2026.
  - ES: Plazo hasta el 24 June 2026.
- Example 2
  - EN: Due by 15 July 2026.
  - ES: Plazo hasta el 15 July 2026.

## tpl.summary.bill_full

- EN: `{sender} appears to be asking you to pay {amount} by {date}.`
- ES: `{sender} parece pedirle un pago de {amount} antes del {date}.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42 by 24 June 2026.
  - ES: Thames Water parece pedirle un pago de £187.42 antes del 24 June 2026.
- Example 2
  - EN: British Gas appears to be asking you to pay £64.20 by 15 July 2026.
  - ES: British Gas parece pedirle un pago de £64.20 antes del 15 July 2026.

## tpl.summary.bill_amount_date

- EN: `This appears to be a payment request for {amount}, due by {date}.`
- ES: `Esto parece una solicitud de pago de {amount}, con plazo hasta el {date}.`
- Example 1
  - EN: This appears to be a payment request for £187.42, due by 24 June 2026.
  - ES: Esto parece una solicitud de pago de £187.42, con plazo hasta el 24 June 2026.
- Example 2
  - EN: This appears to be a payment request for £64.20, due by 15 July 2026.
  - ES: Esto parece una solicitud de pago de £64.20, con plazo hasta el 15 July 2026.

## tpl.summary.bill_sender_amount

- EN: `{sender} appears to be asking you to pay {amount}.`
- ES: `{sender} parece pedirle un pago de {amount}.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42.
  - ES: Thames Water parece pedirle un pago de £187.42.
- Example 2
  - EN: British Gas appears to be asking you to pay £64.20.
  - ES: British Gas parece pedirle un pago de £64.20.

## tpl.summary.bill_sender_date

- EN: `This appears to be a bill from {sender}, dated {date}.`
- ES: `Esto parece una factura de {sender}, con fecha {date}.`
- Example 1
  - EN: This appears to be a bill from Thames Water, dated 24 June 2026.
  - ES: Esto parece una factura de Thames Water, con fecha 24 June 2026.
- Example 2
  - EN: This appears to be a bill from British Gas, dated 15 July 2026.
  - ES: Esto parece una factura de British Gas, con fecha 15 July 2026.

## tpl.summary.bill_amount

- EN: `This appears to be a payment request for {amount}.`
- ES: `Esto parece una solicitud de pago de {amount}.`
- Example 1
  - EN: This appears to be a payment request for £187.42.
  - ES: Esto parece una solicitud de pago de £187.42.
- Example 2
  - EN: This appears to be a payment request for £64.20.
  - ES: Esto parece una solicitud de pago de £64.20.

## tpl.summary.bill_sender

- EN: `This appears to be a bill from {sender}.`
- ES: `Esto parece una factura de {sender}.`
- Example 1
  - EN: This appears to be a bill from Thames Water.
  - ES: Esto parece una factura de Thames Water.
- Example 2
  - EN: This appears to be a bill from British Gas.
  - ES: Esto parece una factura de British Gas.

## tpl.summary.bill_in_credit_sender

- EN: `This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
- ES: `Esto parece una factura de {sender}. Parece que su cuenta puede estar a favor, así que quizá no haya nada que pagar. Revise el documento original para asegurarse.`
- Example 1
  - EN: This appears to be a bill from Thames Water. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - ES: Esto parece una factura de Thames Water. Parece que su cuenta puede estar a favor, así que quizá no haya nada que pagar. Revise el documento original para asegurarse.
- Example 2
  - EN: This appears to be a bill from British Gas. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - ES: Esto parece una factura de British Gas. Parece que su cuenta puede estar a favor, así que quizá no haya nada que pagar. Revise el documento original para asegurarse.

## tpl.summary.gov_sender_amount

- EN: `{sender} appears to have sent an official notice mentioning {amount}.`
- ES: `{sender} parece haber enviado un aviso oficial que menciona {amount}.`
- Example 1
  - EN: HMRC appears to have sent an official notice mentioning £187.42.
  - ES: HMRC parece haber enviado un aviso oficial que menciona £187.42.
- Example 2
  - EN: Manchester City Council appears to have sent an official notice mentioning £64.20.
  - ES: Manchester City Council parece haber enviado un aviso oficial que menciona £64.20.

## tpl.summary.gov_sender

- EN: `This appears to be an official notice from {sender}.`
- ES: `Esto parece un aviso oficial de {sender}.`
- Example 1
  - EN: This appears to be an official notice from HMRC.
  - ES: Esto parece un aviso oficial de HMRC.
- Example 2
  - EN: This appears to be an official notice from Manchester City Council.
  - ES: Esto parece un aviso oficial de Manchester City Council.

## tpl.summary.gov_amount

- EN: `This appears to be an official notice mentioning {amount}.`
- ES: `Esto parece un aviso oficial que menciona {amount}.`
- Example 1
  - EN: This appears to be an official notice mentioning £187.42.
  - ES: Esto parece un aviso oficial que menciona £187.42.
- Example 2
  - EN: This appears to be an official notice mentioning £64.20.
  - ES: Esto parece un aviso oficial que menciona £64.20.

## tpl.summary.appt_sender_date

- EN: `This appears to be an appointment from {sender} on {date}.`
- ES: `Esto parece una cita de {sender} el {date}.`
- Example 1
  - EN: This appears to be an appointment from Royal London Hospital on 24 June 2026.
  - ES: Esto parece una cita de Royal London Hospital el 24 June 2026.
- Example 2
  - EN: This appears to be an appointment from Sunrise Medical Centre on 15 July 2026.
  - ES: Esto parece una cita de Sunrise Medical Centre el 15 July 2026.

## tpl.summary.appt_sender

- EN: `This appears to be an appointment from {sender}.`
- ES: `Esto parece una cita de {sender}.`
- Example 1
  - EN: This appears to be an appointment from Royal London Hospital.
  - ES: Esto parece una cita de Royal London Hospital.
- Example 2
  - EN: This appears to be an appointment from Sunrise Medical Centre.
  - ES: Esto parece una cita de Sunrise Medical Centre.

## tpl.summary.appt_date

- EN: `This appears to be an appointment on {date}.`
- ES: `Esto parece una cita el {date}.`
- Example 1
  - EN: This appears to be an appointment on 24 June 2026.
  - ES: Esto parece una cita el 24 June 2026.
- Example 2
  - EN: This appears to be an appointment on 15 July 2026.
  - ES: Esto parece una cita el 15 July 2026.

## tpl.summary.generic_full

- EN: `This appears to be from {sender}, mentioning {amount} and a date of {date}.`
- ES: `Esto parece venir de {sender}, y menciona {amount} y una fecha, {date}.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42 and a date of 24 June 2026.
  - ES: Esto parece venir de Thames Water, y menciona £187.42 y una fecha, 24 June 2026.
- Example 2
  - EN: This appears to be from British Gas, mentioning £64.20 and a date of 15 July 2026.
  - ES: Esto parece venir de British Gas, y menciona £64.20 y una fecha, 15 July 2026.

## tpl.summary.generic_amount_date

- EN: `This document appears to mention {amount} and a date of {date}.`
- ES: `Este documento parece mencionar {amount} y una fecha, {date}.`
- Example 1
  - EN: This document appears to mention £187.42 and a date of 24 June 2026.
  - ES: Este documento parece mencionar £187.42 y una fecha, 24 June 2026.
- Example 2
  - EN: This document appears to mention £64.20 and a date of 15 July 2026.
  - ES: Este documento parece mencionar £64.20 y una fecha, 15 July 2026.

## tpl.summary.generic_sender_amount

- EN: `This appears to be from {sender}, mentioning {amount}.`
- ES: `Esto parece venir de {sender}, y menciona {amount}.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42.
  - ES: Esto parece venir de Thames Water, y menciona £187.42.
- Example 2
  - EN: This appears to be from British Gas, mentioning £64.20.
  - ES: Esto parece venir de British Gas, y menciona £64.20.

## tpl.summary.generic_sender_date

- EN: `This appears to be from {sender}, with a date of {date}.`
- ES: `Esto parece venir de {sender}, con fecha {date}.`
- Example 1
  - EN: This appears to be from Thames Water, with a date of 24 June 2026.
  - ES: Esto parece venir de Thames Water, con fecha 24 June 2026.
- Example 2
  - EN: This appears to be from British Gas, with a date of 15 July 2026.
  - ES: Esto parece venir de British Gas, con fecha 15 July 2026.

## tpl.summary.generic_sender

- EN: `This appears to be from {sender}.`
- ES: `Esto parece venir de {sender}.`
- Example 1
  - EN: This appears to be from Thames Water.
  - ES: Esto parece venir de Thames Water.
- Example 2
  - EN: This appears to be from British Gas.
  - ES: Esto parece venir de British Gas.

## tpl.summary.garbled_sender

- EN: `{sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- ES: `{sender} parece haber enviado {category_label}. La calidad del texto es demasiado baja para leer con seguridad importes o fechas concretas. Revise esos datos en el documento original.`
- Example 1
  - EN: HMRC appears to have sent a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - ES: HMRC parece haber enviado a bill or payment request. La calidad del texto es demasiado baja para leer con seguridad importes o fechas concretas. Revise esos datos en el documento original.
- Example 2
  - EN: Manchester City Council appears to have sent an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - ES: Manchester City Council parece haber enviado an official notice. La calidad del texto es demasiado baja para leer con seguridad importes o fechas concretas. Revise esos datos en el documento original.

## tpl.summary.garbled

- EN: `This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- ES: `Esto parece {category_label}. La calidad del texto es demasiado baja para leer con seguridad importes o fechas concretas. Revise esos datos en el documento original.`
- Example 1
  - EN: This appears to be a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - ES: Esto parece a bill or payment request. La calidad del texto es demasiado baja para leer con seguridad importes o fechas concretas. Revise esos datos en el documento original.
- Example 2
  - EN: This appears to be an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - ES: Esto parece an official notice. La calidad del texto es demasiado baja para leer con seguridad importes o fechas concretas. Revise esos datos en el documento original.

## tpl.readable.summary_sender

- EN: `This appears to be {type_label} from {sender}.`
- ES: `Esto parece {type_label} de {sender}.`
- Example 1
  - EN: This appears to be an official letter from HMRC.
  - ES: Esto parece an official letter de HMRC.
- Example 2
  - EN: This appears to be a housing letter from Manchester City Council.
  - ES: Esto parece a housing letter de Manchester City Council.

## tpl.readable.summary

- EN: `This appears to be {type_label}.`
- ES: `Esto parece {type_label}.`
- Example 1
  - EN: This appears to be an official letter.
  - ES: Esto parece an official letter.
- Example 2
  - EN: This appears to be a housing letter.
  - ES: Esto parece a housing letter.

## tpl.readable.summary_topic

- EN: `This appears to be {type_label} about {topic}.`
- ES: `Esto parece {type_label} sobre {topic}.`
- Example 1
  - EN: This appears to be an official letter about tax or HMRC.
  - ES: Esto parece an official letter sobre tax or HMRC.
- Example 2
  - EN: This appears to be a housing letter about housing or rent.
  - ES: Esto parece a housing letter sobre housing or rent.

## tpl.benefits.summary_sender

- EN: `This appears to be a benefits letter from {sender}.`
- ES: `Esto parece una carta de prestaciones sociales de {sender}.`
- Example 1
  - EN: This appears to be a benefits letter from HMRC.
  - ES: Esto parece una carta de prestaciones sociales de HMRC.
- Example 2
  - EN: This appears to be a benefits letter from Manchester City Council.
  - ES: Esto parece una carta de prestaciones sociales de Manchester City Council.

## tpl.readable.sender_card

- EN: `This appears to be from {sender}. Check the original document to confirm.`
- ES: `Esto parece venir de {sender}. Revise el documento original para confirmarlo.`
- Example 1
  - EN: This appears to be from HMRC. Check the original document to confirm.
  - ES: Esto parece venir de HMRC. Revise el documento original para confirmarlo.
- Example 2
  - EN: This appears to be from Manchester City Council. Check the original document to confirm.
  - ES: Esto parece venir de Manchester City Council. Revise el documento original para confirmarlo.

## tpl.readable.mip_deadline

- EN: `This may include a deadline about {topic}. Check the original before acting.`
- ES: `Esto puede incluir un plazo sobre {topic}. Revise el original antes de actuar.`
- Example 1
  - EN: This may include a deadline about tax or HMRC. Check the original before acting.
  - ES: Esto puede incluir un plazo sobre tax or HMRC. Revise el original antes de actuar.
- Example 2
  - EN: This may include a deadline about housing or rent. Check the original before acting.
  - ES: Esto puede incluir un plazo sobre housing or rent. Revise el original antes de actuar.

## tpl.readable.mip_response

- EN: `This may ask for a response about {topic}. Check the original document.`
- ES: `Esto puede pedir una respuesta sobre {topic}. Revise el documento original.`
- Example 1
  - EN: This may ask for a response about tax or HMRC. Check the original document.
  - ES: Esto puede pedir una respuesta sobre tax or HMRC. Revise el documento original.
- Example 2
  - EN: This may ask for a response about housing or rent. Check the original document.
  - ES: Esto puede pedir una respuesta sobre housing or rent. Revise el documento original.

## tpl.readable.mip_topic

- EN: `The clearest topic appears to be {topic}. Check the original for details.`
- ES: `El tema más claro parece ser {topic}. Revise el original para ver los detalles.`
- Example 1
  - EN: The clearest topic appears to be tax or HMRC. Check the original for details.
  - ES: El tema más claro parece ser tax or HMRC. Revise el original para ver los detalles.
- Example 2
  - EN: The clearest topic appears to be housing or rent. Check the original for details.
  - ES: El tema más claro parece ser housing or rent. Revise el original para ver los detalles.

## tpl.date.letter_dated

- EN: `No clear due date was found. The letter is dated {header_date}.`
- ES: `No se ha encontrado una fecha de vencimiento clara. La carta tiene fecha {header_date}.`
- Example 1
  - EN: No clear due date was found. The letter is dated 2 June 2026.
  - ES: No se ha encontrado una fecha de vencimiento clara. La carta tiene fecha 2 June 2026.
- Example 2
  - EN: No clear due date was found. The letter is dated 1 July 2026.
  - ES: No se ha encontrado una fecha de vencimiento clara. La carta tiene fecha 1 July 2026.

## tpl.date.important_dates

- EN: `These may be important dates: {dates}. Check what they refer to.`
- ES: `Estas fechas pueden ser importantes: {dates}. Revise a qué se refieren.`
- Example 1
  - EN: These may be important dates: 24 June 2026 and 8 July 2026. Check what they refer to.
  - ES: Estas fechas pueden ser importantes: 24 June 2026 and 8 July 2026. Revise a qué se refieren.
- Example 2
  - EN: These may be important dates: 15 July 2026 and 3 August 2026. Check what they refer to.
  - ES: Estas fechas pueden ser importantes: 15 July 2026 and 3 August 2026. Revise a qué se refieren.

## tpl.date.dates_appear

- EN: `These dates appear in the document: {dates}. Check what they refer to.`
- ES: `En el documento aparecen estas fechas: {dates}. Revise a qué se refieren.`
- Example 1
  - EN: These dates appear in the document: 24 June 2026 and 8 July 2026. Check what they refer to.
  - ES: En el documento aparecen estas fechas: 24 June 2026 and 8 July 2026. Revise a qué se refieren.
- Example 2
  - EN: These dates appear in the document: 15 July 2026 and 3 August 2026. Check what they refer to.
  - ES: En el documento aparecen estas fechas: 15 July 2026 and 3 August 2026. Revise a qué se refieren.

## tpl.date.no_due_dates_appear

- EN: `No clear due date. These dates appear in the document: {dates}. Check what they refer to.`
- ES: `No hay una fecha de vencimiento clara. En el documento aparecen estas fechas: {dates}. Revise a qué se refieren.`
- Example 1
  - EN: No clear due date. These dates appear in the document: 24 June 2026 and 8 July 2026. Check what they refer to.
  - ES: No hay una fecha de vencimiento clara. En el documento aparecen estas fechas: 24 June 2026 and 8 July 2026. Revise a qué se refieren.
- Example 2
  - EN: No clear due date. These dates appear in the document: 15 July 2026 and 3 August 2026. Check what they refer to.
  - ES: No hay una fecha de vencimiento clara. En el documento aparecen estas fechas: 15 July 2026 and 3 August 2026. Revise a qué se refieren.

## tpl.check.sender

- EN: `Check the sender: {sender}.`
- ES: `Revise quién lo envía: {sender}.`
- Example 1
  - EN: Check the sender: HMRC.
  - ES: Revise quién lo envía: HMRC.
- Example 2
  - EN: Check the sender: Manchester City Council.
  - ES: Revise quién lo envía: Manchester City Council.

## tpl.check.topic

- EN: `Check the topic: {topic}.`
- ES: `Revise el tema: {topic}.`
- Example 1
  - EN: Check the topic: tax or HMRC.
  - ES: Revise el tema: tax or HMRC.
- Example 2
  - EN: Check the topic: housing or rent.
  - ES: Revise el tema: housing or rent.

## tpl.check.dates

- EN: `Check these visible dates: {dates}.`
- ES: `Revise estas fechas visibles: {dates}.`
- Example 1
  - EN: Check these visible dates: 24 June 2026 and 8 July 2026.
  - ES: Revise estas fechas visibles: 24 June 2026 and 8 July 2026.
- Example 2
  - EN: Check these visible dates: 15 July 2026 and 3 August 2026.
  - ES: Revise estas fechas visibles: 15 July 2026 and 3 August 2026.

## tpl.check.date_on_original

- EN: `Check this date on the original document: {date}.`
- ES: `Revise esta fecha en el documento original: {date}.`
- Example 1
  - EN: Check this date on the original document: 24 June 2026.
  - ES: Revise esta fecha en el documento original: 24 June 2026.
- Example 2
  - EN: Check this date on the original document: 15 July 2026.
  - ES: Revise esta fecha en el documento original: 15 July 2026.

## tpl.check.amount_and_date

- EN: `Check the amount ({amount}) and the date ({date}) on the original document.`
- ES: `Revise el importe ({amount}) y la fecha ({date}) en el documento original.`
- Example 1
  - EN: Check the amount (£187.42) and the date (24 June 2026) on the original document.
  - ES: Revise el importe (£187.42) y la fecha (24 June 2026) en el documento original.
- Example 2
  - EN: Check the amount (£64.20) and the date (15 July 2026) on the original document.
  - ES: Revise el importe (£64.20) y la fecha (15 July 2026) en el documento original.

## tpl.check.amount_any_dates

- EN: `Check the amount ({amount}) and any dates on the original document.`
- ES: `Revise el importe ({amount}) y cualquier fecha en el documento original.`
- Example 1
  - EN: Check the amount (£187.42) and any dates on the original document.
  - ES: Revise el importe (£187.42) y cualquier fecha en el documento original.
- Example 2
  - EN: Check the amount (£64.20) and any dates on the original document.
  - ES: Revise el importe (£64.20) y cualquier fecha en el documento original.

## tpl.check.date_any_amounts

- EN: `Check the date ({date}) and any amounts on the original document.`
- ES: `Revise la fecha ({date}) y cualquier importe en el documento original.`
- Example 1
  - EN: Check the date (24 June 2026) and any amounts on the original document.
  - ES: Revise la fecha (24 June 2026) y cualquier importe en el documento original.
- Example 2
  - EN: Check the date (15 July 2026) and any amounts on the original document.
  - ES: Revise la fecha (15 July 2026) y cualquier importe en el documento original.

## tpl.check.kp_date

- EN: `Date: {date}.`
- ES: `Fecha: {date}.`
- Example 1
  - EN: Date: 24 June 2026.
  - ES: Fecha: 24 June 2026.
- Example 2
  - EN: Date: 15 July 2026.
  - ES: Fecha: 15 July 2026.

## tpl.check.kp_amount

- EN: `Amount shown: {amount}.`
- ES: `Importe indicado: {amount}.`
- Example 1
  - EN: Amount shown: £187.42.
  - ES: Importe indicado: £187.42.
- Example 2
  - EN: Amount shown: £64.20.
  - ES: Importe indicado: £64.20.

## tpl.consequence.avoid

- EN: `The document says {consequence} if a payment is not made. Check the original document.`
- ES: `El documento dice {consequence} si no se realiza un pago. Revise el documento original.`
- Example 1
  - EN: The document says a late payment charge if a payment is not made. Check the original document.
  - ES: El documento dice a late payment charge si no se realiza un pago. Revise el documento original.
- Example 2
  - EN: The document says a reminder fee if a payment is not made. Check the original document.
  - ES: El documento dice a reminder fee si no se realiza un pago. Revise el documento original.

## tpl.consequence.reported

- EN: `The document states that {sentence_body}.`
- ES: `El documento indica que {sentence_body}.`
- Example 1
  - EN: The document states that a payment of £187.42 is now overdue.
  - ES: El documento indica que a payment of £187.42 is now overdue.
- Example 2
  - EN: The document states that the account will be reviewed in August.
  - ES: El documento indica que the account will be reviewed in August.

## tpl.consequence.may_follow

- EN: `{consequence_clause} may follow`
- ES: `podría producirse {consequence_clause}`
- Example 1
  - EN: further action may follow
  - ES: podría producirse further action
- Example 2
  - EN: a late payment charge may follow
  - ES: podría producirse a late payment charge

## tpl.action.check_wrap

- EN: `Check {action_sentence}`
- ES: `Revise {action_sentence}`
- Example 1
  - EN: Check the payment amount and due date on the original document.
  - ES: Revise the payment amount and due date on the original document.
- Example 2
  - EN: Check whether a response is needed by 15 July 2026.
  - ES: Revise whether a response is needed by 15 July 2026.

## tpl.composite.read_aloud

- EN: `{title}. {explanation}. {key_points}`
- ES: `{title}. {explanation}. {key_points}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this?. This looks like a formal document.. Amount shown: £187.42.
  - ES: What is this?. This looks like a formal document.. Amount shown: £187.42.
- Example 2
  - EN: When is it due?. Use this date before making a reminder.. Date: 15 July 2026.
  - ES: When is it due?. Use this date before making a reminder.. Date: 15 July 2026.

## tpl.composite.display_text

- EN: `{title} {short_answer}`
- ES: `{title} {short_answer}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this? This looks like a formal document.
  - ES: What is this? This looks like a formal document.
- Example 2
  - EN: When is it due? Due by 15 July 2026.
  - ES: When is it due? Due by 15 July 2026.

## tpl.composite.tts

- EN: `{title}. {short_answer}`
- ES: `{title}. {short_answer}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this?. This looks like a formal document.
  - ES: What is this?. This looks like a formal document.
- Example 2
  - EN: When is it due?. Due by 15 July 2026.
  - ES: When is it due?. Due by 15 July 2026.

## tpl.api.unknown_analytics_fields

- EN: `Unknown analytics fields: {field_list}`
- ES: `Campos de analítica desconocidos: {field_list}`
- Example 1
  - EN: Unknown analytics fields: sessionRef, deviceId
  - ES: Campos de analítica desconocidos: sessionRef, deviceId
- Example 2
  - EN: Unknown analytics fields: pageName, extraField
  - ES: Campos de analítica desconocidos: pageName, extraField
