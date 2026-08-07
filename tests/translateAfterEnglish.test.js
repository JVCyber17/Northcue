// THE TRANSLATE-AFTER-ENGLISH PIPELINE, pinned through a stubbed provider.
//
// Approved by the founder on 6 August 2026: for every launched non-English
// reader the prose call generates the six cards in ENGLISH, the full English
// guard stack runs on them exactly as for an English reader, then a second
// call translates the guarded cards into the reader's language and that
// language's verified guard vocabulary runs on the translation. Any
// translation failure falls back to the bank cards; never a lost session.
//
// The pipeline sits behind config.launch.proseArchitecture. These tests
// drive the flag both ways, so the pre-flip behaviour (generate-in-language)
// is held in place until the founder's flip commit, and the post-flip
// behaviour is fully proven before that commit exists.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const config = require(path.join(ROOT, "public", "i18n", "config.js"));

// The stub exists BEFORE the service loads. It distinguishes the two calls
// by their system prompts: generation returns the English benchmark
// candidate; translation reads the ACTUAL guarded cards from the user
// message and transforms every reader-facing string, which guarantees the
// shape contract holds and marks the output as having been translated.
const captured = [];
// translate | http_500 | abort | five_cards | alter_value | invent_value |
// native_digits | { append: sentence } (appended to card 3's headline, so
// shape and digit parity hold and the vocabulary guard is isolated)
let translationMode = "translate";
const MARKER = "અનુવાદ ";

// Digit-free proof sentences per open language, so a vocabulary proof can
// ride through the value-parity guard without touching it. Each fire
// sentence was checked against the real vocabulary pattern; the keep
// sentences are the measured keeps from the wired-guard proofs.
const PROOFS = {
  gu: { fire: "ચુકવણી કરવી જરૂરી છે.", keep: "તમારે કોઈ કાર્યવાહી કરવાની જરૂર નથી." },
  hi: { fire: "आपको भुगतान करना होगा।", keep: "मूल दस्तावेज में विवरण जांचें।" },
  // The wave-two six, verified against the live patterns on 7 August 2026
  // before the flags opened, digit-free like the first pair.
  fr: { fire: "Vous devez payer immédiatement.", keep: "Vous pouvez vérifier le document original." },
  ro: { fire: "Trebuie să achitați suma restantă.", keep: "Puteți verifica documentul original." },
  es: { fire: "Debe pagar la cantidad indicada.", keep: "Puede comprobar el documento original." },
  pt: { fire: "Tem de pagar o valor em dívida.", keep: "Pode verificar o documento original." },
  bn: { fire: "টাকা পরিশোধ করতে হবে।", keep: "মূল নথি যাচাই করা যেতে পারে।" },
  pa: { fire: "ਭੁਗਤਾਨ ਕਰਨਾ ਹੋਵੇਗਾ।", keep: "ਮੂਲ ਦਸਤਾਵੇਜ਼ ਦੀ ਜਾਂਚ ਕੀਤੀ ਜਾ ਸਕਦੀ ਹੈ।" },
  // pl joined 7 August 2026 with the founder's pl-33 resolution and the flag.
  pl: { fire: "Kwota musi zostać zapłacona w całości.", keep: "Można sprawdzić oryginalny dokument." }
};

function translatedFrom(source) {
  const clone = JSON.parse(JSON.stringify(source));
  clone.cards.forEach((card) => {
    ["title", "simple_explanation", "read_aloud_text"].forEach((field) => {
      if (typeof card[field] === "string" && card[field]) card[field] = MARKER + card[field];
    });
    if (Array.isArray(card.key_points)) {
      card.key_points = card.key_points.map((point) => MARKER + point);
    }
  });
  return clone;
}

const realFetch = global.fetch;
global.fetch = async (url, options) => {
  if (!String(url).includes("openai")) return realFetch(url, options);
  const body = JSON.parse(options.body);
  captured.push(body);
  const system = body.input.find((m) => m.role === "system").content;

  if (system.startsWith("You translate Northcue cue cards")) {
    if (translationMode === "http_500") {
      return { ok: false, status: 500, json: async () => ({}), text: async () => "" };
    }
    if (translationMode === "abort") {
      const abort = new Error("aborted");
      abort.name = "AbortError";
      throw abort;
    }
    const source = JSON.parse(body.input.find((m) => m.role === "user").content);
    const translated = translatedFrom(source);
    if (translationMode === "five_cards") translated.cards = translated.cards.slice(0, 5);
    if (translationMode === "alter_value") {
      const card = translated.cards.find((c) => (c.key_points || []).some((p) => /\d/.test(p)));
      card.key_points = card.key_points.map((p) =>
        p.replace(/\d/, (d) => String((Number(d) + 1) % 10)));
    }
    if (translationMode === "invent_value") {
      translated.cards[0].simple_explanation += " Ref 4499.";
    }
    if (translationMode === "native_digits") {
      const card = translated.cards.find((c) => (c.key_points || []).some((p) => /\d/.test(p)));
      card.key_points = card.key_points.map((p) =>
        p.replace(/\d/g, (d) => "०१२३४५६७८९"[Number(d)]));
    }
    if (translationMode && translationMode.append) {
      translated.cards[2].simple_explanation += " " + translationMode.append;
    }
    return {
      ok: true, status: 200,
      json: async () => ({ output_text: JSON.stringify(translated) }),
      text: async () => ""
    };
  }

  const FIXTURE = require(path.join(ROOT, "tests", "fixtures", "english-benchmark-candidates.json"));
  return {
    ok: true, status: 200,
    json: async () => ({ output_text: JSON.stringify(FIXTURE.candidates.council_tax) }),
    text: async () => ""
  };
};

const ai = require(path.join(ROOT, "src", "services", "aiStructuredResultService"));
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(ROOT, "scripts", "engine-baseline", "corpus"));
const CORPUS_FACTS = require(path.join(ROOT, "tests", "fixtures", "corpus-facts.json"));

async function runFor(language) {
  captured.length = 0;
  const doc = CORPUS.find((d) => d.id === "council_tax");
  const rulesRun = runClearStepsEngine({
    extractedText: doc.text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "translate-pin-" + language },
    facts: CORPUS_FACTS.council_tax || null
  });
  const applied = await ai.applySafetyPassAndRecordAiStatus({
    rulesRun, extractedText: doc.text, language
  });
  return applied.api_output;
}

test("the translate-after-English pipeline", async (t) => {
  const savedKey = process.env.OPENAI_API_KEY;
  const savedArchitecture = config.launch.proseArchitecture;
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
  config.launch.proseArchitecture = "translate";

  try {
    await t.test("a launched reader: English generation, then translation, served translated", async () => {
      translationMode = "translate";
      const output = await runFor("gu");
      assert.equal(captured.length, 2, "exactly two provider calls");
      const generationSystem = captured[0].input.find((m) => m.role === "system").content;
      assert.ok(generationSystem.includes("Use UK English"),
        "the first call must generate English");
      assert.ok(!generationSystem.includes("own script"),
        "the first call must carry no write-in instruction");
      const translationSystem = captured[1].input.find((m) => m.role === "system").content;
      assert.ok(translationSystem.includes("Gujarati"), "the second call names the reader's language");
      // Founder's decision, 6 August 2026: the name on the card must match
      // the name on the paper letter exactly, so names ride in Latin script.
      assert.ok(translationSystem.includes("organisation and sender names") &&
        translationSystem.includes("Never transliterate"),
        "the translation prompt must hold names in Latin script, letter for letter");
      assert.equal(output.debug.ai.ai_status, "completed");
      assert.equal(output.debug.ai.ai_used, true);
      output.structured_result.cards.forEach((card) => {
        assert.ok(card.simple_explanation.startsWith(MARKER),
          "served cards must be the translated cards");
      });
      assert.ok(output.display_text.includes(MARKER), "display text follows the served cards");
      assert.ok(output.tts_script.includes(MARKER), "tts follows the served cards");
      // THE PHONE NUMBER GATE, the founder's hard condition, at unit level.
      // The engine's protected contact line rides through English guarding,
      // is translated, and the post-translation guard must NOT eat the
      // number. The first pipeline run did exactly that: the full English
      // stripper ran on the translation, its byte-identical exemption can
      // never match a translated sentence, and its language-blind rule 5
      // substituted the number away. The translation guard is vocabulary
      // only, so this stays.
      const contactCard = output.structured_result.cards[2];
      assert.ok(JSON.stringify(contactCard).includes("020 8583 4242"),
        "the contact number must survive translation and the translation guard");
    });

    await t.test("the translation call sends the guarded cards, not the document", async () => {
      translationMode = "translate";
      await runFor("gu");
      const userContent = captured[1].input.find((m) => m.role === "user").content;
      const sent = JSON.parse(userContent);
      assert.ok(Array.isArray(sent.cards) && sent.cards.length === 6,
        "the translation input is the six guarded cards");
      // The generation call's user message carries the quality preamble and
      // the redacted document text; the translation call must carry neither.
      // (A single letter line CAN legitimately appear inside the cards: card
      // five quotes the letter by design, so the probe is the wrapping, not
      // the presence of any one sentence.)
      assert.ok(!userContent.includes("Document quality (from the rules engine)"),
        "the translation call must not carry the generation preamble");
      assert.ok(!userContent.includes("Document text for in-memory analysis"),
        "the translation call must not carry the document text block");
    });

    await t.test("an English reader: one call, nothing changed", async () => {
      translationMode = "translate";
      const output = await runFor("en");
      assert.equal(captured.length, 1, "an English reader makes exactly one provider call");
      assert.equal(output.debug.ai.ai_status, "completed");
      output.structured_result.cards.forEach((card) => {
        assert.ok(!String(card.simple_explanation).includes(MARKER));
      });
    });

    await t.test("Latin and Indic script languages ride the same path", async () => {
      translationMode = "translate";
      config.launch.open.push("pl");
      try {
        await runFor("pl");
        assert.equal(captured.length, 2);
        const translationSystem = captured[1].input.find((m) => m.role === "system").content;
        assert.ok(translationSystem.includes("Polish"),
          "a Latin-script language uses the identical translation stage");
      } finally {
        config.launch.open.pop();
      }
    });

    await t.test("translation HTTP failure falls back to the bank cards", async () => {
      translationMode = "http_500";
      const output = await runFor("gu");
      assert.equal(output.debug.ai.ai_status, "fallback");
      assert.equal(output.debug.ai.ai_used, false);
      assert.equal(output.debug.ai.ai_error_code, "translation_http_500");
      output.structured_result.cards.forEach((card) => {
        assert.ok(!String(card.simple_explanation).includes(MARKER),
          "a failed translation must never be served");
      });
    });

    await t.test("translation timeout falls back with its own code", async () => {
      translationMode = "abort";
      const output = await runFor("gu");
      assert.equal(output.debug.ai.ai_status, "fallback");
      assert.equal(output.debug.ai.ai_error_code, "translation_timeout");
    });

    await t.test("a shape-breaking translation is refused, digit-free record", async () => {
      translationMode = "five_cards";
      const output = await runFor("gu");
      assert.equal(output.debug.ai.ai_status, "fallback");
      assert.equal(output.debug.ai.ai_error_code, "translation_invalid");
      const recorded = output.debug.ai.validation_errors || [];
      assert.ok(recorded.length > 0, "the shape error is recorded");
      recorded.forEach((message) => {
        assert.ok(!/\d/.test(message), "shape messages must be digit-free: " + message);
      });
    });

    await t.test("a translation that alters a value falls back, digit-free record", async () => {
      translationMode = "alter_value";
      const output = await runFor("gu");
      assert.equal(output.debug.ai.ai_status, "fallback");
      assert.equal(output.debug.ai.ai_error_code, "translation_value_mismatch");
      (output.debug.ai.validation_errors || []).forEach((message) => {
        assert.ok(!/\d/.test(message), "parity messages must be digit-free: " + message);
      });
    });

    await t.test("a translation that invents a value falls back", async () => {
      translationMode = "invent_value";
      const output = await runFor("gu");
      assert.equal(output.debug.ai.ai_status, "fallback");
      assert.equal(output.debug.ai.ai_error_code, "translation_value_mismatch");
    });

    await t.test("native-script digits are the same value, not an alteration", async () => {
      translationMode = "native_digits";
      const output = await runFor("gu");
      assert.equal(output.debug.ai.ai_status, "completed",
        "a digit's script is presentation; parity must not fail the session over it");
    });

    // THE OPEN LANGUAGES' PROOF SENTENCES, re-run through the new path: the
    // fire sentence is stripped from a served translation, the keep sentence
    // survives one, per launched language, full pipeline.
    for (const code of config.launch.open) {
      await t.test(code + ": the vocabulary fires and keeps on the translation, full path", async () => {
        const proofs = PROOFS[code];
        assert.ok(proofs, "premise: proof sentences exist for " + code);

        translationMode = { append: proofs.fire };
        let output = await runFor(code);
        assert.equal(output.debug.ai.ai_status, "completed");
        assert.ok(!output.structured_result.cards[2].simple_explanation.includes(proofs.fire.slice(0, 10)),
          code + ": a command planted in the translation must be stripped");

        translationMode = { append: proofs.keep };
        output = await runFor(code);
        assert.equal(output.debug.ai.ai_status, "completed");
        assert.ok(output.structured_result.cards[2].simple_explanation.includes(proofs.keep.slice(0, 10)),
          code + ": a safe sentence must survive the translation guard");
      });
    }

    await t.test("parity unit truths: lost, altered, invented, currency, native digits", () => {
      const source = { cards: [{ card_id: "what_is_this", simple_explanation: "The bill is £129.16.", key_points: ["Due 5 August 2026."] }], summary: {} };
      const clone = () => JSON.parse(JSON.stringify(source));
      const lost = clone(); lost.cards[0].key_points = ["Due August."];
      const altered = clone(); altered.cards[0].simple_explanation = "The bill is £129.17.";
      const invented = clone(); invented.cards[0].key_points = ["Due 5 August 2026.", "Quote 999."];
      const currency = clone(); currency.cards[0].simple_explanation = "The bill is $129.16.";
      const native = clone(); native.cards[0].key_points = ["Due ५ August २०२६."];
      assert.ok(ai.translationValueParityErrors(lost, source).length, "a lost value is caught");
      assert.ok(ai.translationValueParityErrors(altered, source).length, "an altered value is caught");
      assert.ok(ai.translationValueParityErrors(invented, source).length, "an invented value is caught");
      assert.ok(ai.translationValueParityErrors(currency, source).length, "a currency swap is caught");
      assert.equal(ai.translationValueParityErrors(native, source).length, 0, "native digits pass");
      assert.equal(ai.translationValueParityErrors(clone(), source).length, 0, "identity passes");
    });

    await t.test("with the flag on generate, the old path is untouched", async () => {
      translationMode = "translate";
      config.launch.proseArchitecture = "generate";
      try {
        const output = await runFor("gu");
        assert.equal(captured.length, 1, "generate architecture makes one call");
        const system = captured[0].input.find((m) => m.role === "system").content;
        assert.ok(system.includes("Gujarati") && system.includes("own script"),
          "generate architecture still writes the reader's language directly");
        assert.equal(output.debug.ai.ai_status, "completed");
      } finally {
        config.launch.proseArchitecture = "translate";
      }
    });
  } finally {
    translationMode = "translate";
    config.launch.proseArchitecture = savedArchitecture;
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedKey;
  }
});
