// THE GUARD WIRING, per the founder's decision of 6 August 2026: the nine
// verified vocabularies wired into the stripper behind the launch flag, so
// the verified guards and the launched guards are the same thing. Every
// sentence below is a pinned sentence from the language's vocabulary test
// file, which remains the measured record; if this module drifts from
// those files, these pins go red.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const config = require(path.join(ROOT, "public", "i18n", "config.js"));
const ai = require(path.join(ROOT, "src", "services", "aiStructuredResultService"));

const REPLACEMENT = "Check the original document to see whether a response or action is needed.";
const CREDENTIAL_REPLACEMENT = "Check the original document. Do not share personal or banking details.";

// One measured must-fire and one measured must-keep per language, from the
// committed vocabulary files.
const SENTENCES = {
  es: {
    fire: "El pago de £486.20 debe hacerse antes del 31 de julio de 2026.",
    keep: "Debe llegar quince minutos antes."
  },
  fr: {
    fire: "Le montant de £214.63 doit être payé avant le 28 mai 2026.",
    keep: "Il faut arriver quinze minutes avant l'heure du rendez-vous."
  },
  pt: {
    fire: "O pagamento deve ser feito até 28 de maio de 2026.",
    keep: "Deve chegar quinze minutos antes da hora marcada."
  },
  ro: {
    fire: "Suma de £486.20 trebuie plătită până la 31 July 2026.",
    keep: "Trebuie să ajungeți cu 15 minute mai devreme."
  },
  pl: {
    fire: "Kwota £1,381.50 musi być zapłacona do 28 maja 2026.",
    keep: "To jest pilne. Być może trzeba działać jeszcze dziś."
  },
  hi: {
    fire: "भुगतान 3 सितंबर 2026 तक करना होगा।",
    keep: "मूल दस्तावेज में विवरण जांचें।"
  },
  bn: {
    fire: "৭ জুলাই ২০২৬ তারিখের মধ্যে বকেয়া পরিশোধ করতে হবে।",
    keep: "টাকা 2 May 2026 তারিখে নেওয়া হবে।"
  },
  gu: {
    fire: "પ્રથમ હપ્તો 1 એપ્રિલ 2026 સુધી ચૂકવવો જરૂરી છે.",
    keep: "તમારે કોઈ કાર્યવાહી કરવાની જરૂર નથી."
  },
  pa: {
    fire: "ਤੁਹਾਨੂੰ 1 ਜੁਲਾਈ 2026 ਤੱਕ £74.22 ਭੁਗਤਾਨ ਕਰਨਾ ਹੋਵੇਗਾ।",
    keep: "ਭੁਗਤਾਨ 2 ਮਈ 2026 ਤੱਕ ਹੋਵੇਗਾ।"
  }
};

function resultWith(sentence) {
  return { cards: [{ card_id: "what_do_i_need_to_do", simple_explanation: sentence }] };
}

function strippedText(sentence, language) {
  return ai.stripAiViolations(resultWith(sentence), undefined, language)
    .cards[0].simple_explanation;
}

test("with the launch switch open, every wired guard fires and keeps as measured", async (t) => {
  config.launch.open = Object.keys(SENTENCES);
  try {
    for (const lang of Object.keys(SENTENCES)) {
      await t.test(lang + ": the measured command is replaced with the bank sentence", () => {
        assert.equal(strippedText(SENTENCES[lang].fire, lang), REPLACEMENT);
      });
      await t.test(lang + ": the measured keep passes untouched", () => {
        assert.equal(strippedText(SENTENCES[lang].keep, lang), SENTENCES[lang].keep);
      });
      await t.test(lang + ": another language's guard never fires on it", () => {
        // A Gujarati sentence through the Polish guard stays untouched:
        // wiring is per reader language, never a union.
        const other = lang === "gu" ? "pl" : "gu";
        assert.equal(strippedText(SENTENCES[lang].fire, other), SENTENCES[lang].fire);
      });
    }

    await t.test("hi: the credential guard is wired too, both directions", () => {
      assert.equal(strippedText("अपना पिन बताएं।", "hi"), CREDENTIAL_REPLACEMENT);
      assert.equal(strippedText("अपना पिन किसी को न बताएं।", "hi"),
        "अपना पिन किसी को न बताएं।");
    });

    await t.test("the danda splits Indic sentences, so one command costs one sentence", () => {
      const two = "आपका मासिक भुगतान £412.66 है। भुगतान 3 सितंबर 2026 तक करना होगा।";
      assert.equal(strippedText(two, "hi"),
        "आपका मासिक भुगतान £412.66 है। " + REPLACEMENT);
    });

    await t.test("English behaviour is unchanged by the wiring, launched or not", () => {
      // A non-pay command, because the more specific pay rule runs first
      // and has its own replacement, which is the documented rule order.
      assert.equal(strippedText("You must contact the council before Friday.", "en"), REPLACEMENT);
      assert.equal(strippedText("Payment is due by 1 July 2026.", "en"),
        "Payment is due by 1 July 2026.");
    });
  } finally {
    config.launch.open = [];
  }
});

test("the repo's launch list is exactly what is live, nothing more", async (t) => {
  await t.test("unlaunched languages pass untouched; launched languages strip", () => {
    // Derived from the repo's own launch list, so this pin is the truth
    // before the flag commit and after it without an edit: a language not
    // in the list must never strip, and a language in the list must.
    const open = config.launch.open;
    assert.ok(Array.isArray(open));
    Object.keys(SENTENCES).forEach((lang) => {
      if (open.includes(lang)) {
        assert.equal(strippedText(SENTENCES[lang].fire, lang), REPLACEMENT,
          lang + " is launched but its wired guard is not stripping");
      } else {
        assert.equal(strippedText(SENTENCES[lang].fire, lang), SENTENCES[lang].fire,
          lang + " stripped while not launched; the flag is not gating the wiring");
      }
    });
  });
});
