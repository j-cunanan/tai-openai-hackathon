const assert = require("node:assert/strict");
const {
  buildCarousel,
  extractTweetId,
  looksLikeThread
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
  }
});

assert.equal(carousel.slideCount, 5);
assert.equal(carousel.slides[0].type, "cover");
assert.equal(carousel.slides[1].type, "content");
assert.equal(carousel.slides[3].type, "content");
assert.equal(carousel.slides[4].type, "cta");
assert.match(carousel.slides[0].headline, /SMBs/);
assert.match(carousel.slides[0].imagePrompt, /square editorial Instagram carousel cover image/);

console.log("Smoke tests passed.");
