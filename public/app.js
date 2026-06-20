const pages = ["landing", "home", "journey", "help", "comfort"];
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

const helpGuides = {
  overwhelmed: {
    title: "I feel overwhelmed",
    text: "It is okay to feel this way. You can take one small step at a time.",
    steps: [
      {
        icon: "focus",
        title: "Turn on Focus mode",
        detail: "Hide distractions and see one step at a time."
      },
      {
        icon: "document",
        title: "Read only the Action card",
        detail: "You do not need to understand everything."
      },
      {
        icon: "pause",
        title: "Take a break",
        detail: "It is okay to pause and come back later."
      }
    ],
    action: "Turn on Focus mode",
    actionType: "focus"
  },
  fake: {
    title: "I think this document is fake",
    text: "Do not pay or share details until you check it safely.",
    steps: [
      {
        icon: "shield",
        title: "Do not use links in the document",
        detail: "They may not be safe."
      },
      {
        icon: "search",
        title: "Search for the organisation yourself",
        detail: "Use its official website or app."
      },
      {
        icon: "people",
        title: "Ask someone to check it with you",
        detail: "A second look can help."
      }
    ],
    action: "Open Document check",
    actionType: "check"
  },
  deadline: {
    title: "I cannot find the deadline",
    text: "Deadlines can be hidden in small text. Check slowly.",
    steps: [
      {
        icon: "calendar",
        title: "Open the Deadline card",
        detail: "Northcue looks for the due date."
      },
      {
        icon: "document",
        title: "Check the original page",
        detail: "Look near the top, bottom, and bold text."
      },
      {
        icon: "calendar",
        title: "Save the date if you find one",
        detail: "Write it down or add it to your calendar."
      }
    ],
    action: "Open Deadline card",
    actionType: "deadline"
  },
  time: {
    title: "I need more time",
    text: "You may be able to ask for more time. Use safe contact details.",
    steps: [
      {
        icon: "document",
        title: "Check who sent it",
        detail: "Find the organisation name first."
      },
      {
        icon: "shield",
        title: "Use official contact details",
        detail: "Do not rely on unknown links or numbers."
      },
      {
        icon: "message",
        title: "Ask for an extension",
        detail: "Use clear words: I need more time."
      }
    ],
    action: "Go to Document Journey",
    actionType: "journey"
  },
  wrong: {
    title: "I uploaded the wrong file",
    text: "That is easy to fix. You can replace the file.",
    steps: [
      {
        icon: "close",
        title: "Remove the current upload",
        detail: "Northcue will forget this file."
      },
      {
        icon: "folder",
        title: "Choose the correct document",
        detail: "Pick one clear file if possible."
      },
      {
        icon: "upload",
        title: "Upload it again",
        detail: "Start the same simple journey."
      }
    ],
    action: "Upload another document",
    actionType: "upload"
  },
  person: {
    title: "I need someone to help me",
    text: "You can ask someone you trust to look with you.",
    steps: [
      {
        icon: "copy",
        title: "Copy the summary",
        detail: "Share only the simple explanation."
      },
      {
        icon: "people",
        title: "Choose a trusted person",
        detail: "Family, friend, adviser, or support worker."
      },
      {
        icon: "document",
        title: "Ask them to read one card",
        detail: "Start with the Action card together."
      },
      {
        icon: "shield",
        title: "Contact the organisation safely",
        detail: "Use official contact details — not links or numbers from the document."
      }
    ],
    action: "Copy summary",
    actionType: "copy"
  }
};

const cardEncouragement = [
  "Good start. Let's go one card at a time.",
  "One step done.",
  "You are doing well.",
  "Good progress.",
  "You are nearly there.",
  "Last card. You made it."
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
let pendingDocumentJobId = null;
let currentTheme = "calm";
let currentBackgroundStyle = "plain";
let activeFeedbackAnswer = "";
let latestUploadInputQuality = "unknown";
let latestOcrStatus = "unknown";
let lastTrackedCardKey = "";
let journeyCompletedTracked = false;

const backgroundStyles = ["plain", "dots", "shapes", "notebook", "animals"];
const legacyBackgroundStyles = {
  clouds: "plain",
  forest: "animals",
  rainbow: "shapes"
};

const feedbackChoices = {
  yes: {
    rating: "Yes, this helped",
    label: "Yes",
    detail: "This helped",
    tone: "positive",
    heading: "What helped most?",
    chips: ["Simple words", "Clear next step", "Easy to read", "Less overwhelming", "Focus mode helped"]
  },
  little: {
    rating: "A little",
    label: "A little",
    detail: "Partly helpful",
    tone: "mixed",
    heading: "What could be clearer?",
    chips: ["Too much text", "Action was unclear", "Deadline was unclear", "Words felt difficult", "Needed more support"]
  },
  no: {
    rating: "No, I was confused",
    label: "No",
    detail: "I was confused",
    tone: "needs-work",
    heading: "What went wrong?",
    chips: ["I was still confused", "Wrong information", "Too much information", "I did not know what to do", "I did not trust it"]
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
let modalReturnFocusTarget = null;

document.addEventListener("click", (event) => {
  const helpCard = event.target.closest(".help-card[data-help]");
  if (!helpCard) return;

  openHelpModal(helpCard.dataset.help, helpCard);
});

loadSavedPreferences();
wireNavigation();
wireUpload();
wireCueCards();
wireActions();
wireCompletion();
wireHelp();
wireComfortSettings();
wireFeedback();

setPage("landing");
setJourneyStep("upload");
renderCard();
renderProgressDots();
prepareThemeAwareArtMetadata();
updateThemeAwareArt();

function wireNavigation() {
  pageLinks.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setPage(button.dataset.pageLink);
      if (button.dataset.pageLink === "journey" && !hasUploadedResult()) {
        setJourneyStep("upload");
      }
    });
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
    button.setAttribute("aria-label", isActive ? "Turn off Focus mode" : "Focus mode");
  });

  if (cardFocusToggle) {
    cardFocusToggle.classList.toggle("active", isActive);
    cardFocusToggle.setAttribute("aria-pressed", String(isActive));
    cardFocusToggle.querySelector("span").textContent = isActive ? "Exit focus" : "Focus on card";
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
        moreTypeLabel.textContent = "More";
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
    fileName.textContent = "PDF, JPG, or PNG";
    setStatus(file ? "Document selected." : "Choose a document to begin.");
    form.classList.toggle("file-added", !!file);
    if (file) updateTypeConfirmLabel();
  });

  removeDocumentButton?.addEventListener("click", () => {
    if (form.classList.contains("file-added")) {
      fileInput.click();
      return;
    }
    fileInput.value = "";
    pendingDocumentJobId = null;
    fileName.textContent = "PDF, JPG, or PNG";
    setStatus("Choose a document to begin.");
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
      setStatus("Choose one document first.", true);
      return;
    }

    setLoading(true);
    const _uploadTypeName = typeNameForReading(selectedType);
    setStatus(_uploadTypeName ? `Reading your ${_uploadTypeName}…` : "Reading your document…");
    setReadingHint(_uploadTypeName ? `This looks like a ${_uploadTypeName}. Pulling out the key points…` : "Pulling out the key points…");
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

    try {
      const response = await fetch("/api/simplify", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed.");
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
      setStatus("Your cue cards are ready.");
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
      setStatus(error.message || "Please try again.", true);
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
  const labels = {
    auto: "We’ll detect the type for you.",
    letter: "Looks like a letter.",
    bill: "Looks like a bill.",
    work: "Treating as a work document.",
    medical: "Treating as a medical document.",
    school: "Treating as a school document.",
    legal: "Treating as a legal document.",
    email: "Treating as an email.",
    article: "Treating as an article.",
    other: "Treating as another type.",
  };
  el.textContent = labels[selectedType] || "Type selected.";
}

async function analyseReadyDocument() {
  const analysisJobId = pendingDocumentJobId;
  setLoading(true);
  const _analysisTypeName = typeNameForReading(selectedType);
  setStatus(_analysisTypeName ? `Reading your ${_analysisTypeName}…` : "Reading your document…");
  setReadingHint(_analysisTypeName ? `This looks like a ${_analysisTypeName}. Pulling out the key points…` : "Pulling out the key points…");
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
        documentCategory: selectedType
      })
    });

    const payload = await response.json();
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || "We could not understand this document yet.");
    }

    latestResult = normalizeApiResult(payload);
    latestResult.hasUploaded = true;
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
    setStatus("Your cue cards are ready.");
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
    setStatus(error.message || "Please try again.", true);
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
    openModal(card.title, `<p>${buildCardDetail(card)}</p>`);
  });

  document.querySelector("#card-style-button").addEventListener("click", openCardStyleModal);
  document.querySelector("#check-button").addEventListener("click", () => {
    openDocumentCheck();
  });
}

function wireActions() {
  document.querySelector("#copy-summary").addEventListener("click", async () => {
    setJourneyStep("act");
    trackAnalyticsEvent("copy_summary_clicked", {
      page: "journey",
      section: "actions"
    });
    const text = latestResult.cards.map((card) => `${card.title} ${card.short_answer}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showActionMessage("Summary copied.");
    } catch (error) {
      showActionMessage("Copy did not work. You can copy from the card text.");
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
    fileName.textContent = "PDF, JPG, or PNG";
    setStatus("Choose a document to begin.");
    latestResult = createMockApiResult();
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

  openModal(guide.title, buildHelpModalMarkup(key, guide), {
    returnFocusTo: sourceCard,
    variant: "help",
    closeLabel: "&times;",
    closeAriaLabel: "Close help popup"
  });
}

function buildHelpModalMarkup(key, guide) {
  const steps = guide.steps.map((step) => `
    <li>
      <span class="help-step-icon" aria-hidden="true">${helpStepIconMarkup(step.icon)}</span>
      <span class="help-step-copy">
        <strong>${escapeHtml(step.title)}</strong>
        <small>${escapeHtml(step.detail)}</small>
      </span>
    </li>
  `).join("");

  return `
    <div class="help-modal-content">
      <span class="help-icon-bubble help-modal-icon ${helpIconTone(key)}" aria-hidden="true">${helpIconMarkup(key)}</span>
      <p class="help-modal-text">${escapeHtml(guide.text)}</p>
      <hr class="help-modal-rule">
      <p class="help-modal-section-title">Try these next steps</p>
      <ol class="help-modal-steps">
        ${steps}
      </ol>
      <div class="help-modal-footer">
        <button type="button" class="outline-btn help-modal-back" data-modal-back>&larr; Back</button>
        <button type="button" class="primary-btn help-modal-action" data-help-action="${escapeHtml(guide.actionType)}">${escapeHtml(guide.action)} <span aria-hidden="true">&rarr;</span></button>
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
      setStatus("Upload a document first, then Northcue can look for a deadline.", true);
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
    setStatus("Upload a document first, then Northcue can make a summary.", true);
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
        counter.textContent = `${textarea.value.length} / ${textarea.maxLength}`;
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
    setStatus("Upload a document first, then you can check it.", true);
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

function openDocumentCheck() {
  if (!hasUploadedResult()) {
    setJourneyStep("upload");
    openModal("Document check", "<p>Upload a document first.<br>Then Northcue can check trust, severity, and next steps.</p>");
    return;
  }

  setJourneyStep("check");
  trackAnalyticsEvent("document_check_clicked", {
    page: "journey",
    section: "document_check"
  });
  openModal("Document check", buildCheckMarkup(latestResult.trust));
}

function renderCard() {
  const card = latestResult.cards[cardIndex];

  document.querySelector("#card-progress").textContent = `Card ${cardIndex + 1} of ${latestResult.cards.length}`;
  document.querySelector("#card-icon").innerHTML = cardIconMarkup(card.id);
  document.querySelector("#card-title").textContent = card.title;
  document.querySelector("#card-answer").textContent = card.short_answer;
  document.querySelector("#card-explanation").textContent = shortCardExplanation(card);
  document.querySelector("#card-feedback").textContent = cardEncouragement[cardIndex] || "Keep going at your own pace.";

  const isLastCard = latestResult.cards.length > 0 && cardIndex >= latestResult.cards.length - 1;
  document.querySelector("#card-next").innerHTML = isLastCard ? "Finish" : "Next &rarr;";
  document.querySelector(".cue-card-panel").classList.remove("hidden");
  document.querySelector("#completion-screen").classList.add("hidden");
  document.querySelector("#card-feedback").classList.remove("hidden");
  document.querySelector(".journey-main").classList.remove("is-complete");

  if (Array.isArray(card.steps) && card.steps.length > 0) {
    cardSteps.classList.remove("hidden");
    cardSteps.innerHTML = card.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  } else {
    cardSteps.classList.add("hidden");
    cardSteps.innerHTML = "";
  }

  renderProgressDots();
  prepareThemeAwareArtMetadata();
  updateThemeAwareArt();
  trackCurrentCardViewed();
}

function showCompletionScreen() {
  const count = latestResult.cards.length;
  const countEl = document.querySelector("#completion-card-count");
  if (countEl) countEl.textContent = count;
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

function cardIconMarkup(cardId) {
  const icons = {
    what_is_this: northcueIcon("document", "northcue-icon northcue-cue-icon"),
    what_matters_most: northcueIcon("what-matters-most", "northcue-icon northcue-cue-icon"),
    what_do_i_need_to_do: northcueIcon("what-to-do", "northcue-icon northcue-cue-icon"),
    when_is_it_due: northcueIcon("deadline", "northcue-icon northcue-cue-icon"),
    what_could_happen: northcueIcon("safety-check", "northcue-icon northcue-cue-icon"),
    helpful_note: northcueIcon("helpful-note", "northcue-icon northcue-cue-icon")
  };

  return icons[cardId] || icons.what_is_this;
}

function shortCardExplanation(card) {
  if (card.id === "what_is_this") {
    return "It can be read clearly, so we can pull out the key points.";
  }
  if (card.id === "what_matters_most") {
    return "This helps you know what needs attention first.";
  }
  if (card.id === "what_do_i_need_to_do") {
    return "Use these as small steps, one at a time.";
  }
  if (card.id === "when_is_it_due") {
    return card.date ? "Use this date before making a reminder." : "No clear date was found in the document.";
  }
  if (card.id === "what_could_happen") {
    return "This helps you decide how carefully to respond.";
  }
  return "Check the original document if anything feels unclear.";
}

function renderProgressDots() {
  progressDots.innerHTML = latestResult.cards
    .map((card, index) => {
      const state = index === cardIndex ? "active" : "inactive";
      return `<span class="progress-dot${index === cardIndex ? " active" : ""}" aria-label="${index + 1} of ${latestResult.cards.length}">${northcueIcon(`progress-dot-${state}`, "northcue-icon northcue-progress-icon")}</span>`;
    })
    .join("");
  prepareThemeAwareArtMetadata();
  updateThemeAwareArt();
}

function openCardStyleModal() {
  const styles = [
    { id: "simple", label: "Simple view" },
    { id: "animal", label: "Animal Cards" },
    { id: "shape", label: "Shape Cards" },
    { id: "map", label: "Map Cards" }
  ];

  const markup = styles
    .map((style) => {
      const activeText = style.id === activeCardStyle ? " selected" : "";
      return `<button type="button" class="outline-btn style-option${activeText}" data-style="${style.id}">${style.label}</button>`;
    })
    .join("");

  openModal("Card style", `<div class="style-list">${markup}<p>Custom card packs coming later.</p></div>`);

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
      showActionMessage(`${labelForStyle(activeCardStyle)} selected.`);
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
      "Add to calendar",
      "<p>No clear date was found in this document, so there's nothing to add yet.<br>If you spotted a date yourself, you can add it to your calendar by hand.</p>"
    );
    return;
  }

  const title = calendarEventTitle();
  const ics = buildIcsForDeadline(parsed, title);
  downloadIcsFile(ics, "northcue-date.ics");
  showActionMessage("Calendar file downloaded. Open it to add the date, and your calendar will remind you.");
}

// Title includes the document type only when it's confidently known; otherwise generic.
function calendarEventTitle() {
  const trust = latestResult?.trust || {};
  const typeKey = (trust.document_type || "").toLowerCase();
  const categoryKey = (trust.document_category || "").toLowerCase();

  const typeLabels = {
    council_tax_notice: "council tax letter",
    energy_bill: "energy bill",
    bill_or_payment_notice: "bill",
    appointment_letter: "appointment letter"
  };
  const categoryLabels = {
    bill_or_payment: "bill",
    appointment: "appointment letter",
    government: "council or government letter",
    medical: "medical letter",
    housing: "housing letter",
    employment: "work letter",
    education: "school letter",
    bank_or_loan: "bank letter"
  };
  const selectedLabels = {
    bill: "bill",
    letter: "letter",
    medical: "medical document",
    school: "school document",
    work: "work document",
    legal: "legal document"
  };

  const label =
    typeLabels[typeKey] ||
    categoryLabels[categoryKey] ||
    (selectedType && selectedType !== "auto" ? selectedLabels[selectedType] : null);

  return label ? `Check your ${label}` : "Check your document";
}

// Best-effort parse of a free-text deadline (UK formats) into {year, month, day}.
function parseDeadlineToDate(text) {
  const value = String(text).trim();
  if (!value) return null;

  let match = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (match) return validDateParts(Number(match[1]), Number(match[2]), Number(match[3]));

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
  const description = icsEscape("A date from a document you reviewed in Northcue. Check the original document.");

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
  modalTitle.textContent = "Get in touch";
  modalContent.innerHTML = buildContactRequestMarkup();
  document.querySelector("#modal-contact-email")?.focus();
}

function buildContactRequestMarkup() {
  return `
    <section class="feedback-flow modal-feedback-panel" data-feedback-context="modal">
      <p class="feedback-intro">Leave your details and we'll reach out when we can.</p>
      <p class="feedback-private-note">${feedbackPrivacyIcon()} We'll only use this to contact you. Please don't include any document content here.</p>
      <hr class="feedback-rule">
      <label class="feedback-label" for="modal-contact-email">Email or phone number</label>
      <input id="modal-contact-email" class="feedback-contact-input" type="text" placeholder="How should we reach you?">
      <label class="feedback-label" for="modal-contact-note">What would you like help with? <span>optional</span></label>
      <textarea id="modal-contact-note" class="short-feedback-comment" maxlength="240" placeholder="A few words is enough — please don't paste document content here."></textarea>
      <button type="button" class="primary-btn" id="send-contact-request">${sendIconMarkup()} Send</button>
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
    if (savedMessage) savedMessage.textContent = "Please add an email or phone number so we can reach you.";
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
  modalTitle.textContent = "Thanks.";
  modalContent.innerHTML = `
    <section class="feedback-flow feedback-success" role="status" aria-live="polite">
      <span class="feedback-success-icon" aria-hidden="true">${feedbackHeartIcon()}</span>
      <h3>Thanks.</h3>
      <p>We've noted your request. Someone from Northcue will be in touch.</p>
      <button type="button" class="primary-btn" data-modal-back>Done</button>
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
  openModal("Give feedback", buildFeedbackStepOneMarkup(), {
    returnFocusTo: returnTarget,
    variant: "feedback"
  });
}

function renderFeedbackStepOne() {
  modalTitle.textContent = "Give feedback";
  modalContent.innerHTML = buildFeedbackStepOneMarkup();
  modalContent.querySelector("[data-feedback-choice]")?.focus();
}

function renderFeedbackStepTwo(answerKey) {
  const choice = feedbackChoices[answerKey] || feedbackChoices.little;
  modalTitle.textContent = "Give feedback";
  modalContent.innerHTML = buildFeedbackStepTwoMarkup(answerKey, choice);
  modalContent.querySelector(".feedback-reason-chip")?.focus();
}

function buildFeedbackStepOneMarkup() {
  const choices = Object.entries(feedbackChoices).map(([key, choice]) => `
    <button type="button" class="feedback-choice-card ${choice.tone}" data-feedback-choice="${key}">
      <span class="feedback-face" aria-hidden="true">${feedbackFaceMarkup(key)}</span>
      <strong>${escapeHtml(choice.label)}</strong>
      <small>${escapeHtml(choice.detail)}</small>
    </button>
  `).join("");

  return `
    <section class="feedback-flow modal-feedback-panel" data-feedback-context="modal">
      <p class="feedback-intro">Your feedback helps us make Northcue better.</p>
      <hr class="feedback-rule">
      <div class="feedback-question">
        <h3>Was this helpful?</h3>
        <p>This will only take a few seconds.</p>
      </div>
      <div class="feedback-choice-row" role="group" aria-label="Was this helpful?">
        ${choices}
      </div>
      <p class="feedback-private-note">${feedbackPrivacyIcon()} Your feedback is private and helps us improve.</p>
      <div class="feedback-contact-option">
        <hr class="feedback-rule">
        <p class="feedback-or-text">Or, would you like us to get in touch?</p>
        <button type="button" class="outline-btn feedback-contact-btn" data-contact-request>Please get in touch with me</button>
      </div>
    </section>
  `;
}

function buildFeedbackStepTwoMarkup(answerKey, choice) {
  const chips = choice.chips.map((chip) => `
    <button type="button" class="feedback-reason-chip" data-reason="${escapeHtml(chip)}" aria-pressed="false">
      ${feedbackReasonIcon(chip)}
      <span>${escapeHtml(chip)}</span>
    </button>
  `).join("");

  return `
    <section class="feedback-flow modal-feedback-panel feedback-step-two" data-feedback-context="modal" data-rating="${escapeHtml(choice.rating)}" data-answer="${answerKey}">
      <div class="feedback-selected-bar ${choice.tone}">
        <span>You selected: <strong>${escapeHtml(choice.rating)}</strong></span>
        <button type="button" data-feedback-change>Change</button>
      </div>
      <div class="feedback-question">
        <h3>${escapeHtml(choice.heading)}</h3>
        <p>Choose any that apply.</p>
      </div>
      <div class="feedback-chip-grid" role="group" aria-label="${escapeHtml(choice.heading)}">
        ${chips}
      </div>
      <label class="feedback-label" for="modal-feedback-comment">Anything else? <span>optional</span></label>
      <textarea id="modal-feedback-comment" class="short-feedback-comment" maxlength="240" placeholder="A short note is enough."></textarea>
      <div class="feedback-contact-toggle-row">
        <label>
          <input id="modal-feedback-contact-toggle" type="checkbox">
          <span>I'm happy for Northcue to contact me about this</span>
        </label>
      </div>
      <div id="modal-feedback-contact-panel" class="optional-contact feedback-contact-reveal hidden">
        <label class="feedback-label" for="modal-feedback-contact">Email or phone number</label>
        <input id="modal-feedback-contact" class="feedback-contact-input" type="text" placeholder="Your email or phone number">
        <small>We'll only use this for your feedback.</small>
      </div>
      <button type="button" class="primary-btn send-short-feedback">${sendIconMarkup()} Send feedback</button>
      <p class="feedback-saved-message" role="status" aria-live="polite"></p>
    </section>
  `;
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

function getFeedbackPayload(panel) {
  const contactToggle = panel.querySelector("#modal-feedback-contact-toggle");

  return {
    rating: normaliseFeedbackRating(panel.dataset.rating, panel.dataset.answer),
    reasons: Array.from(panel.querySelectorAll(".feedback-reason-chip.selected")).map((chip) => chip.dataset.reason),
    note: panel.querySelector(".short-feedback-comment")?.value.trim() || "",
    contact_permission: contactToggle ? contactToggle.checked : false,
    page: document.body.dataset.page || "unknown",
    section: panel.dataset.feedbackContext || "feedback",
    document_category: latestResult.trust?.document_category || selectedType || "unknown",
    trust_level: latestResult.trust?.trust_assessment || "unknown",
    severity_level: latestResult.trust?.severity_level || "unknown"
  };
}

function saveFeedbackFallback(feedback) {
  const savedFeedback = JSON.parse(localStorage.getItem("clearsteps-feedback") || "[]");
  savedFeedback.unshift({
    rating: feedback.rating,
    reasons: feedback.reasons,
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
    if (message) message.textContent = "Choose one option first.";
    return;
  }

  const sendButton = panel.querySelector(".send-short-feedback");
  if (sendButton) sendButton.disabled = true;

  const feedback = getFeedbackPayload(panel);
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
    modalTitle.textContent = "Thanks.";
    modalContent.innerHTML = `
      <section class="feedback-flow feedback-success" role="status" aria-live="polite">
        <span class="feedback-success-icon" aria-hidden="true">${feedbackHeartIcon()}</span>
        <h3>Thanks.</h3>
        <p>Every bit of feedback helps us make Northcue calmer, clearer and more helpful.</p>
        <button type="button" class="primary-btn" data-modal-back>Done</button>
      </section>
    `;
    modalContent.querySelector("[data-modal-back]")?.focus();
    return;
  }

  if (message) {
    message.textContent = savedToSupabase
      ? "Thank you. Your feedback was saved."
      : "Thank you. Your feedback was saved on this device.";
  }
}

function isOcrReadyResult(payload) {
  return payload && Object.prototype.hasOwnProperty.call(payload, "success");
}

function showOcrReadyResult(payload) {
  if (!payload.success) {
    setStatus(payload.error || "This document is hard to read. Please upload a clearer image.", true);
    return;
  }

  pendingDocumentJobId = payload.job_id || null;
  setStatus(payload.message || "Your document is ready.");
}

function buildCardDetail(card) {
  if (card.id === "what_do_i_need_to_do" && card.steps?.length) {
    return card.steps.join(" ");
  }

  if (card.id === "when_is_it_due") {
    return card.date ? `Date found: ${card.date}.` : "No deadline clearly stated.";
  }

  return card.short_answer;
}

function buildCheckMarkup(trust) {
  const bannerText = latestResult.banner?.text || safeActionFromTrust(trust);
  return `
    <div class="check-grid">
      <p><strong>Trust level</strong><br><span class="badge-chip ${classFromLevel(trust.trust_assessment)}">${escapeHtml(trust.trust_assessment)}</span></p>
      <p><strong>Severity</strong><br><span class="badge-chip ${classFromLevel(trust.severity_level)}">${escapeHtml(trust.severity_level)}</span></p>
      <p><strong>Document status</strong><br>${escapeHtml(trust.document_type || "unknown")}</p>
      <p><strong>Confidence</strong><br><span class="badge-chip ${classFromLevel(trust.confidence)}">${escapeHtml(trust.confidence)}</span></p>
      <p><strong>Needs review</strong><br>${trust.needs_human_review ? "Yes" : "No"}</p>
      <p><strong>Possible issue</strong><br>${escapeHtml(trust.review_reason || "No major issue found.")}</p>
      <p><strong>Safe next step</strong><br>${escapeHtml(trust.safe_next_step || bannerText)}</p>
    </div>
  `;
}

function safeActionFromTrust(trust) {
  if (trust.processing_mode === "verification_only") {
    return "Verify using official contact details before acting.";
  }
  if (trust.processing_mode === "unsupported") {
    return "Use a clearer upload or ask for help checking details.";
  }
  return "Check the original document before acting.";
}

function classFromLevel(level) {
  const value = String(level || "").toLowerCase();
  if (value.includes("urgent") || value.includes("high") || value.includes("low")) return "badge-high";
  if (value.includes("medium")) return "badge-medium";
  return "badge-low";
}

function labelForStyle(style) {
  const labels = {
    simple: "Simple view",
    animal: "Animal Cards",
    shape: "Shape Cards",
    map: "Map Cards"
  };
  return labels[style] || "Simple view";
}

function showActionMessage(message) {
  document.querySelector("#action-message").textContent = message;
}

function setStatus(message, isError = false) {
  if (!statusText) return;

  const file = fileInput?.files?.[0];
  const shouldHide = !isError && !file && message === "Choose a document to begin.";
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
    statusTitle.textContent = "Please check your upload";
    statusDetail.textContent = message;
    return;
  }

  if (message === "Document selected." || message === "Your document is ready.") {
    statusTitle.textContent = "Document ready";
    statusDetail.textContent = file ? `${file.name} • ${formatFileSize(file.size)}` : message;
    return;
  }

  statusTitle.textContent = message;
  statusDetail.textContent = file ? `${file.name} • ${formatFileSize(file.size)}` : "";
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Reading..." : "Understand this document \u2192";
  document.querySelector(".type-confirm")?.style.setProperty("display", isLoading ? "none" : "");
}

function typeNameForReading(type) {
  const names = { letter: "letter", bill: "bill", work: "work document", medical: "medical document", school: "school document", legal: "legal document", email: "email", article: "article" };
  return names[type] || null;
}

function setReadingHint(text) {
  const el = document.querySelector("[data-reading-hint]");
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || "";
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, unitIndex);
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

function openModal(title, html, options = {}) {
  modalReturnFocusTarget = options.returnFocusTo || document.activeElement;
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modal.classList.toggle("help-modal", options.variant === "help");
  modal.classList.toggle("feedback-modal", options.variant === "feedback");
  modal.classList.remove("hidden");
  const closeButton = document.querySelector("#modal-close");
  closeButton.innerHTML = options.closeLabel || "Back";
  closeButton.setAttribute("aria-label", options.closeAriaLabel || "Go back");
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
  closeButton.textContent = "Back";
  closeButton.setAttribute("aria-label", "Go back");
  modalContent.innerHTML = "";
  if (returnTarget && typeof returnTarget.focus === "function" && document.contains(returnTarget)) {
    returnTarget.focus();
  }
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
      dyslexiaMode: document.body.classList.contains("dyslexia-mode")
    })
  );

  if (showConfirmation !== false) {
    openModal("Saved", "<p>Your preferences are saved on this device.</p>");
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
