// The consequence.kind severity floor.
//
// consequence.kind is a SIGNAL the engine interprets, never a verdict the model
// issues. detectSeriousDocumentSignals reads English phrases, so a Polish
// letter warning of a court eviction order was rated low; this gives the same
// judgement a language-independent input. The mapping stays in engine code, in
// CONSEQUENCE_KIND_POLICY, and merges through raiseSeverityTo, the same helper
// the English stakes floor uses.
//
// Every fact set below is the real captured output of the live extractor on
// that document, committed as tests/fixtures/corpus-facts.json, so these are
// the kinds the model actually returns rather than kinds chosen to pass.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const CORPUS_FACTS = require(path.join(__dirname, "fixtures", "corpus-facts.json"));
const { CONSEQUENCE_KINDS } = require(path.join(__dirname, "..", "src", "utils", "factSchema"));
const { SCAM_SHAPED_KINDS } = require(path.join(__dirname, "..", "src", "utils", "factCandidates"));

const meta = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "floor" };
const byId = (id) => CORPUS.find((e) => e.id === id).text;
const analyse = (text, facts) => runClearStepsEngine({ extractedText: text, fileMeta: meta, facts });
const severityOf = (text, facts) => analyse(text, facts).api_output.trust.severity_level;

// The seven kinds that floor, and to what. Named literally rather than read out
// of the engine, so a change to the table is a change to this file too.
const FLOORS = {
  enforcement_agent: "urgent",
  remove_goods: "urgent",
  possession: "high",
  eviction: "high",
  court_action: "high",
  disconnection: "high",
  prosecution: "high"
};
const FLOORS_NOTHING = ["debt_collection", "credit_record", "penalty", "account_suspension", "other"];

const RANK = { low: 0, medium: 1, high: 2, urgent: 3 };

// A document at each base severity, so a floor can be tried against all four.
const AT_SEVERITY = {
  low: "council_tax",
  medium: "appointment_nhs",
  high: "arrears_past_and_future",
  urgent: "bailiff_enforcement"
};

const factsWith = (kind) => ({
  consequence: { kind, conditional: true, sentence: null }
});

// The sentence has to be verbatim or the candidate is refused before the kind
// is ever read, so each base document gets a sentence taken from itself.
function factsFor(id, kind) {
  const text = byId(id);
  const sentence = text.split(/\r?\n/).filter((l) => l.trim().length > 30)[1];
  return { consequence: { kind, conditional: true, sentence } };
}

// ─── 1. the floor never lowers ───────────────────────────────────────────────

test("the floor never lowers", async (t) => {
  for (const [kind, floor] of Object.entries(FLOORS)) {
    for (const [base, id] of Object.entries(AT_SEVERITY)) {
      await t.test(kind + " on a " + base + " document", () => {
        const before = severityOf(byId(id), null);
        const after = severityOf(byId(id), factsFor(id, kind));
        assert.ok(RANK[after] >= RANK[before],
          kind + " lowered " + id + " from " + before + " to " + after);
        assert.ok(RANK[after] >= RANK[before],
          "and it must be at least the base");
      });
    }
  }

  await t.test("eviction on an already urgent document stays urgent", () => {
    // The named case. eviction floors to high, and eviction_possession is
    // already urgent from the English stakes floor.
    const id = "eviction_possession";
    assert.equal(severityOf(byId(id), null), "urgent");
    assert.equal(severityOf(byId(id), factsFor(id, "eviction")), "urgent");
  });
});

// ─── 2. the excluded kinds floor nothing ─────────────────────────────────────

test("the excluded kinds floor nothing", async (t) => {
  for (const kind of FLOORS_NOTHING) {
    await t.test(kind, () => {
      for (const [, id] of Object.entries(AT_SEVERITY)) {
        assert.equal(severityOf(byId(id), factsFor(id, kind)), severityOf(byId(id), null),
          kind + " moved severity on " + id);
      }
    });
  }

  await t.test("the two lists together cover every kind in the schema", () => {
    // Named, not derived, so deleting a row from the engine's table fails here
    // instead of silently arming a kind that was meant to floor nothing.
    assert.deepEqual(
      Object.keys(FLOORS).concat(FLOORS_NOTHING).sort(),
      [...CONSEQUENCE_KINDS].sort()
    );
  });
});

// ─── 3. account_suspension can never be armed ────────────────────────────────

test("account_suspension can never be armed", async (t) => {
  // Asserted separately from the loop above so the REASON survives in the
  // failure message. Both corpus documents returning this kind are scams, and a
  // floor here would make Northcue amplify the attacker's own deadline. It is
  // refused before the floor is even consulted, in SCAM_SHAPED_KINDS.
  await t.test("it is refused as a consequence, not merely unfloored", () => {
    assert.ok(SCAM_SHAPED_KINDS.includes("account_suspension"));
    const id = "council_tax";
    const run = analyse(byId(id), factsFor(id, "account_suspension"));
    assert.equal(run.structured_output.extractor_internal.consequence_kind, null);
  });

  await t.test("the real phishing letter gains neither a card nor a floor", () => {
    const before = analyse(byId("polish_phishing"), null);
    const after = analyse(byId("polish_phishing"), CORPUS_FACTS.polish_phishing);
    assert.equal(after.api_output.trust.severity_level, before.api_output.trust.severity_level);
    assert.equal(Boolean(after.structured_output.extractor_internal.has_consequence), false);
  });
});

// ─── 4. exactly these documents change severity ──────────────────────────────

test("exactly these documents change severity", async (t) => {
  const moved = [];
  const otherMoves = [];

  CORPUS.forEach((entry) => {
    const facts = CORPUS_FACTS[entry.id] || null;
    const before = analyse(entry.text, null).api_output.trust;
    const after = analyse(entry.text, facts).api_output.trust;
    if (before.severity_level !== after.severity_level) {
      moved.push(entry.id + ": " + before.severity_level + " -> " + after.severity_level);
    }
    ["is_high_stakes", "trust_assessment"].forEach((field) => {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        otherMoves.push(entry.id + "." + field);
      }
    });
  });

  await t.test("the moved set", () => {
    assert.deepEqual(moved.sort(), [
      "polish_rent_arrears: low -> high",
      "spanish_water_final_notice: low -> high"
    ]);
  });

  await t.test("nothing else about seriousness moves", () => {
    assert.deepEqual(otherMoves, []);
  });

  await t.test("urgency moves only where severity did", () => {
    // urgency_level is derived from severity, so it follows rather than moving
    // independently. Asserted so a future change that moves it alone is caught.
    const urgencyMoved = CORPUS.filter((entry) => {
      const facts = CORPUS_FACTS[entry.id] || null;
      return analyse(entry.text, null).api_output.trust.urgency_level !==
        analyse(entry.text, facts).api_output.trust.urgency_level;
    }).map((e) => e.id);
    assert.deepEqual(urgencyMoved.sort(), ["polish_rent_arrears", "spanish_water_final_notice"]);
  });
});

// ─── 5. the table agrees with the English phrase list ────────────────────────

test("the fact floor never outranks the English stakes floor", async (t) => {
  // Where both mechanisms fire, the fact floor must produce the same tier or a
  // lower one. If it ever produces a HIGHER tier than the engine's own reading
  // of the same document, the model is deciding seriousness, which is the line
  // this work does not cross.
  const BOTH = ["bailiff_enforcement", "eviction_possession", "court_fine",
    "legal_solicitor", "arrears_before_clause", "arrears_past_and_future"];

  for (const id of BOTH) {
    await t.test(id, () => {
      const facts = CORPUS_FACTS[id];
      const kind = facts && facts.consequence ? facts.consequence.kind : null;
      const engineTier = analyse(byId(id), null).api_output.trust.severity_level;
      const factTier = FLOORS[kind] || "low";
      assert.ok(RANK[factTier] <= RANK[engineTier],
        id + ": the fact floor (" + factTier + ") outranks the engine (" + engineTier + ")");
      assert.equal(analyse(byId(id), facts).api_output.trust.severity_level, engineTier,
        id + ": severity moved on a document the engine had already judged");
    });
  }
});

// ─── the gates still dominate ────────────────────────────────────────────────

test("a gated document cannot be floored by a fact", async (t) => {
  const GATED = ["scam_phishing", "non_document_recipe", "ocr_heavy_damage", "ocr_enforcement", "multi_document"];
  for (const id of GATED) {
    await t.test(id, () => {
      const facts = { consequence: { kind: "enforcement_agent", conditional: true, sentence: byId(id).split(/\r?\n/)[0] } };
      assert.equal(severityOf(byId(id), facts), severityOf(byId(id), null));
    });
  }
});
