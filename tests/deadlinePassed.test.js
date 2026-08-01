// Guards the one thing Northcue says about a date relative to today: that it
// has gone.
//
// The arithmetic is on the CLIENT, and these tests exist because that decision
// has consequences a server-side test would not catch. The engine emits
// deadline_iso as a fixed string and knows nothing about today, so the
// regression baseline is byte identical before and after this feature. Nothing
// in scripts/engine-baseline can tell you whether this works.
//
// Three properties matter more than the wording:
//   it is recomputed on every render, so a tab left open overnight is right
//   it is gated only on deadline_iso, so every engine rule is inherited
//   it never appears on the reading-aid path, whose date is a guess

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const { hasPassed } = require(path.join(ROOT, "public", "deadlineStatus"));
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(ROOT, "scripts", "engine-baseline", "corpus"));

// The bank runtime and the English bank are UMD browser files; requiring them
// in node attaches them to globalThis the same way.
require(path.join(ROOT, "public", "i18n", "templates-en"));
const bank = require(path.join(ROOT, "public", "i18n", "templateBank"));

const APP_JS = fs.readFileSync(path.join(ROOT, "public", "app.js"), "utf8");
const EN = fs.readFileSync(path.join(ROOT, "public", "i18n", "en.js"), "utf8");

function analyse(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "passed-test" }
  });
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// The map is READ OUT OF app.js rather than restated here. A copy would mean
// these tests kept passing while the real gate changed underneath them, which
// is exactly what happened when this file first carried its own: adding the
// reading-aid template to app.js failed nothing.
function parsedKeyMap() {
  const block = /const DEADLINE_PASSED_KEYS = \{([\s\S]*?)\};/.exec(APP_JS);
  assert.ok(block, "DEADLINE_PASSED_KEYS not found in app.js");
  const map = {};
  const entry = /"([^"]+)":\s*"([^"]+)"/g;
  let match;
  while ((match = entry.exec(block[1])) !== null) map[match[1]] = match[2];
  return map;
}

const KEY_MAP = parsedKeyMap();

// What the client will decide for a corpus document at a given moment, built
// from exactly the inputs renderCard uses.
function lineKeyFor(id, now) {
  const result = analyse(byId(id)).api_output.structured_result;
  const iso = result.summary.deadline_iso;
  if (!iso) return null;
  const key = KEY_MAP[bank.templateIdFor(result.cards[3].simple_explanation)];
  if (!key) return null;
  return hasPassed(iso, now) ? key : null;
}

const day = (iso) => new Date(iso + "T12:00:00");

// ------------------------------------------------------------- the boundary

test("a deadline has passed only when the day is behind the reader's today", async (t) => {
  await t.test("the day before is passed", () => {
    assert.equal(hasPassed("2026-04-01", day("2026-04-02")), true);
    assert.equal(hasPassed("2026-04-01", day("2027-01-01")), true);
  });

  await t.test("the day itself is NOT passed", () => {
    // Strictly before. The today bucket is deliberately not built, so the only
    // claim this can make is one that holds for a whole calendar day.
    assert.equal(hasPassed("2026-04-01", day("2026-04-01")), false);
  });

  await t.test("a future day is not passed", () => {
    assert.equal(hasPassed("2026-09-30", day("2026-04-01")), false);
  });

  await t.test("the boundary is the reader's local midnight, not UTC", () => {
    // 23:30 on 1 April in a zone ahead of UTC is still 1 April to the reader,
    // and 22:30 UTC. Reading the day in UTC would call the deadline passed an
    // hour and a half early, every night, during British Summer Time.
    const lateOn1April = new Date(2026, 3, 1, 23, 30, 0);
    assert.equal(hasPassed("2026-04-01", lateOn1April), false);
    const justAfterMidnight = new Date(2026, 3, 2, 0, 5, 0);
    assert.equal(hasPassed("2026-04-01", justAfterMidnight), true);
  });

  await t.test("anything that is not a well formed ISO day answers false", () => {
    [null, undefined, "", "2026-04", "2026-4-1", "1 April 2026", "03/06/2026",
     "2026-04-01T00:00:00Z", 20260401, {}].forEach((value) => {
      assert.equal(hasPassed(value, day("2027-01-01")), false, JSON.stringify(value));
    });
  });
});

test("the answer is recomputed, never remembered", async (t) => {
  // The staleness property. A tab left open overnight must be right in the
  // morning, so the clock is read at call time and nothing is cached.
  await t.test("the same date answers differently either side of midnight", () => {
    const deadline = "2026-04-01";
    assert.equal(hasPassed(deadline, new Date(2026, 3, 1, 23, 59, 0)), false, "before midnight");
    assert.equal(hasPassed(deadline, new Date(2026, 3, 2, 0, 0, 1)), true, "after midnight");
  });

  await t.test("a corpus document flips as the clock crosses its deadline", () => {
    assert.equal(lineKeyFor("court_fine", day("2026-09-29")), null);
    assert.equal(lineKeyFor("court_fine", day("2026-09-30")), null, "the day itself says nothing");
    assert.equal(lineKeyFor("court_fine", day("2026-10-01")), "journey.deadlinePassed");
  });

  await t.test("renderCard reads the clock rather than a stored value", () => {
    // Structural, because the property is about WHEN the call happens. The
    // helper takes no now argument at the call site, so it reads the device
    // clock on every render, and it is called from inside renderCard.
    assert.match(APP_JS, /return NorthcueDeadlineStatus\.hasPassed\(deadlineIso\) \? t\(key\) : null;/,
      "the client must not pass a captured timestamp");
    const renderCard = APP_JS.slice(APP_JS.indexOf("function renderCard()"));
    assert.match(renderCard.slice(0, renderCard.indexOf("\n}\n")), /passedDeadlineLine\(card\)/,
      "the line must be built inside renderCard, not once per result");
  });
});

// ----------------------------------------------------------------- the gates

test("the line is gated on deadline_iso alone, so every engine rule is inherited", async (t) => {
  const FAR_FUTURE = day("2030-01-01");

  await t.test("the five fully supported documents show it", () => {
    const EXPECTED = {
      council_tax: "journey.deadlinePassed",
      energy_bill: "journey.deadlinePassed",
      water_bill: "journey.deadlinePassed",
      appointment_nhs: "journey.appointmentDatePassed",
      multi_document_split: "journey.deadlinePassed"
    };
    Object.entries(EXPECTED).forEach(([id, key]) => {
      assert.equal(lineKeyFor(id, FAR_FUTURE), key, id);
    });
  });

  await t.test("an appointment gets its own sentence", () => {
    // "This date has already passed." under "Your appointment is on 1 July
    // 2026." reads as a missed appointment, which is a different thing to have
    // missed than a payment.
    assert.equal(lineKeyFor("appointment_nhs", FAR_FUTURE), "journey.appointmentDatePassed");
    assert.notEqual(lineKeyFor("council_tax", FAR_FUTURE), "journey.appointmentDatePassed");
  });

  await t.test("nothing on a garbled document", () => {
    ["ocr_council_tax", "ocr_energy_bill", "ocr_enforcement", "ocr_heavy_damage"].forEach((id) => {
      assert.equal(analyse(byId(id)).structured_output.trust_internal.garbled_by_ocr, true, id + ": premise");
      assert.equal(lineKeyFor(id, FAR_FUTURE), null, id);
    });
  });

  await t.test("nothing on a suspected scam", () => {
    assert.equal(analyse(byId("scam_phishing")).structured_output.trust_internal.processing_mode,
      "verification_only", "premise");
    assert.equal(lineKeyFor("scam_phishing", FAR_FUTURE), null);
  });

  await t.test("nothing on a fused multi letter upload", () => {
    ["multi_document", "multi_document_greetings"].forEach((id) => {
      assert.equal(analyse(byId(id)).structured_output.extractor_internal.multi_letter_state,
        "fused", id + ": premise");
      assert.equal(lineKeyFor(id, FAR_FUTURE), null, id);
    });
  });

  await t.test("nothing on a date with no single reading", () => {
    ["ambiguous_numeric_date", "short_year_date"].forEach((id) => {
      assert.equal(lineKeyFor(id, FAR_FUTURE), null, id);
    });
  });

  await t.test("nothing on a relative period", () => {
    assert.equal(lineKeyFor("housing_letter", FAR_FUTURE), null);
  });
});

test("the line never reaches the reading-aid path", async (t) => {
  // The scope rule, and the reason for it: that path's date comes from
  // unclaimedDates[0], the first-date-in-document-order guess D-8 records, and
  // D-5 shows it picking the wrong date on insurance_letter. A line saying a
  // date has passed is worth no more than the date under it.
  await t.test("every aid-path document with a deadline_iso still shows nothing", () => {
    const onAid = CORPUS.filter((entry) => {
      const run = analyse(entry.text);
      return Boolean(run.structured_output.extractor_internal.readable_unsupported_signals) &&
        Boolean(run.api_output.structured_result.summary.deadline_iso);
    });
    assert.ok(onAid.length >= 5, "premise: only " + onAid.length + " aid documents carry an iso date");
    onAid.forEach((entry) => {
      assert.equal(lineKeyFor(entry.id, day("2030-01-01")), null, entry.id);
    });
  });

  await t.test("insurance_letter specifically, the document D-5 names", () => {
    const run = analyse(byId("insurance_letter"));
    assert.equal(run.api_output.structured_result.summary.deadline_iso, "2026-07-01",
      "premise: it has a resolvable date, and D-5 says it is the wrong one");
    assert.equal(lineKeyFor("insurance_letter", day("2030-01-01")), null);
  });

  await t.test("the gate is the bank id, not the card number", () => {
    // Card 4 on the aid path carries tpl.date.primary, which is not in the map.
    assert.equal(bank.templateIdFor("The document shows 1 July 2026 as the date that matters. Check the original document."),
      "tpl.date.primary");
    assert.equal(bank.templateIdFor("Due by 1 April 2026."), "tpl.deadline.due");
    assert.equal(bank.templateIdFor("Your appointment is on 1 July 2026."), "tpl.deadline.appointment");
  });

  await t.test("app.js maps exactly the two supported-path sentences and no others", () => {
    // Read from app.js, so widening it there fails here. The aid path's
    // sentence is the one that must never appear, and D-5 and D-8 are why.
    assert.deepEqual(KEY_MAP, {
      "tpl.deadline.due": "journey.deadlinePassed",
      "tpl.deadline.appointment": "journey.appointmentDatePassed"
    });
  });
});

// ------------------------------------------------------------- the sentences

test("the two sentences, and what they may not say", async (t) => {
  // Derived from config, never copied: a language added there must be covered
  // here without anyone remembering to edit this list.
  const config = require(path.join(ROOT, "public", "i18n", "config.js"));
  const LANGUAGES = config.languages.map((entry) => entry.code);
  const KEYS = ["journey.deadlinePassed", "journey.appointmentDatePassed"];

  await t.test("both exist in all ten languages", () => {
    LANGUAGES.forEach((code) => {
      const source = fs.readFileSync(path.join(ROOT, "public", "i18n", code + ".js"), "utf8");
      KEYS.forEach((key) => {
        assert.match(source, new RegExp('"' + key.replace(".", "\\.") + '":\\s*"[^"]+"'),
          code + " is missing " + key);
      });
    });
  });

  await t.test("no numeral in any of them", () => {
    // A day count would need a template per plural category per language:
    // Romanian takes "de" above nineteen, Polish inflects separately for one.
    // Bucketed vocabulary with no number is what avoids that entirely.
    LANGUAGES.forEach((code) => {
      const source = fs.readFileSync(path.join(ROOT, "public", "i18n", code + ".js"), "utf8");
      KEYS.forEach((key) => {
        const value = new RegExp('"' + key.replace(".", "\\.") + '":\\s*"([^"]+)"').exec(source)[1];
        assert.doesNotMatch(value, /[0-9]/, code + " " + key + ": " + value);
        assert.doesNotMatch(value, /[–—]/, code + " " + key + " has a dash");
      });
    });
  });

  await t.test("the English states a property of the date, not a fact about the reader", () => {
    // Unicode lookarounds rather than \b, per the word boundary rule: \b is
    // ASCII only. These read English, but the rule is file wide and the habit
    // is the point.
    const word = (terms) => new RegExp("(?<!\\p{L})(?:" + terms + ")(?!\\p{L})", "iu");
    const value = (key) => new RegExp('"' + key.replace(/\./g, "\\.") + '":\\s*"([^"]+)"').exec(EN)[1];
    KEYS.forEach((key) => {
      const text = value(key);
      assert.match(text, /^This /, key + ": the subject must be the date");
      assert.doesNotMatch(text, word("you|your"), key + ": must not be about the reader");
      assert.doesNotMatch(text, word("must|should|need|contact|pay"), key + ": must not instruct");
      assert.doesNotMatch(text, word("missed|failed|late|overdue"), key + ": must not assign fault");
    });
  });
});

test("card 4 stays as calm as the severity system made it", async (t) => {
  // The line must not raise the temperature of the card it sits on. Status is
  // decided by statusFromTrustAndSeverity and is untouched by any of this, so
  // this asserts the premise the wording depends on.
  await t.test("council_tax card 4 is still a low severity, non urgent card", () => {
    const run = analyse(byId("council_tax"));
    assert.equal(run.structured_output.trust_internal.severity_level, "low");
    assert.equal(run.api_output.structured_result.cards[3].status, "normal");
    assert.equal(lineKeyFor("council_tax", day("2030-01-01")), "journey.deadlinePassed",
      "and it does carry the line, so the two coexist");
  });

  await t.test("nothing about the line is in the structured result at all", () => {
    // It is client rendered, so the engine's own output cannot have gained a
    // warning, a status or a key point from it.
    CORPUS.forEach((entry) => {
      const cards = analyse(entry.text).api_output.structured_result.cards;
      cards.forEach((card) => {
        const text = [card.simple_explanation, card.read_aloud_text]
          .concat(card.key_points || []).join(" ");
        assert.doesNotMatch(text, /has already passed/, entry.id + " card " + card.card_number);
      });
    });
  });
});
