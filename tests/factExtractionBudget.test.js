// The extractor's time budget, and the evidence for it.
//
// A number in a constant is inherited blind. The measurement that chose it is
// recorded here so that changing the number means changing the evidence too,
// and so that a future session can see at a glance what would have to be true
// for a different value to be right.
//
// WHY IT WAS MEASURED AGAIN. 8,000ms was chosen in tier 1, when the fact call
// ran beside a phrasing pass averaging 15.1 seconds. Its only job was to finish
// first. That pass was removed, so the fact call became the wait itself, and
// the justification went with the thing it was justified against.
//
// HOW IT WAS MEASURED. requestFactsFromOpenAi called directly with a 60 second
// timeout, so nothing aborted and the whole tail was visible. A cap cannot be
// chosen from measurements taken under the cap: at 8,000ms every call over
// eight seconds records as a failure at exactly 8,000, and the part the cap
// exists to cover is the part that was never seen.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { FACT_EXTRACTION_BUDGET_MS } = require(path.join(__dirname, "..", "src", "services", "aiFactExtractionService"));

// 1 August 2026. 192 calls, six rounds, round robin over the 32 corpus
// documents that reach the extractor. Zero errors.
const MEASURED = {
  samples: 192,
  rounds: 6,
  documents: 32,
  min: 1068,
  p50: 2957,
  p90: 4005,
  p95: 4684,
  p99: 6888,
  max: 8999,
  // Mean wait a reader actually experiences at each cap, which is
  // mean(min(latency, budget)) rather than the mean latency.
  meanWaitAt4s: 2933,
  meanWaitAt8s: 3024,
  meanWaitAt12s: 3030,
  abortsAt4s: 20,
  abortsAt8s: 1,
  abortsAt12s: 0
};

// What the phrasing pass cost every reader, for as long as it ran. The budget's
// worst case has to stay under this or the change would be trading a rare long
// wait for one that used to be the average.
const PHRASING_PASS_MEAN_MS = 16444;

test("the budget covers the measured tail with margin", async (t) => {
  await t.test("it is above the largest call ever measured", () => {
    assert.ok(FACT_EXTRACTION_BUDGET_MS > MEASURED.max,
      "a budget below the observed maximum aborts a call that was going to succeed");
  });

  await t.test("with at least a third again of headroom", () => {
    // The tail is provider throughput, not payload: the slowest call carried
    // 263 output tokens, which is mid-range. A bad provider day moves the whole
    // distribution, so the margin is over the maximum rather than the p99.
    const margin = FACT_EXTRACTION_BUDGET_MS / MEASURED.max;
    assert.ok(margin >= 1.3,
      "margin over the observed maximum is " + margin.toFixed(2) + "x, which is too tight");
  });
});

test("raising it costs the reader almost nothing", async (t) => {
  await t.test("the mean wait barely moves", () => {
    // This is the whole argument. The distribution is concentrated, so the cap
    // only touches the handful of calls in the tail: six milliseconds of mean
    // wait separate eight seconds from twenty five.
    const cost = MEASURED.meanWaitAt12s - MEASURED.meanWaitAt8s;
    assert.ok(cost < 50,
      "raising the budget cost " + cost + "ms of mean wait, which is no longer negligible");
  });

  await t.test("the p90 wait does not move at all above four seconds", () => {
    // Nine calls in ten finish inside four seconds whatever the cap says.
    assert.ok(MEASURED.p90 <= 4100);
  });
});

test("the budget is bounded by what a reader should ever wait for nothing", async (t) => {
  await t.test("its worst case is shorter than the phrasing pass's mean", () => {
    // An abort means the reader waited the full budget AND got no facts. That
    // worst case must stay below the wait the removed pass imposed on EVERY
    // reader, or this would be trading a rare cost for a former average one.
    assert.ok(FACT_EXTRACTION_BUDGET_MS < PHRASING_PASS_MEAN_MS,
      "the worst case now exceeds what the phrasing pass cost on average");
  });

  await t.test("it is not simply the old phrasing timeout", () => {
    // 25,000ms was the phrasing pass's limit and it was too long: readers waited
    // it out and received the engine's cards anyway. Inheriting it here would
    // repeat that.
    assert.ok(FACT_EXTRACTION_BUDGET_MS < 25000);
  });
});

test("the chosen value", () => {
  // Pinned last, so a change shows up as an edit to a number with every
  // assertion above still standing over it.
  assert.equal(FACT_EXTRACTION_BUDGET_MS, 12000);
});

test("what would justify a different number", async (t) => {
  // Recorded as executable notes rather than prose, so the conditions are
  // checkable rather than remembered.
  await t.test("aborts observed in production at this budget would justify raising it", () => {
    // document_sessions carries ai_facts.facts_error_code. facts_timeout at
    // 12,000ms is the signal, and it is real evidence rather than anticipated
    // evidence. Nothing to assert yet; recorded so the next session knows where
    // to look.
    assert.equal(MEASURED.abortsAt12s, 0, "no aborts were observed at this budget");
  });

  await t.test("a materially faster model would justify lowering it", () => {
    // The budget is a function of the distribution, and the distribution is a
    // function of output tokens over provider throughput. Either changing means
    // re-measuring, with nothing aborting, before touching the number.
    assert.ok(MEASURED.samples >= 150,
      "fewer than 150 samples is not enough to see a tail worth capping");
  });
});
