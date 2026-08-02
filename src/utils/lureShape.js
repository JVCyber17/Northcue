// The shape of a message that wants money through a link, read without reading
// any language.
//
// WHY A SHAPE AND NOT A PHRASE. Every scam rule in the engine is a needle in an
// English haystack, which is why nine of ten corpus scams were undetected and
// three of those nine are in English. The phrases a lure uses are unbounded and
// translate; what it has to DO does not. To take money through a link it must
// show the link and it must name a figure. What it almost never carries is the
// two things an organisation gives you so you can identify yourself and reach
// them back: a reference for the account, and a number to ring.
//
//   a link, and an amount, and no reference, and no telephone number
//
// All four parts are already built and already language independent. This file
// only states the combination and what it is worth.
//
// WHAT IT IS WORTH: ADVISORY, AND ONLY EVER ADVISORY. It can withhold a clean
// bill of health. It can never condemn. It cannot reach "low" trust, cannot
// produce verification_only, cannot null a deadline and cannot replace a card,
// and pickTrustAssessment enforces that by taking this list separately from the
// phrase-based one rather than by trusting a caller to be careful.
//
// MEASURED, 2 August 2026, across all 60 corpus documents. Fires on 7, all 7
// scams, none of the 50 genuine documents:
//
//   polish_phishing                smish_parcel_link_only
//   smish_parcel_link_only_pl      scam_council_refund_link_only
//   scam_dvla_vehicle_tax          scam_hmrc_refund_es
//   scam_energy_refund_pt
//
// It misses three scams, and each one is missed by a part working correctly:
// scam_phishing carries a reference, scam_bank_security_fr and
// scam_crypto_investment_pl name no figure at all. Two of those three are
// already refused by the decisive tier.
//
// HOW THIN THE EVIDENCE IS, said plainly because the number 7-for-0 reads much
// stronger than it is. Of 50 genuine documents only FOUR carry a link, and of
// those four only TWO also carry an amount. So the separation rests on two
// genuine examples: genuine_post_office_card_payment, excluded by carrying both
// a reference and a phone number, and intl_sole_trader_invoice, excluded only
// by its phone number.
//
// THE SECOND ONE IS THERE BECAUSE THIS RULE GOT IT WRONG. The sole trader
// invoice was the false positive KNOWN_ENGINE_DEFECTS.md predicted before the
// document existed: a plumber with a payment link, a total and no reference
// code. It fired, because +44 113 496 2200 was invisible to hasTelephoneNumber
// until the phone pattern was fixed on 2 August 2026. It no longer fires, and
// the whole margin between this rule and a genuine invoice is now one working
// regex. Promoting it beyond advisory needs production evidence, not more
// corpus documents written by the same hand that wrote the rule.

const {
  hasLink,
  hasCurrencyAmount,
  hasReferenceCode,
  hasTelephoneNumber
} = require("./documentSignals");

const LURE_SHAPE_SIGNAL = "Asks for money through a link, with no reference or contact number.";

function hasLureShape(text) {
  const source = String(text || "");
  if (!hasLink(source)) return false;
  if (!hasCurrencyAmount(source)) return false;
  // Either one is enough to clear it. A genuine organisation asking for money
  // in writing gives you a way to identify the account or a way to reach them,
  // and usually both.
  if (hasReferenceCode(source)) return false;
  if (hasTelephoneNumber(source)) return false;
  return true;
}

function detectLureShapeSignals(text) {
  return hasLureShape(text) ? [LURE_SHAPE_SIGNAL] : [];
}

module.exports = {
  LURE_SHAPE_SIGNAL,
  hasLureShape,
  detectLureShapeSignals
};
