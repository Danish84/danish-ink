import { describe, expect, it } from "vitest";
import { DEFAULT_FEEDS, feedSourcesFromEnv } from "../feeds";

describe("feedSourcesFromEnv", () => {
  it("uses the five default feeds when RSS_FEED_URLS is unset", () => {
    const feeds = feedSourcesFromEnv("");

    expect(feeds).toEqual(DEFAULT_FEEDS);
    expect(feeds.map((feed) => feed.name)).toEqual([
      "BBC World",
      "Reuters World",
      "AP News",
      "Al Jazeera",
      "Times of India",
    ]);
  });

  it("parses comma-separated URL overrides and infers source names", () => {
    const feeds = feedSourcesFromEnv(
      "https://example.com/feed.xml, https://news.example.org/rss",
    );

    expect(feeds).toEqual([
      { name: "example.com", url: "https://example.com/feed.xml" },
      { name: "news.example.org", url: "https://news.example.org/rss" },
    ]);
  });

  it("allows explicit source names with Name|URL entries", () => {
    const feeds = feedSourcesFromEnv(
      "Wire Desk|https://example.com/feed.xml, Local Paper|https://paper.test/rss",
    );

    expect(feeds).toEqual([
      { name: "Wire Desk", url: "https://example.com/feed.xml" },
      { name: "Local Paper", url: "https://paper.test/rss" },
    ]);
  });
});
