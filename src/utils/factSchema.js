// The fact schema's closed vocabularies, in one place.
//
// They are shared by three consumers with no business importing each other:
// the extractor that asks the provider for them (aiFactExtractionService), the
// adjudicator that decides which the engine may use (factCandidates), and the
// tests. Keeping them here stops a role being added to the prompt and not to
// the validator, which would be a hole rather than a mismatch.
//
// Every entry is derived from a composer that already consumes it. See
// aiFactExtractionService for the derivation, document by document.

const FACT_SCHEMA_VERSION = "facts_v1";

const AMOUNT_ROLES = ["total_due", "arrears", "fee", "instalment", "credit", "balance", "other"];

const DATE_ROLES = ["deadline", "appointment", "letter_date", "period_start", "period_end", "other"];

const OBLIGATION_KINDS = ["pay", "contact", "attend", "send_documents", "respond", "none"];

// The 25 swept RISK_PHRASES, collapsed into the eleven things they name, plus
// "other" for a stated consequence outside them.
const CONSEQUENCE_KINDS = [
  "enforcement_agent", "remove_goods", "court_action", "possession", "eviction",
  "disconnection", "debt_collection", "credit_record", "penalty", "prosecution",
  "account_suspension", "other"
];

module.exports = {
  FACT_SCHEMA_VERSION,
  AMOUNT_ROLES,
  DATE_ROLES,
  OBLIGATION_KINDS,
  CONSEQUENCE_KINDS
};
