// THE VERIFICATION INGEST, pinned. The founder's decision of 5 August 2026:
// no language launches unverified, every disagreement is a defect with a
// founder-approved resolution, an unsure mark is data with a conservative
// proposal. This file pins the outcome table so an ingest can never
// reclassify a disagreement quietly, and validates any completed pack
// fixtures that have landed.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const { classifyMark, OUTCOME_META } = require(path.join(ROOT, "scripts", "verification", "ingest.js"));
const LANGS = require(path.join(ROOT, "public", "i18n", "config.js")).languages
  .map((e) => e.code).filter((c) => c !== "en");

test("the outcome table is exactly the recorded one", async (t) => {
  const fires = { guard_fires: true };
  const keeps = { guard_fires: false };

  await t.test("agreement both ways", () => {
    assert.equal(classifyMark("A", fires), "agreement_fire");
    assert.equal(classifyMark("B", keeps), "agreement_keep");
  });

  await t.test("a B on a firing sentence is a BLOCKING over-fire defect", () => {
    const outcome = classifyMark("B", fires);
    assert.equal(outcome, "overfire_defect");
    assert.equal(OUTCOME_META[outcome].blocking, true);
  });

  await t.test("a C on a firing sentence blocks too: unsure is not good enough to strip", () => {
    const outcome = classifyMark("C", fires);
    assert.equal(outcome, "unsure_on_fire_defect");
    assert.equal(OUTCOME_META[outcome].blocking, true);
  });

  await t.test("an A the guard misses is a recall candidate, never silently absorbed", () => {
    const outcome = classifyMark("A", keeps);
    assert.equal(outcome, "recall_candidate");
    assert.equal(OUTCOME_META[outcome].defect, true);
    assert.equal(OUTCOME_META[outcome].blocking, false);
  });

  await t.test("a C on a kept sentence is data with the conservative reading", () => {
    assert.equal(classifyMark("C", keeps), "unsure_keep");
    assert.equal(OUTCOME_META.unsure_keep.defect, false);
  });

  await t.test("an unmarked row blocks: an incomplete pack cannot verify a language", () => {
    const outcome = classifyMark(undefined, fires);
    assert.equal(outcome, "unmarked_defect");
    assert.equal(OUTCOME_META[outcome].blocking, true);
  });
});

test("any completed pack fixtures that have landed are well-formed and honestly ingested", async (t) => {
  for (const lang of LANGS) {
    const fixturePath = path.join(ROOT, "tests", "fixtures", "native-review-" + lang + ".json");
    const verdictPath = path.join(ROOT, "tests", "fixtures", "verification-verdicts", lang + ".json");
    if (!fs.existsSync(fixturePath)) continue;

    await t.test(lang + ": the pack has a reviewer, a date and full marks, and its verdict is honest", () => {
      const pack = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      assert.ok(pack.reviewer && pack.date, lang + " fixture must name reviewer and date");
      const key = JSON.parse(fs.readFileSync(
        path.join(ROOT, "tests", "fixtures", "verification-keys", lang + ".json"), "utf8"));
      const resolutions = pack.resolutions || {};
      const defects = key.entries.filter((entry) => {
        const outcome = classifyMark((pack.marks || {})[entry.id], entry);
        return OUTCOME_META[outcome].defect;
      });
      const blocking = defects.filter((entry) => {
        const outcome = classifyMark((pack.marks || {})[entry.id], entry);
        return OUTCOME_META[outcome].blocking;
      });
      const unresolved = defects.filter((entry) => !resolutions[entry.id]);
      // Every recorded resolution must name what was decided and whose word
      // decided it; an empty approval is not an approval.
      Object.entries(resolutions).forEach(([id, r]) => {
        assert.ok(r && r.resolution && r.approvedBy,
          lang + " resolution for " + id + " must carry resolution and approvedBy");
      });
      assert.ok(fs.existsSync(verdictPath),
        lang + " has a completed pack but no ingest verdict; run scripts/verification/ingest.js " + lang);
      const verdict = JSON.parse(fs.readFileSync(verdictPath, "utf8"));
      assert.equal(verdict.blocking_defects, blocking.length,
        lang + " verdict disagrees with a fresh classification; re-run the ingest");
      assert.equal(verdict.verified, unresolved.length === 0,
        lang + " verified flag disagrees with the fixture's resolutions; re-run the ingest");
    });
  }
});
