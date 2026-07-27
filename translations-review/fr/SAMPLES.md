# French (fr) pattern samples

DRAFT PENDING HUMAN REVIEW. All 51 slot templates from
`public/i18n/templates-fr.js`, each with the English source, the French draft,
and two example sentences filled with plausible UK values.

Slot values stay verbatim in the French sentences, exactly as the app inserts
them. For label slots such as `{type_label}`, `{category_label}` and `{topic}`,
the live app fills the slot from the translated sentence bank, so real users
see French labels, for example `Cela semble être une lettre officielle.` These
samples keep the inserted value identical in both sentences so you can see the
verbatim slot rule at work.

## tpl.deadline.appointment

- EN: `Your appointment is on {date}.`
- FR: `Votre rendez-vous est prévu le {date}.`
- Example 1
  - EN: Your appointment is on 24 June 2026.
  - FR: Votre rendez-vous est prévu le 24 June 2026.
- Example 2
  - EN: Your appointment is on 15 July 2026.
  - FR: Votre rendez-vous est prévu le 15 July 2026.

## tpl.deadline.due

- EN: `Due by {date}.`
- FR: `Échéance le {date}.`
- Example 1
  - EN: Due by 24 June 2026.
  - FR: Échéance le 24 June 2026.
- Example 2
  - EN: Due by 15 July 2026.
  - FR: Échéance le 15 July 2026.

## tpl.summary.bill_full

- EN: `{sender} appears to be asking you to pay {amount} by {date}.`
- FR: `{sender} semble vous demander de payer {amount} avant le {date}.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42 by 24 June 2026.
  - FR: Thames Water semble vous demander de payer £187.42 avant le 24 June 2026.
- Example 2
  - EN: British Gas appears to be asking you to pay £64.20 by 15 July 2026.
  - FR: British Gas semble vous demander de payer £64.20 avant le 15 July 2026.

## tpl.summary.bill_amount_date

- EN: `This appears to be a payment request for {amount}, due by {date}.`
- FR: `Cela semble être une demande de paiement de {amount}, à régler avant le {date}.`
- Example 1
  - EN: This appears to be a payment request for £187.42, due by 24 June 2026.
  - FR: Cela semble être une demande de paiement de £187.42, à régler avant le 24 June 2026.
- Example 2
  - EN: This appears to be a payment request for £64.20, due by 15 July 2026.
  - FR: Cela semble être une demande de paiement de £64.20, à régler avant le 15 July 2026.

## tpl.summary.bill_sender_amount

- EN: `{sender} appears to be asking you to pay {amount}.`
- FR: `{sender} semble vous demander de payer {amount}.`
- Example 1
  - EN: Thames Water appears to be asking you to pay £187.42.
  - FR: Thames Water semble vous demander de payer £187.42.
- Example 2
  - EN: British Gas appears to be asking you to pay £64.20.
  - FR: British Gas semble vous demander de payer £64.20.

## tpl.summary.bill_sender_date

- EN: `This appears to be a bill from {sender}, dated {date}.`
- FR: `Cela semble être une facture de {sender}, datée du {date}.`
- Example 1
  - EN: This appears to be a bill from Thames Water, dated 24 June 2026.
  - FR: Cela semble être une facture de Thames Water, datée du 24 June 2026.
- Example 2
  - EN: This appears to be a bill from British Gas, dated 15 July 2026.
  - FR: Cela semble être une facture de British Gas, datée du 15 July 2026.

## tpl.summary.bill_amount

- EN: `This appears to be a payment request for {amount}.`
- FR: `Cela semble être une demande de paiement de {amount}.`
- Example 1
  - EN: This appears to be a payment request for £187.42.
  - FR: Cela semble être une demande de paiement de £187.42.
- Example 2
  - EN: This appears to be a payment request for £64.20.
  - FR: Cela semble être une demande de paiement de £64.20.

## tpl.summary.bill_sender

- EN: `This appears to be a bill from {sender}.`
- FR: `Cela semble être une facture de {sender}.`
- Example 1
  - EN: This appears to be a bill from Thames Water.
  - FR: Cela semble être une facture de Thames Water.
- Example 2
  - EN: This appears to be a bill from British Gas.
  - FR: Cela semble être une facture de British Gas.

## tpl.summary.bill_in_credit_sender

- EN: `This appears to be a bill from {sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
- FR: `Cela semble être une facture de {sender}. Votre compte semble être créditeur, il n'y a donc peut-être rien à payer. Vérifiez le document original pour en être sûr.`
- Example 1
  - EN: This appears to be a bill from Thames Water. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - FR: Cela semble être une facture de Thames Water. Votre compte semble être créditeur, il n'y a donc peut-être rien à payer. Vérifiez le document original pour en être sûr.
- Example 2
  - EN: This appears to be a bill from British Gas. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.
  - FR: Cela semble être une facture de British Gas. Votre compte semble être créditeur, il n'y a donc peut-être rien à payer. Vérifiez le document original pour en être sûr.

## tpl.summary.gov_sender_amount

- EN: `{sender} appears to have sent an official notice mentioning {amount}.`
- FR: `{sender} semble avoir envoyé un avis officiel mentionnant {amount}.`
- Example 1
  - EN: Thames Water appears to have sent an official notice mentioning £187.42.
  - FR: Thames Water semble avoir envoyé un avis officiel mentionnant £187.42.
- Example 2
  - EN: British Gas appears to have sent an official notice mentioning £64.20.
  - FR: British Gas semble avoir envoyé un avis officiel mentionnant £64.20.

## tpl.summary.gov_sender

- EN: `This appears to be an official notice from {sender}.`
- FR: `Cela semble être un avis officiel de {sender}.`
- Example 1
  - EN: This appears to be an official notice from Thames Water.
  - FR: Cela semble être un avis officiel de Thames Water.
- Example 2
  - EN: This appears to be an official notice from British Gas.
  - FR: Cela semble être un avis officiel de British Gas.

## tpl.summary.gov_amount

- EN: `This appears to be an official notice mentioning {amount}.`
- FR: `Cela semble être un avis officiel mentionnant {amount}.`
- Example 1
  - EN: This appears to be an official notice mentioning £187.42.
  - FR: Cela semble être un avis officiel mentionnant £187.42.
- Example 2
  - EN: This appears to be an official notice mentioning £64.20.
  - FR: Cela semble être un avis officiel mentionnant £64.20.

## tpl.summary.appt_sender_date

- EN: `This appears to be an appointment from {sender} on {date}.`
- FR: `Cela semble être un rendez-vous avec {sender} le {date}.`
- Example 1
  - EN: This appears to be an appointment from Thames Water on 24 June 2026.
  - FR: Cela semble être un rendez-vous avec Thames Water le 24 June 2026.
- Example 2
  - EN: This appears to be an appointment from British Gas on 15 July 2026.
  - FR: Cela semble être un rendez-vous avec British Gas le 15 July 2026.

## tpl.summary.appt_sender

- EN: `This appears to be an appointment from {sender}.`
- FR: `Cela semble être un rendez-vous avec {sender}.`
- Example 1
  - EN: This appears to be an appointment from Thames Water.
  - FR: Cela semble être un rendez-vous avec Thames Water.
- Example 2
  - EN: This appears to be an appointment from British Gas.
  - FR: Cela semble être un rendez-vous avec British Gas.

## tpl.summary.appt_date

- EN: `This appears to be an appointment on {date}.`
- FR: `Cela semble être un rendez-vous le {date}.`
- Example 1
  - EN: This appears to be an appointment on 24 June 2026.
  - FR: Cela semble être un rendez-vous le 24 June 2026.
- Example 2
  - EN: This appears to be an appointment on 15 July 2026.
  - FR: Cela semble être un rendez-vous le 15 July 2026.

## tpl.summary.generic_full

- EN: `This appears to be from {sender}, mentioning {amount} and a date of {date}.`
- FR: `Cela semble venir de {sender}, en mentionnant {amount} et la date {date}.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42 and a date of 24 June 2026.
  - FR: Cela semble venir de Thames Water, en mentionnant £187.42 et la date 24 June 2026.
- Example 2
  - EN: This appears to be from British Gas, mentioning £64.20 and a date of 15 July 2026.
  - FR: Cela semble venir de British Gas, en mentionnant £64.20 et la date 15 July 2026.

## tpl.summary.generic_amount_date

- EN: `This document appears to mention {amount} and a date of {date}.`
- FR: `Ce document semble mentionner {amount} et la date {date}.`
- Example 1
  - EN: This document appears to mention £187.42 and a date of 24 June 2026.
  - FR: Ce document semble mentionner £187.42 et la date 24 June 2026.
- Example 2
  - EN: This document appears to mention £64.20 and a date of 15 July 2026.
  - FR: Ce document semble mentionner £64.20 et la date 15 July 2026.

## tpl.summary.generic_sender_amount

- EN: `This appears to be from {sender}, mentioning {amount}.`
- FR: `Cela semble venir de {sender}, en mentionnant {amount}.`
- Example 1
  - EN: This appears to be from Thames Water, mentioning £187.42.
  - FR: Cela semble venir de Thames Water, en mentionnant £187.42.
- Example 2
  - EN: This appears to be from British Gas, mentioning £64.20.
  - FR: Cela semble venir de British Gas, en mentionnant £64.20.

## tpl.summary.generic_sender_date

- EN: `This appears to be from {sender}, with a date of {date}.`
- FR: `Cela semble venir de {sender}, avec la date {date}.`
- Example 1
  - EN: This appears to be from Thames Water, with a date of 24 June 2026.
  - FR: Cela semble venir de Thames Water, avec la date 24 June 2026.
- Example 2
  - EN: This appears to be from British Gas, with a date of 15 July 2026.
  - FR: Cela semble venir de British Gas, avec la date 15 July 2026.

## tpl.summary.generic_sender

- EN: `This appears to be from {sender}.`
- FR: `Cela semble venir de {sender}.`
- Example 1
  - EN: This appears to be from Thames Water.
  - FR: Cela semble venir de Thames Water.
- Example 2
  - EN: This appears to be from British Gas.
  - FR: Cela semble venir de British Gas.

## tpl.summary.garbled_sender

- EN: `{sender} appears to have sent {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- FR: `{sender} semble avoir envoyé {category_label}. La qualité du texte est trop faible pour lire les montants ou les dates de façon fiable. Vérifiez ces détails sur le document original.`
- Example 1
  - EN: Thames Water appears to have sent a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - FR: Thames Water semble avoir envoyé a bill or payment request. La qualité du texte est trop faible pour lire les montants ou les dates de façon fiable. Vérifiez ces détails sur le document original.
- Example 2
  - EN: British Gas appears to have sent an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - FR: British Gas semble avoir envoyé an official notice. La qualité du texte est trop faible pour lire les montants ou les dates de façon fiable. Vérifiez ces détails sur le document original.

## tpl.summary.garbled

- EN: `This appears to be {category_label}. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`
- FR: `Cela semble être {category_label}. La qualité du texte est trop faible pour lire les montants ou les dates de façon fiable. Vérifiez ces détails sur le document original.`
- Example 1
  - EN: This appears to be a bill or payment request. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - FR: Cela semble être a bill or payment request. La qualité du texte est trop faible pour lire les montants ou les dates de façon fiable. Vérifiez ces détails sur le document original.
- Example 2
  - EN: This appears to be an official notice. The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.
  - FR: Cela semble être an official notice. La qualité du texte est trop faible pour lire les montants ou les dates de façon fiable. Vérifiez ces détails sur le document original.

## tpl.readable.summary_sender

- EN: `This appears to be {type_label} from {sender}.`
- FR: `Cela semble être {type_label} de {sender}.`
- Example 1
  - EN: This appears to be an official letter from Thames Water.
  - FR: Cela semble être an official letter de Thames Water.
- Example 2
  - EN: This appears to be a housing letter from British Gas.
  - FR: Cela semble être a housing letter de British Gas.

## tpl.readable.summary

- EN: `This appears to be {type_label}.`
- FR: `Cela semble être {type_label}.`
- Example 1
  - EN: This appears to be an official letter.
  - FR: Cela semble être an official letter.
- Example 2
  - EN: This appears to be a housing letter.
  - FR: Cela semble être a housing letter.

## tpl.readable.summary_topic

- EN: `This appears to be {type_label} about {topic}.`
- FR: `Cela semble être {type_label} concernant {topic}.`
- Example 1
  - EN: This appears to be an official letter about housing or rent.
  - FR: Cela semble être an official letter concernant housing or rent.
- Example 2
  - EN: This appears to be a housing letter about an appointment.
  - FR: Cela semble être a housing letter concernant an appointment.

## tpl.benefits.summary_sender

- EN: `This appears to be a benefits letter from {sender}.`
- FR: `Cela semble être une lettre d'aides sociales de {sender}.`
- Example 1
  - EN: This appears to be a benefits letter from Thames Water.
  - FR: Cela semble être une lettre d'aides sociales de Thames Water.
- Example 2
  - EN: This appears to be a benefits letter from British Gas.
  - FR: Cela semble être une lettre d'aides sociales de British Gas.

## tpl.readable.sender_card

- EN: `This appears to be from {sender}. Check the original document to confirm.`
- FR: `Cela semble venir de {sender}. Vérifiez sur le document original pour confirmer.`
- Example 1
  - EN: This appears to be from Thames Water. Check the original document to confirm.
  - FR: Cela semble venir de Thames Water. Vérifiez sur le document original pour confirmer.
- Example 2
  - EN: This appears to be from British Gas. Check the original document to confirm.
  - FR: Cela semble venir de British Gas. Vérifiez sur le document original pour confirmer.

## tpl.readable.mip_deadline

- EN: `This may include a deadline about {topic}. Check the original before acting.`
- FR: `Cela peut comporter une date limite concernant {topic}. Vérifiez l'original avant d'agir.`
- Example 1
  - EN: This may include a deadline about housing or rent. Check the original before acting.
  - FR: Cela peut comporter une date limite concernant housing or rent. Vérifiez l'original avant d'agir.
- Example 2
  - EN: This may include a deadline about an appointment. Check the original before acting.
  - FR: Cela peut comporter une date limite concernant an appointment. Vérifiez l'original avant d'agir.

## tpl.readable.mip_response

- EN: `This may ask for a response about {topic}. Check the original document.`
- FR: `Cela peut demander une réponse concernant {topic}. Vérifiez le document original.`
- Example 1
  - EN: This may ask for a response about housing or rent. Check the original document.
  - FR: Cela peut demander une réponse concernant housing or rent. Vérifiez le document original.
- Example 2
  - EN: This may ask for a response about an appointment. Check the original document.
  - FR: Cela peut demander une réponse concernant an appointment. Vérifiez le document original.

## tpl.readable.mip_topic

- EN: `The clearest topic appears to be {topic}. Check the original for details.`
- FR: `Le sujet le plus clair semble être {topic}. Vérifiez les détails sur l'original.`
- Example 1
  - EN: The clearest topic appears to be housing or rent. Check the original for details.
  - FR: Le sujet le plus clair semble être housing or rent. Vérifiez les détails sur l'original.
- Example 2
  - EN: The clearest topic appears to be an appointment. Check the original for details.
  - FR: Le sujet le plus clair semble être an appointment. Vérifiez les détails sur l'original.

## tpl.date.letter_dated

- EN: `No clear due date was found. The letter is dated {header_date}.`
- FR: `Aucune date d'échéance claire n'a été trouvée. La lettre est datée du {header_date}.`
- Example 1
  - EN: No clear due date was found. The letter is dated 2 June 2026.
  - FR: Aucune date d'échéance claire n'a été trouvée. La lettre est datée du 2 June 2026.
- Example 2
  - EN: No clear due date was found. The letter is dated 11 May 2026.
  - FR: Aucune date d'échéance claire n'a été trouvée. La lettre est datée du 11 May 2026.

## tpl.date.important_dates

- EN: `These may be important dates: {dates}. Check what they refer to.`
- FR: `Ces dates peuvent être importantes : {dates}. Vérifiez à quoi elles correspondent.`
- Example 1
  - EN: These may be important dates: 24 June 2026, 8 July 2026. Check what they refer to.
  - FR: Ces dates peuvent être importantes : 24 June 2026, 8 July 2026. Vérifiez à quoi elles correspondent.
- Example 2
  - EN: These may be important dates: 15 July 2026, 3 August 2026. Check what they refer to.
  - FR: Ces dates peuvent être importantes : 15 July 2026, 3 August 2026. Vérifiez à quoi elles correspondent.

## tpl.date.dates_appear

- EN: `These dates appear in the document: {dates}. Check what they refer to.`
- FR: `Ces dates figurent dans le document : {dates}. Vérifiez à quoi elles correspondent.`
- Example 1
  - EN: These dates appear in the document: 24 June 2026, 8 July 2026. Check what they refer to.
  - FR: Ces dates figurent dans le document : 24 June 2026, 8 July 2026. Vérifiez à quoi elles correspondent.
- Example 2
  - EN: These dates appear in the document: 15 July 2026, 3 August 2026. Check what they refer to.
  - FR: Ces dates figurent dans le document : 15 July 2026, 3 August 2026. Vérifiez à quoi elles correspondent.

## tpl.date.no_due_dates_appear

- EN: `No clear due date. These dates appear in the document: {dates}. Check what they refer to.`
- FR: `Aucune date d'échéance claire. Ces dates figurent dans le document : {dates}. Vérifiez à quoi elles correspondent.`
- Example 1
  - EN: No clear due date. These dates appear in the document: 24 June 2026, 8 July 2026. Check what they refer to.
  - FR: Aucune date d'échéance claire. Ces dates figurent dans le document : 24 June 2026, 8 July 2026. Vérifiez à quoi elles correspondent.
- Example 2
  - EN: No clear due date. These dates appear in the document: 15 July 2026, 3 August 2026. Check what they refer to.
  - FR: Aucune date d'échéance claire. Ces dates figurent dans le document : 15 July 2026, 3 August 2026. Vérifiez à quoi elles correspondent.

## tpl.check.sender

- EN: `Check the sender: {sender}.`
- FR: `Vérifiez l'expéditeur : {sender}.`
- Example 1
  - EN: Check the sender: Thames Water.
  - FR: Vérifiez l'expéditeur : Thames Water.
- Example 2
  - EN: Check the sender: British Gas.
  - FR: Vérifiez l'expéditeur : British Gas.

## tpl.check.topic

- EN: `Check the topic: {topic}.`
- FR: `Vérifiez le sujet : {topic}.`
- Example 1
  - EN: Check the topic: housing or rent.
  - FR: Vérifiez le sujet : housing or rent.
- Example 2
  - EN: Check the topic: an appointment.
  - FR: Vérifiez le sujet : an appointment.

## tpl.check.dates

- EN: `Check these visible dates: {dates}.`
- FR: `Vérifiez ces dates visibles : {dates}.`
- Example 1
  - EN: Check these visible dates: 24 June 2026, 8 July 2026.
  - FR: Vérifiez ces dates visibles : 24 June 2026, 8 July 2026.
- Example 2
  - EN: Check these visible dates: 15 July 2026, 3 August 2026.
  - FR: Vérifiez ces dates visibles : 15 July 2026, 3 August 2026.

## tpl.check.date_on_original

- EN: `Check this date on the original document: {date}.`
- FR: `Vérifiez cette date sur le document original : {date}.`
- Example 1
  - EN: Check this date on the original document: 24 June 2026.
  - FR: Vérifiez cette date sur le document original : 24 June 2026.
- Example 2
  - EN: Check this date on the original document: 15 July 2026.
  - FR: Vérifiez cette date sur le document original : 15 July 2026.

## tpl.check.amount_and_date

- EN: `Check the amount ({amount}) and the date ({date}) on the original document.`
- FR: `Vérifiez le montant ({amount}) et la date ({date}) sur le document original.`
- Example 1
  - EN: Check the amount (£187.42) and the date (24 June 2026) on the original document.
  - FR: Vérifiez le montant (£187.42) et la date (24 June 2026) sur le document original.
- Example 2
  - EN: Check the amount (£64.20) and the date (15 July 2026) on the original document.
  - FR: Vérifiez le montant (£64.20) et la date (15 July 2026) sur le document original.

## tpl.check.amount_any_dates

- EN: `Check the amount ({amount}) and any dates on the original document.`
- FR: `Vérifiez le montant ({amount}) et les dates éventuelles sur le document original.`
- Example 1
  - EN: Check the amount (£187.42) and any dates on the original document.
  - FR: Vérifiez le montant (£187.42) et les dates éventuelles sur le document original.
- Example 2
  - EN: Check the amount (£64.20) and any dates on the original document.
  - FR: Vérifiez le montant (£64.20) et les dates éventuelles sur le document original.

## tpl.check.date_any_amounts

- EN: `Check the date ({date}) and any amounts on the original document.`
- FR: `Vérifiez la date ({date}) et les montants éventuels sur le document original.`
- Example 1
  - EN: Check the date (24 June 2026) and any amounts on the original document.
  - FR: Vérifiez la date (24 June 2026) et les montants éventuels sur le document original.
- Example 2
  - EN: Check the date (15 July 2026) and any amounts on the original document.
  - FR: Vérifiez la date (15 July 2026) et les montants éventuels sur le document original.

## tpl.check.kp_date

- EN: `Date: {date}.`
- FR: `Date : {date}.`
- Example 1
  - EN: Date: 24 June 2026.
  - FR: Date : 24 June 2026.
- Example 2
  - EN: Date: 15 July 2026.
  - FR: Date : 15 July 2026.

## tpl.check.kp_amount

- EN: `Amount shown: {amount}.`
- FR: `Montant indiqué : {amount}.`
- Example 1
  - EN: Amount shown: £187.42.
  - FR: Montant indiqué : £187.42.
- Example 2
  - EN: Amount shown: £64.20.
  - FR: Montant indiqué : £64.20.

## tpl.consequence.avoid

- EN: `The document says {consequence} if a payment is not made. Check the original document.`
- FR: `Le document indique {consequence} si un paiement n'est pas effectué. Vérifiez le document original.`
- Example 1
  - EN: The document says a late fee may be added if a payment is not made. Check the original document.
  - FR: Le document indique a late fee may be added si un paiement n'est pas effectué. Vérifiez le document original.
- Example 2
  - EN: The document says the service may be restricted if a payment is not made. Check the original document.
  - FR: Le document indique the service may be restricted si un paiement n'est pas effectué. Vérifiez le document original.

## tpl.consequence.reported

- EN: `The document states that {sentence_body}.`
- FR: `Le document indique que {sentence_body}.`
- Example 1
  - EN: The document states that a payment was reported as missed.
  - FR: Le document indique que a payment was reported as missed.
- Example 2
  - EN: The document states that an appointment was rescheduled.
  - FR: Le document indique que an appointment was rescheduled.

## tpl.consequence.may_follow

- EN: `{consequence_clause} may follow`
- FR: `{consequence_clause} peut suivre`
- Example 1
  - EN: Further action may follow
  - FR: Further action peut suivre
- Example 2
  - EN: A late fee may follow
  - FR: A late fee peut suivre

## tpl.action.check_wrap

- EN: `Check {action_sentence}`
- FR: `Vérifiez {action_sentence}`
- Example 1
  - EN: Check the payment amount on the original document.
  - FR: Vérifiez the payment amount on the original document.
- Example 2
  - EN: Check the appointment time on the letter.
  - FR: Vérifiez the appointment time on the letter.

## tpl.composite.read_aloud

- EN: `{title}. {explanation}. {key_points}`
- FR: `{title}. {explanation}. {key_points}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this?. This looks like a formal document.. Amount shown: £187.42.
  - FR: What is this?. This looks like a formal document.. Amount shown: £187.42.
- Example 2
  - EN: When is it due?. Use this date before making a reminder.. Date: 24 June 2026.
  - FR: When is it due?. Use this date before making a reminder.. Date: 24 June 2026.

## tpl.composite.display_text

- EN: `{title} {short_answer}`
- FR: `{title} {short_answer}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this? This looks like a formal document.
  - FR: What is this? This looks like a formal document.
- Example 2
  - EN: When is it due? Due by 24 June 2026.
  - FR: When is it due? Due by 24 June 2026.

## tpl.composite.tts

- EN: `{title}. {short_answer}`
- FR: `{title}. {short_answer}`
- Note: pure assembly template, identical on purpose. The slots arrive already translated.
- Example 1
  - EN: What is this?. This looks like a formal document.
  - FR: What is this?. This looks like a formal document.
- Example 2
  - EN: When is it due?. Due by 24 June 2026.
  - FR: When is it due?. Due by 24 June 2026.

## tpl.api.unknown_analytics_fields

- EN: `Unknown analytics fields: {field_list}`
- FR: `Champs de statistiques inconnus : {field_list}`
- Example 1
  - EN: Unknown analytics fields: sessionId, referrer
  - FR: Champs de statistiques inconnus : sessionId, referrer
- Example 2
  - EN: Unknown analytics fields: deviceId, campaign
  - FR: Champs de statistiques inconnus : deviceId, campaign
