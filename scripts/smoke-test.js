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
assert.equal(carousel.slides[0].type, "cover");
assert.equal(carousel.slides[1].type, "content");
assert.equal(carousel.slides[3].type, "content");
assert.equal(carousel.slides[4].type, "cta");
assert.match(carousel.slides[0].headline, /SMBs/);
assert.notEqual(carousel.slides[0].headline, carousel.slides[1].title);
assert.match(carousel.slides[0].imagePrompt, /upper 66%/);
assert.match(carousel.slides[0].imagePrompt, /1080x1350/);
assert.match(carousel.slides[0].imagePrompt, /4:5 portrait/);
assert.match(carousel.slides[0].imagePrompt, /editorial poster/);
assert.match(carousel.slides[0].imagePrompt, /original viral hook page/);
assert.match(carousel.slides[0].imagePrompt, /must not contain any headline text/);
assert.doesNotMatch(carousel.slides[0].imagePrompt, /\bsquare\b/i);

const apostropheCarousel = buildCarousel({
  manualText: "Most SMBs don't need more random posts. They need one strong visual hook.",
  brand: {},
  cta: {}
});
assert.doesNotMatch(apostropheCarousel.slides[0].headline, /Don'T/);

const mediaCarousel = buildCarousel({
  tweet: {
    id: "1234567890123456789",
    url: "https://x.com/example/status/1234567890123456789",
    text: sampleThread,
    handle: "@example",
    isThreadLikely: true,
    media: [
      {
        type: "image",
        url: "https://pbs.twimg.com/media/source-one.jpg",
        alt: "Source image one"
      },
      {
        type: "image",
        url: "https://pbs.twimg.com/media/source-two.jpg",
        alt: "Source image two"
      }
    ]
  },
  brand: {},
  cta: {},
  template: {
    styleId: "black-gold"
  }
});
assert.equal(mediaCarousel.source.media.length, 2);
assert.equal(mediaCarousel.slides[0].media, null);
assert.equal(mediaCarousel.slides[1].media.url, "https://pbs.twimg.com/media/source-one.jpg");
assert.equal(mediaCarousel.slides[2].media.url, "https://pbs.twimg.com/media/source-two.jpg");

console.log("Smoke tests passed.");
