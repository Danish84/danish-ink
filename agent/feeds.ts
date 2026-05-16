import type { FeedSource } from "./rss";

export const DEFAULT_FEEDS: FeedSource[] = [
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  {
    name: "Reuters World",
    url: "https://news.google.com/rss/search?q=site%3Areuters.com%2Fworld&hl=en-US&gl=US&ceid=US%3Aen",
  },
  {
    name: "AP News",
    url: "https://news.google.com/rss/search?q=site%3Aapnews.com&hl=en-US&gl=US&ceid=US%3Aen",
  },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  {
    name: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms",
  },
];

export function feedSourcesFromEnv(raw = process.env.RSS_FEED_URLS): FeedSource[] {
  if (!raw?.trim()) {
    return DEFAULT_FEEDS;
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [maybeName, maybeUrl] = entry.includes("|")
        ? entry.split("|", 2).map((part) => part.trim())
        : [undefined, entry];

      return {
        name: maybeName || sourceNameFromUrl(maybeUrl),
        url: maybeUrl,
      };
    });
}

function sourceNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "RSS Feed";
  }
}
