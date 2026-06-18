# Skill: northcue-engine-test

## Triggers

Use this skill when the user says any of the following (or close variants):
- "run the engine test suite"
- "test the engine"
- "run the engine tests"
- "stress test the document engine"
- "verify the engine still works"
- "run all engine tests"
- "check the engine output"
- "run the Northcue test documents"

Do NOT use this for unit test runs (`npm test`) — that is the Jest/node:test suite in `tests/`. This skill runs realistic UK document scenarios end-to-end and produces human-readable six-card output, not pass/fail assertions.

## What This Skill Does

Runs a curated set of realistic UK document test cases through `clearStepsEngine.js` end to end. For each document it prints:
- Trust classification line: category, severity, mode, quality
- All six cue cards with short_answer and steps
- A structured summary (deadline, amounts extracted)
- Pass/fail checks against known-correct expected values

The document set and known-correct values live in `references/test-documents.md`. Known engine quirks and historical gotchas live in `references/known-gotchas.md`. Read those files before interpreting results.

## How to Run

From the project root (`claude main`):

```
node .claude/skills/northcue-engine-test/scripts/run_engine_tests.js
```

The script requires no npm packages beyond what is already in `ClearSteps-/node_modules`. It imports `clearStepsEngine.js` directly.

## Interpreting Output

- `PASS` = engine produced the expected value for a known-correct assertion
- `FAIL` = engine did not produce the expected value — check `references/known-gotchas.md` first to see whether this is a pre-existing known limitation before treating it as a regression
- `NOTE` = known limitation or expected quirk, not a regression

When comparing to a previous run, look for any PASS→FAIL changes (regressions) or FAIL→PASS changes (fixes). Do not be alarmed by pre-existing FAILs that are documented in known-gotchas.md.

## Files in This Skill

```
SKILL.md                         ← this file
references/test-documents.md     ← all test documents with what they test
references/known-gotchas.md      ← real gotchas discovered in this project
scripts/run_engine_tests.js      ← the executable test runner
```
