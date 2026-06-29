const http = require("node:http");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;

function loadEnvFile(filePath = path.join(ROOT, ".env")) {
  if (!fsSync.existsSync(filePath)) return;

  const lines = fsSync.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [rawKey, ...valueParts] = trimmed.split("=");
    const key = rawKey.trim();
    if (!key || process.env[key]) continue;

    let value = valueParts.join("=").trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(ROOT, "public");
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const XAI_MODEL = process.env.XAI_MODEL || "grok-4.3";
const XAI_API_BASE = (process.env.XAI_API_BASE || "https://api.x.ai/v1").replace(/\/$/, "");

function logServer(event, details = {}) {
  const fields = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");
  console.log(`[carousel] ${event}${fields ? ` ${fields}` : ""}`);
}

const BRAND_PRESETS = {
  default: {
    styleId: "default",
    name: "Growth Loop",
    tagline: "Instagram growth system for SMBs",
    primaryColor: "#111827",
    accentColor: "#ff6b35",
    paperColor: "#fff8ed",
    inkColor: "#111827",
    tone: "sharp, practical, founder-friendly"
  },
  terminal: {
    styleId: "terminal",
    name: "Terminal",
    tagline: "Neon green mono growth signals",
    primaryColor: "#030604",
    accentColor: "#39ff88",
    paperColor: "#061109",
    inkColor: "#d7ffe7",
    tone: "hacker terminal, neon green, mono, signal-heavy"
  },
  bullion: {
    styleId: "bullion",
    name: "Bullion",
    tagline: "Black and gold premium growth",
    primaryColor: "#090706",
    accentColor: "#d6af4b",
    paperColor: "#15100a",
    inkColor: "#fff2c2",
    tone: "premium black and gold, luxury, decisive"
  },
  voltage: {
    styleId: "voltage",
    name: "Voltage",
    tagline: "Electric blue momentum engine",
    primaryColor: "#04112f",
    accentColor: "#00a3ff",
    paperColor: "#071b4a",
    inkColor: "#eaf7ff",
    tone: "electric blue, kinetic, high-energy"
  }
};

const DEFAULT_VISUAL_TEMPLATE = "black-gold";

const VISUAL_TEMPLATES = {
  "black-gold": {
    styleId: "black-gold",
    name: "Black Gold Authority",
    language: "en",
    imageUrl: "/assets/generated/tech-gold-workspace.png",
    imageAlt: "Gold lit creator workspace",
    accentColor: "#f8c94f",
    mark: "IV",
    label: "Viral Intel",
    chrome: "top-swipe",
    tone: "black and gold authority, contrarian business hooks, high contrast editorial"
  },
  "sprint-jp": {
    styleId: "sprint-jp",
    name: "Sprint Gold Impact",
    language: "jp",
    imageUrl: "/assets/generated/sprint-science-track.png",
    imageAlt: "Sprinter on indoor track",
    accentColor: "#ffd45b",
    mark: "",
    label: "保存推奨",
    chrome: "save-badge",
    tone: "Japanese sports science, kinetic gold impact, save-worthy tactical tips"
  },
  "blue-brief": {
    styleId: "blue-brief",
    name: "White Blue Briefing",
    language: "bilingual",
    imageUrl: "/assets/generated/blue-business-data.png",
    imageAlt: "Presenter with digital data globe",
    accentColor: "#7bd8ff",
    mark: "",
    label: "EN / JP Briefing",
    chrome: "briefing-top",
    tone: "clean business credibility, blue briefing, explainers and analysis"
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
    chrome: "center-mark",
    tone: "fast-moving news pulse, creator economy, teal highlight over dark editorial"
  },
  "white-blue-jp": {
    styleId: "white-blue-jp",
    name: "Clean White Blue",
    language: "jp",
    imageUrl: "/assets/generated/blue-business-data.png",
    imageAlt: "Blue business data presentation",
    accentColor: "#42b8ff",
    mark: "",
    label: "保存版",
    chrome: "side-brand",
    tone: "trustworthy Japanese tutorial, white and blue business education"
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
    chrome: "top-brand",
    tone: "warm human editorial, personal stories, coaching, parenting, community"
  },
  "red-alert": {
    styleId: "red-alert",
    name: "Red Alert Hook",
    language: "en",
    imageUrl: "/assets/generated/sprint-science-track.png",
    imageAlt: "Sprint training background with red alert treatment",
    accentColor: "#ff3131",
    mark: "",
    label: "Swipe for fixes",
    chrome: "bottom-brand",
    tone: "red alert, mistakes, warnings, tactical creator hooks"
  },
  "soft-jp": {
    styleId: "soft-jp",
    name: "Soft Editorial JP",
    language: "jp",
    imageUrl: "/assets/generated/family-soft-light.png",
    imageAlt: "Family lifestyle background",
    accentColor: "#f7b267",
    mark: "",
    label: "日英対応",
    chrome: "side-swipe",
    tone: "soft Japanese editorial, lifestyle, family, habits, thoughtful essays"
  }
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    const err = new Error("Request body must be valid JSON.");
    err.statusCode = 400;
    throw err;
  }
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripHtml(html) {
  return decodeEntities(String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim());
}

function normalizeText(value) {
  return decodeEntities(String(value || ""))
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/https?:\/\/t\.co\/\S+/gi, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractTweetId(input) {
  if (!input) return null;

  try {
    const parsed = new URL(input);
    const match = parsed.pathname.match(/\/status(?:es)?\/(\d+)/);
    if (match) return match[1];
  } catch {
    const match = String(input).match(/(?:status(?:es)?\/|^)(\d{12,25})(?:\D|$)/);
    if (match) return match[1];
  }

  const fallback = String(input).match(/(\d{12,25})/);
  return fallback ? fallback[1] : null;
}

function extractHandle(input) {
  try {
    const parsed = new URL(input);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 1 && !["i", "intent", "share"].includes(parts[0].toLowerCase())) {
      return `@${parts[0].replace(/^@/, "")}`;
    }
  } catch {
    const match = String(input || "").match(/(?:x|twitter)\.com\/@?([^/?#]+)/i);
    if (match) return `@${match[1].replace(/^@/, "")}`;
  }

  return "";
}

async function fetchJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "accept": "application/json,text/html;q=0.9,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
      }
    });

    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`Upstream request failed with ${response.status}.`);
      error.statusCode = 502;
      error.upstreamBody = text.slice(0, 500);
      throw error;
    }

    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function extractResponseText(result) {
  if (!result || typeof result !== "object") return "";
  if (typeof result.output_text === "string") return result.output_text;

  const parts = [];
  for (const item of result.output || []) {
    if (typeof item?.text === "string") parts.push(item.text);
    if (typeof item?.content === "string") parts.push(item.content);

    for (const content of item?.content || []) {
      if (typeof content === "string") parts.push(content);
      if (typeof content?.text === "string") parts.push(content.text);
      if (typeof content?.output_text === "string") parts.push(content.output_text);
    }
  }

  for (const choice of result.choices || []) {
    if (typeof choice?.message?.content === "string") parts.push(choice.message.content);
  }

  return parts.join("\n").trim();
}

function parseJsonFromText(text) {
  const fenced = String(text || "").match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [];
  if (fenced) candidates.push(fenced[1]);

  const firstBrace = String(text || "").indexOf("{");
  const lastBrace = String(text || "").lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(String(text).slice(firstBrace, lastBrace + 1));
  }
  candidates.push(text);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next likely JSON slice.
    }
  }

  const error = new Error("xAI returned content, but it was not valid JSON.");
  error.statusCode = 502;
  throw error;
}

function normalizeHandle(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  return clean.startsWith("@") ? clean : `@${clean}`;
}

function normalizeMediaUrls(...values) {
  const urls = [];
  const add = (value) => {
    if (!value) return;
    if (typeof value === "string") {
      const clean = value.trim();
      if (/^https?:\/\//i.test(clean) || clean.startsWith("data:image/")) urls.push(clean);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) add(item);
      return;
    }
    if (typeof value === "object") {
      add(value.url);
      add(value.mediaUrl);
      add(value.media_url);
      add(value.media_url_https);
      add(value.imageUrl);
      add(value.image_url);
      add(value.preview_image_url);
      add(value.src);
      add(value.mediaUrls);
      add(value.media_urls);
    }
  };

  for (const value of values) add(value);
  return [...new Set(urls)];
}

function normalizeXaiTweetPayload(payload, url, id) {
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const joinedPostText = posts
    .map((post, index) => normalizeText(post?.text || post?.content || post?.full_text || ""))
    .filter(Boolean)
    .map((text, index) => posts.length > 1 && !/^\s*\d+[.)/]/.test(text) ? `${index + 1}/ ${text}` : text)
    .join("\n\n");

  const text = normalizeText(joinedPostText || payload.text || payload.content || payload.full_text || "");
  if (!text) {
    const error = new Error("xAI did not return readable X post text.");
    error.statusCode = 502;
    throw error;
  }

  const firstPost = posts[0] || {};
  const normalizedPosts = posts.map((post, index) => {
    const mediaUrls = normalizeMediaUrls(post.mediaUrls, post.media_urls, post.mediaUrl, post.media_url, post.media);
    return {
      id: String(post.id || ""),
      url: post.url || "",
      text: normalizeText(post.text || post.content || post.full_text || ""),
      author: post.author || post.authorName || "",
      handle: normalizeHandle(post.handle || ""),
      mediaUrl: mediaUrls[0] || "",
      mediaUrls
    };
  }).filter((post) => post.text || post.mediaUrls.length);
  const payloadMediaUrls = normalizeMediaUrls(
    payload.mediaUrls,
    payload.media_urls,
    payload.mediaUrl,
    payload.media_url,
    payload.media,
    firstPost.mediaUrls,
    firstPost.media_urls,
    firstPost.mediaUrl,
    firstPost.media_url,
    firstPost.media,
    normalizedPosts.flatMap((post) => post.mediaUrls)
  );

  return {
    id: String(payload.id || firstPost.id || id || ""),
    url: payload.url || firstPost.url || url,
    text,
    author: payload.author || firstPost.author || firstPost.authorName || "",
    handle: normalizeHandle(payload.handle || firstPost.handle || extractHandle(url)),
    avatar: payload.avatar || firstPost.avatar || "",
    mediaUrl: payloadMediaUrls[0] || "",
    mediaUrls: payloadMediaUrls,
    publishedAt: payload.publishedAt || payload.created_at || firstPost.publishedAt || firstPost.created_at || "",
    isThreadLikely: Boolean(payload.isThreadLikely || payload.is_thread || posts.length > 1 || looksLikeThread(text)),
    source: "xai-x-search",
    posts: normalizedPosts
  };
}

function tweetFromSyndicationData(data, id, url = "") {
  const mediaUrls = normalizeMediaUrls(data.photos, data.video?.poster, data.mediaDetails, data.card);
  return {
    id: String(id || data.id_str || data.id || ""),
    url,
    text: normalizeText(data.text || data.full_text || ""),
    author: data.user?.name || "",
    handle: data.user?.screen_name ? `@${data.user.screen_name}` : "",
    avatar: data.user?.profile_image_url_https || data.user?.profile_image_url || "",
    mediaUrl: mediaUrls[0] || "",
    mediaUrls,
    publishedAt: data.created_at || "",
    source: "twitter-syndication"
  };
}

async function fetchTweetFromSyndication(id, url = "") {
  const data = await fetchJson(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en`, 7000);
  return tweetFromSyndicationData(data, id, url);
}

async function enrichTweetMediaFromSyndication(tweet, sourceUrl = "") {
  const posts = Array.isArray(tweet.posts) ? tweet.posts : [];
  const candidates = posts.length
    ? posts
    : [{ id: tweet.id || extractTweetId(sourceUrl), url: tweet.url || sourceUrl, text: tweet.text }];

  const enrichedPosts = await Promise.all(candidates.map(async (post) => {
    const id = post.id || extractTweetId(post.url);
    if (!id) return post;

    try {
      const syndication = await fetchTweetFromSyndication(id, post.url || tweet.url || sourceUrl);
      const mediaUrls = normalizeMediaUrls(post.mediaUrls, post.mediaUrl, syndication.mediaUrls, syndication.mediaUrl);
      return {
        ...post,
        id: post.id || syndication.id || id,
        url: post.url || syndication.url || "",
        text: normalizeText(post.text || syndication.text || ""),
        author: post.author || syndication.author || "",
        handle: normalizeHandle(post.handle || syndication.handle || ""),
        mediaUrl: mediaUrls[0] || "",
        mediaUrls
      };
    } catch {
      return post;
    }
  }));

  const mediaUrls = normalizeMediaUrls(tweet.mediaUrls, tweet.mediaUrl, enrichedPosts.flatMap((post) => post.mediaUrls || []));
  return {
    ...tweet,
    mediaUrl: mediaUrls[0] || tweet.mediaUrl || "",
    mediaUrls,
    posts: posts.length ? enrichedPosts : tweet.posts
  };
}

async function requestXaiJson(payload, endpoint = "responses") {
  const response = await fetch(`${XAI_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${process.env.XAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const upstreamMessage = typeof result.error === "string"
      ? result.error
      : result.error?.message || result.message || `xAI request failed with ${response.status}.`;
    const error = new Error(upstreamMessage);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return result;
}

async function fetchTweetWithXai(url) {
  if (!process.env.XAI_API_KEY) {
    const error = new Error("XAI_API_KEY is not set.");
    error.statusCode = 400;
    throw error;
  }

  const id = extractTweetId(url);
  const handle = extractHandle(url);
  const extractionInstructions = [
    "Fetch the exact public X/Twitter post from the URL below.",
    "If the post belongs to a same-author thread, include the selected post plus same-author continuation posts in chronological order.",
    "For each post, include public image asset URLs attached to that post whenever available.",
    "Return only JSON with this shape:",
    "{\"id\":\"\",\"url\":\"\",\"author\":\"\",\"handle\":\"@handle\",\"publishedAt\":\"\",\"text\":\"full text with thread posts separated by blank lines\",\"mediaUrls\":[\"https://...\"],\"isThreadLikely\":true,\"posts\":[{\"id\":\"\",\"url\":\"\",\"author\":\"\",\"handle\":\"@handle\",\"text\":\"\",\"mediaUrls\":[\"https://...\"]}]}",
    "Do not summarize, rewrite, add commentary, or include markdown."
  ].join(" ");

  const userPrompt = [
    extractionInstructions,
    `URL: ${url}`,
    id ? `Tweet ID: ${id}` : "",
    handle ? `Handle: ${handle}` : ""
  ].filter(Boolean).join("\n");

  const responsePayload = {
    model: XAI_MODEL,
    input: [
      {
        role: "system",
        content: "You extract public X/Twitter thread text and attached image URLs for a social carousel generator. Return strict JSON only."
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    tools: [
      {
        type: "x_search",
        allowed_x_handles: handle ? [handle.replace(/^@/, "")] : undefined,
        enable_image_understanding: true
      }
    ]
  };

  let result;
  try {
    result = await requestXaiJson(responsePayload, "responses");
  } catch (responseError) {
    const chatPayload = {
      model: XAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You extract public X/Twitter thread text and attached image URLs for a social carousel generator. Return strict JSON only."
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      search_parameters: {
        mode: "on",
        sources: [
          {
            type: "x",
            allowed_x_handles: handle ? [handle.replace(/^@/, "")] : undefined
          }
        ],
        return_citations: true
      }
    };

    try {
      result = await requestXaiJson(chatPayload, "chat/completions");
    } catch {
      throw responseError;
    }
  }

  const text = extractResponseText(result);
  const payload = parseJsonFromText(text);
  const tweet = await enrichTweetMediaFromSyndication(normalizeXaiTweetPayload(payload, url, id), url);
  logServer("x-thread extracted", {
    posts: tweet.posts.length,
    mediaAssets: tweet.mediaUrls.length,
    isThreadLikely: tweet.isThreadLikely
  });
  return tweet;
}

async function fetchTweet(url) {
  const id = extractTweetId(url);
  if (!id) {
    const error = new Error("Paste a valid X/Twitter post URL that includes a status ID.");
    error.statusCode = 400;
    throw error;
  }

  let xaiError = null;
  if (process.env.XAI_API_KEY) {
    try {
      return await fetchTweetWithXai(url);
    } catch (error) {
      xaiError = error;
      logServer("x-fetch xai failed", {
        statusCode: error.statusCode,
        reason: error.message,
        fallback: "public-x-embed"
      });
    }
  }

  const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en`;
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&dnt=true`;

  const [syndication, oembed] = await Promise.allSettled([
    fetchJson(syndicationUrl),
    fetchJson(oembedUrl)
  ]);

  const errors = [];
  if (syndication.status === "rejected") errors.push(syndication.reason.message);
  if (oembed.status === "rejected") errors.push(oembed.reason.message);

  let text = "";
  let author = "";
  let handle = "";
  let avatar = "";
  let mediaUrl = "";
  let mediaUrls = [];
  let publishedAt = "";
  let source = "";

  if (syndication.status === "fulfilled") {
    const data = tweetFromSyndicationData(syndication.value, id, url);
    text = data.text;
    author = data.author;
    handle = data.handle;
    avatar = data.avatar;
    mediaUrl = data.mediaUrl;
    mediaUrls = data.mediaUrls;
    publishedAt = data.publishedAt;
    if (text || mediaUrls.length) source = data.source;
  }

  if ((!text || !author) && oembed.status === "fulfilled") {
    const data = oembed.value;
    if (!text) {
      text = normalizeText(stripHtml(data.html));
      if (text) source = "twitter-oembed";
    }
    if (!author) author = data.author_name || "";
    if (!handle && data.author_url) {
      const match = data.author_url.match(/(?:twitter|x)\.com\/([^/?#]+)/i);
      if (match) handle = `@${match[1]}`;
    }
  }

  if (!text) {
    const error = new Error(xaiError
      ? `xAI and public X fetch both failed. xAI: ${xaiError.message}`
      : "The public X embed endpoints did not return readable post text. Paste the text manually or use an X API-backed fetcher.");
    error.statusCode = 502;
    error.details = errors.filter(Boolean);
    throw error;
  }

  return {
    id,
    url,
    text,
    author,
    handle,
    avatar,
    mediaUrl,
    mediaUrls,
    publishedAt,
    isThreadLikely: looksLikeThread(text),
    source: source || (syndication.status === "fulfilled" ? "twitter-syndication" : "twitter-oembed"),
    fetchWarning: xaiError
      ? `xAI thread extraction failed (${xaiError.message}); using public single-post fallback.`
      : "",
    posts: [{
      id,
      url,
      text,
      author,
      handle,
      mediaUrl,
      mediaUrls
    }]
  };
}

function looksLikeThread(text) {
  return /(^|\n)\s*(?:1[.)/]|🧵|thread\b|a thread\b)/i.test(text) ||
    /\b\d+\s*\/\s*\d+\b/.test(text);
}

function sentenceChunks(text) {
  const paragraphs = normalizeText(text).split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const numberedBlocks = normalizeText(text)
    .split(/\n(?=\s*(?:\d+[.)/]|[-*]\s+))/)
    .map((item) => item.trim())
    .filter((item) => item.length > 20);

  if (numberedBlocks.length >= 3) return numberedBlocks;
  if (paragraphs.length >= 3) return paragraphs;

  const sentenceMatches = normalizeText(text).match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  return sentenceMatches.map((item) => item.trim()).filter(Boolean);
}

function groupChunks(chunks, targetLength = 280, maxLength = 440) {
  const groups = [];
  let current = "";

  for (const chunk of chunks) {
    const next = current ? `${current} ${chunk}` : chunk;
    if (current && next.length > maxLength) {
      groups.push(current);
      current = chunk;
    } else if (next.length >= targetLength) {
      groups.push(next);
      current = "";
    } else {
      current = next;
    }
  }

  if (current) groups.push(current);
  return groups;
}

function clip(value, max = 120) {
  const clean = normalizeText(value).replace(/\s+/g, " ");
  if (clean.length <= max) return clean;

  const trimmed = clean.slice(0, max - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 40 ? lastSpace : trimmed.length).trim()}...`;
}

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\bSmbs\b/g, "SMBs")
    .replace(/\bSmb\b/g, "SMB")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bCta\b/g, "CTA")
    .replace(/\bUrl\b/g, "URL")
    .replace(/\bX\b/g, "X");
}

function isStructuredThreadText(text) {
  const clean = normalizeText(text);
  const markers = clean.match(/(?:^|\n)\s*(?:\d+[.)/]|[-*]\s+)/g) || [];
  return markers.length >= 3 || clean.split(/\n{2,}/).filter((item) => item.trim().length > 35).length >= 3;
}

function deriveHeadline(text) {
  const clean = normalizeText(text).replace(/^(\d+[.)/]\s*)/, "");
  const firstLine = clean.split(/\n|[.!?]/).find((line) => line.trim().length > 8) || clean;
  const noLinks = firstLine.replace(/@\w+/g, "").replace(/#\w+/g, "").trim();
  const candidate = noLinks.length < 24 ? clean.slice(0, 90) : noLinks;
  return clip(titleCase(candidate), 72);
}

function deriveSlideTitle(text, index) {
  const clean = normalizeText(text)
    .replace(/^(\d+[.)/]\s*)/, "")
    .replace(/@\w+/g, "")
    .replace(/#\w+/g, "")
    .trim();
  const firstSentence = clean.split(/[.!?]\s/).find((part) => part.trim().length > 10) || clean;
  const words = firstSentence.split(/\s+/).slice(0, 8).join(" ");
  return clip(titleCase(words || `Point ${index}`), 58);
}

function toBullets(text) {
  const lines = normalizeText(text)
    .split(/\n/)
    .map((line) => line.replace(/^[-*\d.)/\s]+/, "").trim())
    .filter((line) => line.length > 0);

  if (lines.length >= 2) return lines.slice(0, 4).map((line) => clip(line, 130));

  const sentences = (normalizeText(text).match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text])
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (sentences.length >= 2) return sentences.slice(0, 3).map((line) => clip(line, 130));
  return [clip(text, 260)];
}

function makeCoverImagePrompt({ headline, sourceText, contentSlides, tweet, brand, template }) {
  const palette = [brand.primaryColor, brand.accentColor, template?.accentColor, brand.paperColor, brand.inkColor]
    .filter(Boolean)
    .join(", ");
  const takeaways = contentSlides
    .map((slide) => slide.title)
    .filter(Boolean)
    .slice(0, 5)
    .join("; ");
  const sourceExcerpt = clip(sourceText, 520);

  return [
    "Create one editorial Instagram carousel cover image with no readable text.",
    `Topic: ${headline}.`,
    takeaways ? `Key ideas to visualize: ${takeaways}.` : "",
    sourceExcerpt ? `Source context: ${sourceExcerpt}.` : "",
    tweet?.author || tweet?.handle ? `Inspired by a post from ${tweet.author || tweet.handle}.` : "",
    template?.name ? `Visual template: ${template.name}; ${template.tone}.` : "",
    `Brand mood: ${brand.tone || "sharp, credible, modern SMB growth marketing"}.`,
    palette ? `Use this color direction: ${palette}.` : "",
    "Composition: vertical 4:5 social cover, bold central metaphor, subject safely framed behind headline overlays, strong negative space in the lower third.",
    "Style: premium social media cover art, high contrast, no logos, no UI screenshots, no captions, no letters, no words, no numbers."
  ].filter(Boolean).join(" ");
}

function normalizeBrand(brand = {}) {
  const styleId = Object.hasOwn(BRAND_PRESETS, brand.styleId) ? brand.styleId : "default";
  const preset = BRAND_PRESETS[styleId];

  return {
    styleId,
    name: clip(brand.name || preset.name, 34),
    tagline: clip(brand.tagline || preset.tagline, 76),
    primaryColor: brand.primaryColor || preset.primaryColor,
    accentColor: brand.accentColor || preset.accentColor,
    paperColor: brand.paperColor || preset.paperColor,
    inkColor: brand.inkColor || preset.inkColor,
    tone: brand.tone || preset.tone
  };
}

function normalizeVisualTemplate(template = {}) {
  const requestedStyleId = typeof template === "string" ? template : template.styleId;
  const styleId = Object.hasOwn(VISUAL_TEMPLATES, requestedStyleId) ? requestedStyleId : DEFAULT_VISUAL_TEMPLATE;
  return { ...VISUAL_TEMPLATES[styleId] };
}

function buildCarousel({ tweet, manualText, url, brand = {}, cta = {}, template = {} }) {
  const fallbackText = normalizeText(manualText);
  const sourceText = normalizeText(tweet?.text || fallbackText);
  if (!sourceText) {
    const error = new Error("No post content was found. Add an X link or paste source text.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedBrand = normalizeBrand(brand);
  const visualTemplate = normalizeVisualTemplate(template);

  const normalizedCta = {
    headline: clip(cta.headline || "Turn attention into pipeline", 64),
    body: clip(cta.body || "DM us the word GROWTH and we will map your next 30 days of Instagram content.", 170),
    button: clip(cta.button || "DM GROWTH", 32)
  };

  const headline = deriveHeadline(sourceText);
  const threadPosts = Array.isArray(tweet?.posts)
    ? tweet.posts
      .map((post) => {
        const mediaUrls = normalizeMediaUrls(post.mediaUrls, post.mediaUrl, post.media);
        return {
          ...post,
          text: normalizeText(post.text || ""),
          mediaUrl: mediaUrls[0] || "",
          mediaUrls
        };
      })
      .filter((post) => post.text || post.mediaUrls.length)
    : [];
  const shouldUseThreadPosts = threadPosts.length > 1 || threadPosts.some((post) => post.mediaUrls.length);

  const contentSlides = shouldUseThreadPosts
    ? threadPosts.slice(0, 8).map((post, index) => ({
      id: `thread-${index + 1}`,
      type: "content",
      eyebrow: `Thread post ${index + 1}`,
      title: deriveSlideTitle(post.text || `Source image ${index + 1}`, index + 1),
      body: clip(post.text || "", 520),
      bullets: post.text ? toBullets(post.text).slice(0, post.mediaUrls.length ? 2 : 4) : [],
      sourceIndex: index + 1,
      sourceUrl: post.url || "",
      mediaUrl: post.mediaUrl || "",
      mediaUrls: post.mediaUrls
    }))
    : (() => {
      const chunks = sentenceChunks(sourceText);
      const grouped = (isStructuredThreadText(sourceText) ? chunks : groupChunks(chunks)).slice(0, 8);
      const fallbackMediaUrls = normalizeMediaUrls(tweet?.mediaUrls, tweet?.mediaUrl);
      return grouped.map((group, index) => ({
        id: `content-${index + 1}`,
        type: "content",
        eyebrow: tweet?.isThreadLikely || looksLikeThread(sourceText) ? `Thread note ${index + 1}` : `Takeaway ${index + 1}`,
        title: deriveSlideTitle(group, index + 1),
        body: clip(group, 520),
        bullets: toBullets(group),
        sourceIndex: index + 1,
        mediaUrl: index === 0 ? fallbackMediaUrls[0] || "" : "",
        mediaUrls: index === 0 ? fallbackMediaUrls : []
      }));
    })();
  const imagePrompt = makeCoverImagePrompt({
    headline,
    sourceText,
    contentSlides,
    tweet,
    brand: normalizedBrand,
    template: visualTemplate
  });
  const templateWithPrompt = {
    ...visualTemplate,
    imagePrompt
  };

  const slides = [
    {
      id: "cover",
      type: "cover",
      kicker: normalizedBrand.name,
      headline,
      subhead: tweet?.handle ? `Adapted from ${tweet.handle}` : "Adapted from an X post",
      imagePrompt
    },
    ...contentSlides,
    {
      id: "cta",
      type: "cta",
      eyebrow: normalizedBrand.tagline,
      headline: normalizedCta.headline,
      body: normalizedCta.body,
      button: normalizedCta.button
    }
  ];

  return {
    source: {
      url: tweet?.url || url || "",
      id: tweet?.id || extractTweetId(url || "") || "",
      author: tweet?.author || "",
      handle: tweet?.handle || "",
      source: tweet?.source || (fallbackText ? "manual-text" : ""),
      isThreadLikely: tweet?.isThreadLikely || looksLikeThread(sourceText),
      mediaUrls: normalizeMediaUrls(tweet?.mediaUrls, tweet?.mediaUrl),
      posts: threadPosts.map((post) => ({
        id: post.id || "",
        url: post.url || "",
        mediaUrls: post.mediaUrls || []
      }))
    },
    brand: normalizedBrand,
    template: templateWithPrompt,
    cta: normalizedCta,
    slideCount: slides.length,
    slides
  };
}

async function handleCarousel(req, res) {
  const body = await readJson(req);
  const { url, manualText, brand, cta, template } = body;
  let tweet = null;
  let fetchWarning = null;

  if (url) {
    try {
      tweet = await fetchTweet(url);
    } catch (error) {
      if (!manualText) throw error;
      fetchWarning = error.message;
    }
  }

  const carousel = buildCarousel({ tweet, manualText, url, brand, cta, template });
  if (tweet?.fetchWarning) fetchWarning = tweet.fetchWarning;
  if (fetchWarning) carousel.fetchWarning = fetchWarning;

  sendJson(res, 200, carousel);
}

async function handleClientLog(req, res) {
  const body = await readJson(req);
  const event = clip(body.event || "client-event", 80);
  const details = body.details && typeof body.details === "object" ? body.details : {};
  logServer(`client ${event}`, {
    carouselRunId: details.carouselRunId,
    requestSeq: details.requestSeq,
    serverRequestId: details.serverRequestId,
    source: details.source,
    slideType: details.slideType,
    template: details.template,
    isDataUrl: details.isDataUrl,
    dataUrlChars: details.dataUrlChars,
    promptChars: details.promptChars,
    reason: details.reason
  });
  sendJson(res, 200, { ok: true });
}

async function handleTweet(req, res, requestUrl) {
  const url = requestUrl.searchParams.get("url");
  if (!url) {
    sendJson(res, 400, { error: "Missing url query parameter." });
    return;
  }

  const tweet = await fetchTweet(url);
  sendJson(res, 200, tweet);
}

async function imageUrlToDataUrl(imageUrl) {
  if (!/^https?:\/\//i.test(String(imageUrl || ""))) return imageUrl;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return imageUrl;

    const contentType = response.headers.get("content-type")?.split(";")[0] || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return imageUrl;
  }
}

async function handleCoverImage(req, res) {
  const requestId = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logServer("cover-image skipped", {
      requestId,
      reason: "OPENAI_API_KEY missing",
      model: IMAGE_MODEL
    });
    sendJson(res, 400, {
      error: "OPENAI_API_KEY is not set. Start the server with an OpenAI API key to generate cover images.",
      code: "openai_key_missing"
    });
    return;
  }

  const body = await readJson(req);
  const prompt = normalizeText(body.prompt);
  if (!prompt) {
    logServer("cover-image rejected", {
      requestId,
      reason: "missing prompt"
    });
    sendJson(res, 400, { error: "Missing image prompt." });
    return;
  }

  const size = body.size || "1024x1024";
  const quality = body.quality || "medium";
  logServer("cover-image openai request", {
    requestId,
    model: IMAGE_MODEL,
    size,
    quality,
    promptChars: prompt.length,
    promptPreview: clip(prompt, 180)
  });

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size,
      quality,
      n: 1
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    logServer("cover-image openai error", {
      requestId,
      status: response.status,
      code: result.error?.code || "openai_image_error",
      message: result.error?.message || "OpenAI image generation failed.",
      durationMs: Date.now() - startedAt
    });
    sendJson(res, response.status, {
      error: result.error?.message || "OpenAI image generation failed.",
      code: result.error?.code || "openai_image_error"
    });
    return;
  }

  const item = result.data?.[0] || {};
  const responseFormat = item.b64_json ? "b64_json" : item.url ? "url" : "missing";
  const imageUrl = item.b64_json ? `data:image/png;base64,${item.b64_json}` : await imageUrlToDataUrl(item.url);
  if (!imageUrl) {
    logServer("cover-image missing image", {
      requestId,
      responseFormat,
      durationMs: Date.now() - startedAt
    });
    sendJson(res, 502, { error: "OpenAI response did not include an image." });
    return;
  }

  logServer("cover-image success", {
    requestId,
    model: IMAGE_MODEL,
    responseFormat,
    returnedDataUrl: imageUrl.startsWith("data:"),
    revisedPrompt: Boolean(item.revised_prompt),
    durationMs: Date.now() - startedAt
  });

  sendJson(res, 200, {
    requestId,
    imageUrl,
    revisedPrompt: item.revised_prompt || "",
    model: IMAGE_MODEL
  });
}

async function serveStatic(req, res, requestUrl) {
  const safePath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    const target = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const data = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME_TYPES[ext] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(data);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function route(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/tweet") {
      await handleTweet(req, res, requestUrl);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/carousel") {
      await handleCarousel(req, res);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/client-log") {
      await handleClientLog(req, res);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/cover-image") {
      await handleCoverImage(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      await serveStatic(req, res, requestUrl);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || "Unexpected server error.",
      details: error.details || undefined
    });
  }
}

const server = http.createServer(route);

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    logServer("server started", {
      url: `http://${HOST}:${PORT}`,
      imageModel: IMAGE_MODEL,
      openaiKey: process.env.OPENAI_API_KEY ? "present" : "missing",
      xaiKey: process.env.XAI_API_KEY ? "present" : "missing"
    });
  });
}

module.exports = {
  BRAND_PRESETS,
  VISUAL_TEMPLATES,
  buildCarousel,
  deriveHeadline,
  extractTweetId,
  fetchTweet,
  looksLikeThread,
  sentenceChunks
};
