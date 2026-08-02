// Guards the non-document gate after the structural fallback landed.
//
// THE DEFECT. detectProbableNonDocument asked four questions and all four were
// English: a hand-listed vocabulary of organisation words, thirteen English
// reference labels, English month names, and twenty-five English phrases. A
// Polish rent arrears letter and a Spanish water final notice, each carrying a
// sender on line one, an account number on line three, a date on line five, an
// amount, a deadline and a stated consequence, answered no to all four and were
// refused with "This does not look like an official letter or bill."
//
// The two documents that escaped that fate did so only by being MISCLASSIFIED:
// the French appointment letter was read as education and the Polish phishing
// message as government, so the gate never ran on them.
//
// THE FIX IS ADDITIVE. The four English checks are untouched and still run
// first. Only when all four fail does the gate look for structure, and it can
// therefore accept a document it would otherwise refuse and never refuse one it
// would otherwise accept. That property is asserted below rather than assumed.
//
// THE TRADE IS RECORDED HERE, not left to be discovered. Three items that are
// refused today are accepted at a threshold of three: a parcel delivery card, a
// gym flyer, and a sole trader's invoice. They are named, with their verdicts,
// so a future change to the threshold shows up as these expectations moving.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const signals = require(path.join(__dirname, "..", "src", "utils", "documentSignals"));

const analyse = (text) => runClearStepsEngine({
  extractedText: text,
  fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "gate-test" }
});
const refused = (text) => analyse(text).structured_output.trust_internal.is_probable_non_document;
const byId = (id) => CORPUS.find((entry) => entry.id === id).text;

// ─── the adversarial set ─────────────────────────────────────────────────────
//
// Thirteen non documents across four languages, written on 1 August 2026 to
// measure the gate. `accepted` records what the gate does with each one AFTER
// the structural fallback, and `note` says why that is or is not acceptable.
const NON_DOCUMENTS = [
  {
    id: "menu, English, plain", accepted: false, signals: 0,
    note: "the base case. No amount with a currency symbol, no phone, no date, no code, no labels.",
    text: [
      "THE CORNER CAFE", "Breakfast served all day", "",
      "Latte 3.20    Flat white 3.00    Americano 2.80    Espresso 2.40",
      "Croissant, plain or almond 2.50    Toasted teacake with butter 2.80",
      "Bacon roll 4.95    Sausage roll 4.50    Vegetarian breakfast 8.95",
      "Soup of the day with sourdough 6.50    Jacket potato 7.25",
      "All our bread is baked on the premises every morning.",
      "Please order and pay at the counter. Open eight until four every day."
    ].join("\n")
  },
  {
    id: "menu, Polish, with prices and a booking line", accepted: false, signals: 2,
    note: "currency and a phone number, and still refused. This is why the threshold is not two.",
    text: [
      "KAWIARNIA POD LIPA", "Rezerwacje: 020 7946 0123", "",
      "Latte £3.20    Biala kawa £3.00    Americano £2.80    Espresso £2.40",
      "Rogalik migdalowy £2.50    Drozdzowka z maslem £2.80",
      "Bulka z boczkiem £4.95    Sniadanie wegetarianskie £8.95",
      "Zupa dnia z chlebem £6.50    Frytki £3.50",
      "Caly chleb wypiekamy u nas kazdego ranka.",
      "Prosimy zamawiac i placic przy kasie. Otwarte od osmej do szesnastej."
    ].join("\n")
  },
  {
    id: "till receipt, Polish", accepted: true, signals: 5,
    note: "ALREADY accepted before this change, so not part of the trade. A receipt is " +
      "structurally a bill: sender, code, date, amount, labels. Nothing over shape separates them.",
    text: [
      "BIEDRONKA", "ul. Dluga 14, Warszawa", "NIP 5252445719", "",
      "Data: 12 marca 2026", "Paragon nr: 004471/26", "",
      "Chleb razowy        £1.20", "Mleko 2%            £0.95",
      "Jajka 10 szt        £2.40", "Ser zolty           £3.15",
      "Kawa mielona 250g   £4.80", "",
      "RAZEM               £12.50", "Karta               £12.50",
      "Dziekujemy za zakupy. Infolinia 0800 080 8000."
    ].join("\n")
  },
  {
    id: "chat screenshot, Polish", accepted: false, signals: 0,
    note: "a private conversation. Must never be treated as a document, in any language.",
    text: [
      "Kasia", "czesc, jak leci u ciebie",
      "wszystko dobrze, wlasnie wrocilam z pracy a ty",
      "tez dobrze, tylko troche zmeczony po tym tygodniu",
      "jutro sie widzimy tak jak ustalilismy",
      "no pewnie, bede kolo siodmej pod kinem",
      "super, to do zobaczenia jutro, trzymaj sie, dobranoc"
    ].join("\n")
  },
  {
    id: "novel page, Spanish", accepted: false, signals: 0,
    note: "prose. Zero signals in any language.",
    text: [
      "Capitulo tres", "",
      "La manana llego despacio sobre los tejados de la ciudad y el ruido de los coches",
      "subia por la calle estrecha hasta la ventana abierta de la cocina, donde ella",
      "preparaba el desayuno sin ninguna prisa. Habia dormido mal, como casi siempre",
      "desde que se mudaron, y el cansancio le pesaba en los hombros igual que un abrigo",
      "mojado. Fuera, un perro ladraba en el patio de al lado."
    ].join("\n")
  },
  {
    id: "recipe, French", accepted: false, signals: 1,
    note: "two colon lines, which is the labelled-fields signal, and nothing else. Refused.",
    text: [
      "Tarte aux pommes de ma grand-mere", "",
      "Pour la pate: 250 g de farine, 125 g de beurre doux, 1 oeuf, une pincee de sel.",
      "Pour la garniture: six pommes, 80 g de sucre, un peu de cannelle.",
      "Melanger la farine et le beurre jusqu'a obtenir un sable grossier.",
      "Ajouter l'oeuf et l'eau, former une boule et laisser reposer une heure au frais.",
      "Cuire quarante minutes a cent quatre-vingts degres jusqu'a ce que la pate soit doree."
    ].join("\n")
  },
  {
    id: "community poster, Polish", accepted: false, signals: 0,
    note: "a notice, but not one addressed to the reader and not carrying any of their facts.",
    text: [
      "ZEBRANIE MIESZKANCOW", "", "Wspolnota Mieszkaniowa Kwiatowa 14", "",
      "Zapraszamy wszystkich mieszkancow na zebranie, ktore odbedzie sie",
      "w swietlicy na parterze. Bedziemy rozmawiac o remoncie klatki schodowej,",
      "o wymianie domofonu oraz o planie wydatkow na przyszly rok.",
      "Prosimy o liczne przybycie. Kazdy glos jest wazny."
    ].join("\n")
  },
  {
    id: "event flyer, Spanish, with date and phone", accepted: false, signals: 2,
    note: "a date and a phone number and no money. Refused, which is the threshold earning its keep.",
    text: [
      "FIESTA DE PRIMAVERA", "Parque del Retiro", "",
      "Sabado 16 de mayo de 2026, desde las once de la manana",
      "Musica en directo, puestos de comida, juegos para los ninos",
      "Entrada libre para todas las edades",
      "Informacion: 0800 123 4567",
      "Organiza la asociacion de vecinos del barrio"
    ].join("\n")
  },
  {
    id: "parcel delivery card, Polish", accepted: true, signals: 4,
    note: "NEWLY ACCEPTED BY THIS CHANGE. A card telling the reader where their parcel is, " +
      "with a tracking code, a date and a helpline. Arguably something a reader wants explained.",
    text: [
      "DPD Polska", "Awizo", "", "Numer przesylki: 09821447112",
      "Data doreczenia: 5 czerwca 2026", "",
      "Nie zastalismy Panstwa w domu.",
      "Przesylke mozna odebrac w punkcie przy ul. Dlugiej 8.",
      "Infolinia: 0800 900 100", "Prosimy o kontakt w ciagu 7 dni roboczych."
    ].join("\n")
  },
  {
    id: "hotel booking confirmation, French", accepted: true, signals: 5,
    note: "ALREADY accepted before this change, so not part of the trade.",
    text: [
      "Hotel du Parc", "Confirmation de reservation", "",
      "Reference: HDP-77120", "Date d arrivee: 14 juillet 2026",
      "Date de depart: 17 juillet 2026", "Chambre double, petit dejeuner inclus",
      "Montant total: £246.00", "Pour toute question appelez le 0800 224 466"
    ].join("\n")
  },
  {
    id: "gym flyer, Polish, with prices and phone", accepted: true, signals: 3,
    note: "NEWLY ACCEPTED BY THIS CHANGE, and the only one of the three that is " +
      "unambiguously not a document. An advert with prices and an offer end date has " +
      "the same shape as a bill with a deadline. This is the cost of the threshold.",
    text: [
      "SILOWNIA FORMA", "Nowa siedziba przy ul. Sportowej 3", "",
      "Karnet miesieczny £29.99", "Karnet roczny £299.00",
      "Pierwszy trening gratis",
      "Otwarte codziennie od szostej do dwudziestej drugiej",
      "Zapisy: 0800 111 222", "Promocja wazna do 30 czerwca 2026"
    ].join("\n")
  },
  {
    id: "invoice from a small trader, Polish", accepted: true, signals: 5,
    note: "NEWLY ACCEPTED BY THIS CHANGE, and it is a bill. Calling it a non document " +
      "was the older error.",
    text: [
      "USLUGI HYDRAULICZNE JAN NOWAK", "Faktura nr FV/2026/118", "",
      "Data wystawienia: 3 kwietnia 2026", "Termin platnosci: 17 kwietnia 2026", "",
      "Naprawa instalacji wodnej   £180.00", "Wymiana zaworu              £45.00",
      "Razem do zaplaty:           £225.00", "Kontakt: 0800 555 121"
    ].join("\n")
  },
  {
    id: "non_document_recipe (corpus)", accepted: false, signals: 0,
    note: "the entry this gate was built for. Unchanged.",
    text: byId("non_document_recipe")
  }
];

// ─── the property that makes this safe ───────────────────────────────────────

test("the structural fallback is additive and cannot refuse anything", async (t) => {
  await t.test("a document answering any English check is accepted with zero structural signals", () => {
    // "Dear" alone satisfies hasOfficialPhrasing. Nothing else here is a signal:
    // no currency, no phone, no date, no code, no labelled fields. If the
    // fallback were ever reordered above the English checks, this fails.
    const text = [
      "Some heading in plain words", "",
      "Dear reader", "",
      "This is a short letter with no numbers in it at all, written so that the",
      "structural signals cannot fire and only the English phrasing check can.",
      "It is long enough for the quality gate to rate it as good input."
    ].join("\n");
    assert.equal(signals.countDocumentSignals(text), 0, "the fixture must carry no structural signal");
    assert.equal(refused(text), false, "an English marker alone must still accept");
  });

  await t.test("nothing in the corpus or the adversarial set is refused for lacking structure alone", () => {
    // The additive property restated as a check anyone can run: for every item,
    // if any English check passes then it is accepted, whatever its score.
    const englishMarkers = /\b(dear|you must|please pay|amount due|amount payable|balance|payment|outstanding|arrears|your account|on behalf of|we are writing|we have been|notice|summons|claim|benefit|appointment|tax|overdue|direct debit|refund|penalty|policy|assessment|hearing|tribunal)\b/i;
    [...CORPUS.map((e) => ({ id: e.id, text: e.text })), ...NON_DOCUMENTS].forEach((item) => {
      if (!englishMarkers.test(item.text)) return;
      assert.equal(refused(item.text), false,
        item.id + " carries English phrasing and must never be refused");
    });
  });
});

// ─── the two documents this exists to rescue ─────────────────────────────────

test("the two letters the gate used to refuse", async (t) => {
  ["polish_rent_arrears", "spanish_water_final_notice"].forEach((id) => {
    t.test(id, () => {
      const run = analyse(byId(id));
      assert.equal(run.structured_output.trust_internal.is_probable_non_document, false);
      assert.equal(run.api_output.trust.document_category, "unknown");
      assert.equal(run.api_output.trust.processing_mode, "caution");
      assert.notEqual(run.api_output.structured_result.cards[0].simple_explanation,
        "This does not look like an official letter or bill.");
    });
  });

  t.test("they are still only a thin reading aid, which is tier 2's problem", () => {
    // Accepting them did not make the cards good, and this test recorded how
    // little it changed: no deadline, no consequence, severity low.
    //
    // THE DEADLINE HALF IS NOW CLOSED. findDates carries the month names of all
    // nine languages, so "4 września 2026" is a date, the letter date above the
    // greeting is excluded, and card 4 names the day the arrears must be
    // cleared by. Updated rather than deleted, because what it pins is the
    // DISTANCE still left, and the rest of that distance is real.
    const run = analyse(byId("polish_rent_arrears"));
    assert.equal(run.structured_output.extractor_internal.deadline, "4 września 2026",
      "the localised month names should have recovered this");
    // Still missed, and both are vocabulary, not structure. The letter says the
    // association will apply to the district court for an eviction order and
    // that this may cost the reader their home. Nothing in the engine reads
    // Polish, so it is neither a consequence nor a reason to raise severity.
    assert.equal(Boolean(run.structured_output.extractor_internal.has_consequence), false,
      "if this is now true, a Polish consequence is being read and the note above is stale");
    assert.equal(run.api_output.trust.severity_level, "low");
  });

  t.test("the Spanish letter declines rather than naming the wrong date", () => {
    // The counterweight to the line above, and the reason the range rule
    // exists. This letter states its billing period, "1 de febrero de 2026 al
    // 30 de abril de 2026", before it states its deadline, so the first visible
    // date is the period start. Promoting it would say "The document shows
    // 1 de febrero de 2026 as the date that matters" on a letter due 15 June.
    const run = analyse(byId("spanish_water_final_notice"));
    const signals = run.structured_output.extractor_internal.readable_unsupported_signals;
    assert.equal(signals.primaryDate, null,
      "a date written as one end of a period is not the date that matters");
    assert.deepEqual(signals.dateParts,
      ["1 de febrero de 2026", "30 de abril de 2026", "15 de junio de 2026"],
      "all three are still LISTED, which claims nothing about what they mean");
  });
});

// ─── the trade, pinned ───────────────────────────────────────────────────────

test("every adversarial non document, and what the gate now does with it", async (t) => {
  for (const item of NON_DOCUMENTS) {
    await t.test(item.id, () => {
      assert.equal(signals.countDocumentSignals(item.text), item.signals,
        item.id + ": signal count moved. " + item.note);
      assert.equal(refused(item.text), !item.accepted,
        item.id + ": verdict moved. " + item.note);
    });
  }

  await t.test("exactly three items are accepted that a threshold of four would refuse", () => {
    // Names the trade so raising or lowering the threshold is a visible edit.
    const borderline = NON_DOCUMENTS.filter((n) => n.signals === 3).map((n) => n.id);
    assert.deepEqual(borderline, ["gym flyer, Polish, with prices and phone"]);
    const newlyAccepted = NON_DOCUMENTS
      .filter((n) => n.accepted && n.note.includes("NEWLY ACCEPTED")).map((n) => n.id);
    assert.deepEqual(newlyAccepted.sort(), [
      "gym flyer, Polish, with prices and phone",
      "invoice from a small trader, Polish",
      "parcel delivery card, Polish"
    ]);
  });
});

// ─── the signals themselves ──────────────────────────────────────────────────

test("every signal is language independent", async (t) => {
  await t.test("dates, in ten scripts", () => {
    [
      "3 September 2026", "3 września 2026", "15 de junio de 2026", "7 juillet 2026",
      "18 de maio de 2026", "3 septembrie 2026", "03/06/2026", "2026-09-03", "June 3, 2026"
    ].forEach((value) => assert.ok(signals.hasDateInAnyScript(value), value));
  });

  await t.test("a period is not a date", () => {
    assert.equal(signals.hasDateInAnyScript("within 14 days"), false);
    assert.equal(signals.hasDateInAnyScript("w ciagu 14 dni"), false);
  });

  await t.test("reference codes, and what is not one", () => {
    ["BH-44712", "TW-8830921", "FV/2026/118", "HG/DR/22981", "4471028866"]
      .forEach((v) => assert.ok(signals.hasReferenceCode(v), v));
    ["hello", "2026", "12.50", "a-b", "8 do 16"]
      .forEach((v) => assert.equal(signals.hasReferenceCode(v), false, v));
  });

  await t.test("a URL is not a labelled field", () => {
    // Without the guard, a phishing message carrying nothing but a link would
    // score a structural point for having a link.
    const text = "https://hmrc-zwrot-podatku.example.com/potwierdz\nhttps://example.com/two";
    assert.equal(signals.countLabelLines(text), 0);
  });

  await t.test("a time is not a labelled field either", () => {
    assert.equal(signals.countLabelLines("10:30\n11:45"), 0);
    assert.equal(signals.countLabelLines("Heure: 10h30\nLieu: Clinique 4"), 2);
  });

  await t.test("no signal reads an English word", () => {
    // The whole point. A Polish letter scores what its English twin scores.
    const polish = byId("polish_rent_arrears");
    assert.equal(signals.countDocumentSignals(polish), 5);
    assert.equal(signals.countDocumentSignals(byId("spanish_water_final_notice")), 5);
  });
});
