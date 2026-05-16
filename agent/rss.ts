import Parser from "rss-parser";

export type NormalizedItem = {
  title: string;
  description: string;
  source: string;
  pubDate: Date;
};

export type FeedSource = {
  name: string;
  url: string;
};

const parser = new Parser({ timeout: 15_000 });

export async function parseFeedXml(
  xml: string,
  source: string,
): Promise<NormalizedItem[]> {
  let feed;
  try {
    feed = await parser.parseString(xml);
  } catch {
    return [];
  }

  return (feed.items ?? [])
    .map((item) => ({
      title: (item.title ?? "").trim(),
      description: (item.contentSnippet ?? item.content ?? "").trim(),
      source,
      pubDate: item.isoDate ? new Date(item.isoDate) : new Date(),
    }))
    .filter((item) => item.title.length > 0);
}

export async function fetchFeed(
  source: FeedSource,
): Promise<NormalizedItem[]> {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "danish-ink-agent/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Feed ${source.name}: HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseFeedXml(xml, source.name);
}

export async function fetchAllFeeds(
  sources: FeedSource[],
): Promise<NormalizedItem[]> {
  const results = await Promise.allSettled(sources.map(fetchFeed));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
