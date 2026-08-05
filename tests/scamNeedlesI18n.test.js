// P2 OF THE SCAM-PARITY LADDER, pinned per language. The per-language
// decisive needles mirror the English decisive twelve, never wider:
// credential-harvest asks, the gift card, the suspension threat. Labels are
// the same strings the English needles emit, so tests/refusalPathTranslation
// holds them to the banks automatically.
//
// Each language is measured against three zero-fire sets before its needles
// land: every non-scam corpus document, the full measured sweep slice, and
// the 371-sentence bank (where the needles appear only inside the why-chip
// labels DESCRIBING them, which never pass through detection). Languages
// without scam corpus documents are pinned with CONSTRUCTED asks, the
// recorded Hindi credential precedent: they prove the needles CAN fire, not
// that they fire on what a real scam letter writes.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "scam-needles-i18n" };
const SCAM_ID = /scam|smish|phish/i;

function trustOf(text) {
  return runClearStepsEngine({ extractedText: text, fileMeta: META }).api_output.trust;
}

// Per language: measured must-fires from the corpus (real scam documents),
// constructed must-fires where no scam document exists (marked), and the
// needle count pinned so the report cannot drift from the engine.
const PINS = {
  pl: {
    needleCount: 18,
    measured: [
      ["polish_phishing", ["Asks for a full password, which real organisations never request.",
        "Asks for card number and PIN together.",
        "Threatens to suspend your account within a short time."]]
    ],
    constructed: []
  },
  es: {
    needleCount: 12,
    measured: [
      ["scam_hmrc_refund_es", ["Threatens to suspend your account within a short time."]]
    ],
    constructed: [
      ["a password ask, the class the es scam corpus does not yet contain",
        "Agencia Tributaria\nReferencia: ES-4471\nFecha: 14 de julio de 2026\n\n" +
        "Para recibir su reembolso, introduzca su contraseña completa en el portal.",
        "Asks for a full password, which real organisations never request."]
    ]
  },
  fr: {
    needleCount: 11,
    measured: [
      ["scam_bank_security_fr", ["Threatens to suspend your account within a short time."]]
    ],
    constructed: [
      ["a password ask, the class the fr scam corpus does not yet contain",
        "Service des Impôts\nRéférence : FR-2210\nDate : 14 juillet 2026\n\n" +
        "Pour recevoir votre remboursement, saisissez votre mot de passe complet.",
        "Asks for a full password, which real organisations never request."]
    ]
  }
};

Object.keys(PINS).forEach((lang) => {
  const pin = PINS[lang];

  test(lang + ": the translated decisive needles fire where measured and nowhere genuine", async (t) => {
    for (const [id, labels] of pin.measured) {
      await t.test("measured: " + id, () => {
        const doc = CORPUS.find((d) => d.id === id);
        assert.ok(doc, id + " is in the corpus");
        const trust = trustOf(doc.text);
        labels.forEach((label) => {
          assert.ok((trust.scam_signals || []).includes(label),
            id + " should carry: " + label);
        });
        assert.equal(trust.processing_mode, "verification_only");
      });
    }
    for (const [gloss, text, label] of pin.constructed) {
      await t.test("constructed: " + gloss, () => {
        const trust = trustOf(text);
        assert.ok((trust.scam_signals || []).includes(label),
          "the constructed ask did not fire: " + text);
      });
    }
    await t.test("zero fires on every genuine corpus document", () => {
      const engine = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
      const source = require("fs").readFileSync(
        path.join(__dirname, "..", "src", "services", "clearStepsEngine.js"), "utf8");
      // The needles for this language, read from the engine source block, so
      // this loop cannot drift from what actually ships.
      assert.ok(engine, "premise");
      const genuineCarrying = [];
      CORPUS.filter((d) => !SCAM_ID.test(d.id)).forEach((d) => {
        const trust = trustOf(d.text);
        const translatedLabels = (trust.scam_signals || []);
        if (trust.processing_mode === "verification_only" &&
            !SCAM_ID.test(d.id)) {
          genuineCarrying.push(d.id + ": " + translatedLabels.join(" | "));
        }
      });
      assert.deepEqual(genuineCarrying, [],
        "a genuine document is refused as a scam: " + genuineCarrying.join("\n"));
      assert.ok(source.includes("DECISIVE_SCAM_CHECKS_I18N"), "the tier exists");
    });
  });
});

test("the needle counts a reviewer is asked to check", async (t) => {
  await t.test("pinned per language", () => {
    const source = require("fs").readFileSync(
      path.join(__dirname, "..", "src", "services", "clearStepsEngine.js"), "utf8");
    const block = source.split("DECISIVE_SCAM_CHECKS_I18N = {")[1].split("\n};")[0];
    Object.keys(PINS).forEach((lang) => {
      const match = new RegExp("  " + lang + ": \\[([\\s\\S]*?)\\n  \\]").exec(block);
      assert.ok(match, lang + " has a needle block");
      const count = (match[1].match(/\[\s*"/g) || []).length;
      assert.equal(count, PINS[lang].needleCount,
        lang + " needle count drifted from the pinned report");
    });
  });
});
