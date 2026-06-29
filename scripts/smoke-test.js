const assert = require("node:assert/strict");
const {
  buildCarousel,
  extractTweetId,
  looksLikeThread,
  VISUAL_TEMPLATES
} = require("../server");

const sampleThread = [
  "1/ Most SMBs do not need more content. They need sharper distribution.",
  "2/ Turn one strong founder insight into a carousel, a reel script, and three story prompts.",
  "3/ The carousel should make one point per slide, build curiosity, and end with a CTA that starts a conversation."
].join("\n\n");

assert.equal(
  extractTweetId("https://x.com/example/status/1234567890123456789?s=20"),
  "1234567890123456789"
);

assert.equal(looksLikeThread(sampleThread), true);

const carousel = buildCarousel({
  manualText: sampleThread,
  brand: {
    name: "Growth Loop",
    tagline: "Instagram growth system for SMBs",
    primaryColor: "#111827",
    accentColor: "#ff6b35",
    paperColor: "#fff8ed",
    inkColor: "#111827"
  },
  cta: {
    headline: "Turn attention into pipeline",
    body: "DM us the word GROWTH and we will map your next 30 days of Instagram content.",
    button: "DM GROWTH"
  },
  template: {
    styleId: "teal-news"
  }
});

assert.equal(Object.keys(VISUAL_TEMPLATES).length, 8);
assert.equal(carousel.slideCount, 5);
assert.equal(carousel.template.styleId, "teal-news");
assert.equal(carousel.template.imageUrl, "/assets/generated/tech-gold-workspace.png");
assert.match(carousel.template.imagePrompt, /editorial Instagram carousel cover image/);
assert.match(carousel.template.imagePrompt, /Key ideas to visualize/);
assert.equal(carousel.slides[0].type, "cover");
assert.equal(carousel.slides[1].type, "content");
assert.equal(carousel.slides[3].type, "content");
assert.equal(carousel.slides[4].type, "cta");
assert.match(carousel.slides[0].headline, /SMBs/);
assert.equal(carousel.slides[0].imagePrompt, carousel.template.imagePrompt);

const sourceMediaThread = buildCarousel({
  tweet: {
    id: "2070555274835046430",
    url: "https://x.com/OpenAI/status/2070555274835046430",
    text: [
      "GPT-5.6 Sol sets a new state of the art on Terminal-Bench 2.1, which tests complex command-line workflows requiring planning, iteration, and tool coordination.",
      "Sol is our new flagship and a step function better than GPT-5.5. Terra delivers performance competitive to GPT-5.5 at 2x lower cost.",
      "GPT-5.6 Sol is our most capable model yet for cybersecurity. It shifts the performance-efficiency frontier for long-horizon security tasks."
    ].join("\n\n"),
    author: "OpenAI",
    handle: "@OpenAI",
    isThreadLikely: true,
    mediaUrls: [
      "https://example.com/terminal-bench.png",
      "https://example.com/model-family.png",
      "https://example.com/exploit-bench.png"
    ],
    posts: [
      {
        id: "2070555274835046430",
        url: "https://x.com/OpenAI/status/2070555274835046430",
        text: "GPT-5.6 Sol sets a new state of the art on Terminal-Bench 2.1, which tests complex command-line workflows requiring planning, iteration, and tool coordination.",
        mediaUrls: ["https://example.com/terminal-bench.png"]
      },
      {
        id: "2070555276370169969",
        url: "https://x.com/OpenAI/status/2070555276370169969",
        text: "Sol is our new flagship and a step function better than GPT-5.5. Terra delivers performance competitive to GPT-5.5 at 2x lower cost.",
        mediaUrls: ["https://example.com/model-family.png"]
      },
      {
        id: "2070555278576439306",
        url: "https://x.com/OpenAI/status/2070555278576439306",
        text: "GPT-5.6 Sol is our most capable model yet for cybersecurity. It shifts the performance-efficiency frontier for long-horizon security tasks.",
        mediaUrls: ["https://example.com/exploit-bench.png"]
      }
    ]
  },
  brand: {
    name: "Growth Loop",
    tagline: "Instagram growth system for SMBs",
    primaryColor: "#111827",
    accentColor: "#ff6b35",
    paperColor: "#fff8ed",
    inkColor: "#111827"
  },
  cta: {
    headline: "Turn attention into pipeline",
    body: "DM us the word GROWTH and we will map your next 30 days of Instagram content.",
    button: "DM GROWTH"
  },
  template: {
    styleId: "blue-brief"
  }
});

assert.equal(sourceMediaThread.slideCount, 5);
assert.equal(sourceMediaThread.slides[0].type, "cover");
assert.equal(sourceMediaThread.slides[0].mediaUrl, undefined);
assert.equal(sourceMediaThread.slides[1].eyebrow, "Thread post 1");
assert.equal(sourceMediaThread.slides[1].mediaUrl, "https://example.com/terminal-bench.png");
assert.deepEqual(sourceMediaThread.slides[3].mediaUrls, ["https://example.com/exploit-bench.png"]);
assert.equal(sourceMediaThread.source.posts.length, 3);
assert.equal(sourceMediaThread.source.mediaUrls.length, 3);

console.log("Smoke tests passed.");
