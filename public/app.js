const pages = ["landing", "home", "journey", "help", "comfort", "privacy", "privacy-full", "why-northcue"];
const northcueIconBase = "/icons/northcue/";
const northcueForegroundIconBase = "/icons/northcue/foreground/";
const northcueForegroundLightIconBase = "/icons/northcue/foreground-light/";
const northcueUtilityLightIconBase = "/icons/northcue/utility-light/";
const northcueForegroundIcons = new Set([
  "act-next-step",
  "add-deadline",
  "auto-detect",
  "bill-document",
  "chat-message",
  "comfort-break",
  "deadline",
  "document",
  "document-check",
  "document-stack",
  "fake-document",
  "focus-mode",
  "folder",
  "letter-document",
  "need-help",
  "overwhelmed",
  "people",
  "private-secure",
  "safety-check",
  "search",
  "shield-check",
  "time",
  "time-message",
  "upload",
  "upload-add",
  "what-matters-most",
  "what-to-do",
  "wrong-file",
  "copy-summary",
  "helpful-note"
]);

// Card id to icon file mapping for the cue card reading screen. Declared up
// here because renderCard runs during the top level init below, long before
// the later function definitions, and a const declared further down would
// still be uninitialised at that moment.
const cueCardIconNames = {
  what_is_this: "document",
  what_matters_most: "what-matters-most",
  what_do_i_need_to_do: "what-to-do",
  when_is_it_due: "deadline",
  what_could_happen: "safety-check",
  helpful_note: "helpful-note"
};

function northcueIcon(fileName, className = "northcue-icon northcue-inline-icon", options = {}) {
  const basePath = northcueForegroundIcons.has(fileName)
    ? getThemeAwareForegroundBase()
    : northcueIconBase;
  const extraClasses = [];
  const attributes = [];

  if (options.circle) extraClasses.push("northcue-circle-fill");
  if (options.toneClass) extraClasses.push(options.toneClass);
  if (northcueForegroundIcons.has(fileName)) {
    extraClasses.push("northcue-theme-icon");
    attributes.push(`data-theme-art="icon" data-icon-name="${fileName}"`);
  }

  const classes = [className, ...extraClasses].filter(Boolean).join(" ");
  return `<img class="${classes}" src="${basePath}${fileName}.png" alt="" aria-hidden="true" ${attributes.join(" ")}>`;
}

function useLightThemeArt() {
  return document.body.classList.contains("theme-dark");
}

function getThemeAwareForegroundBase() {
  return useLightThemeArt() ? northcueForegroundLightIconBase : northcueForegroundIconBase;
}

function getThemeAwareUtilityBase() {
  return useLightThemeArt() ? northcueUtilityLightIconBase : northcueIconBase;
}

function prepareThemeAwareArtMetadata() {
  document.querySelectorAll("img.northcue-icon").forEach((image) => {
    if (image.dataset.themeArt === "utility" || image.dataset.themeArt === "logo") return;
    const src = image.getAttribute("src") || "";
    const foregroundMatch = src.match(/\/icons\/northcue\/foreground(?:-light)?\/([^/.]+)\.png$/);
    if (foregroundMatch) {
      image.dataset.iconName = foregroundMatch[1];
      const keepDarkStroke =
        image.classList.contains("northcue-circle-fill") ||
        Boolean(image.closest(".home-icon-bubble, .process-icon-circle, .help-icon-bubble, .upload-hero-icon, .action-icon, .cue-logo"));
      image.dataset.themeArt = keepDarkStroke ? "icon-static" : "icon";
    }
  });
}

function updateThemeAwareArt() {
  const useLight = useLightThemeArt();

  document.querySelectorAll("img[data-theme-art='icon']").forEach((image) => {
    const name = image.dataset.iconName;
    if (!name) return;
    const nextSrc = `${useLight ? northcueForegroundLightIconBase : northcueForegroundIconBase}${name}.png`;
    if (image.getAttribute("src") !== nextSrc) {
      image.setAttribute("src", nextSrc);
    }
  });

  document.querySelectorAll("img[data-theme-art='icon-static']").forEach((image) => {
    const name = image.dataset.iconName;
    if (!name) return;
    const nextSrc = `${northcueForegroundIconBase}${name}.png`;
    if (image.getAttribute("src") !== nextSrc) {
      image.setAttribute("src", nextSrc);
    }
  });

  document.querySelectorAll("img[data-theme-art='utility']").forEach((image) => {
    const name = image.dataset.iconName;
    if (!name) return;
    const nextSrc = `${useLight ? northcueUtilityLightIconBase : northcueIconBase}${name}.png`;
    if (image.getAttribute("src") !== nextSrc) {
      image.setAttribute("src", nextSrc);
    }
  });

  document.querySelectorAll("img[data-theme-art='logo']").forEach((image) => {
    const lightSrc = image.dataset.logoLight;
    const darkSrc = image.dataset.logoDark;
    if (!lightSrc || !darkSrc) return;
    const nextSrc = useLight ? lightSrc : darkSrc;
    if (image.getAttribute("src") !== nextSrc) {
      image.setAttribute("src", nextSrc);
    }
  });
}

const styleIcons = {
  simple: ["\uD83D\uDCC4", "\uD83D\uDCCC", "\u2705", "\uD83D\uDCC5", "\uD83D\uDEE1\uFE0F", "\u2139\uFE0F"],
  animal: ["\uD83E\uDD89", "\uD83D\uDC1D", "\uD83E\uDD8A", "\uD83D\uDC22", "\uD83D\uDC18", "\uD83C\uDF3F"],
  shape: ["\uD83D\uDFE2", "\uD83D\uDFE8", "\uD83D\uDD36", "\u23F0", "\uD83D\uDEE1\uFE0F", "\uD83D\uDD35"],
  map: ["1", "2", "3", "4", "5", "6"]
};

// Help guide copy lives in the i18n dictionary. This object is built once at
// load, so it stores KEYS only; t() runs at render time (openHelpModal and
// buildHelpModalMarkup) so the copy always follows the active language.
const helpGuides = {
  overwhelmed: {
    titleKey: "helpGuides.overwhelmed.title",
    textKey: "helpGuides.overwhelmed.text",
    steps: [
      {
        icon: "focus",
        titleKey: "helpGuides.overwhelmed.step1Title",
        detailKey: "helpGuides.overwhelmed.step1Detail"
      },
      {
        icon: "document",
        titleKey: "helpGuides.overwhelmed.step2Title",
        detailKey: "helpGuides.overwhelmed.step2Detail"
      },
      {
        icon: "pause",
        titleKey: "helpGuides.overwhelmed.step3Title",
        detailKey: "helpGuides.overwhelmed.step3Detail"
      }
    ],
    actionKey: "helpGuides.overwhelmed.action",
    actionType: "focus"
  },
  fake: {
    titleKey: "helpGuides.fake.title",
    textKey: "helpGuides.fake.text",
    steps: [
      {
        icon: "shield",
        titleKey: "helpGuides.fake.step1Title",
        detailKey: "helpGuides.fake.step1Detail"
      },
      {
        icon: "search",
        titleKey: "helpGuides.fake.step2Title",
        detailKey: "helpGuides.fake.step2Detail"
      },
      {
        icon: "people",
        titleKey: "helpGuides.fake.step3Title",
        detailKey: "helpGuides.fake.step3Detail"
      }
    ],
    actionKey: "helpGuides.fake.action",
    actionType: "check"
  },
  deadline: {
    titleKey: "helpGuides.deadline.title",
    textKey: "helpGuides.deadline.text",
    steps: [
      {
        icon: "calendar",
        titleKey: "helpGuides.deadline.step1Title",
        detailKey: "helpGuides.deadline.step1Detail"
      },
      {
        icon: "document",
        titleKey: "helpGuides.deadline.step2Title",
        detailKey: "helpGuides.deadline.step2Detail"
      },
      {
        icon: "calendar",
        titleKey: "helpGuides.deadline.step3Title",
        detailKey: "helpGuides.deadline.step3Detail"
      }
    ],
    actionKey: "helpGuides.deadline.action",
    actionType: "deadline"
  },
  time: {
    titleKey: "helpGuides.time.title",
    textKey: "helpGuides.time.text",
    steps: [
      {
        icon: "document",
        titleKey: "helpGuides.time.step1Title",
        detailKey: "helpGuides.time.step1Detail"
      },
      {
        icon: "shield",
        titleKey: "helpGuides.time.step2Title",
        detailKey: "helpGuides.time.step2Detail"
      },
      {
        icon: "message",
        titleKey: "helpGuides.time.step3Title",
        detailKey: "helpGuides.time.step3Detail"
      }
    ],
    actionKey: "helpGuides.time.action",
    actionType: "journey"
  },
  wrong: {
    titleKey: "helpGuides.wrong.title",
    textKey: "helpGuides.wrong.text",
    steps: [
      {
        icon: "close",
        titleKey: "helpGuides.wrong.step1Title",
        detailKey: "helpGuides.wrong.step1Detail"
      },
      {
        icon: "folder",
        titleKey: "helpGuides.wrong.step2Title",
        detailKey: "helpGuides.wrong.step2Detail"
      },
      {
        icon: "upload",
        titleKey: "helpGuides.wrong.step3Title",
        detailKey: "helpGuides.wrong.step3Detail"
      }
    ],
    actionKey: "helpGuides.wrong.action",
    actionType: "upload"
  },
  person: {
    titleKey: "helpGuides.person.title",
    textKey: "helpGuides.person.text",
    steps: [
      {
        icon: "copy",
        titleKey: "helpGuides.person.step1Title",
        detailKey: "helpGuides.person.step1Detail"
      },
      {
        icon: "people",
        titleKey: "helpGuides.person.step2Title",
        detailKey: "helpGuides.person.step2Detail"
      },
      {
        icon: "document",
        titleKey: "helpGuides.person.step3Title",
        detailKey: "helpGuides.person.step3Detail"
      },
      {
        icon: "shield",
        titleKey: "helpGuides.person.step4Title",
        detailKey: "helpGuides.person.step4Detail"
      }
    ],
    actionKey: "helpGuides.person.action",
    actionType: "copy"
  }
};

// Keys only, resolved with t() inside renderCard so the encouragement line
// follows the active language instead of freezing at load time.
const cardEncouragementKeys = [
  "journey.encouragement1",
  "journey.encouragement2",
  "journey.encouragement3",
  "journey.encouragement4",
  "journey.encouragement5",
  "journey.encouragement6"
];

const themeConfig = {
  light: {
    top: "#ece8fb",
    bottom: "#fffdf8",
    soft: "#f1effd",
    panel: "#fffdfa",
    accent: "#2f5b35",
    line: "rgba(148, 136, 213, 0.16)",
    strongLine: "rgba(148, 136, 213, 0.28)",
    blobA: "#dfe8d8",
    blobB: "#fff1d8",
    blobC: "#f6d3c4",
    art: "#2f5b35"
  },
  calm: {
    top: "#ece8fb",
    bottom: "#fffdf8",
    soft: "#f1effd",
    panel: "#fffdfa",
    accent: "#2f5b35",
    line: "rgba(148, 136, 213, 0.16)",
    strongLine: "rgba(148, 136, 213, 0.28)",
    blobA: "#dfe8d8",
    blobB: "#fff1d8",
    blobC: "#f6d3c4",
    art: "#2f5b35"
  },
  lavender: {
    top: "#cbc3eb",
    bottom: "#f9dcd6",
    soft: "#ebe6fb",
    panel: "#fffaff",
    accent: "#4c5271",
    line: "rgba(104, 94, 160, 0.16)",
    strongLine: "rgba(104, 94, 160, 0.28)",
    blobA: "#e6e1f5",
    blobB: "#f9dcd6",
    blobC: "#d6cfef",
    art: "#4c5271"
  },
  cream: {
    top: "#ffe0a8",
    bottom: "#fff4df",
    soft: "#fff3df",
    panel: "#fffaf0",
    accent: "#5a5136",
    line: "rgba(168, 126, 49, 0.15)",
    strongLine: "rgba(168, 126, 49, 0.26)",
    blobA: "#eee4c8",
    blobB: "#ffe8b8",
    blobC: "#f2d9c8",
    art: "#5a5136"
  },
  sage: {
    top: "#dce7d2",
    bottom: "#f4f4dd",
    soft: "#eef4ea",
    panel: "#fffdfa",
    accent: "#2f5b35",
    line: "rgba(91, 125, 82, 0.15)",
    strongLine: "rgba(91, 125, 82, 0.27)",
    blobA: "#dce7d2",
    blobB: "#f4f4dd",
    blobC: "#e2efd8",
    art: "#2f5b35"
  },
  classic: {
    top: "#e7ebf2",
    bottom: "#566277",
    soft: "#e9edf4",
    panel: "#f8f9fb",
    accent: "#1f2d45",
    line: "rgba(31, 45, 69, 0.15)",
    strongLine: "rgba(31, 45, 69, 0.28)",
    blobA: "#d8dde8",
    blobB: "#eef1f5",
    blobC: "#c7cedb",
    art: "#1f2d45"
  },
  dark: {
    top: "#283039",
    bottom: "#1c2529",
    soft: "#2d3042",
    panel: "#1c2529",
    accent: "#b6d2ad",
    line: "rgba(207, 199, 255, 0.12)",
    strongLine: "rgba(207, 199, 255, 0.24)",
    blobA: "#2d3b31",
    blobB: "#4d402f",
    blobC: "#483535",
    art: "#b6d2ad"
  }
};

let selectedType = "auto";
let activeCardStyle = "simple";
let cardIndex = 0;
let latestResult = createMockApiResult();
// latestResult starts as the built in demo result so the example card can
// render before anything is uploaded. That demo carries a document category,
// a trust assessment and a severity, so feedback given before a real upload
// would otherwise be filed against a document the reader never had. This flag
// is the only reliable way to tell a real analysis from the demo.
let hasAnalysedDocument = false;
let pendingDocumentJobId = null;
let currentTheme = "calm";
let currentBackgroundStyle = "plain";
let activeFeedbackAnswer = "";
let latestUploadInputQuality = "unknown";
let latestOcrStatus = "unknown";
let lastTrackedCardKey = "";
let journeyCompletedTracked = false;
// Records the dictionary key of the current status whenever it was set through
// setStatusKey. Statuses carrying engine or free text record "". The hide and
// file-strip logic in setStatus compares this key, never the display text, so
// translation can never break it.
let lastStatusTitleKey = "";

const backgroundStyles = ["plain", "dots", "shapes", "notebook", "animals"];
const legacyBackgroundStyles = {
  clouds: "plain",
  forest: "animals",
  rainbow: "shapes"
};

// Feedback copy: display strings resolve through t() at render time (the
// *Key fields). The `rating` strings and each chip's `reason` are FIXED
// English identifiers: they feed the data-rating / data-reason attributes,
// the feedback payload, and the icon lookup, so the wire format and
// analytics never change with the interface language.
const feedbackChoices = {
  yes: {
    rating: "Yes, this helped",
    ratingKey: "feedback.yes.rating",
    labelKey: "feedback.yes.label",
    detailKey: "feedback.yes.detail",
    tone: "positive",
    headingKey: "feedback.yes.heading",
    chips: [
      { reason: "Simple words", labelKey: "feedback.yes.chip1" },
      { reason: "Clear next step", labelKey: "feedback.yes.chip2" },
      { reason: "Easy to read", labelKey: "feedback.yes.chip3" },
      { reason: "Less overwhelming", labelKey: "feedback.yes.chip4" },
      { reason: "Focus mode helped", labelKey: "feedback.yes.chip5" }
    ]
  },
  little: {
    rating: "A little",
    ratingKey: "feedback.little.rating",
    labelKey: "feedback.little.label",
    detailKey: "feedback.little.detail",
    tone: "mixed",
    headingKey: "feedback.little.heading",
    chips: [
      { reason: "Too much text", labelKey: "feedback.little.chip1" },
      { reason: "Action was unclear", labelKey: "feedback.little.chip2" },
      { reason: "Deadline was unclear", labelKey: "feedback.little.chip3" },
      { reason: "Words felt difficult", labelKey: "feedback.little.chip4" },
      { reason: "Needed more support", labelKey: "feedback.little.chip5" }
    ]
  },
  no: {
    rating: "No, I was confused",
    ratingKey: "feedback.no.rating",
    labelKey: "feedback.no.label",
    detailKey: "feedback.no.detail",
    tone: "needs-work",
    headingKey: "feedback.no.heading",
    chips: [
      { reason: "I was still confused", labelKey: "feedback.no.chip1" },
      { reason: "Wrong information", labelKey: "feedback.no.chip2" },
      { reason: "Too much information", labelKey: "feedback.no.chip3" },
      { reason: "I did not know what to do", labelKey: "feedback.no.chip4" },
      { reason: "I did not trust it", labelKey: "feedback.no.chip5" }
    ]
  }
};

const pageSections = Object.fromEntries(
  pages.map((page) => [page, document.querySelector(`#page-${page}`)])
);

const pageLinks = Array.from(document.querySelectorAll("[data-page-link]"));
const themeButtons = Array.from(document.querySelectorAll("[data-theme]"));
const toggleButtons = Array.from(document.querySelectorAll("[data-toggle]"));
const chips = Array.from(document.querySelectorAll(".chip[data-category]"));
const railSteps = Array.from(document.querySelectorAll(".rail-step"));
const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#document-file");
const cameraInput = document.querySelector("#camera-capture");
const fileName = document.querySelector("#file-name");
const statusText = document.querySelector("#status");
const statusTitle = statusText?.querySelector("[data-status-title]");
const statusDetail = statusText?.querySelector("[data-status-detail]");
const removeDocumentButton = document.querySelector("#remove-document");
const moreTypeButton = document.querySelector("#more-type-button");
const moreTypeMenu = document.querySelector("#more-type-menu");
const moreTypeLabel = moreTypeButton?.querySelector("[data-more-label]");
const submitButton = document.querySelector("#submit-button");
const journeyPage = document.querySelector("#page-journey");
const cardSteps = document.querySelector("#card-steps");
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modal-title");
const modalContent = document.querySelector("#modal-content");
const progressDots = document.querySelector("#progress-dots");
const cardFeedbackPanel = document.querySelector("#card-feedback-panel");
const cardFocusToggle = document.querySelector("#card-focus-toggle");
const cardDetailToggle = document.querySelector("#card-detail-toggle");
let modalReturnFocusTarget = null;

document.addEventListener("click", (event) => {
  const helpCard = event.target.closest(".help-card[data-help], [data-help-open]");
  if (!helpCard) return;

  openHelpModal(helpCard.dataset.help || helpCard.dataset.helpOpen, helpCard);
});

loadSavedPreferences();
wireNavigation();
wireUpload();
wireCueCards();
wireCardSwipe();
wireActions();
wireCompletion();
wireHelp();
wireComfortSettings();
wireFeedback();
wireCheckMeanings();
wireInstallPrompt();
wireModalSheetGesture();
wirePageSwipe();
wireLanguageControls();
wireLanguageBanner();
wireLandingReveal();

// Landing is the front door. It is the first page users see on load, on both
// mobile and desktop. The body data-page default and the active class live on
// #page-landing in index.html (with #page-home no longer active), and this init
// call re-asserts landing. To route past landing again and open straight on
// home, change this back to setPage("home") and move the active class /
// data-page defaults back to #page-home in index.html.
setPage("landing");
setJourneyStep("upload");
renderCard();
renderProgressDots();
prepareThemeAwareArtMetadata();
updateThemeAwareArt();

function wireLandingReveal() {
  const card = document.querySelector(".landing-example-card");
  if (!card) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

  // Start hidden and reveal once, the first time the card scrolls into view.
  card.classList.add("reveal-init");
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      card.classList.add("is-revealed");
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.25 });
  observer.observe(card);
}

function wireNavigation() {
  pageLinks.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setPage(button.dataset.pageLink);
      if (button.dataset.pageLink === "journey" && !hasUploadedResult()) {
        setJourneyStep("upload");
      }
    });

    // Non-native controls (e.g. the clickable "Private and secure" shields)
    // need explicit keyboard activation so Enter/Space behave like a button.
    const tag = button.tagName;
    if (tag !== "A" && tag !== "BUTTON") {
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setPage(button.dataset.pageLink);
        }
      });
    }
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const requestedTheme = button.dataset.theme;
      if (requestedTheme === "dark" && document.body.classList.contains("theme-dark")) {
        setTheme("calm");
        savePreferences(false);
        return;
      }

      setTheme(requestedTheme);
      savePreferences(false);
    });
  });

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.toggle === "focus-mode") {
        setFocusMode(!document.body.classList.contains("focus-mode"), { save: true });
        return;
      }

      document.body.classList.toggle(button.dataset.toggle);
      const isActive = document.body.classList.contains(button.dataset.toggle);
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
      savePreferences(false);
    });
  });

  cardFocusToggle?.addEventListener("click", () => {
    setFocusMode(!document.body.classList.contains("focus-mode"), { save: true });
  });

  cardDetailToggle?.addEventListener("click", () => {
    setSimpleView(!document.body.classList.contains("cards-simple"), { save: true });
  });

  document.querySelector("#colour-wheel").addEventListener("click", () => setPage("comfort"));

  document.querySelectorAll("[data-open-check]").forEach((button) => {
    button.addEventListener("click", () => {
      setPage("journey");
      openDocumentCheck();
    });
  });

  railSteps.forEach((button) => {
    button.addEventListener("click", () => {
      moveToRailStep(button.dataset.rail);
    });
  });
}

function setFocusMode(isActive, options = {}) {
  document.body.classList.toggle("focus-mode", isActive);

  document.querySelectorAll("[data-toggle='focus-mode']").forEach((button) => {
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.setAttribute("aria-label", isActive ? t("aria.focusOff") : t("aria.focusOn"));
  });

  if (cardFocusToggle) {
    cardFocusToggle.classList.toggle("active", isActive);
    cardFocusToggle.setAttribute("aria-pressed", String(isActive));
    cardFocusToggle.querySelector("span").textContent = isActive ? t("journey.exitFocus") : t("journey.focusOnCard");
  }

  if (options.save) {
    if (isActive) {
      trackAnalyticsEvent("focus_mode_used", {
        section: hasUploadedResult() ? "cue_card" : "global"
      });
    }
    savePreferences(false);
  }

  updateThemeAwareArt();
}

// Journey-wide "Simple view / Show full details" toggle. Mirrors the
// setFocusMode pattern: a single body class, persisted via savePreferences.
// In simple view the per-card subtitle and detail bullets are hidden (CSS,
// desktop only for now), leaving the label + headline. Defaults to OFF
// (full view) so nothing is withheld from an anxious user by default.
//
// NOTE for a future cleanup session: there is a separate, dormant "Simple
// view" concept — `activeCardStyle = "simple"` and the "Simple view" entry
// in openCardStyleModal() (alongside the not-yet-built Animal/Shape/Map card
// packs). That value is never read by renderCard(), so it changes nothing.
// This `cards-simple` / setSimpleView feature is the live one; the dormant
// duplicate can be removed when the card-style packs are revisited.
function setSimpleView(isActive, options = {}) {
  document.body.classList.toggle("cards-simple", isActive);

  if (cardDetailToggle) {
    cardDetailToggle.classList.toggle("active", isActive);
    cardDetailToggle.setAttribute("aria-pressed", String(isActive));
    cardDetailToggle.setAttribute("aria-label", isActive ? t("aria.showFullDetails") : t("aria.showSimplerView"));
    cardDetailToggle.querySelector("span").textContent = isActive ? t("journey.showFullDetails") : t("journey.simpleView");
  }

  if (options.save) {
    if (isActive) {
      trackAnalyticsEvent("simple_view_used", {
        page: "journey",
        section: "cue_card"
      });
    }
    savePreferences(false);
  }
}

// Re-resolves every translated string app.js writes outside data-i18n
// markup: the state-dependent toggle labels (aria-label plus visible span,
// which applyTranslations would otherwise stomp back to the default), the
// detected-type line, and the keyed status line. Needed because a language
// file loads asynchronously, so init-time t() calls resolve from English,
// and because a runtime language switch must reach these too. State is read
// back from the DOM and nothing is saved: wording only, never behaviour.
function refreshDynamicI18nText() {
  setFocusMode(document.body.classList.contains("focus-mode"), { save: false });
  setSimpleView(document.body.classList.contains("cards-simple"), { save: false });
  updateTypeConfirmLabel();
  if (lastStatusTitleKey) {
    setStatusKey(lastStatusTitleKey, Boolean(statusText && statusText.classList.contains("error")));
  }
}

function trackCurrentCardViewed() {
  if (!hasUploadedResult()) return;

  const card = latestResult.cards?.[cardIndex];
  if (!card) return;

  const key = `${latestResult.job_id || pendingDocumentJobId || "mock"}:${cardIndex}:${card.id}`;
  if (key === lastTrackedCardKey) return;

  lastTrackedCardKey = key;
  trackAnalyticsEvent("card_viewed", {
    page: "journey",
    section: "cue_card",
    card_number: cardIndex + 1,
    card_type: card.id
  });
}

function trackCurrentCardAction(eventName) {
  if (!hasUploadedResult()) return;

  const card = latestResult.cards?.[cardIndex];
  trackAnalyticsEvent(eventName, {
    page: "journey",
    section: "cue_card",
    card_number: cardIndex + 1,
    card_type: card?.id || ""
  });
}

function trackAnalyticsEvent(eventName, fields = {}) {
  try {
    const payload = buildAnalyticsPayload(eventName, fields);
    if (!payload.event_name) return;

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  } catch (error) {
    // Analytics must never block reading, uploading, feedback, or navigation.
  }
}

function buildAnalyticsPayload(eventName, fields = {}) {
  const trust = latestResult?.trust || {};
  const card = latestResult?.cards?.[cardIndex] || {};
  const payload = {
    event_name: eventName,
    client_job_id: fields.client_job_id || latestResult?.job_id || pendingDocumentJobId || "",
    page: fields.page || document.body.dataset.page || "unknown",
    section: fields.section || "",
    card_number: fields.card_number || "",
    card_type: fields.card_type || card.id || "",
    document_type: fields.document_type || trust.document_category || trust.document_type || selectedType || "",
    input_quality: fields.input_quality || trust.input_quality || latestUploadInputQuality || "",
    ai_status: fields.ai_status || extractAiStatus(latestResult) || "",
    ocr_status: fields.ocr_status || latestOcrStatus || "",
    error_code: fields.error_code || "",
    created_at: new Date().toISOString()
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

function extractAiStatus(result) {
  if (!result) return "";
  return result.ai_status
    || result.debug?.ai_status
    || result.debug?.ai?.status
    || result.debug?.ai?.ai_status
    || "";
}

function wireUpload() {
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      selectedType = chip.dataset.category;
      const isMoreOption = Boolean(chip.closest("#more-type-menu"));

      chips.forEach((item) => {
        const isSelected = item === chip;
        item.classList.toggle("active", isSelected);
        item.setAttribute("aria-checked", String(isSelected));
      });

      if (moreTypeButton) {
        moreTypeButton.classList.toggle("active", isMoreOption);
        moreTypeButton.setAttribute("aria-pressed", String(isMoreOption));
      }
      if (moreTypeLabel) {
        moreTypeLabel.textContent = t("status.moreTypes");
      }
      closeMoreTypeMenu();
      updateTypeConfirmLabel();
      const dtr = document.querySelector(".document-type-row");
      dtr?.classList.remove("type-pills-visible");
      document.querySelector(".change-type-btn")?.setAttribute("aria-expanded", "false");
    });
  });

  moreTypeButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = moreTypeButton.getAttribute("aria-expanded") !== "true";
    moreTypeButton.setAttribute("aria-expanded", String(shouldOpen));
    moreTypeMenu?.classList.toggle("hidden", !shouldOpen);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".more-type-wrapper")) {
      closeMoreTypeMenu();
    }
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    pendingDocumentJobId = null;
    fileName.textContent = t("status.fileTypesHint");
    setStatusKey(file ? "status.documentSelected" : "status.chooseToBegin");
    form.classList.toggle("file-added", !!file);
    if (file) updateTypeConfirmLabel();
  });

  // "Take a photo" (mobile): the camera writes to a separate input so the main
  // browse input keeps its full accept list untouched. Funnel the captured photo
  // into #document-file and re-fire its change, so it enters the exact same
  // upload/validation/submit pipeline as a gallery pick — no separate path.
  cameraInput?.addEventListener("change", () => {
    const photo = cameraInput.files[0];
    if (!photo) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(photo);
    fileInput.files = dataTransfer.files;
    cameraInput.value = "";
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  });

  removeDocumentButton?.addEventListener("click", () => {
    if (form.classList.contains("file-added")) {
      fileInput.click();
      return;
    }
    fileInput.value = "";
    pendingDocumentJobId = null;
    fileName.textContent = t("status.fileTypesHint");
    setStatusKey("status.chooseToBegin");
    fileInput.focus();
  });

  const changeTypeBtn = document.querySelector(".change-type-btn");
  const documentTypeRow = document.querySelector(".document-type-row");
  changeTypeBtn?.addEventListener("click", () => {
    const isOpen = documentTypeRow?.classList.contains("type-pills-visible");
    documentTypeRow?.classList.toggle("type-pills-visible", !isOpen);
    changeTypeBtn.setAttribute("aria-expanded", String(!isOpen));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (pendingDocumentJobId) {
      await analyseReadyDocument();
      return;
    }

    const file = fileInput.files[0];
    if (!file) {
      setStatusKey("status.chooseOneFirst", true);
      return;
    }

    setLoading(true);
    const _uploadTypeName = typeNameForReading(selectedType);
    setStatus(_uploadTypeName ? t("status.readingTyped", { typeName: _uploadTypeName }) : t("status.readingGeneric"));
    setReadingHint(_uploadTypeName ? t("status.readingHintTyped", { typeName: _uploadTypeName }) : t("status.readingHintGeneric"));
    setJourneyStep("upload");
    document.querySelector("#achievement").classList.add("hidden");
    cardFeedbackPanel.classList.add("hidden");
    document.querySelector("#completion-screen").classList.add("hidden");
    document.querySelector(".cue-card-panel").classList.remove("hidden");
    document.querySelector("#card-feedback").classList.remove("hidden");
    document.querySelector(".journey-main").classList.remove("is-complete");
    lastTrackedCardKey = "";
    journeyCompletedTracked = false;

    trackAnalyticsEvent("upload_started", {
      page: "journey",
      section: "upload",
      document_type: selectedType
    });

    const formData = new FormData();
    formData.append("letter", file);
    formData.append("documentCategory", selectedType);
    formData.append("language", NorthcueI18n.getLanguage());

    try {
      const response = await fetch("/api/simplify", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t("status.uploadFailed"));
      }

      if (isOcrReadyResult(payload)) {
        latestUploadInputQuality = payload.input_quality || "unknown";
        latestOcrStatus = payload.success ? "completed" : "failed";
        trackAnalyticsEvent(payload.success ? "upload_completed" : "upload_failed", {
          page: "journey",
          section: "upload",
          client_job_id: payload.job_id || "",
          document_type: selectedType,
          input_quality: latestUploadInputQuality,
          ocr_status: latestOcrStatus,
          error_code: payload.success ? "" : "ocr_unreadable"
        });
        showOcrReadyResult(payload);
        if (pendingDocumentJobId) {
          await analyseReadyDocument();
        }
        return;
      }

      latestResult = normalizeApiResult(payload);
      latestResult.hasUploaded = true;
      hasAnalysedDocument = true;
      latestUploadInputQuality = latestResult.trust?.input_quality || "unknown";
      latestOcrStatus = latestResult.debug?.ocr_status || latestOcrStatus || "unknown";
      pendingDocumentJobId = null;
      cardIndex = 0;
      trackAnalyticsEvent("upload_completed", {
        page: "journey",
        section: "upload",
        client_job_id: latestResult.job_id,
        document_type: selectedType,
        input_quality: latestUploadInputQuality,
        ocr_status: latestOcrStatus
      });
      trackAnalyticsEvent("analysis_completed", {
        page: "journey",
        section: "analysis",
        client_job_id: latestResult.job_id,
        document_type: latestResult.trust?.document_category || selectedType,
        input_quality: latestUploadInputQuality,
        ai_status: extractAiStatus(latestResult),
        ocr_status: latestOcrStatus
      });
      trackAnalyticsEvent("cards_generated", {
        page: "journey",
        section: "cue_cards",
        client_job_id: latestResult.job_id,
        document_type: latestResult.trust?.document_category || selectedType,
        input_quality: latestUploadInputQuality,
        ai_status: extractAiStatus(latestResult),
        ocr_status: latestOcrStatus
      });
      setReadingHint(null);
      renderCard();
      setJourneyStep("understand");
      setStatusKey("status.cardsReady");
    } catch (error) {
      latestOcrStatus = "failed";
      trackAnalyticsEvent("upload_failed", {
        page: "journey",
        section: "upload",
        document_type: selectedType,
        ocr_status: latestOcrStatus,
        error_code: "upload_request_failed"
      });
      setReadingHint(null);
      setStatus(error.message ? translatedEngineText(error.message).text : t("status.tryAgain"), true);
    } finally {
      setLoading(false);
    }
  });
}

function closeMoreTypeMenu() {
  moreTypeButton?.setAttribute("aria-expanded", "false");
  moreTypeMenu?.classList.add("hidden");
}

function updateTypeConfirmLabel() {
  const el = document.querySelector("[data-type-label]");
  if (!el) return;
  const labelKeys = {
    auto: "status.typeConfirmAuto",
    letter: "status.typeConfirmLetter",
    bill: "status.typeConfirmBill",
    work: "status.typeConfirmWork",
    medical: "status.typeConfirmMedical",
    school: "status.typeConfirmSchool",
    legal: "status.typeConfirmLegal",
    email: "status.typeConfirmEmail",
    article: "status.typeConfirmArticle",
    other: "status.typeConfirmOther",
  };
  el.textContent = t(labelKeys[selectedType] || "status.typeConfirmFallback");
}

async function analyseReadyDocument() {
  const analysisJobId = pendingDocumentJobId;
  setLoading(true);
  const _analysisTypeName = typeNameForReading(selectedType);
  setStatus(_analysisTypeName ? t("status.readingTyped", { typeName: _analysisTypeName }) : t("status.readingGeneric"));
  setReadingHint(_analysisTypeName ? t("status.readingHintTyped", { typeName: _analysisTypeName }) : t("status.readingHintGeneric"));
  trackAnalyticsEvent("analysis_started", {
    page: "journey",
    section: "analysis",
    client_job_id: analysisJobId,
    document_type: selectedType,
    input_quality: latestUploadInputQuality,
    ocr_status: latestOcrStatus || "completed"
  });

  try {
    const response = await fetch("/api/simplify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "analyse",
        job_id: pendingDocumentJobId,
        documentCategory: selectedType,
        language: NorthcueI18n.getLanguage()
      })
    });

    const payload = await response.json();
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || t("status.analysisFailed"));
    }

    latestResult = normalizeApiResult(payload);
    latestResult.hasUploaded = true;
    hasAnalysedDocument = true;
    latestUploadInputQuality = latestResult.trust?.input_quality || latestUploadInputQuality || "unknown";
    latestOcrStatus = latestResult.debug?.ocr_status || latestOcrStatus || "completed";
    pendingDocumentJobId = null;
    cardIndex = 0;
    lastTrackedCardKey = "";
    journeyCompletedTracked = false;
    trackAnalyticsEvent("analysis_completed", {
      page: "journey",
      section: "analysis",
      client_job_id: latestResult.job_id || analysisJobId,
      document_type: latestResult.trust?.document_category || selectedType,
      input_quality: latestUploadInputQuality,
      ai_status: extractAiStatus(latestResult),
      ocr_status: latestOcrStatus
    });
    trackAnalyticsEvent("cards_generated", {
      page: "journey",
      section: "cue_cards",
      client_job_id: latestResult.job_id || analysisJobId,
      document_type: latestResult.trust?.document_category || selectedType,
      input_quality: latestUploadInputQuality,
      ai_status: extractAiStatus(latestResult),
      ocr_status: latestOcrStatus
    });
    setReadingHint(null);
    renderCard();
    setJourneyStep("understand");
    setStatusKey("status.cardsReady");
  } catch (error) {
    trackAnalyticsEvent("analysis_failed", {
      page: "journey",
      section: "analysis",
      client_job_id: analysisJobId,
      document_type: selectedType,
      input_quality: latestUploadInputQuality,
      ocr_status: latestOcrStatus,
      error_code: "analysis_request_failed"
    });
    setReadingHint(null);
    setStatus(error.message ? translatedEngineText(error.message).text : t("status.tryAgain"), true);
  } finally {
    setLoading(false);
  }
}

function wireCueCards() {
  document.querySelector("#card-back").addEventListener("click", () => {
    trackCurrentCardAction("back_clicked");
    if (cardIndex === 0) {
      setJourneyStep("upload");
      return;
    }

    cardIndex -= 1;
    renderCard();
    setJourneyStep("understand");
  });

  document.querySelector("#card-next").addEventListener("click", () => {
    const cards = latestResult.cards;
    trackCurrentCardAction("next_clicked");
    if (cardIndex >= cards.length - 1) {
      setJourneyStep("act");
      showActionMessage("");
      showCompletionScreen();
      return;
    }

    cardIndex += 1;
    renderCard();
    setJourneyStep("understand");
  });

  document.querySelector("#details-button")?.addEventListener("click", () => {
    const card = latestResult.cards[cardIndex];
    openModal(translatedEngineText(card.title).text, `<p>${buildCardDetail(card)}</p>`);
  });

  document.querySelector("#card-style-button").addEventListener("click", openCardStyleModal);
  document.querySelector("#check-button").addEventListener("click", () => {
    openDocumentCheck();
  });
}

// Mobile only swipe for the cue cards. It reuses the existing #card-next and
// #card-back handlers through click, so the advance, completion, edge, and
// analytics logic is never duplicated. Vertical scrolling stays native through
// touch-action pan-y, and a JS axis lock plus a 60px threshold make sure only a
// deliberate horizontal swipe changes a card. All motion is off under reduced
// motion and on screens above 760px. Only the inner content slides, so the dots
// and counter stay put as the anchor.
function wireCardSwipe() {
  const panel = document.querySelector(".cue-card-panel");
  const content = document.querySelector(".cue-card-content");
  if (!panel || !content) return;

  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DEADZONE = 8;
  const THRESHOLD = 60;
  const SLIDE = 110;

  let startX = 0;
  let startY = 0;
  let axis = null;
  let dragging = false;
  let animating = false;
  let pendingX = 0;
  let frame = null;

  function startsOnControl(target) {
    return Boolean(target.closest && target.closest("button, a, input, textarea, select, [role='button']"));
  }

  function setTransform(x, opacity) {
    content.style.transform = x ? `translateX(${x}px)` : "translateX(0)";
    if (opacity !== undefined) content.style.opacity = String(opacity);
  }

  function clearInline() {
    content.style.transition = "";
    content.style.transform = "";
    content.style.opacity = "";
  }

  function resetGesture() {
    panel.classList.remove("is-swiping");
    axis = null;
    dragging = false;
    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function springBack() {
    if (reducedMotion()) {
      clearInline();
      return;
    }
    content.style.transition = "transform 0.26s ease, opacity 0.26s ease";
    setTransform(0, 1);
    window.setTimeout(clearInline, 280);
  }

  function commit(direction) {
    const selector = direction === "next" ? "#card-next" : "#card-back";
    if (reducedMotion()) {
      clearInline();
      document.querySelector(selector).click();
      return;
    }
    animating = true;
    const exitX = direction === "next" ? -SLIDE : SLIDE;
    const enterX = direction === "next" ? SLIDE : -SLIDE;
    content.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    setTransform(exitX, 0);
    window.setTimeout(() => {
      document.querySelector(selector).click();
      content.style.transition = "none";
      setTransform(enterX, 0);
      void content.offsetWidth;
      content.style.transition = "transform 0.22s ease, opacity 0.22s ease";
      setTransform(0, 1);
      window.setTimeout(() => {
        clearInline();
        animating = false;
      }, 240);
    }, 200);
  }

  panel.addEventListener("touchstart", (event) => {
    if (!isMobile() || animating || event.touches.length !== 1) return;
    if (startsOnControl(event.target)) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    axis = null;
    dragging = false;
  }, { passive: true });

  panel.addEventListener("touchmove", (event) => {
    if (!isMobile() || animating || axis === "y" || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - startX;
    const dy = event.touches[0].clientY - startY;

    if (axis === null) {
      if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return;
      axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis !== "x") return;
      dragging = true;
      panel.classList.add("is-swiping");
    }

    if (reducedMotion()) return;
    pendingX = dx > 0 && cardIndex === 0 ? dx * 0.25 : dx;
    if (!frame) {
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setTransform(pendingX);
      });
    }
  }, { passive: true });

  panel.addEventListener("touchend", (event) => {
    if (axis !== "x" || !dragging || animating) {
      resetGesture();
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch ? touch.clientX - startX : pendingX;
    panel.classList.remove("is-swiping");
    if (Math.abs(dx) < THRESHOLD || (dx > 0 && cardIndex === 0)) {
      springBack();
    } else {
      commit(dx < 0 ? "next" : "prev");
    }
    resetGesture();
  }, { passive: true });

  panel.addEventListener("touchcancel", () => {
    if (axis === "x" && dragging && !animating) springBack();
    resetGesture();
  }, { passive: true });
}

// Mobile only swipe between the four main pages, matching the bottom tab bar
// order, as an addition to the tab bar rather than a replacement. It listens
// on the app main region only, so the modal sheet, the topbar, and the tab
// bar are structurally out of reach. It stands down entirely on the cue card
// reading steps, where horizontal swiping belongs to the cards, and on the
// landing and privacy pages. A clear horizontal intent is required before
// anything moves: the drag must dominate vertical by a wide margin and pass
// a distance or flick threshold, so scrolling never changes the page. Swipes
// that begin at the screen edges are ignored so the iOS back and forward
// edge gestures keep working. No wrapping at the ends, only a gentle spring.
function wirePageSwipe() {
  const region = document.querySelector(".app-main");
  if (!region) return;

  const SWIPE_ORDER = ["home", "journey", "help", "comfort"];
  const EDGE_GUARD_PX = 28;
  const DEADZONE_PX = 10;
  const AXIS_DOMINANCE = 1.5;
  const DISTANCE_THRESHOLD_PX = 70;
  const VELOCITY_THRESHOLD_PX_MS = 0.5;
  const FLICK_MIN_DISTANCE_PX = 30;
  const SLIDE_PX = 110;

  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastMoveTime = 0;
  let velocity = 0;
  let axis = null;
  let dragging = false;
  let animating = false;
  let frame = null;
  let pendingX = 0;

  function activeSection() {
    return document.querySelector(".page.active");
  }

  function currentIndex() {
    return SWIPE_ORDER.indexOf(document.body.dataset.page);
  }

  function cardFlowActive() {
    return document.body.dataset.page === "journey" && document.body.dataset.journeyStep !== "upload";
  }

  function clearInline(section) {
    if (!section) return;
    section.style.transition = "";
    section.style.transform = "";
    section.style.opacity = "";
  }

  function resetGesture() {
    axis = null;
    dragging = false;
    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function springBack(section) {
    if (reducedMotion()) {
      clearInline(section);
      return;
    }
    section.style.transition = "transform 0.26s ease, opacity 0.26s ease";
    section.style.transform = "translateX(0)";
    section.style.opacity = "1";
    window.setTimeout(() => clearInline(section), 280);
  }

  function commit(direction) {
    const index = currentIndex();
    const nextPage = SWIPE_ORDER[direction === "next" ? index + 1 : index - 1];
    const outgoing = activeSection();
    if (!nextPage || !outgoing) return;

    if (reducedMotion()) {
      clearInline(outgoing);
      setPage(nextPage);
      return;
    }

    animating = true;
    const exitX = direction === "next" ? -SLIDE_PX : SLIDE_PX;
    outgoing.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    outgoing.style.transform = `translateX(${exitX}px)`;
    outgoing.style.opacity = "0";
    window.setTimeout(() => {
      clearInline(outgoing);
      setPage(nextPage);
      const incoming = activeSection();
      if (incoming) {
        incoming.style.transition = "none";
        incoming.style.transform = `translateX(${-exitX}px)`;
        incoming.style.opacity = "0";
        void incoming.offsetWidth;
        incoming.style.transition = "transform 0.22s ease, opacity 0.22s ease";
        incoming.style.transform = "translateX(0)";
        incoming.style.opacity = "1";
        window.setTimeout(() => {
          clearInline(incoming);
          animating = false;
        }, 240);
      } else {
        animating = false;
      }
    }, 200);
  }

  region.addEventListener("touchstart", (event) => {
    if (!isMobile() || animating || event.touches.length !== 1) return;
    if (currentIndex() === -1 || cardFlowActive()) return;
    if (event.target.closest(".cue-card-panel")) return;
    if (event.target.closest("input, textarea, select")) return;
    const touch = event.touches[0];
    if (touch.clientX < EDGE_GUARD_PX || touch.clientX > window.innerWidth - EDGE_GUARD_PX) return;
    startX = touch.clientX;
    startY = touch.clientY;
    lastX = touch.clientX;
    lastMoveTime = event.timeStamp;
    velocity = 0;
    axis = "pending";
    dragging = false;
  }, { passive: true });

  region.addEventListener("touchmove", (event) => {
    if (axis === null || axis === "y" || animating || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (axis === "pending") {
      if (Math.abs(dx) < DEADZONE_PX && Math.abs(dy) < DEADZONE_PX) return;
      // Horizontal must clearly dominate, otherwise this is a scroll and
      // the page must never move.
      axis = Math.abs(dx) > Math.abs(dy) * AXIS_DOMINANCE ? "x" : "y";
      if (axis !== "x") return;
      if (cardFlowActive()) { axis = "y"; return; }
      dragging = true;
    }

    const index = currentIndex();
    const atFirst = index <= 0;
    const atLast = index === SWIPE_ORDER.length - 1;
    const resisted = (dx > 0 && atFirst) || (dx < 0 && atLast) ? dx * 0.25 : dx;
    pendingX = resisted;
    const dt = event.timeStamp - lastMoveTime;
    if (dt > 0) velocity = (touch.clientX - lastX) / dt;
    lastX = touch.clientX;
    lastMoveTime = event.timeStamp;

    if (reducedMotion()) return;
    if (!frame) {
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const section = activeSection();
        if (section && dragging) {
          section.style.transition = "none";
          section.style.transform = `translateX(${pendingX}px)`;
        }
      });
    }
  }, { passive: true });

  region.addEventListener("touchend", (event) => {
    if (axis !== "x" || !dragging || animating) {
      resetGesture();
      return;
    }
    // Stop the browser generating a click on whatever the finger ends over,
    // so a swipe that started on a tile never activates it.
    event.preventDefault();
    const touch = event.changedTouches[0];
    const dx = touch ? touch.clientX - startX : pendingX;
    const index = currentIndex();
    const blockedEnd = (dx > 0 && index <= 0) || (dx < 0 && index === SWIPE_ORDER.length - 1);
    const passedDistance = Math.abs(dx) >= DISTANCE_THRESHOLD_PX;
    const passedFlick = Math.abs(velocity) >= VELOCITY_THRESHOLD_PX_MS &&
      Math.abs(dx) >= FLICK_MIN_DISTANCE_PX &&
      Math.sign(velocity) === Math.sign(dx);
    const section = activeSection();

    if (blockedEnd || (!passedDistance && !passedFlick)) {
      if (section) springBack(section);
    } else {
      commit(dx < 0 ? "next" : "prev");
    }
    resetGesture();
  }, { passive: false });

  region.addEventListener("touchcancel", () => {
    if (axis === "x" && dragging && !animating) {
      const section = activeSection();
      if (section) springBack(section);
    }
    resetGesture();
  }, { passive: true });
}

function wireActions() {
  document.querySelector("#copy-summary").addEventListener("click", async () => {
    setJourneyStep("act");
    trackAnalyticsEvent("copy_summary_clicked", {
      page: "journey",
      section: "actions"
    });
    const text = latestResult.cards
      .map((card) => `${translatedEngineText(card.title).text} ${translatedEngineText(card.short_answer).text}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showActionMessage(t("journey.summaryCopied"));
    } catch (error) {
      showActionMessage(t("journey.copyFailed"));
    }
  });

  document.querySelector("#add-calendar").addEventListener("click", () => {
    setJourneyStep("act");
    addDeadlineToCalendar();
  });

  document.querySelector("#review-check").addEventListener("click", openDocumentCheck);
  document.querySelector("#give-feedback").addEventListener("click", openFeedbackModal);

  document.querySelector("#upload-another").addEventListener("click", () => {
    form.reset();
    pendingDocumentJobId = null;
    latestUploadInputQuality = "unknown";
    latestOcrStatus = "unknown";
    lastTrackedCardKey = "";
    journeyCompletedTracked = false;
    fileName.textContent = t("status.fileTypesHint");
    setStatusKey("status.chooseToBegin");
    latestResult = createMockApiResult();
    hasAnalysedDocument = false;
    cardIndex = 0;
    renderCard();
    setJourneyStep("upload");
    document.querySelector("#achievement").classList.add("hidden");
    cardFeedbackPanel.classList.add("hidden");
    fileInput.focus();
  });

  document.querySelector("#modal-close").addEventListener("click", () => {
    if (modal.classList.contains("feedback-modal") && activeFeedbackAnswer) {
      activeFeedbackAnswer = "";
      renderFeedbackStepOne();
      return;
    }
    closeModal();
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  modal.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".modal-box")) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (modal.classList.contains("hidden")) return;

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key === "Tab") {
      trapModalFocus(event);
    }
  });
}

function wireHelp() {
  // Help cards use delegated clicks so the modal still works if the page is re-rendered later.
}

function wireCompletion() {
  document.querySelector("#completion-add-calendar").addEventListener("click", addDeadlineToCalendar);
  document.querySelector("#completion-upload-another").addEventListener("click", () => {
    document.querySelector("#upload-another").click();
  });
  document.querySelector("#completion-back-home").addEventListener("click", () => {
    setPage("home");
  });
  // #completion-feedback uses data-feedback-open, handled globally by wireFeedback()
}

function openHelpModal(key, sourceCard) {
  const guide = helpGuides[key];
  if (!guide) return;

  openModal(t(guide.titleKey), buildHelpModalMarkup(key, guide), {
    returnFocusTo: sourceCard,
    variant: "help",
    closeLabel: t("helpGuides.closeLabel"),
    closeAriaLabel: t("aria.closeHelp")
  });
}

function buildHelpModalMarkup(key, guide) {
  const steps = guide.steps.map((step) => `
    <li>
      <span class="help-step-icon" aria-hidden="true">${helpStepIconMarkup(step.icon)}</span>
      <span class="help-step-copy">
        <strong>${escapeHtml(t(step.titleKey))}</strong>
        <small>${escapeHtml(t(step.detailKey))}</small>
      </span>
    </li>
  `).join("");

  return `
    <div class="help-modal-content">
      <span class="help-icon-bubble help-modal-icon ${helpIconTone(key)}" aria-hidden="true">${helpIconMarkup(key)}</span>
      <p class="help-modal-text">${escapeHtml(t(guide.textKey))}</p>
      <hr class="help-modal-rule">
      <p class="help-modal-section-title">${t("helpGuides.sectionTitle")}</p>
      <ol class="help-modal-steps">
        ${steps}
      </ol>
      <div class="help-modal-footer">
        <button type="button" class="outline-btn help-modal-back" data-modal-back>${t("helpGuides.back")}</button>
        <button type="button" class="primary-btn help-modal-action" data-help-action="${escapeHtml(guide.actionType)}">${escapeHtml(t(guide.actionKey))} <span aria-hidden="true">&rarr;</span></button>
      </div>
    </div>
  `;
}

function helpIconTone(key) {
  const tones = {
    overwhelmed: "northcue-circle-soft-purple",
    fake: "northcue-circle-soft-green",
    deadline: "northcue-circle-soft-blue",
    time: "northcue-circle-soft-cream",
    wrong: "northcue-circle-soft-green",
    person: "northcue-circle-soft-purple"
  };
  return tones[key] || "northcue-circle-soft-green";
}

function helpIconMarkup(key) {
  const icons = {
    overwhelmed: northcueIcon("overwhelmed", "northcue-icon northcue-help-icon"),
    fake: northcueIcon("fake-document", "northcue-icon northcue-help-icon"),
    deadline: northcueIcon("deadline", "northcue-icon northcue-help-icon"),
    time: northcueIcon("time", "northcue-icon northcue-help-icon"),
    wrong: northcueIcon("wrong-file", "northcue-icon northcue-help-icon"),
    person: northcueIcon("need-help", "northcue-icon northcue-help-icon")
  };

  return icons[key] || icons.overwhelmed;
}

function helpStepIconMarkup(icon) {
  const icons = {
    focus: northcueIcon("focus-mode", "northcue-icon northcue-step-icon"),
    document: northcueIcon("document", "northcue-icon northcue-step-icon"),
    pause: northcueIcon("comfort-break", "northcue-icon northcue-step-icon"),
    shield: northcueIcon("shield-check", "northcue-icon northcue-step-icon"),
    search: northcueIcon("search", "northcue-icon northcue-step-icon"),
    people: northcueIcon("people", "northcue-icon northcue-step-icon"),
    calendar: northcueIcon("deadline", "northcue-icon northcue-step-icon"),
    message: northcueIcon("chat-message", "northcue-icon northcue-step-icon"),
    close: `<svg class="help-step-svg" viewBox="0 0 24 24" focusable="false"><path d="M7 7l10 10"></path><path d="M17 7 7 17"></path><circle cx="12" cy="12" r="8"></circle></svg>`,
    folder: northcueIcon("folder", "northcue-icon northcue-step-icon"),
    upload: northcueIcon("upload", "northcue-icon northcue-step-icon"),
    copy: northcueIcon("copy-summary", "northcue-icon northcue-step-icon")
  };

  return icons[icon] || icons.document;
}

function handleHelpAction(action) {
  if (action === "focus") {
    setFocusMode(true, { save: true });
    closeModal();
    return;
  }

  if (action === "check") {
    closeModal();
    setPage("journey");
    openDocumentCheck();
    return;
  }

  if (action === "deadline") {
    closeModal();
    setPage("journey");
    if (!hasUploadedResult()) {
      setJourneyStep("upload");
      setStatusKey("status.uploadFirstDeadline", true);
      fileInput.focus();
      return;
    }
    const deadlineIndex = latestResult.cards.findIndex((card) => card.id === "when_is_it_due");
    if (deadlineIndex >= 0) {
      cardIndex = deadlineIndex;
      renderCard();
    }
    setJourneyStep("understand");
    return;
  }

  if (action === "upload") {
    closeModal();
    setPage("journey");
    if (hasUploadedResult()) {
      document.querySelector("#upload-another").click();
      return;
    }
    setJourneyStep("upload");
    fileInput.focus();
    return;
  }

  if (action === "copy") {
    closeModal();
    setPage("journey");
    if (hasUploadedResult()) {
      document.querySelector("#copy-summary").click();
      return;
    }
    setJourneyStep("upload");
    setStatusKey("status.uploadFirstSummary", true);
    fileInput.focus();
    return;
  }

  closeModal();
  setPage("journey");
}

function wireComfortSettings() {
  document.querySelectorAll(".feeling-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".feeling-btn").forEach((item) => item.classList.toggle("selected", item === button));
    });
  });

  document.querySelectorAll("textarea").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      const counter = textarea.nextElementSibling;
      if (counter?.classList.contains("char-count")) {
        counter.textContent = t("feedback.charCount", { count: textarea.value.length, max: textarea.maxLength });
      }
    });
  });

  document.querySelectorAll(".colour-style").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".colour-style").forEach((item) => item.classList.toggle("selected", item === button));
      setTheme(button.dataset.colourStyle);
      savePreferences(false);
    });
  });

  document.querySelectorAll(".text-size-btn").forEach((button) => {
    button.addEventListener("click", () => {
      setTextSize(button.dataset.textSize);
      savePreferences(false);
    });
  });

  document.querySelectorAll(".background-style-choice").forEach((button) => {
    button.addEventListener("click", () => {
      setBackgroundStyle(button.dataset.backgroundStyle);
      savePreferences(false);
    });
  });

  document.querySelectorAll(".card-style-choice").forEach((button) => {
    button.addEventListener("click", () => {
      setCardStyle(button.dataset.cardStyleChoice);
      savePreferences(false);
    });
  });

}

function wireFeedback() {
  document.addEventListener("click", (event) => {
    const feedbackLink = event.target.closest("[data-feedback-open]");
    if (feedbackLink) {
      openFeedbackModal(feedbackLink);
      return;
    }

    const modalBack = event.target.closest("[data-modal-back]");
    if (modalBack) {
      closeModal();
      return;
    }

    const helpAction = event.target.closest("[data-help-action]");
    if (helpAction) {
      handleHelpAction(helpAction.dataset.helpAction);
      return;
    }

    const feedbackChoice = event.target.closest("[data-feedback-choice]");
    if (feedbackChoice) {
      activeFeedbackAnswer = feedbackChoice.dataset.feedbackChoice;
      renderFeedbackStepTwo(activeFeedbackAnswer);
      return;
    }

    const feedbackChange = event.target.closest("[data-feedback-change]");
    if (feedbackChange) {
      activeFeedbackAnswer = "";
      renderFeedbackStepOne();
      return;
    }

    // Checked before the reason chips because a confidence chip carries both
    // classes for styling. Single select, and tapping the chosen answer again
    // clears it, so the question stays skippable after a stray tap.
    const confidenceChip = event.target.closest(".feedback-confidence-chip");
    if (confidenceChip) {
      const wasSelected = confidenceChip.getAttribute("aria-pressed") === "true";
      confidenceChip.closest(".feedback-confidence-grid")
        ?.querySelectorAll(".feedback-confidence-chip")
        .forEach((chip) => {
          chip.classList.remove("selected");
          chip.setAttribute("aria-pressed", "false");
        });
      if (!wasSelected) {
        confidenceChip.classList.add("selected");
        confidenceChip.setAttribute("aria-pressed", "true");
      }
      return;
    }

    const feedbackChip = event.target.closest(".feedback-reason-chip");
    if (feedbackChip) {
      const isSelected = feedbackChip.getAttribute("aria-pressed") === "true";
      feedbackChip.classList.toggle("selected", !isSelected);
      feedbackChip.setAttribute("aria-pressed", String(!isSelected));
      return;
    }

    const ratingButton = event.target.closest(".feedback-rating-btn");
    if (ratingButton) {
      const panel = ratingButton.closest(".short-feedback-panel");
      panel.dataset.rating = ratingButton.dataset.rating;
      panel.querySelectorAll(".feedback-rating-btn").forEach((button) => {
        const isSelected = button === ratingButton;
        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });
      return;
    }

    const sendButton = event.target.closest(".send-short-feedback");
    if (sendButton) {
      saveShortFeedback(sendButton.closest(".short-feedback-panel") || sendButton.closest(".feedback-flow"));
      return;
    }

    const contactRequest = event.target.closest("[data-contact-request]");
    if (contactRequest) {
      renderContactRequestForm();
      return;
    }

    const sendContact = event.target.closest("#send-contact-request");
    if (sendContact) {
      submitContactRequest(sendContact);
      return;
    }
  });

  document.addEventListener("change", (event) => {
    const contactToggle = event.target.closest("#modal-feedback-contact-toggle");
    if (!contactToggle) return;

    const contactPanel = document.querySelector("#modal-feedback-contact-panel");
    if (!contactPanel) return;

    contactPanel.classList.toggle("hidden", !contactToggle.checked);
    if (contactToggle.checked) {
      contactPanel.querySelector("input")?.focus();
    }
  });
}

function setPage(page) {
  if (!pages.includes(page)) return;
  document.body.dataset.page = page;

  pages.forEach((entry) => {
    pageSections[entry].classList.toggle("active", entry === page);
  });

  pageLinks.forEach((button) => {
    const isActive = button.dataset.pageLink === page;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setTheme(theme) {
  document.body.classList.remove("theme-light", "theme-calm", "theme-lavender", "theme-cream", "theme-sage", "theme-classic", "theme-dark");
  const themeClass = Object.prototype.hasOwnProperty.call(themeConfig, theme) ? theme : "calm";
  currentTheme = themeClass;
  document.body.classList.add(`theme-${themeClass}`);
  applyThemeTokens(themeClass);

  themeButtons.forEach((button) => {
    const isModeActive = button.dataset.theme === "dark" ? themeClass === "dark" : themeClass !== "dark";
    button.classList.toggle("active", isModeActive);
    button.setAttribute("aria-pressed", String(isModeActive));
  });

  if (themeClass !== "dark") {
    document.querySelectorAll(".colour-style").forEach((button) => {
      button.classList.toggle("selected", button.dataset.colourStyle === themeClass);
    });
  }

  setBackgroundStyle(currentBackgroundStyle);
  updateThemeAwareArt();
}

function applyThemeTokens(themeClass) {
  const theme = themeConfig[themeClass] || themeConfig.calm;
  const target = document.body.style;
  target.setProperty("--theme-top", theme.top);
  target.setProperty("--theme-bottom", theme.bottom);
  target.setProperty("--theme-soft", theme.soft);
  target.setProperty("--theme-panel", theme.panel);
  target.setProperty("--theme-accent", theme.accent);
  target.setProperty("--theme-line", theme.line);
  target.setProperty("--theme-line-strong", theme.strongLine);
  target.setProperty("--theme-blob-a", theme.blobA);
  target.setProperty("--theme-blob-b", theme.blobB);
  target.setProperty("--theme-blob-c", theme.blobC);
  target.setProperty("--wallpaper-line", hexToRgba(theme.art, 0.1));
  updateBackgroundPreviews(themeClass);
}

function setTextSize(size) {
  const selectedSize = ["small", "medium", "large"].includes(size) ? size : "medium";
  document.body.classList.remove("text-small", "text-large");
  if (selectedSize === "small") document.body.classList.add("text-small");
  if (selectedSize === "large") document.body.classList.add("text-large");

  document.querySelectorAll(".text-size-btn").forEach((button) => {
    const isSelected = button.dataset.textSize === selectedSize;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function setCardStyle(style) {
  const selectedStyle = style === "standard" ? "standard" : "soft";
  document.body.classList.toggle("card-standard", selectedStyle === "standard");

  document.querySelectorAll(".card-style-choice").forEach((button) => {
    const isSelected = button.dataset.cardStyleChoice === selectedStyle;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function setBackgroundStyle(style) {
  const selectedStyle = normaliseBackgroundStyle(style);
  currentBackgroundStyle = selectedStyle;

  document.body.classList.remove(
    ...[...backgroundStyles, ...Object.keys(legacyBackgroundStyles)].map((entry) => `bg-${entry}`)
  );
  document.body.classList.add(`bg-${selectedStyle}`);
  document.body.style.setProperty("--wallpaper-art", makeBackgroundArt(selectedStyle, currentTheme, false));

  document.querySelectorAll(".background-style-choice").forEach((button) => {
    const isSelected = button.dataset.backgroundStyle === selectedStyle;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function updateBackgroundPreviews(themeClass) {
  document.querySelectorAll(".background-style-choice").forEach((button) => {
    const style = normaliseBackgroundStyle(button.dataset.backgroundStyle);
    button.style.setProperty("--preview-art", makeBackgroundArt(style, themeClass, true));
  });
}

function normaliseBackgroundStyle(style) {
  if (backgroundStyles.includes(style)) return style;
  return legacyBackgroundStyles[style] || "plain";
}

function makeBackgroundArt(style, themeClass, isPreview) {
  const selectedStyle = normaliseBackgroundStyle(style);
  if (selectedStyle === "plain") {
    return "none";
  }
  if (selectedStyle === "dots" && !isPreview) {
    return "none";
  }
  if (selectedStyle === "notebook" && !isPreview) {
    const palette = backgroundPalette(themeClass);
    const pencilSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="104" viewBox="-2 6 88 102"><g fill="none" stroke="${palette.line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path fill="${palette.d}" d="M8 78 58 10l26 20-52 68-30 8Z"/><path d="m58 10 26 20M22 84l14 10"/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(pencilSvg)}")`;
  }

  const palette = backgroundPalette(themeClass);
  const width = isPreview ? 220 : (selectedStyle === "animals" ? 1280 : 720);
  const height = isPreview ? 260 : (selectedStyle === "animals" ? 800 : 520);
  const opacity = isPreview ? 0.92 : (selectedStyle === "animals" ? 0.42 : 0.24);
  const content = isPreview
    ? makePreviewBackgroundMotif(selectedStyle, palette, opacity)
    : makePageBackgroundMotif(selectedStyle, palette, opacity);
  const base = isPreview
    ? `<rect width="220" height="260" rx="24" fill="${palette.paper}"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${base}${content}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function makePageBackgroundMotif(style, palette, opacity) {
  const symbols = backgroundSymbols(style, palette);
  const uses = {
    dots: `
      <circle cx="96" cy="78" r="5"/><circle cx="304" cy="64" r="4"/><circle cx="526" cy="92" r="5"/>
      <circle cx="184" cy="226" r="5"/><circle cx="430" cy="228" r="4"/><circle cx="640" cy="198" r="5"/>
      <circle cx="92" cy="390" r="5"/><circle cx="338" cy="410" r="5"/><circle cx="574" cy="382" r="4"/>`,
    animals: `
      <use href="#bunny" transform="translate(60 676) scale(1.12)"/>
      <use href="#cat" transform="translate(590 690) scale(1.12)"/>
      <use href="#bear" transform="translate(1110 676) scale(1.12)"/>
      <use href="#star" transform="translate(286 700) scale(2)"/>
      <use href="#paw" transform="translate(852 706) scale(1.9)"/>
      <use href="#star" transform="translate(168 732) scale(1.5)"/>
      <use href="#paw" transform="translate(1004 730) scale(1.5)"/>
      <use href="#star" transform="translate(16 702) scale(1.6)"/>
      <use href="#paw" transform="translate(1232 702) scale(1.6)"/>
      <use href="#paw" transform="translate(20 360) scale(1.5)"/>
      <use href="#star" transform="translate(1236 360) scale(1.5)"/>`,
    shapes: `
      <use href="#soft-circle" transform="translate(14 14) scale(0.66)"/>
      <use href="#soft-star" transform="translate(228 8) scale(0.63)"/>
      <use href="#soft-square" transform="translate(442 12) scale(0.65)"/>
      <use href="#soft-triangle" transform="translate(608 16) scale(0.62)"/>
      <use href="#soft-blob" transform="translate(8 130) scale(0.60)"/>
      <use href="#soft-circle" transform="translate(464 130) scale(0.58)"/>
      <use href="#soft-star" transform="translate(12 310) scale(0.58)"/>
      <use href="#soft-triangle" transform="translate(10 390) scale(0.60)"/>
      <use href="#soft-blob" transform="translate(14 216) scale(0.62)"/>
      <use href="#soft-circle" transform="translate(238 234) scale(0.58)"/>
      <use href="#soft-star" transform="translate(452 222) scale(0.60)"/>
      <use href="#soft-square" transform="translate(616 214) scale(0.58)"/>`,
    notebook: `
      <path d="M0 96H720M0 188H720M0 280H720M0 372H720M0 464H720"/>
      <path d="M110 0V520"/>
      <use href="#pencil" transform="translate(524 90) scale(0.88)"/><use href="#paper-dot" transform="translate(176 314) scale(1)"/><use href="#paper-dot" transform="translate(438 396) scale(0.9)"/>`
  };

  return `${symbols}<g opacity="${opacity}" fill="none" stroke="${palette.line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${uses[style] || uses.shapes}</g>`;
}

function makePreviewBackgroundMotif(style, palette, opacity) {
  const symbols = backgroundSymbols(style, palette);
  const uses = {
    plain: ``,
    dots: `<circle cx="60" cy="96" r="5"/><circle cx="110" cy="96" r="5"/><circle cx="160" cy="96" r="5"/><circle cx="60" cy="148" r="5"/><circle cx="110" cy="148" r="5"/><circle cx="160" cy="148" r="5"/><circle cx="60" cy="200" r="5"/><circle cx="110" cy="200" r="5"/><circle cx="160" cy="200" r="5"/>`,
    animals: `<use href="#star" transform="translate(24 44) scale(1.3)"/><use href="#bunny" transform="translate(60 26) scale(0.82)"/><use href="#bear" transform="translate(26 112) scale(0.84)"/><use href="#cat" transform="translate(116 112) scale(0.84)"/><use href="#paw" transform="translate(96 198) scale(1.4)"/>`,
    shapes: `<use href="#soft-star" transform="translate(84 34) scale(0.6)"/><use href="#soft-circle" transform="translate(30 140) scale(0.66)"/><use href="#soft-square" transform="translate(118 140) scale(0.62)"/>`,
    notebook: `<path d="M0 70H220M0 120H220M0 170H220M0 220H220"/><path d="M44 0V260"/><use href="#pencil" transform="translate(78 116) scale(0.82)"/>`
  };

  return `${symbols}<g opacity="${opacity}" fill="none" stroke="${palette.line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${uses[style] || uses.shapes}</g>`;
}

function backgroundSymbols(style, palette) {
  const common = {
    dots: `<defs><g id="paper-dot"><circle cx="0" cy="0" r="7" fill="${palette.a}" stroke="${palette.line}"/></g></defs>`,
    animals: `<defs>
      <g id="cat"><path fill="${palette.a}" stroke="${palette.line}" d="M22 34 14 9q-1-5 4-3l16 14Z"/><path fill="${palette.a}" stroke="${palette.line}" d="M68 34 76 9q1-5-4-3L56 20Z"/><ellipse cx="45" cy="50" rx="30" ry="27" fill="${palette.a}" stroke="${palette.line}"/><path fill="none" stroke="${palette.line}" d="M32 47q3-3 6 0"/><path fill="none" stroke="${palette.line}" d="M52 47q3-3 6 0"/><path fill="${palette.d}" stroke="${palette.line}" d="M42 55h6l-3 3Z"/><path fill="none" stroke="${palette.line}" d="M45 59q-4 4-8 1"/><path fill="none" stroke="${palette.line}" d="M45 59q4 4 8 1"/><path fill="none" stroke="${palette.line}" d="M16 53h13"/><path fill="none" stroke="${palette.line}" d="M16 59h12"/><path fill="none" stroke="${palette.line}" d="M61 53h13"/><path fill="none" stroke="${palette.line}" d="M62 59h12"/><path fill="${palette.a}" stroke="${palette.line}" d="M63 70q9-1 9 8 0 7-9 4"/></g>
      <g id="bunny"><path fill="${palette.b}" stroke="${palette.line}" d="M38 30C30 6 34-2 41 9q4 9 2 19Z"/><path fill="${palette.b}" stroke="${palette.line}" d="M52 30C60 6 56-2 49 9q-4 9-2 19Z"/><ellipse cx="45" cy="56" rx="27" ry="24" fill="${palette.b}" stroke="${palette.line}"/><path fill="none" stroke="${palette.line}" d="M34 52q3-3 6 0"/><path fill="none" stroke="${palette.line}" d="M50 52q3-3 6 0"/><path fill="${palette.d}" stroke="${palette.line}" d="M43 59h4l-2 2Z"/><path fill="none" stroke="${palette.line}" d="M39 64q6 5 12 0"/></g>
      <g id="bear"><circle cx="22" cy="26" r="11" fill="${palette.c}" stroke="${palette.line}"/><circle cx="68" cy="26" r="11" fill="${palette.c}" stroke="${palette.line}"/><circle cx="45" cy="50" r="30" fill="${palette.c}" stroke="${palette.line}"/><path fill="none" stroke="${palette.line}" d="M31 46q3-3 6 0"/><path fill="none" stroke="${palette.line}" d="M53 46q3-3 6 0"/><ellipse cx="45" cy="57" rx="9" ry="7" fill="${palette.d}" stroke="${palette.line}"/><path fill="none" stroke="${palette.line}" d="M45 57v5"/><path fill="none" stroke="${palette.line}" d="M45 62q-4 3-7 1"/><path fill="none" stroke="${palette.line}" d="M45 62q4 3 7 1"/></g>
      <g id="paw"><path fill="${palette.a}" stroke="${palette.line}" stroke-width="1.6" stroke-linejoin="round" d="M13 12c4.5 0 8 2.8 8 6.5S17.5 24 13 24 5 22.2 5 18.5 8.5 12 13 12Z"/><circle cx="6" cy="7" r="2.6" fill="${palette.a}" stroke="${palette.line}" stroke-width="1.6"/><circle cx="13" cy="4.5" r="2.6" fill="${palette.a}" stroke="${palette.line}" stroke-width="1.6"/><circle cx="20" cy="7" r="2.6" fill="${palette.a}" stroke="${palette.line}" stroke-width="1.6"/></g>
      <g id="star"><path fill="${palette.d}" stroke="${palette.line}" stroke-width="1.6" stroke-linejoin="round" d="M13 3.5c.9 0 1.4.6 1.8 1.6l1.7 4 4.3.4c1.3.1 1.8 1.7.8 2.5l-3.3 2.8 1 4.3c.3 1.3-1 2.2-2.1 1.5L13 18.6l-4 2.5c-1.1.7-2.4-.2-2.1-1.5l1-4.3-3.3-2.8c-1-.8-.5-2.4.8-2.5l4.3-.4 1.7-4c.4-1 .9-1.6 1.8-1.6Z"/></g>
    </defs>`,
    shapes: `<defs>
      <g id="soft-circle"><circle cx="42" cy="42" r="40" fill="${palette.a}" stroke="${palette.line}"/></g>
      <g id="soft-square"><rect x="0" y="0" width="84" height="84" rx="22" fill="${palette.b}" stroke="${palette.line}"/></g>
      <g id="soft-triangle"><path fill="${palette.c}" stroke="${palette.line}" d="M44 0 88 78H0Z"/></g>
      <g id="soft-star"><path fill="${palette.d}" stroke="${palette.line}" d="m42 0 11 28 31 4-23 20 7 31-26-17-26 17 7-31L0 32l31-4Z"/></g>
      <g id="soft-blob"><path fill="${palette.c}" stroke="${palette.line}" d="M42 4c28-12 66 2 76 30 12 32-14 66-48 72-32 6-66-14-70-44C-4 34 14 16 42 4Z"/></g>
    </defs>`,
    notebook: `<defs>
      <g id="pencil"><path fill="${palette.d}" stroke="${palette.line}" d="M8 78 58 10l26 20-52 68-30 8Z"/><path d="m58 10 26 20M22 84l14 10"/></g>
      <g id="paper-dot"><circle cx="0" cy="0" r="8" fill="${palette.a}" stroke="${palette.line}"/></g>
    </defs>`
  };

  return common[style] || common.shapes;
}

function backgroundPalette(themeClass) {
  const palettes = {
    calm: { paper: "#fffdf8", a: "#dfe8d8", b: "#d9e7f0", c: "#fff1d8", d: "#f3d5c8", line: "#2f5b35" },
    light: { paper: "#fffdf8", a: "#dfe8d8", b: "#d9e7f0", c: "#fff1d8", d: "#f3d5c8", line: "#2f5b35" },
    lavender: { paper: "#fffaff", a: "#e6e1f5", b: "#f9dcd6", c: "#d6cfef", d: "#fff1d8", line: "#4c5271" },
    cream: { paper: "#fffaf0", a: "#ffe8b8", b: "#eee4c8", c: "#fff4df", d: "#f2d9c8", line: "#5a5136" },
    sage: { paper: "#fffdfa", a: "#dce7d2", b: "#f4f4dd", c: "#d7e8dd", d: "#fff1d8", line: "#2f5b35" },
    classic: { paper: "#f8f9fb", a: "#e7ebf2", b: "#d8dde8", c: "#eef1f5", d: "#c7cedb", line: "#1f2d45" },
    dark: { paper: "#1c2529", a: "#3a4b40", b: "#3b3855", c: "#5c4c31", d: "#5b3834", line: "#b6d2ad" }
  };

  return palettes[themeClass] || palettes.calm;
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function setJourneyStep(step) {
  railSteps.forEach((item) => {
    item.classList.toggle("active", item.dataset.rail === step);
  });

  journeyPage.classList.remove("upload-active", "understand-active", "act-active", "check-active");
  journeyPage.classList.add(`${step}-active`);
  document.body.dataset.journeyStep = step;
}

function moveToRailStep(step) {
  setPage("journey");

  if (step === "upload") {
    setJourneyStep("upload");
    return;
  }

  if (!hasUploadedResult()) {
    setJourneyStep("upload");
    setStatusKey("status.uploadFirstCheck", true);
    if (step === "check") {
      openDocumentCheck();
    }
    return;
  }

  setJourneyStep(step);

  if (step === "check") {
    openDocumentCheck();
  }
}

// Progressive disclosure for the Document Check meaning lines. The modal content
// is rebuilt on every open, so a delegated listener (matching the wireFeedback
// pattern) keeps the toggle working without re-wiring per render.
function wireCheckMeanings() {
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-check-meanings]");
    if (!toggle) return;
    const panel = toggle.closest(".check-panel");
    if (!panel) return;
    const open = panel.classList.toggle("meanings-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

// PWA install experience: an occasional reminder card plus a quiet permanent
// footline at the foot of the home page. Additive and self-contained. If the
// browser cannot install and it is not iOS Safari, nothing shows. While the
// card is visible the footline is hidden so the same words never stack twice.
function wireInstallPrompt() {
  const block = document.querySelector("[data-install-block]");
  if (!block) return;

  const card = block.querySelector("[data-install-card]");
  const footline = block.querySelector("[data-install-footline]");
  const cardActions = card.querySelector("[data-install-actions]");
  const cardIos = card.querySelector("[data-install-ios]");
  const footBtn = footline.querySelector("[data-install-android]");
  const footIos = footline.querySelector("[data-install-ios]");

  const KEY_COUNT = "northcue_install_dismiss_count";
  const KEY_LAST = "northcue_install_last_dismissed";
  const KEY_DONE = "northcue_install_done";
  const COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;
  const phoneWidthQuery = window.matchMedia("(max-width: 760px)");

  let deferredPrompt = null;

  function readNumber(key) {
    const value = parseInt(localStorage.getItem(key) || "0", 10);
    return Number.isFinite(value) ? value : 0;
  }

  function isInstalled() {
    if (localStorage.getItem(KEY_DONE) === "1") return true;
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    return window.navigator.standalone === true;
  }

  function isIosSafari() {
    const ua = window.navigator.userAgent;
    const iosDevice = /iPhone|iPad|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    if (!iosDevice) return false;
    if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;
    return true;
  }

  // Phone widths only. The install copy is phone-oriented, so desktop stays free
  // of both the card and the footline (revisit desktop separately if ever wanted).
  function isPhoneWidth() {
    return phoneWidthQuery.matches;
  }

  // First visit (count 0): always show. After one "Not now" (count 1): show once
  // more, but only after the 5 day cooldown. After two "Not now" (count 2+): never.
  function cardShouldShow() {
    const count = readNumber(KEY_COUNT);
    if (count >= 2) return false;
    if (count === 0) return true;
    const last = readNumber(KEY_LAST);
    return last > 0 && Date.now() - last >= COOLDOWN_MS;
  }

  function applyPlatformCopy() {
    const ios = isIosSafari() && !deferredPrompt;
    cardActions.hidden = ios;
    cardIos.hidden = !ios;
    footBtn.hidden = ios;
    footIos.hidden = !ios;
  }

  function evaluate() {
    const installed = isInstalled();
    const eligible = !installed && isPhoneWidth() && (Boolean(deferredPrompt) || isIosSafari());

    if (!eligible) {
      block.hidden = true;
      card.classList.remove("is-visible");
      return;
    }

    block.hidden = false;
    applyPlatformCopy();

    if (cardShouldShow()) {
      footline.hidden = true;
      card.hidden = false;
      requestAnimationFrame(() => card.classList.add("is-visible"));
    } else {
      card.classList.remove("is-visible");
      card.hidden = true;
      footline.hidden = false;
    }
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    evaluate();
  });

  window.addEventListener("appinstalled", () => {
    localStorage.setItem(KEY_DONE, "1");
    deferredPrompt = null;
    block.hidden = true;
    card.classList.remove("is-visible");
  });

  // Re-evaluate if the viewport crosses the phone/desktop boundary.
  if (phoneWidthQuery.addEventListener) {
    phoneWidthQuery.addEventListener("change", evaluate);
  } else if (phoneWidthQuery.addListener) {
    phoneWidthQuery.addListener(evaluate);
  }

  block.addEventListener("click", async (event) => {
    if (event.target.closest("[data-install-dismiss]")) {
      localStorage.setItem(KEY_COUNT, String(readNumber(KEY_COUNT) + 1));
      localStorage.setItem(KEY_LAST, String(Date.now()));
      card.classList.remove("is-visible");
      window.setTimeout(evaluate, 420);
      return;
    }

    const trigger = event.target.closest("[data-install-trigger]");
    if (!trigger || !deferredPrompt) return;

    trigger.disabled = true;
    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (error) {
      // If the prompt cannot run, fall through and re-evaluate calmly.
    }
    deferredPrompt = null;
    trigger.disabled = false;
    evaluate();
  });

  evaluate();
}

function openDocumentCheck() {
  if (!hasUploadedResult()) {
    setJourneyStep("upload");
    openModal(t("check.title"), `<p>${t("check.uploadFirst")}</p>`);
    return;
  }

  setJourneyStep("check");
  trackAnalyticsEvent("document_check_clicked", {
    page: "journey",
    section: "document_check"
  });
  openModal(t("check.title"), buildCheckMarkup(latestResult.trust));
}

// Language switcher: every [data-language-open] control opens the shared
// modal with one calm option per enabled language, shown in its own name and
// script. Picking one loads that language's files, rewrites tagged markup,
// re renders any visible engine content, and remembers the choice. The
// switcher labels always show the active language's native name.
function wireLanguageControls() {
  // Wording refresh, attached BEFORE the switcher early-return below so it
  // exists even when zero or one language is enabled: the development
  // preview (?lang=xx) loads a language with the switcher hidden, and the
  // language file can land either side of this line. The immediate call
  // covers a file that loaded first (in English it rewrites identical
  // strings); the listener covers one that lands later, and every runtime
  // switch after that.
  document.addEventListener("northcue:languagechange", refreshDynamicI18nText);
  refreshDynamicI18nText();

  // The three switcher buttons are static markup in index.html, so the
  // enabled flags in i18n/config.js only become a true off switch if the
  // control is hidden here as well. With fewer than two languages enabled
  // there is nothing to switch between, so the button is meaningless and
  // must not appear at all: the site should look exactly as it did before
  // any of the language work existed.
  if (NorthcueI18n.languageList().length < 2) {
    document.querySelectorAll("[data-language-open]").forEach((control) => {
      control.classList.add("hidden");
      control.setAttribute("hidden", "hidden");
    });
    return;
  }

  function refreshSwitcherLabels() {
    const active = NorthcueI18n.getLanguage();
    const entry = NorthcueI18n.languageList().find((item) => item.code === active);
    document.querySelectorAll("[data-language-label]").forEach((label) => {
      label.textContent = entry ? entry.nativeName : "English";
    });
  }

  function openLanguageModal() {
    const active = NorthcueI18n.getLanguage();
    const options = NorthcueI18n.languageList().map((entry) => {
      const selected = entry.code === active ? " selected" : "";
      return `<button type="button" class="outline-btn language-option${selected}" data-language-choice="${entry.code}" lang="${entry.code}">${escapeHtml(entry.nativeName)}</button>`;
    }).join("");
    openModal(t("language.title"), `<div class="language-options">${options}</div>`);
  }

  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-language-open]");
    if (opener) {
      openLanguageModal();
      return;
    }
    const choice = event.target.closest("[data-language-choice]");
    if (choice) {
      NorthcueI18n.setLanguage(choice.dataset.languageChoice);
      closeModal();
    }
  });

  document.addEventListener("northcue:languagechange", () => {
    refreshSwitcherLabels();
    // Re render engine content that is currently on screen so the template
    // bank applies immediately, not only on the next document.
    if (latestResult && latestResult.cards && latestResult.cards.length) {
      renderCard();
    }
  });

  refreshSwitcherLabels();
}

// First visit detection banner: appears only when the browser prefers a
// supported non English language, no choice is stored, and the banner has
// not been dismissed before. It speaks the detected language using the
// pre translated strings in the i18n config. One tap switches; dismissal
// is remembered.
function wireLanguageBanner() {
  const banner = document.querySelector("[data-language-banner]");
  if (!banner) return;

  const state = NorthcueI18n.detectionState();
  if (!state) return;

  const entry = NorthcueI18n.languageList().find((item) => item.code === state.language);
  if (!entry) return;

  banner.querySelector("[data-language-banner-text]").textContent = entry.bannerOffer || "";
  const switchButton = banner.querySelector("[data-language-banner-switch]");
  const dismissButton = banner.querySelector("[data-language-banner-dismiss]");
  switchButton.textContent = entry.bannerSwitch || "";
  dismissButton.textContent = entry.bannerDismiss || "";
  banner.setAttribute("lang", entry.code);
  banner.classList.remove("hidden");

  switchButton.addEventListener("click", () => {
    NorthcueI18n.setLanguage(entry.code);
    NorthcueI18n.dismissDetectionBanner();
    banner.classList.add("hidden");
  });
  dismissButton.addEventListener("click", () => {
    NorthcueI18n.dismissDetectionBanner();
    banner.classList.add("hidden");
  });
}

// Tier 2 presentation: translate one engine built sentence through the
// template bank for the active language. English passes straight through.
// Callers use the translated flag to show the shown in English notice when a
// sentence has no reviewed translation, which is the safe fallback by design.
function translatedEngineText(text) {
  if (typeof NorthcueTemplateBank === "undefined" || typeof NorthcueI18n === "undefined") {
    return { text: String(text == null ? "" : text), translated: true };
  }
  return NorthcueTemplateBank.translateEngineSentence(text, NorthcueI18n.getLanguage());
}

function renderCard() {
  const card = latestResult.cards[cardIndex];

  document.querySelector("#card-progress").textContent = t("journey.cardProgress", { current: cardIndex + 1, total: latestResult.cards.length });
  showCueCardIcon(card.id);
  const translatedTitle = translatedEngineText(card.title);
  const translatedAnswer = translatedEngineText(card.short_answer);
  document.querySelector("#card-title").textContent = translatedTitle.text;
  document.querySelector("#card-answer").textContent = translatedAnswer.text;
  document.querySelector("#card-explanation").textContent = shortCardExplanation(card);
  document.querySelector("#card-feedback").textContent = t(cardEncouragementKeys[cardIndex] || "journey.encouragementFallback");

  const isLastCard = latestResult.cards.length > 0 && cardIndex >= latestResult.cards.length - 1;
  document.querySelector("#card-next").innerHTML = isLastCard ? t("journey.finish") : t("journey.next");
  document.querySelector(".cue-card-panel").classList.remove("hidden");
  document.querySelector("#completion-screen").classList.add("hidden");
  document.querySelector("#card-feedback").classList.remove("hidden");
  document.querySelector(".journey-main").classList.remove("is-complete");

  let anyUntranslated = !translatedTitle.translated || !translatedAnswer.translated;

  // Each step is translated once and the results reused below for the money
  // format check, so an untranslated step costs one pattern scan, not two.
  const translatedSteps = Array.isArray(card.steps)
    ? card.steps.map((step) => translatedEngineText(step))
    : [];

  if (translatedSteps.length > 0) {
    cardSteps.classList.remove("hidden");
    cardSteps.innerHTML = translatedSteps.map((translatedStep) => {
      if (!translatedStep.translated) anyUntranslated = true;
      return `<li>${escapeHtml(translatedStep.text)}</li>`;
    }).join("");
  } else {
    cardSteps.classList.add("hidden");
    cardSteps.innerHTML = "";
  }

  // The pre translated notice appears only when the active language is not
  // English and some of this card's text had no bank match.
  const englishNote = document.querySelector("#card-i18n-note");
  if (englishNote) {
    englishNote.classList.toggle("hidden", !anyUntranslated);
  }

  const cardText = [translatedTitle.text, translatedAnswer.text]
    .concat(translatedSteps.map((translatedStep) => translatedStep.text))
    .join(" ");
  const moneyNote = document.querySelector("#card-money-note");
  if (moneyNote) {
    moneyNote.classList.toggle("hidden", !shouldExplainMoneyFormat(cardText));
  }

  renderProgressDots();
  prepareThemeAwareArtMetadata();
  updateThemeAwareArt();
  trackCurrentCardViewed();
}

// Some languages write 1.234,56 where the UK writes 1,234.56. In these, an
// amount lifted verbatim off a UK letter can be read at the wrong magnitude:
// "£1,247.00" looks like roughly one and a quarter pounds, and "£8.50" can
// look like eight hundred and fifty. On an enforcement notice that is not a
// cosmetic problem.
//
// The digits are never touched, because the figure has to match the paper in
// the reader's hand. Instead the card carries a short note naming the UK
// convention, so the number is unambiguous in context. Which languages need
// the note is data, not code: config.js marks them with invertedNumberFormat,
// so adding a language never means editing this file.
//
// Only amounts carrying a separator are ambiguous. "£40" reads the same
// everywhere and needs no explanation.
const SEPARATED_AMOUNT = /£\s?\d[\d\s]*[.,]\d/;

function shouldExplainMoneyFormat(text) {
  const entry = NorthcueI18n.languageEntry();
  if (!entry || !entry.invertedNumberFormat) return false;
  return SEPARATED_AMOUNT.test(String(text || ""));
}

function showCompletionScreen() {
  const count = latestResult.cards.length;
  const countEl = document.querySelector("#completion-card-count");
  if (countEl) countEl.textContent = t("completion.cardCount", { count: count });
  document.querySelector(".cue-card-panel").classList.add("hidden");
  document.querySelector("#completion-screen").classList.remove("hidden");
  document.querySelector("#achievement").classList.add("hidden");
  cardFeedbackPanel.classList.add("hidden");
  document.querySelector("#card-feedback").classList.add("hidden");
  document.querySelector(".journey-main").classList.add("is-complete");
  if (!journeyCompletedTracked) {
    journeyCompletedTracked = true;
    trackAnalyticsEvent("journey_completed", {
      page: "journey",
      section: "cue_cards",
      card_number: cardIndex + 1,
      card_type: latestResult.cards[cardIndex]?.id || ""
    });
  }
}

function stylePillMarkup(label) {
  return escapeHtml(label);
}

// The cue card icon images are created once and toggled per card, never torn
// down between cards. Static files are served with no-store, so an img that
// is recreated on each render refetches its PNG over the network on every
// swipe, and on a slow or flaky phone connection the icon could arrive after
// the card was already visible, or not at all, leaving an empty circle. With
// persistent imgs each PNG loads once per session and theme, and swiping
// between cards never touches the network again. Visibility is toggled with
// an inline display style rather than the hidden attribute, because the
// northcue-icon class sets its own display and would override hidden.
function showCueCardIcon(cardId) {
  const slot = document.querySelector("#card-icon");
  if (!slot) return;

  if (!slot.dataset.cueIconsReady) {
    slot.innerHTML = Object.values(cueCardIconNames)
      .map((name) => northcueIcon(name, "northcue-icon northcue-cue-icon"))
      .join("");
    const images = slot.querySelectorAll("img");
    Object.keys(cueCardIconNames).forEach((id, index) => {
      if (images[index]) images[index].dataset.cueCardIcon = id;
    });
    slot.dataset.cueIconsReady = "1";
  }

  const selectedId = cueCardIconNames[cardId] ? cardId : "what_is_this";
  slot.querySelectorAll("img[data-cue-card-icon]").forEach((image) => {
    image.style.display = image.dataset.cueCardIcon === selectedId ? "" : "none";
  });
}

// True when the engine is not confident the upload was read cleanly. Card 1
// already says so in its own words on these documents, so the line underneath
// must not claim the opposite.
function uploadWasHardToRead() {
  const trust = latestResult?.trust;
  if (!trust) return false;
  return trust.input_quality === "poor" ||
    trust.input_quality === "borderline" ||
    trust.processing_mode === "unsupported";
}

function shortCardExplanation(card) {
  if (card.id === "what_is_this") {
    // "It can be read clearly, so we can pull out the key points." sat directly
    // beneath a card 1 reading "The text quality is too low to read specific
    // amounts or dates reliably", on the same screen, in every language.
    return uploadWasHardToRead()
      ? t("journey.explainWhatIsThisHardToRead")
      : t("journey.explainWhatIsThis");
  }
  if (card.id === "what_matters_most") {
    return t("journey.explainWhatMattersMost");
  }
  if (card.id === "what_do_i_need_to_do") {
    return t("journey.explainWhatToDo");
  }
  if (card.id === "when_is_it_due") {
    return card.date ? t("journey.explainDueWithDate") : t("journey.explainDueNoDate");
  }
  if (card.id === "what_could_happen") {
    return t("journey.explainWhatCouldHappen");
  }
  return t("journey.explainDefault");
}

function renderProgressDots() {
  progressDots.innerHTML = latestResult.cards
    .map((card, index) => {
      const state = index === cardIndex ? "active" : "inactive";
      return `<span class="progress-dot${index === cardIndex ? " active" : ""}" aria-label="${t("aria.progressDot", { n: index + 1, total: latestResult.cards.length })}">${northcueIcon(`progress-dot-${state}`, "northcue-icon northcue-progress-icon")}</span>`;
    })
    .join("");
  prepareThemeAwareArtMetadata();
  updateThemeAwareArt();
}

function openCardStyleModal() {
  const styles = [
    { id: "simple", labelKey: "journey.cardStyleSimple" },
    { id: "animal", labelKey: "journey.cardStyleAnimal" },
    { id: "shape", labelKey: "journey.cardStyleShape" },
    { id: "map", labelKey: "journey.cardStyleMap" }
  ];

  const markup = styles
    .map((style) => {
      const activeText = style.id === activeCardStyle ? " selected" : "";
      return `<button type="button" class="outline-btn style-option${activeText}" data-style="${style.id}">${t(style.labelKey)}</button>`;
    })
    .join("");

  openModal(t("journey.cardStyleTitle"), `<div class="style-list">${markup}<p>${t("journey.cardStyleComing")}</p></div>`);

  document.querySelectorAll(".style-option").forEach((button) => {
    button.addEventListener("click", () => {
      activeCardStyle = button.dataset.style;
      if (activeCardStyle === "simple") {
        trackAnalyticsEvent("simple_view_used", {
          page: "journey",
          section: "card_style"
        });
      }
      closeModal();
      renderCard();
      showActionMessage(t("journey.cardStyleSelected", { styleLabel: labelForStyle(activeCardStyle) }));
    });
  });
}

// Builds and downloads a real .ics calendar event for the detected deadline.
// Everything is generated client-side — nothing is uploaded, stored, or logged.
function addDeadlineToCalendar() {
  const deadlineCard = latestResult?.cards?.find((card) => card.id === "when_is_it_due");
  const parsed = deadlineCard?.date ? parseDeadlineToDate(deadlineCard.date) : null;

  if (!parsed) {
    openModal(
      t("journey.calendarTitle"),
      `<p>${t("journey.calendarNoDateBody")}</p>`
    );
    return;
  }

  const title = calendarEventTitle();
  const ics = buildIcsForDeadline(parsed, title);
  downloadIcsFile(ics, t("journey.icsFileName"));
  showActionMessage(t("journey.calendarDownloaded"));
}

// Title includes the document type only when it's confidently known; otherwise generic.
function calendarEventTitle() {
  const trust = latestResult?.trust || {};
  const typeKey = (trust.document_type || "").toLowerCase();
  const categoryKey = (trust.document_category || "").toLowerCase();

  const typeLabelKeys = {
    council_tax_notice: "journey.calendarTypeCouncilTaxNotice",
    energy_bill: "journey.calendarTypeEnergyBill",
    bill_or_payment_notice: "journey.calendarTypeBillOrPaymentNotice",
    appointment_letter: "journey.calendarTypeAppointmentLetter"
  };
  const categoryLabelKeys = {
    bill_or_payment: "journey.calendarCatBillOrPayment",
    appointment: "journey.calendarCatAppointment",
    government: "journey.calendarCatGovernment",
    medical: "journey.calendarCatMedical",
    housing: "journey.calendarCatHousing",
    employment: "journey.calendarCatEmployment",
    education: "journey.calendarCatEducation",
    bank_or_loan: "journey.calendarCatBankOrLoan"
  };
  const selectedLabelKeys = {
    bill: "journey.calendarSelBill",
    letter: "journey.calendarSelLetter",
    medical: "journey.calendarSelMedical",
    school: "journey.calendarSelSchool",
    work: "journey.calendarSelWork",
    legal: "journey.calendarSelLegal"
  };

  const labelKey =
    typeLabelKeys[typeKey] ||
    categoryLabelKeys[categoryKey] ||
    (selectedType && selectedType !== "auto" ? selectedLabelKeys[selectedType] : null);

  return labelKey ? t("journey.calendarEventTitle", { label: t(labelKey) }) : t("journey.calendarEventTitleGeneric");
}

// Best-effort parse of a free-text deadline (UK formats) into {year, month, day}.
function parseDeadlineToDate(text) {
  const value = String(text).trim();
  if (!value) return null;

  // ascii-boundary-ok: matches ASCII digits in a machine date format, never
  // translated prose, so the ASCII definition of a word boundary is correct
  // here. See tests/wordBoundarySafety.test.js.
  let match = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (match) return validDateParts(Number(match[1]), Number(match[2]), Number(match[3]));

  // ascii-boundary-ok: as above, digits only.
  match = value.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    return validDateParts(year, Number(match[2]), Number(match[1]));
  }

  const worded = new Date(value);
  if (!Number.isNaN(worded.getTime())) {
    return validDateParts(worded.getFullYear(), worded.getMonth() + 1, worded.getDate());
  }

  return null;
}

function validDateParts(year, month, day) {
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function buildIcsForDeadline(parts, title) {
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${parts.year}${pad(parts.month)}${pad(parts.day)}`;
  // All-day events use an exclusive end date (the day after).
  const endDate = new Date(parts.year, parts.month - 1, parts.day + 1);
  const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `northcue-${Date.now()}-${Math.floor(Math.random() * 1e6)}@northcue`;
  const safeTitle = icsEscape(title);
  const description = icsEscape(t("journey.icsDescription"));

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Northcue//Add to calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${safeTitle}`,
    `DESCRIPTION:${description}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${safeTitle}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

function icsEscape(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function downloadIcsFile(content, filename) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderContactRequestForm() {
  modalTitle.textContent = t("feedback.contactTitle");
  modalContent.innerHTML = buildContactRequestMarkup();
  document.querySelector("#modal-contact-email")?.focus();
}

function buildContactRequestMarkup() {
  return `
    <section class="feedback-flow modal-feedback-panel" data-feedback-context="modal">
      <p class="feedback-intro">${t("feedback.contactIntro")}</p>
      <p class="feedback-private-note">${feedbackPrivacyIcon()} ${t("feedback.contactPrivateNote")}</p>
      <hr class="feedback-rule">
      <label class="feedback-label" for="modal-contact-email">${t("feedback.contactReachLabel")}</label>
      <input id="modal-contact-email" class="feedback-contact-input" type="text" placeholder="${t("feedback.contactReachPlaceholder")}">
      <label class="feedback-label" for="modal-contact-note">${t("feedback.contactHelpLabel")} <span>${t("feedback.optional")}</span></label>
      <textarea id="modal-contact-note" class="short-feedback-comment" maxlength="240" placeholder="${t("feedback.contactNotePlaceholder")}"></textarea>
      <button type="button" class="primary-btn" id="send-contact-request">${sendIconMarkup()} ${t("feedback.contactSend")}</button>
      <p class="feedback-saved-message" role="status" aria-live="polite"></p>
    </section>
  `;
}

function submitContactRequest(button) {
  const emailInput = document.querySelector("#modal-contact-email");
  const email = emailInput?.value.trim() || "";
  const note = document.querySelector("#modal-contact-note")?.value.trim() || "";
  const savedMessage = button.closest("section")?.querySelector(".feedback-saved-message");

  if (!email) {
    if (savedMessage) savedMessage.textContent = t("feedback.contactNeedContact");
    emailInput?.focus();
    return;
  }

  // TODO: Backend — POST contact request to a new server endpoint, e.g. POST /api/contact-request
  // Payload: { email, note, page: document.body.dataset.page }
  // Add a route in server.js that persists this to Supabase (a new `contact_requests` table)
  // or sends an email notification. Do NOT reuse /api/feedback — contact requests have
  // different retention/purpose requirements. The user's email must be handled carefully
  // per privacy rules and must never be logged or stored in plain-text analytics.

  button.disabled = true;
  modalTitle.textContent = t("feedback.thanksTitle");
  modalContent.innerHTML = `
    <section class="feedback-flow feedback-success" role="status" aria-live="polite">
      <span class="feedback-success-icon" aria-hidden="true">${feedbackHeartIcon()}</span>
      <h3>${t("feedback.thanksTitle")}</h3>
      <p>${t("feedback.contactThanksBody")}</p>
      <button type="button" class="primary-btn" data-modal-back>${t("feedback.done")}</button>
    </section>
  `;
}

function openFeedbackModal(sourceButton) {
  activeFeedbackAnswer = "";
  const returnTarget = sourceButton?.currentTarget || sourceButton?.target || sourceButton;
  trackAnalyticsEvent("feedback_opened", {
    page: document.body.dataset.page || "unknown",
    section: "feedback"
  });
  openModal(t("feedback.title"), buildFeedbackStepOneMarkup(), {
    returnFocusTo: returnTarget,
    variant: "feedback"
  });
}

function renderFeedbackStepOne() {
  modalTitle.textContent = t("feedback.title");
  modalContent.innerHTML = buildFeedbackStepOneMarkup();
  modalContent.querySelector("[data-feedback-choice]")?.focus();
}

function renderFeedbackStepTwo(answerKey) {
  const choice = feedbackChoices[answerKey] || feedbackChoices.little;
  modalTitle.textContent = t("feedback.title");
  modalContent.innerHTML = buildFeedbackStepTwoMarkup(answerKey, choice);
  modalContent.querySelector(".feedback-reason-chip")?.focus();
}

// The get in touch route collects a contact detail and a note and currently
// has nowhere to send them: there is no endpoint, no table, and no mailbox.
// It used to finish by telling the reader that someone would be in touch,
// which is a promise Northcue cannot keep, and the people most likely to use
// it are the ones least able to afford waiting for help that is not coming.
// The route is hidden until it has somewhere to go. Everything behind this
// flag still works, so switching it back on is a one line change once the
// endpoint exists. See FEEDBACK_AUDIT.md.
const CONTACT_REQUEST_ENABLED = false;

function buildFeedbackStepOneMarkup() {
  const choices = Object.entries(feedbackChoices).map(([key, choice]) => `
    <button type="button" class="feedback-choice-card ${choice.tone}" data-feedback-choice="${key}">
      <span class="feedback-face" aria-hidden="true">${feedbackFaceMarkup(key)}</span>
      <strong>${escapeHtml(t(choice.labelKey))}</strong>
      <small>${escapeHtml(t(choice.detailKey))}</small>
    </button>
  `).join("");

  return `
    <section class="feedback-flow modal-feedback-panel" data-feedback-context="modal">
      <p class="feedback-intro">${t("feedback.intro")}</p>
      <hr class="feedback-rule">
      <div class="feedback-question">
        <h3>${t("feedback.question")}</h3>
        <p>${t("feedback.questionSub")}</p>
      </div>
      <div class="feedback-choice-row" role="group" aria-label="${t("aria.wasHelpful")}">
        ${choices}
      </div>
      <p class="feedback-private-note">${feedbackPrivacyIcon()} ${t("feedback.privateNote")}</p>
      ${CONTACT_REQUEST_ENABLED ? `
      <div class="feedback-contact-option">
        <hr class="feedback-rule">
        <p class="feedback-or-text">${t("feedback.orContact")}</p>
        <button type="button" class="outline-btn feedback-contact-btn" data-contact-request>${t("feedback.contactBtn")}</button>
      </div>
      ` : ""}
    </section>
  `;
}

function buildFeedbackStepTwoMarkup(answerKey, choice) {
  const chips = choice.chips.map((chip) => `
    <button type="button" class="feedback-reason-chip" data-reason="${escapeHtml(chip.reason)}" aria-pressed="false">
      ${feedbackReasonIcon(chip.reason)}
      <span>${escapeHtml(t(chip.labelKey))}</span>
    </button>
  `).join("");

  // The one measure of confidence Northcue collects. Single select and fully
  // skippable: tapping the chosen answer again clears it, so nobody is forced
  // past a question they would rather not answer.
  const confidenceChips = confidenceChoices.map((entry) => `
    <button type="button" class="feedback-reason-chip feedback-confidence-chip" data-confidence="${entry.value}" aria-pressed="false">
      ${feedbackConfidenceIcon(entry.value)}
      <span>${escapeHtml(t(entry.labelKey))}</span>
    </button>
  `).join("");

  const selectedRating = `<strong>${escapeHtml(t(choice.ratingKey))}</strong>`;

  return `
    <section class="feedback-flow modal-feedback-panel feedback-step-two" data-feedback-context="modal" data-rating="${escapeHtml(choice.rating)}" data-answer="${answerKey}">
      <div class="feedback-selected-bar ${choice.tone}">
        <span>${t("feedback.selected", { rating: selectedRating })}</span>
        <button type="button" data-feedback-change>${t("feedback.change")}</button>
      </div>
      <div class="feedback-question">
        <h3>${escapeHtml(t(choice.headingKey))}</h3>
        <p>${t("feedback.chooseAny")}</p>
      </div>
      <div class="feedback-chip-grid" role="group" aria-label="${escapeHtml(t(choice.headingKey))}">
        ${chips}
      </div>
      <div class="feedback-question feedback-confidence-question">
        <h3>${t("feedback.confidenceHeading")}</h3>
        <p>${t("feedback.confidenceHint")}</p>
      </div>
      <div class="feedback-chip-grid feedback-confidence-grid" role="group" aria-label="${t("feedback.aria.confidence")}">
        ${confidenceChips}
      </div>
      <label class="feedback-label" for="modal-feedback-comment">${t("feedback.anythingElse")} <span>${t("feedback.optional")}</span></label>
      <textarea id="modal-feedback-comment" class="short-feedback-comment" maxlength="240" placeholder="${t("feedback.commentPlaceholder")}" aria-describedby="modal-feedback-comment-privacy"></textarea>
      <small id="modal-feedback-comment-privacy" class="feedback-field-note">${t("feedback.commentPrivacyNote")}</small>
      <div class="feedback-contact-toggle-row">
        <label>
          <input id="modal-feedback-contact-toggle" type="checkbox">
          <span>${t("feedback.contactToggle")}</span>
        </label>
      </div>
      <div id="modal-feedback-contact-panel" class="optional-contact feedback-contact-reveal hidden">
        <label class="feedback-label" for="modal-feedback-contact">${t("feedback.emailLabel")} <span>${t("feedback.emailOptional")}</span></label>
        <input id="modal-feedback-contact" class="feedback-contact-input" type="email" autocomplete="email" inputmode="email" placeholder="${t("feedback.emailPlaceholder")}">
        <small>${t("feedback.emailNote")}</small>
      </div>
      <button type="button" class="primary-btn send-short-feedback">${sendIconMarkup()} ${t("feedback.send")}</button>
      <p class="feedback-saved-message" role="status" aria-live="polite"></p>
    </section>
  `;
}

// The three confidence answers. Wire values are snake case because that is what
// the feedback_events.confidence_after column stores and reports on; the labels
// resolve through t() so they translate with everything else.
const confidenceChoices = [
  { value: "more_able", labelKey: "feedback.confidence.moreAble" },
  { value: "about_same", labelKey: "feedback.confidence.aboutSame" },
  { value: "still_unsure", labelKey: "feedback.confidence.stillUnsure" }
];

function feedbackConfidenceIcon(value) {
  const icons = {
    // A step up, steady, and a question mark. Line only, matching the reason chips.
    more_able: `<svg viewBox="0 0 24 24" focusable="false"><path d="M4 18h5v-4H4z"></path><path d="M9.5 18h5v-8h-5z"></path><path d="M15 18h5V6h-5z"></path></svg>`,
    about_same: `<svg viewBox="0 0 24 24" focusable="false"><path d="M5 10h14"></path><path d="M5 14h14"></path></svg>`,
    still_unsure: `<svg viewBox="0 0 24 24" focusable="false"><path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.3-1.5 2.4"></path><path d="M12 17.5h.01"></path></svg>`
  };

  return icons[value] || icons.about_same;
}

function feedbackFaceMarkup(key) {
  const faces = {
    yes: `<svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="20" r="17"></circle><path d="M13.5 17.5h.1"></path><path d="M26.5 17.5h.1"></path><path d="M13.5 23.5c3 3 10 3 13 0"></path></svg>`,
    little: `<svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="20" r="17"></circle><path d="M13.5 17.5h.1"></path><path d="M26.5 17.5h.1"></path><path d="M14 25h12"></path></svg>`,
    no: `<svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="20" r="17"></circle><path d="M13.5 17.5h.1"></path><path d="M26.5 17.5h.1"></path><path d="M13.5 27c3-3 10-3 13 0"></path></svg>`
  };

  return faces[key] || faces.little;
}

function feedbackReasonIcon(reason) {
  const icons = {
    "Simple words": `<svg viewBox="0 0 24 24" focusable="false"><path d="M5 8h5"></path><path d="M5 12h8"></path><path d="M5 16h6"></path><path d="M16 7v10"></path><path d="m13.5 9 2.5-2 2.5 2"></path></svg>`,
    "Clear next step": `<svg viewBox="0 0 24 24" focusable="false"><path d="M6 21V4"></path><path d="M6 5h12l-2.5 3.5L18 12H6"></path></svg>`,
    "Easy to read": `<svg viewBox="0 0 24 24" focusable="false"><path d="M3.5 12s3.2-5 8.5-5 8.5 5 8.5 5-3.2 5-8.5 5-8.5-5-8.5-5z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>`,
    "Less overwhelming": `<svg viewBox="0 0 24 24" focusable="false"><path d="M5 19c-1-8 5-15 15-15 1 9-5 16-15 15z"></path><path d="M9 16c1.5-3 4-5.5 8-7"></path></svg>`,
    "Focus mode helped": `<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="7.5"></circle><circle cx="12" cy="12" r="2.5"></circle><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"></path></svg>`,
    "Too much text": `<svg viewBox="0 0 24 24" focusable="false"><path d="M5 7h14"></path><path d="M5 11h14"></path><path d="M5 15h10"></path><path d="M5 19h8"></path></svg>`,
    "Action was unclear": `<svg viewBox="0 0 24 24" focusable="false"><path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.3-1.5 2.4"></path><path d="M12 17.5h.01"></path></svg>`,
    "Deadline was unclear": `<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8"></circle><path d="M12 7.5V12l3 2"></path></svg>`,
    "Words felt difficult": `<svg viewBox="0 0 24 24" focusable="false"><path d="M4 17 8.5 7l4.5 10"></path><path d="M6 13h5"></path><path d="M14 17V9"></path><path d="M14 9h3.5a2.5 2.5 0 0 1 0 5H14"></path></svg>`,
    "Needed more support": `<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="3.4"></circle><path d="M5.5 7.5l3.6 3.6M18.5 7.5l-3.6 3.6M5.5 16.5l3.6-3.6M18.5 16.5l-3.6-3.6"></path></svg>`,
    "I was still confused": `<svg viewBox="0 0 24 24" focusable="false"><path d="M5.5 9a2.5 2.5 0 1 1 3.6 2.2c-.9.5-1.4 1.1-1.4 2"></path><path d="M7.6 16.2h.01"></path><path d="M16.5 7.4v6.2"></path><path d="M16.5 16.4h.01"></path></svg>`,
    "Wrong information": `<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3h8l4 4v14H6z"></path><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"></path></svg>`,
    "Too much information": `<svg viewBox="0 0 24 24" focusable="false"><path d="M6 5h12"></path><path d="M6 8h12"></path><path d="M6 11h12"></path><path d="M6 14h12"></path><path d="M6 17h8"></path></svg>`,
    "I did not know what to do": `<svg viewBox="0 0 24 24" focusable="false"><path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.3-1.5 2.4"></path><path d="M12 17.5h.01"></path></svg>`,
    "I did not trust it": `<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3l7 3v5c0 5-3 8-7 9.5-4-1.5-7-4.5-7-9.5V6z"></path><path d="M10.4 10a1.6 1.6 0 1 1 2.2 1.5c-.7.4-1 .9-1 1.6"></path><path d="M11.6 15.5h.01"></path></svg>`
  };

  return icons[reason] || `<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8"></circle></svg>`;
}

function feedbackPrivacyIcon() {
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3 8-7 9.5-4-1.5-7-4.5-7-9.5V6z"></path><path d="M9 11.5l2.2 2.2L15.5 9.3"></path></svg>`;
}

function sendIconMarkup() {
  return `<svg class="button-line-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 12 20 5l-5.5 14-3-6.2z"></path><path d="m11.5 12.8 4-4"></path></svg>`;
}

function feedbackHeartIcon() {
  return `<svg viewBox="0 0 32 32" focusable="false"><path d="M16 25s-8.5-4.8-8.5-11a4.8 4.8 0 0 1 8.5-3.1A4.8 4.8 0 0 1 24.5 14c0 6.2-8.5 11-8.5 11z"></path></svg>`;
}

function normaliseFeedbackRating(value, answerKey) {
  if (answerKey) return answerKey;

  const rating = String(value || "").toLowerCase();
  if (rating.startsWith("yes")) return "yes";
  if (rating.includes("little") || rating.includes("partly")) return "little";
  if (rating.startsWith("no")) return "no";
  return "";
}

// Forgiving email check — a local part, an @, and a dotted domain, no spaces.
// Deliberately permissive; the goal is to catch obvious typos, not enforce RFC 5322.
function isPlausibleEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function getFeedbackPayload(panel) {
  const contactToggle = panel.querySelector("#modal-feedback-contact-toggle");
  const contactChecked = contactToggle ? contactToggle.checked : false;
  const email = contactChecked
    ? panel.querySelector("#modal-feedback-contact")?.value.trim() || ""
    : "";

  // Document metadata is only ever sent when a real document has actually been
  // analysed. Before that, latestResult still holds the built in demo result,
  // and sending its category, trust and severity would file this feedback
  // against a document the reader never uploaded. Feedback from the home page
  // or the help page is about Northcue itself, so it carries no document.
  const documentContext = hasAnalysedDocument
    ? {
        document_category: latestResult.trust?.document_category || selectedType || "unknown",
        trust_level: latestResult.trust?.trust_assessment || "unknown",
        severity_level: latestResult.trust?.severity_level || "unknown"
      }
    : {};

  // Null when the reader skipped the question, which is expected and normal.
  const confidenceAfter = panel.querySelector(".feedback-confidence-chip.selected")?.dataset.confidence || "";

  return {
    rating: normaliseFeedbackRating(panel.dataset.rating, panel.dataset.answer),
    // Confidence chips share the reason chip class for styling, so they are
    // excluded here to keep the two answers in their own fields.
    reasons: Array.from(panel.querySelectorAll(".feedback-reason-chip.selected:not(.feedback-confidence-chip)"))
      .map((chip) => chip.dataset.reason),
    confidence_after: confidenceAfter,
    note: panel.querySelector(".short-feedback-comment")?.value.trim() || "",
    contact_permission: contactChecked,
    email,
    page: document.body.dataset.page || "unknown",
    section: panel.dataset.feedbackContext || "feedback",
    ...documentContext
  };
}

// Local safety net for when the feedback endpoint cannot be reached. The reply
// address is deliberately NOT kept here: the reader agreed to Northcue
// receiving it, not to it sitting in local storage on what may be a shared
// family device, and nothing ever reads this store back to send it on.
function saveFeedbackFallback(feedback) {
  const savedFeedback = JSON.parse(localStorage.getItem("clearsteps-feedback") || "[]");
  savedFeedback.unshift({
    rating: feedback.rating,
    reasons: feedback.reasons,
    confidence_after: feedback.confidence_after,
    note: feedback.note,
    contact_permission: feedback.contact_permission,
    page: feedback.page,
    section: feedback.section,
    document_category: feedback.document_category,
    trust_level: feedback.trust_level,
    severity_level: feedback.severity_level,
    timestamp: new Date().toISOString(),
    saved_locally: true
  });
  localStorage.setItem("clearsteps-feedback", JSON.stringify(savedFeedback.slice(0, 50)));
}

async function saveShortFeedback(panel) {
  if (!panel) return;

  const rating = normaliseFeedbackRating(panel.dataset.rating, panel.dataset.answer);
  const message = panel.querySelector(".feedback-saved-message");
  if (!rating) {
    if (message) message.textContent = t("feedback.chooseFirst");
    return;
  }

  const feedback = getFeedbackPayload(panel);

  // Forgiving guard: only when the user has asked for a reply and typed something.
  // An empty email is fine (feedback still sends, just with no reply address).
  if (feedback.email && !isPlausibleEmail(feedback.email)) {
    if (message) {
      message.textContent = t("feedback.badEmail");
    }
    panel.querySelector("#modal-feedback-contact")?.focus();
    return;
  }

  const sendButton = panel.querySelector(".send-short-feedback");
  if (sendButton) sendButton.disabled = true;

  let savedToSupabase = false;

  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback)
    });
    savedToSupabase = response.ok;
    if (!response.ok) {
      throw new Error("Feedback endpoint did not accept the event.");
    }
  } catch (error) {
    console.warn("Feedback saved locally because Supabase save failed:", error.message);
    saveFeedbackFallback(feedback);
  } finally {
    if (sendButton) sendButton.disabled = false;
  }

  trackAnalyticsEvent("feedback_submitted", {
    page: feedback.page,
    section: feedback.section
  });

  if (panel.dataset.feedbackContext === "modal") {
    modalTitle.textContent = t("feedback.thanksTitle");
    modalContent.innerHTML = `
      <section class="feedback-flow feedback-success" role="status" aria-live="polite">
        <span class="feedback-success-icon" aria-hidden="true">${feedbackHeartIcon()}</span>
        <h3>${t("feedback.thanksTitle")}</h3>
        <p>${t("feedback.thanksBody")}</p>
        <button type="button" class="primary-btn" data-modal-back>${t("feedback.done")}</button>
      </section>
    `;
    modalContent.querySelector("[data-modal-back]")?.focus();
    return;
  }

  if (message) {
    message.textContent = savedToSupabase
      ? t("feedback.saved")
      : t("feedback.savedLocal");
  }
}

function isOcrReadyResult(payload) {
  return payload && Object.prototype.hasOwnProperty.call(payload, "success");
}

function showOcrReadyResult(payload) {
  if (!payload.success) {
    setStatus(payload.error ? translatedEngineText(payload.error).text : t("status.ocrUnreadable"), true);
    return;
  }

  pendingDocumentJobId = payload.job_id || null;
  // The backend's ready response sends exactly this English sentence. Mapping
  // it onto the status key here keeps the "Document ready" title logic in
  // setStatus key-based while matching today's behaviour byte for byte. Any
  // other engine message passes through as free text.
  if (!payload.message || payload.message === "Your document is ready.") {
    setStatusKey("status.documentReady");
  } else {
    setStatus(translatedEngineText(payload.message).text);
  }
}

function buildCardDetail(card) {
  if (card.id === "what_do_i_need_to_do" && card.steps?.length) {
    return card.steps.map((step) => translatedEngineText(step).text).join(" ");
  }

  if (card.id === "when_is_it_due") {
    return card.date ? t("journey.dateFound", { date: card.date }) : t("journey.noDeadline");
  }

  return translatedEngineText(card.short_answer).text;
}

function buildCheckMarkup(trust) {
  const banner = latestResult.banner || {};
  const genuine = checkGenuineIndicator(trust);
  const urgency = checkUrgencyIndicator(trust.severity_level);
  const nextStep = checkNextStepText(trust, banner, genuine);
  const chips = checkWhyChips(trust);
  const whyRow = chips.length
    ? `<div class="check-why"><span class="check-why-label">${t("check.whyLabel")}</span>${chips.join("")}</div>`
    : "";

  // Scam-suspect documents get no urgency level at all. Showing one would lend
  // weight to a deadline that may itself be part of the pressure tactic.
  const urgencyStatus = trust.processing_mode === "verification_only"
    ? `<p class="check-qblock-status">${t("check.scamDeadline")}</p>`
    : `<p class="check-qblock-status"><span class="check-dot ${urgency.dotClass}"></span>${escapeHtml(urgency.text)}</p>`;

  return `
    <div class="check-panel">
      <div class="check-nextstep check-hero">
        <span class="check-nextstep-label">${checkNextStepIcon()} ${t("check.heroLabel")}</span>
        <p>${escapeHtml(nextStep)}</p>
      </div>
      <p class="check-caption">${escapeHtml(friendlyCategoryLabel(trust.document_category))}</p>
      <div class="check-qblock">
        <p class="check-qblock-label">${t("check.genuineQuestion")}</p>
        <p class="check-qblock-status"><span class="check-dot ${genuine.dotClass}"></span>${escapeHtml(genuine.text)}</p>
        <p class="check-qblock-meaning">${t("check.genuineMeaning")}</p>
      </div>
      <div class="check-qblock">
        <p class="check-qblock-label">${t("check.urgentQuestion")}</p>
        ${urgencyStatus}
        <p class="check-qblock-meaning">${t("check.urgentMeaning")}</p>
      </div>
      <button type="button" class="check-meanings-toggle" data-check-meanings aria-expanded="false">${t("check.meaningsToggle")}</button>
      ${whyRow}
    </div>
  `;
}

// The hero next step, calibrated to how sure the check is. Quiet when confident,
// useful when unsure. Display wording only; the engine's own safe_next_step is
// still the base for confident states.
function checkNextStepText(trust, banner, genuine) {
  if (trust.processing_mode === "verification_only") {
    return trust.safe_next_step
      ? translatedEngineText(trust.safe_next_step).text
      : safeActionFromTrust(trust);
  }
  if (trust.trust_assessment === "low") {
    return t("check.lowTrustStep");
  }
  const engineBase = trust.safe_next_step || banner.text;
  const base = engineBase ? translatedEngineText(engineBase).text : safeActionFromTrust(trust);
  return isRoutineCheck(trust, genuine) ? t("check.noRushPrefix", { base: base }) : base;
}

// Routine = the genuine row reads green AND severity is low AND the engine
// raised no flags. Only then does the whole check soften.
function isRoutineCheck(trust, genuine) {
  return genuine.dotClass === classFromLevel("low") &&
    String(trust.severity_level || "").toLowerCase() === "low" &&
    (trust.processing_mode || "normal") === "normal" &&
    !trust.needs_human_review;
}

// Small arrow for the "One thing to do next" hero label.
function checkNextStepIcon() {
  return '<svg class="check-nextstep-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
}

// Urgency indicator from severity_level (already computed by the engine; shown
// here only). Deliberately hedged and calm — never alarm language. High trust in
// authenticity is a separate question handled by checkGenuineIndicator.
function checkUrgencyIndicator(severityLevel) {
  const value = String(severityLevel || "").toLowerCase();
  if (value === "urgent") return { text: t("check.urgencyUrgent"), dotClass: classFromLevel("high") };
  if (value === "high") return { text: t("check.urgencyHigh"), dotClass: classFromLevel("high") };
  if (value === "medium") return { text: t("check.urgencyMedium"), dotClass: classFromLevel("medium") };
  return { text: t("check.urgencyLow"), dotClass: classFromLevel("low") };
}

// Authenticity indicator, display mapping only. High trust reads green; low trust
// reads as caution without accusing ("we're not sure" rather than "this is a
// scam"). Medium trust reads green ("Nothing unusual spotted") ONLY when the
// engine raised zero companion flags; a caution mode, review flag, or any scam
// signal forces amber, so a shaky document can never accidentally show green.
// Unknown or missing trust also stays amber, never green by default.
function checkGenuineIndicator(trust) {
  const level = String(trust.trust_assessment || "").toLowerCase();
  const hasMixedSignals = Boolean(trust.needs_human_review) ||
    (Array.isArray(trust.scam_signals) && trust.scam_signals.length > 0) ||
    ((trust.processing_mode || "normal") !== "normal");

  if (level === "high") {
    return {
      text: trust.needs_human_review ? t("check.genuineHighReview") : t("check.genuineHigh"),
      dotClass: classFromLevel("low")
    };
  }
  if (level === "low") {
    return { text: t("check.genuineLow"), dotClass: classFromLevel("high") };
  }
  if (level === "medium" && !hasMixedSignals) {
    return { text: t("check.genuineMediumClean"), dotClass: classFromLevel("low") };
  }
  return { text: t("check.genuineDefault"), dotClass: classFromLevel("medium") };
}

function friendlyCategoryLabel(category) {
  const labelKeys = {
    bill_or_payment: "check.categoryBillOrPayment",
    housing: "check.categoryHousing",
    appointment: "check.categoryAppointment",
    employment: "check.categoryEmployment",
    education: "check.categoryEducation",
    bank_or_loan: "check.categoryBankOrLoan",
    government: "check.categoryGovernment",
    medical: "check.categoryMedical",
    legal_or_court: "check.categoryLegalOrCourt",
    benefits: "check.categoryBenefits",
    insurance: "check.categoryInsurance",
    email: "check.categoryEmail",
    possible_scam: "check.categoryPossibleScam",
    template: "check.categoryTemplate",
    outgoing: "check.categoryOutgoing",
    unsupported: "check.categoryUnsupported"
  };
  return t(labelKeys[category] || "check.categoryFallback");
}

// Human-readable "why" chips from the engine's signal arrays, de-duplicated and
// with the trailing full stop trimmed. Returns [] so the row can be hidden.
// Chips read better without a closing full stop, but that is a PRESENTATION
// choice and it has to happen after the lookup, not before it.
//
// The template bank indexes every sentence exactly as the engine emits it,
// stop included, so stripping first made all 55 scam and severity labels miss
// the index and fall back to English in every language. A Polish reader
// opening Document check on a suspected scam saw "Uses pressure wording", on
// the panel whose whole job is explaining why the document was flagged.
// Guarded by tests/bankLookupContract.test.js.
function stripSentenceStop(text) {
  // The danda is included defensively. Northcue's Indic files use a full stop
  // by instruction, but a chip should not silently keep a stop if that changes.
  return String(text).trim().replace(/[.।]+$/, "").trim();
}

function checkWhyChips(trust) {
  const signals = [].concat(trust.severity_signals || [], trust.scam_signals || []);
  const seen = new Set();
  const chips = [];
  signals.forEach((signal) => {
    const raw = String(signal || "").trim();
    if (!raw) return;
    // Deduplicate on the English, insensitive to the trailing stop, so two
    // signals differing only by punctuation still collapse to one chip.
    const key = stripSentenceStop(raw).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    // Translate the signal as the bank knows it, then trim the stop off
    // whatever comes back, in whichever language it comes back in.
    const translated = translatedEngineText(raw).text;
    chips.push(`<span class="check-why-chip">${escapeHtml(stripSentenceStop(translated))}</span>`);
  });
  return chips;
}

function safeActionFromTrust(trust) {
  if (trust.processing_mode === "verification_only") {
    return t("check.safeActionVerify");
  }
  if (trust.processing_mode === "unsupported") {
    return t("check.safeActionUnclearUpload");
  }
  return t("check.safeActionDefault");
}

function classFromLevel(level) {
  const value = String(level || "").toLowerCase();
  // Calm first: a "low" concern level is reassuring (green) and must never be
  // grouped with "high"/"urgent" (which was the old red-low bug). Still used by
  // the trust panel's "Looks genuine" dot, so it stays wired, just corrected.
  if (value.includes("low")) return "badge-low";
  if (value.includes("medium")) return "badge-medium";
  if (value.includes("urgent") || value.includes("high")) return "badge-high";
  return "badge-low";
}

function labelForStyle(style) {
  const labelKeys = {
    simple: "journey.cardStyleSimple",
    animal: "journey.cardStyleAnimal",
    shape: "journey.cardStyleShape",
    map: "journey.cardStyleMap"
  };
  return t(labelKeys[style] || "journey.cardStyleSimple");
}

function showActionMessage(message) {
  document.querySelector("#action-message").textContent = message;
}

// Dictionary-keyed statuses go through here so setStatus can recognise the
// state by key instead of comparing translated display text.
function setStatusKey(titleKey, isError = false) {
  setStatus(t(titleKey), isError, titleKey);
}

function setStatus(message, isError = false, statusKey = "") {
  if (!statusText) return;
  lastStatusTitleKey = statusKey;

  const file = fileInput?.files?.[0];
  const shouldHide = !isError && !file && lastStatusTitleKey === "status.chooseToBegin";
  statusText.classList.toggle("hidden", shouldHide);
  statusText.classList.toggle("error", isError);

  if (shouldHide) {
    form?.classList.remove("file-added");
    document.querySelector(".document-type-row")?.classList.remove("type-pills-visible");
    document.querySelector(".change-type-btn")?.setAttribute("aria-expanded", "false");
    return;
  }

  if (!statusTitle || !statusDetail) {
    statusText.textContent = message;
    return;
  }

  if (isError) {
    statusTitle.textContent = t("status.errorTitle");
    statusDetail.textContent = message;
    return;
  }

  if (lastStatusTitleKey === "status.documentSelected" || lastStatusTitleKey === "status.documentReady") {
    statusTitle.textContent = t("status.readyTitle");
    statusDetail.textContent = file ? t("status.fileMeta", { fileName: file.name, fileSize: formatFileSize(file.size) }) : message;
    return;
  }

  statusTitle.textContent = message;
  statusDetail.textContent = file ? t("status.fileMeta", { fileName: file.name, fileSize: formatFileSize(file.size) }) : "";
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? t("status.submitLoading") : t("status.submitIdle");
  document.querySelector(".type-confirm")?.style.setProperty("display", isLoading ? "none" : "");
}

function typeNameForReading(type) {
  const nameKeys = { letter: "status.typeNameLetter", bill: "status.typeNameBill", work: "status.typeNameWork", medical: "status.typeNameMedical", school: "status.typeNameSchool", legal: "status.typeNameLegal", email: "status.typeNameEmail", article: "status.typeNameArticle" };
  return nameKeys[type] ? t(nameKeys[type]) : null;
}

function setReadingHint(text) {
  const el = document.querySelector("[data-reading-hint]");
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || "";
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return t("status.fileSizeZero");
  const units = [t("status.fileSizeUnitB"), t("status.fileSizeUnitKb"), t("status.fileSizeUnitMb"), t("status.fileSizeUnitGb")];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, unitIndex);
  return t("status.fileSizeValue", { value: value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1), unit: units[unitIndex] });
}

function openModal(title, html, options = {}) {
  modalReturnFocusTarget = options.returnFocusTo || document.activeElement;
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modal.classList.toggle("help-modal", options.variant === "help");
  modal.classList.toggle("feedback-modal", options.variant === "feedback");
  modal.classList.remove("hidden");
  const closeButton = document.querySelector("#modal-close");
  closeButton.innerHTML = options.closeLabel || t("nav.modalBack");
  closeButton.setAttribute("aria-label", options.closeAriaLabel || t("aria.goBack"));
  prepareThemeAwareArtMetadata();
  updateThemeAwareArt();
  closeButton.focus();
}

function closeModal() {
  const returnTarget = modalReturnFocusTarget;
  modalReturnFocusTarget = null;
  modal.classList.add("hidden");
  modal.classList.remove("help-modal");
  modal.classList.remove("feedback-modal");
  const closeButton = document.querySelector("#modal-close");
  closeButton.textContent = t("nav.modalBack");
  closeButton.setAttribute("aria-label", t("aria.goBack"));
  modalContent.innerHTML = "";
  if (returnTarget && typeof returnTarget.focus === "function" && document.contains(returnTarget)) {
    returnTarget.focus();
  }
}

function wireModalSheetGesture() {
  const box = modal.querySelector(".modal-box");
  if (!box) return;

  const DRAG_SLOP_PX = 8;
  const DISMISS_FRACTION = 0.35;
  const DISMISS_VELOCITY_PX_MS = 0.6;

  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let lastMoveTime = 0;
  let velocity = 0;
  let dragging = false;
  let gestureBlocked = false;
  let touchActive = false;

  function clearInlineStyles() {
    box.style.transform = "";
    box.style.transition = "";
    box.style.animation = "";
  }

  // Touches that begin inside the content area may only turn into a
  // dismiss drag when every scrollable element under the finger is
  // already at its top, so scrolling up through long content can never
  // fling the sheet closed. Touches on the header area (the grabber,
  // the title, the box padding) may always drag.
  function scrollChainAtTop(target) {
    let node = target;
    while (node && node !== box.parentElement) {
      if (node.scrollHeight > node.clientHeight && node.scrollTop > 0) return false;
      node = node.parentElement;
    }
    return true;
  }

  function dragAllowedFrom(target) {
    if (target.closest("input, textarea, select")) return false;
    if (!target.closest("#modal-content")) return true;
    return scrollChainAtTop(target);
  }

  box.addEventListener("touchstart", (event) => {
    if (modal.classList.contains("hidden")) return;
    if (event.touches.length !== 1) { gestureBlocked = true; return; }
    const touch = event.touches[0];
    touchActive = true;
    dragging = false;
    gestureBlocked = !dragAllowedFrom(event.target);
    startX = touch.clientX;
    startY = touch.clientY;
    lastY = touch.clientY;
    lastMoveTime = event.timeStamp;
    velocity = 0;
  }, { passive: true });

  box.addEventListener("touchmove", (event) => {
    if (!touchActive || gestureBlocked) return;
    if (event.touches.length !== 1) { gestureBlocked = true; return; }
    const touch = event.touches[0];
    const dy = touch.clientY - startY;
    const dx = touch.clientX - startX;

    if (!dragging) {
      // An upward or sideways start means scrolling or a tap, never a
      // dismiss. Horizontal swiping is reserved for the cue card flow.
      if (dy < 0 || Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dy) > DRAG_SLOP_PX || Math.abs(dx) > DRAG_SLOP_PX) gestureBlocked = true;
        return;
      }
      if (dy <= DRAG_SLOP_PX) return;
      dragging = true;
      box.style.animation = "none";
      box.style.transition = "none";
    }

    event.preventDefault();
    const offset = Math.max(0, dy);
    box.style.transform = `translateY(${offset}px)`;
    const dt = event.timeStamp - lastMoveTime;
    if (dt > 0) velocity = (touch.clientY - lastY) / dt;
    lastY = touch.clientY;
    lastMoveTime = event.timeStamp;
  }, { passive: false });

  function endGesture() {
    if (!touchActive) return;
    touchActive = false;
    if (!dragging) { gestureBlocked = false; return; }
    dragging = false;

    const dragged = Math.max(0, lastY - startY);
    const shouldDismiss = dragged > box.offsetHeight * DISMISS_FRACTION || velocity > DISMISS_VELOCITY_PX_MS;

    if (shouldDismiss) {
      box.style.transition = "transform 200ms ease-in";
      box.style.transform = `translateY(${box.offsetHeight + 60}px)`;
      window.setTimeout(() => {
        clearInlineStyles();
        closeModal();
      }, 200);
    } else {
      box.style.transition = "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)";
      box.style.transform = "translateY(0)";
      window.setTimeout(clearInlineStyles, 260);
    }
  }

  box.addEventListener("touchend", endGesture, { passive: true });
  box.addEventListener("touchcancel", endGesture, { passive: true });
}

function trapModalFocus(event) {
  const focusable = Array.from(
    modal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")
  ).filter((element) => !element.disabled && element.getAttribute("aria-hidden") !== "true");

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function normalizeApiResult(result) {
  const fallback = createMockApiResult();
  const safeResult = result || {};
  const cards = cardsFromStructuredResult(safeResult, fallback);
  const trust = safeResult.trust || fallback.trust;

  return {
    ...fallback,
    ...safeResult,
    trust: {
      ...fallback.trust,
      ...trust
    },
    banner: {
      ...fallback.banner,
      ...(safeResult.banner || {})
    },
    structured_result: safeResult.structured_result || fallback.structured_result || null,
    cards: cards.map((card, index) => {
      const fallbackCard = fallback.cards[index];
      return {
        ...fallbackCard,
        ...card,
        short_answer: card.short_answer || fallbackCard.short_answer
      };
    })
  };
}

function cardsFromStructuredResult(result, fallback) {
  const structuredCards = result?.structured_result?.cards;

  if (Array.isArray(structuredCards) && structuredCards.length > 0) {
    return fallback.cards.map((fallbackCard, index) => {
      const structuredCard = structuredCards[index];
      return structuredCardToUiCard(structuredCard, index, fallbackCard);
    });
  }

  if (Array.isArray(result.cards) && result.cards.length === 6) {
    return result.cards;
  }

  return fallback.cards;
}

function structuredCardToUiCard(card, index, fallbackCard) {
  if (!card || typeof card !== "object") {
    return fallbackCard;
  }

  const keyPoints = Array.isArray(card.key_points)
    ? card.key_points.filter(Boolean).map((item) => String(item))
    : [];

  return {
    ...fallbackCard,
    id: legacyIdFromStructuredCard(card, fallbackCard),
    title: card.title || fallbackCard.title,
    short_answer: card.simple_explanation || fallbackCard.short_answer,
    steps: keyPoints,
    date: card.possible_deadline || null,
    status: card.status || statusFromStructuredWarning(card.warning) || fallbackCard.status,
    structured_card: {
      ...card,
      card_number: card.card_number || index + 1
    }
  };
}

function legacyIdFromStructuredCard(card, fallbackCard) {
  if (card.card_id) return card.card_id;

  const cardTypeMap = {
    what_is_this: "what_is_this",
    who_sent_it: "what_is_this",
    what_matters_most: "what_matters_most",
    what_do_i_need_to_do: "what_do_i_need_to_do",
    when_does_it_matter: "when_is_it_due",
    what_should_i_check: "what_could_happen",
    what_if_i_feel_stuck: "helpful_note"
  };

  return cardTypeMap[card.card_type] || fallbackCard.id;
}

function statusFromStructuredWarning(warning) {
  const text = String(warning || "").toLowerCase();
  if (!text) return null;
  if (text.includes("urgent") || text.includes("serious")) return "urgent";
  if (text.includes("check") || text.includes("suspicious") || text.includes("unclear")) return "caution";
  return "normal";
}

function createMockApiResult() {
  return {
    job_id: "mock-job",
    hasUploaded: false,
    trust: {
      trust_assessment: "medium",
      severity_level: "medium",
      urgency_level: "soon",
      document_category: "bill_or_payment",
      document_type: "unknown",
      processing_mode: "caution",
      confidence: "medium",
      needs_human_review: false,
      review_reason: "Some details may need checking.",
      authentic_signals: [],
      distrust_signals: [],
      scam_signals: [],
      severity_signals: [],
      input_quality: "borderline",
      safe_next_step: "Check the original document before acting."
    },
    banner: {
      show: true,
      type: "caution",
      text: "Some details need checking before you act."
    },
    structured_result: null,
    cards: [
      { id: "what_is_this", title: "What is this?", short_answer: "This looks like a formal document.", status: "normal" },
      { id: "what_matters_most", title: "What matters most?", short_answer: "This may need checking soon.", status: "normal" },
      { id: "what_do_i_need_to_do", title: "What do I need to do?", short_answer: "Check the amount and due date.", steps: ["Check the amount.", "Check the due date."], status: "normal" },
      { id: "when_is_it_due", title: "When is it due?", short_answer: "No deadline clearly stated.", date: null, status: "normal" },
      { id: "what_could_happen", title: "What could happen if I ignore it?", short_answer: "There may be follow-up action.", status: "caution" },
      { id: "helpful_note", title: "Helpful note", short_answer: "Check the original before acting.", status: "good" }
    ],
    display_text: "",
    tts_script: ""
  };
}

function hasUploadedResult() {
  return Boolean(latestResult.hasUploaded);
}

function savePreferences(showConfirmation = true) {
  const selectedColour = document.body.classList.contains("theme-dark")
    ? "dark"
    : document.querySelector(".colour-style.selected")?.dataset.colourStyle || "calm";
  const selectedTextSize = document.querySelector(".text-size-btn.selected")?.dataset.textSize || "medium";
  const selectedBackground = document.querySelector(".background-style-choice.selected")?.dataset.backgroundStyle || "plain";
  const standardCards = document.body.classList.contains("card-standard");

  localStorage.setItem(
    "clearsteps-preferences",
    JSON.stringify({
      colour: selectedColour,
      backgroundStyle: selectedBackground,
      textSize: selectedTextSize,
      cardStyle: standardCards ? "standard" : "soft",
      focusMode: document.body.classList.contains("focus-mode"),
      simpleView: document.body.classList.contains("cards-simple"),
      dyslexiaMode: document.body.classList.contains("dyslexia-mode")
    })
  );

  if (showConfirmation !== false) {
    openModal(t("nav.prefsSavedTitle"), `<p>${t("nav.prefsSavedBody")}</p>`);
  }
}

function loadSavedPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem("clearsteps-preferences") || "{}");
    setTheme(saved.colour || "calm");
    setBackgroundStyle(saved.backgroundStyle || "plain");
    setTextSize(saved.textSize || "medium");
    setCardStyle(saved.cardStyle || "soft");
    setFocusMode(Boolean(saved.focusMode), { save: false });
    setSimpleView(Boolean(saved.simpleView), { save: false });
    document.body.classList.toggle("dyslexia-mode", Boolean(saved.dyslexiaMode));

    toggleButtons.forEach((button) => {
      if (button.dataset.toggle === "focus-mode") return;

      const isActive = document.body.classList.contains(button.dataset.toggle);
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  } catch (error) {
    setTheme("calm");
    setBackgroundStyle("plain");
    setTextSize("medium");
    setCardStyle("soft");
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
