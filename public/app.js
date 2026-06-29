const form = document.querySelector("#generator-form");
const statusLine = document.querySelector("#status-line");
const stage = document.querySelector("#slide-stage");
const thumbnailRail = document.querySelector("#thumbnail-rail");
const deckTitle = document.querySelector("#deck-title");
const slideCount = document.querySelector("#slide-count");
const prevButton = document.querySelector("#prev-slide");
const nextButton = document.querySelector("#next-slide");
const copyButton = document.querySelector("#copy-html");
const downloadButton = document.querySelector("#download-html");
const generateImageButton = document.querySelector("#generate-image");
const imagePrompt = document.querySelector("#cover-prompt");

const templates = {
  cover: document.querySelector("#cover-slide-template"),
  content: document.querySelector("#content-slide-template"),
  cta: document.querySelector("#cta-slide-template")
};

const brandPresets = {
  default: {
    name: "Growth Loop",
    tagline: "Instagram growth system for SMBs",
    primaryColor: "#111827",
    accentColor: "#ff6b35",
    paperColor: "#fff8ed",
    inkColor: "#111827"
  },
  terminal: {
    name: "Terminal",
    tagline: "Neon green mono growth signals",
    primaryColor: "#030604",
    accentColor: "#39ff88",
    paperColor: "#061109",
    inkColor: "#d7ffe7"
  },
  bullion: {
    name: "Bullion",
    tagline: "Black and gold premium growth",
    primaryColor: "#090706",
    accentColor: "#d6af4b",
    paperColor: "#15100a",
    inkColor: "#fff2c2"
  },
  voltage: {
    name: "Voltage",
    tagline: "Electric blue momentum engine",
    primaryColor: "#04112f",
    accentColor: "#00a3ff",
    paperColor: "#071b4a",
    inkColor: "#eaf7ff"
  }
};

const visualTemplates = {
  "black-gold": {
    styleId: "black-gold",
    name: "Black Gold Authority",
    language: "en",
    imageUrl: "/assets/generated/tech-gold-workspace.png",
    imageAlt: "Gold lit creator workspace",
    accentColor: "#f8c94f",
    mark: "IV",
    label: "Viral Intel",
    chrome: "top-swipe"
  },
  "sprint-jp": {
    styleId: "sprint-jp",
    name: "Sprint Gold Impact",
    language: "jp",
    imageUrl: "/assets/generated/sprint-science-track.png",
    imageAlt: "Sprinter on indoor track",
    accentColor: "#ffd45b",
    label: "保存推奨",
    chrome: "save-badge"
  },
  "blue-brief": {
    styleId: "blue-brief",
    name: "White Blue Briefing",
    language: "bilingual",
    imageUrl: "/assets/generated/blue-business-data.png",
    imageAlt: "Presenter with digital data globe",
    accentColor: "#7bd8ff",
    label: "EN / JP Briefing",
    chrome: "briefing-top"
  },
  "teal-news": {
    styleId: "teal-news",
    name: "Teal News Pulse",
    language: "en",
    imageUrl: "/assets/generated/tech-gold-workspace.png",
    imageAlt: "Gold lit workspace adapted for teal news treatment",
    accentColor: "#13c6a3",
    mark: "VM",
    label: "Viral Marketing",
    chrome: "center-mark"
  },
  "white-blue-jp": {
    styleId: "white-blue-jp",
    name: "Clean White Blue",
    language: "jp",
    imageUrl: "/assets/generated/blue-business-data.png",
    imageAlt: "Blue business data presentation",
    accentColor: "#42b8ff",
    label: "保存版",
    chrome: "side-brand"
  },
  "warm-human": {
    styleId: "warm-human",
    name: "Warm Human Editorial",
    language: "bilingual",
    imageUrl: "/assets/generated/family-soft-light.png",
    imageAlt: "Parent holding sleeping toddler",
    accentColor: "#ff9f1c",
    mark: "HV",
    label: "Human Value",
    chrome: "top-brand"
  },
  "red-alert": {
    styleId: "red-alert",
    name: "Red Alert Hook",
    language: "en",
    imageUrl: "/assets/generated/sprint-science-track.png",
    imageAlt: "Sprint training background with red alert treatment",
    accentColor: "#ff3131",
    label: "Swipe for fixes",
    chrome: "bottom-brand"
  },
  "soft-jp": {
    styleId: "soft-jp",
    name: "Soft Editorial JP",
    language: "jp",
    imageUrl: "/assets/generated/family-soft-light.png",
    imageAlt: "Family lifestyle background",
    accentColor: "#f7b267",
    label: "日英対応",
    chrome: "side-swipe"
  }
};

let carousel = null;
let activeIndex = 0;
let coverImageUrl = "";
let coverImageSource = "fallback";
let carouselRunId = 0;
let coverImageRequestSeq = 0;
const templateAssetDataUrls = new Map();

function setStatus(message, tone = "neutral") {
  statusLine.textContent = message;
  statusLine.dataset.tone = tone;
}

function readControls() {
  const styleId = document.querySelector("#brand-preset").value;

  return {
    url: document.querySelector("#x-url").value.trim(),
    manualText: document.querySelector("#manual-text").value.trim(),
    template: {
      styleId: document.querySelector("#visual-template").value
    },
    brand: {
      styleId,
      name: document.querySelector("#brand-name").value.trim(),
      tagline: document.querySelector("#brand-tagline").value.trim(),
      inkColor: document.querySelector("#ink-color").value,
      paperColor: document.querySelector("#paper-color").value,
      primaryColor: document.querySelector("#primary-color").value,
      accentColor: document.querySelector("#accent-color").value
    },
    cta: {
      headline: document.querySelector("#cta-headline").value.trim(),
      body: document.querySelector("#cta-body").value.trim(),
      button: document.querySelector("#cta-button").value.trim()
    }
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.code = data.code;
    throw error;
  }

  return data;
}

function logClientEvent(event, details = {}) {
  const payload = { event, details };
  console.info(`[carousel] ${event}`, details);
  fetch("/api/client-log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {
    // Dev diagnostics should never interrupt carousel generation.
  });
}

function applyBrandVars(node, brand) {
  node.classList.add(`theme-${brand.styleId || "default"}`);
  node.style.setProperty("--brand", brand.primaryColor);
  node.style.setProperty("--accent", brand.accentColor);
  node.style.setProperty("--paper", brand.paperColor);
  node.style.setProperty("--ink", brand.inkColor);
}

function applyBrandPreset(styleId) {
  const preset = brandPresets[styleId] || brandPresets.default;
  document.querySelector("#brand-name").value = preset.name;
  document.querySelector("#brand-tagline").value = preset.tagline;
  document.querySelector("#primary-color").value = preset.primaryColor;
  document.querySelector("#accent-color").value = preset.accentColor;
  document.querySelector("#paper-color").value = preset.paperColor;
  document.querySelector("#ink-color").value = preset.inkColor;
}

function fillText(root, selector, value) {
  const node = root.querySelector(selector);
  if (node) node.textContent = value || "";
}

function fillHeadline(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;

  const clean = String(value || "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    node.textContent = clean;
    return;
  }

  const accentWordCount = Math.min(3, Math.max(2, Math.ceil(words.length * 0.32)));
  const plainText = words.slice(0, -accentWordCount).join(" ");
  const accentText = words.slice(-accentWordCount).join(" ");
  const accent = document.createElement("span");
  accent.className = "accent";
  accent.textContent = accentText;
  node.replaceChildren(`${plainText} `, accent);
}

function resolveTemplate() {
  const serverTemplate = carousel?.template || {};
  const styleId = serverTemplate.styleId || document.querySelector("#visual-template").value || "black-gold";
  return {
    ...(visualTemplates[styleId] || visualTemplates["black-gold"]),
    ...serverTemplate
  };
}

function getTemplateImageSource(template, { exportMode = false, useGeneratedImage = false } = {}) {
  if (useGeneratedImage && coverImageUrl) return coverImageUrl;
  if (exportMode && templateAssetDataUrls.has(template.imageUrl)) {
    return templateAssetDataUrls.get(template.imageUrl);
  }
  return template.imageUrl;
}

function makeTemplateMark(template) {
  const mark = document.createElement("span");
  mark.className = "template-mark";
  mark.textContent = template.mark || "IV";
  return mark;
}

function makeTemplateDivider() {
  const divider = document.createElement("span");
  divider.className = "template-divider";
  return divider;
}

function makeTemplateLabel(text) {
  const label = document.createElement("span");
  label.textContent = text;
  return label;
}

function appendTemplateChrome(root, template, index) {
  const slideNumber = String(index + 1).padStart(2, "0");
  const total = String(carousel.slideCount).padStart(2, "0");

  if (template.chrome === "save-badge") {
    const badge = document.createElement("span");
    badge.className = "template-save-badge";
    badge.append("保存");
    const small = document.createElement("small");
    small.textContent = "推奨";
    badge.append(small);
    root.append(badge);
    return;
  }

  if (template.chrome === "side-brand" || template.chrome === "side-swipe") {
    const sideBrand = document.createElement("span");
    sideBrand.className = "template-side-brand";
    sideBrand.textContent = template.label;
    root.append(sideBrand);
    if (template.chrome === "side-swipe") {
      const chip = document.createElement("span");
      chip.className = "template-swipe-chip";
      chip.textContent = "次へ";
      root.append(chip);
    }
    return;
  }

  if (template.chrome === "bottom-brand") {
    const bottomBrand = document.createElement("span");
    bottomBrand.className = "template-bottom-brand";
    bottomBrand.append(makeTemplateLabel(template.label), makeTemplateDivider(), makeTemplateLabel(slideNumber));
    root.append(bottomBrand);
    return;
  }

  const topBrand = document.createElement("div");
  topBrand.className = "template-top-brand";

  if (template.chrome === "briefing-top") {
    topBrand.append(makeTemplateLabel(template.label), makeTemplateLabel(slideNumber));
  } else if (template.chrome === "center-mark") {
    topBrand.classList.add("is-centered");
    topBrand.append(makeTemplateDivider(), makeTemplateMark(template), makeTemplateDivider());
  } else {
    topBrand.append(makeTemplateMark(template), makeTemplateDivider(), makeTemplateLabel(template.label));
  }

  root.append(topBrand);

  if (template.chrome === "top-swipe") {
    const count = document.createElement("span");
    count.className = "template-slide-count";
    count.textContent = `${slideNumber} / ${total}`;

    const chip = document.createElement("span");
    chip.className = "template-swipe-chip";
    chip.textContent = "Swipe";

    root.append(count, chip);
  }
}

function applyVisualTemplate(root, slide, index, options = {}) {
  const template = resolveTemplate();
  root.classList.add("viral-template", `visual-${template.styleId}`);
  root.dataset.visualTemplate = template.styleId;
  root.style.setProperty("--template-accent", template.accentColor);

  if (template.language === "jp" || template.language === "bilingual") {
    root.classList.add("jp-copy");
  }

  const media = document.createElement("div");
  media.className = "template-media";
  const image = document.createElement("img");
  image.className = "template-image";
  const usingGeneratedCover = slide.type === "cover" && Boolean(coverImageUrl);
  image.src = getTemplateImageSource(template, {
    exportMode: options.exportMode,
    useGeneratedImage: slide.type === "cover"
  });
  image.dataset.imageSource = usingGeneratedCover ? "generated" : "fallback";
  image.alt = usingGeneratedCover
    ? `${slide.headline} generated cover image`
    : template.imageAlt;
  media.append(image);
  if (slide.type === "cover") {
    root.dataset.coverImageSource = usingGeneratedCover ? coverImageSource : "fallback";
  }

  const grain = document.createElement("div");
  grain.className = "template-grain";
  root.prepend(media, grain);
  appendTemplateChrome(root, template, index);
}

async function inlineTemplateAssetForExport() {
  if (!carousel?.template?.imageUrl || templateAssetDataUrls.has(carousel.template.imageUrl)) return;

  const response = await fetch(carousel.template.imageUrl);
  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  templateAssetDataUrls.set(carousel.template.imageUrl, dataUrl);
}

function renderSlide(slide, index, { thumbnail = false, exportMode = false } = {}) {
  const template = templates[slide.type];
  const root = template.content.firstElementChild.cloneNode(true);
  root.dataset.slideId = slide.id;
  root.dataset.slideType = slide.type;
  applyBrandVars(root, carousel.brand);
  applyVisualTemplate(root, slide, index, { exportMode });

  if (slide.type === "cover") {
    fillText(root, ".slide-kicker", slide.kicker);
    fillHeadline(root, ".slide-headline", slide.headline);
    fillText(root, ".slide-subhead", slide.subhead);
    fillText(root, ".slide-footer", `${carousel.brand.tagline} / ${carousel.slideCount} slides`);
    const image = root.querySelector(".cover-image");
    if (coverImageUrl) {
      image.src = coverImageUrl;
      image.alt = `${slide.headline} generated cover image`;
      image.classList.add("has-image");
    }
  }

  if (slide.type === "content") {
    fillText(root, ".slide-eyebrow", slide.eyebrow);
    fillText(root, ".slide-number", `${index + 1}`.padStart(2, "0"));
    fillHeadline(root, ".content-title", slide.title);
    fillText(root, ".content-body", slide.body);
    fillText(root, ".slide-footer", carousel.brand.name);
    const list = root.querySelector(".content-bullets");
    for (const bullet of slide.bullets) {
      const item = document.createElement("li");
      item.textContent = bullet;
      list.append(item);
    }
  }

  if (slide.type === "cta") {
    fillText(root, ".slide-eyebrow", slide.eyebrow);
    fillHeadline(root, ".cta-title", slide.headline);
    fillText(root, ".cta-body", slide.body);
    fillText(root, ".cta-button", slide.button);
    fillText(root, ".slide-footer", carousel.brand.name);
  }

  if (thumbnail) root.setAttribute("aria-hidden", "true");
  return root;
}

function render() {
  if (!carousel) return;

  document.documentElement.style.setProperty("--ink", carousel.brand.inkColor);
  document.documentElement.style.setProperty("--paper", carousel.brand.paperColor);
  document.documentElement.style.setProperty("--brand", carousel.brand.primaryColor);
  document.documentElement.style.setProperty("--accent", carousel.brand.accentColor);

  activeIndex = Math.max(0, Math.min(activeIndex, carousel.slides.length - 1));
  const activeSlide = carousel.slides[activeIndex];

  stage.replaceChildren(renderSlide(activeSlide, activeIndex));
  thumbnailRail.replaceChildren();

  carousel.slides.forEach((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `thumb${index === activeIndex ? " is-active" : ""}`;
    button.setAttribute("aria-label", `Show slide ${index + 1}`);
    button.append(renderSlide(slide, index, { thumbnail: true }));
    button.addEventListener("click", () => {
      activeIndex = index;
      render();
    });
    thumbnailRail.append(button);
  });

  deckTitle.textContent = carousel.slides[0]?.headline || "Generated carousel";
  slideCount.textContent = `${activeIndex + 1} / ${carousel.slides.length}`;
  imagePrompt.textContent = carousel.template?.imagePrompt || carousel.slides[0]?.imagePrompt || "No prompt yet.";

  prevButton.disabled = activeIndex === 0;
  nextButton.disabled = activeIndex === carousel.slides.length - 1;
  copyButton.disabled = false;
  downloadButton.disabled = false;
  generateImageButton.disabled = false;
}

async function generateCoverImage() {
  const prompt = carousel?.template?.imagePrompt || carousel?.slides?.[0]?.imagePrompt;
  if (!prompt) return;

  const runId = carouselRunId;
  const requestSeq = ++coverImageRequestSeq;
  logClientEvent("cover-image request-started", {
    carouselRunId: runId,
    requestSeq,
    template: carousel?.template?.styleId,
    promptChars: prompt.length
  });
  setStatus("Step 2/2: Generating post-specific cover image...");
  generateImageButton.disabled = true;

  try {
    const result = await postJson("/api/cover-image", {
      prompt,
      size: "1024x1024",
      quality: "medium"
    });
    if (runId !== carouselRunId || requestSeq !== coverImageRequestSeq) {
      logClientEvent("cover-image ignored-stale", {
        carouselRunId: runId,
        requestSeq,
        serverRequestId: result.requestId,
        reason: "carousel changed before image completed"
      });
      return;
    }
    coverImageUrl = result.imageUrl;
    coverImageSource = "generated";
    logClientEvent("cover-image applied", {
      carouselRunId: runId,
      requestSeq,
      serverRequestId: result.requestId,
      source: coverImageSource,
      template: carousel?.template?.styleId,
      isDataUrl: coverImageUrl.startsWith("data:"),
      dataUrlChars: coverImageUrl.startsWith("data:") ? coverImageUrl.length : 0
    });
    setStatus(`Generated cover image with ${result.model}.`, "success");
    render();
  } catch (error) {
    logClientEvent("cover-image failed", {
      carouselRunId: runId,
      requestSeq,
      reason: error.message
    });
    const message = error.code === "openai_key_missing"
      ? "Carousel created. Set OPENAI_API_KEY to generate post-specific cover images."
      : error.message;
    setStatus(message, "warning");
  } finally {
    generateImageButton.disabled = false;
  }
}

function exportHtml() {
  if (!carousel) return "";

  const slideMarkup = carousel.slides
    .map((slide, index) => renderSlide(slide, index, { exportMode: true }).outerHTML)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(carousel.slides[0].headline)} - ${escapeHtml(carousel.template.name)} Carousel</title>
<style>
${document.querySelector("link[rel='stylesheet']").dataset.inlineCss || ""}
.export-sheet { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; padding: 24px; background: #e9ece5; }
.export-sheet .slide { width: 100%; box-shadow: none; }
</style>
</head>
<body>
<main class="export-sheet">
${slideMarkup}
</main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function inlineCssForExport() {
  if (document.querySelector("link[rel='stylesheet']").dataset.inlineCss) return;
  const response = await fetch("/styles.css");
  document.querySelector("link[rel='stylesheet']").dataset.inlineCss = await response.text();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = readControls();

  if (!payload.url && !payload.manualText) {
    setStatus("Add an X link or paste source text.", "warning");
    return;
  }

  setStatus("Step 1/2: Fetching and converting content...");
  carouselRunId += 1;
  coverImageUrl = "";
  coverImageSource = "fallback";

  try {
    carousel = await postJson("/api/carousel", payload);
    activeIndex = 0;
    await inlineCssForExport();
    render();
    logClientEvent("carousel rendered", {
      carouselRunId,
      source: coverImageSource,
      slideType: "cover",
      template: carousel?.template?.styleId
    });
    setStatus(carousel.fetchWarning || `Created ${carousel.slideCount} slides.`, carousel.fetchWarning ? "warning" : "success");

    if (document.querySelector("#auto-image").checked) {
      await generateCoverImage();
    }
  } catch (error) {
    setStatus(error.message, "warning");
  }
});

prevButton.addEventListener("click", () => {
  activeIndex -= 1;
  render();
});

nextButton.addEventListener("click", () => {
  activeIndex += 1;
  render();
});

copyButton.addEventListener("click", async () => {
  await inlineCssForExport();
  await inlineTemplateAssetForExport();
  await navigator.clipboard.writeText(exportHtml());
  setStatus("HTML copied to clipboard.", "success");
});

downloadButton.addEventListener("click", async () => {
  await inlineCssForExport();
  await inlineTemplateAssetForExport();
  const blob = new Blob([exportHtml()], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "instagram-carousel.html";
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus("HTML downloaded.", "success");
});

generateImageButton.addEventListener("click", generateCoverImage);

document.querySelector("#brand-preset").addEventListener("change", (event) => {
  applyBrandPreset(event.target.value);
});
