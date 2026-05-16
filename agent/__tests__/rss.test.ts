import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAllFeeds, parseFeedXml } from "../rss";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseFeedXml", () => {
  it("normalizes BBC World items to {title, description, source, pubDate}", async () => {
    const items = await parseFeedXml(fixture("bbc-world.xml"), "BBC World");

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Major diplomatic breakthrough announced in Geneva talks",
      source: "BBC World",
    });
    expect(items[0].description).toContain("preliminary agreement");
    expect(items[0].pubDate).toBeInstanceOf(Date);
    expect(items[0].pubDate.getUTCFullYear()).toBe(2026);
  });

  it("drops items with empty titles", async () => {
    const items = await parseFeedXml(fixture("bbc-world.xml"), "BBC World");
    expect(items.every((i) => i.title.length > 0)).toBe(true);
  });

  it("returns [] for malformed XML rather than throwing", async () => {
    const items = await parseFeedXml("<not-valid-xml", "BBC World");
    expect(items).toEqual([]);
  });

  it("returns [] for a feed with no items", async () => {
    const empty = `<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title></channel></rss>`;
    const items = await parseFeedXml(empty, "Empty Feed");
    expect(items).toEqual([]);
  });
});

describe("fetchAllFeeds", () => {
  it("aggregates multiple feeds and tags each item with its source", async () => {
    const xml = fixture("bbc-world.xml");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(xml, { status: 200 }))
      .mockResolvedValueOnce(new Response(xml, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchAllFeeds([
      { name: "BBC World", url: "https://example.com/bbc.xml" },
      { name: "Al Jazeera", url: "https://example.com/aljazeera.xml" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(4);
    expect(items.map((item) => item.source)).toEqual([
      "BBC World",
      "BBC World",
      "Al Jazeera",
      "Al Jazeera",
    ]);
  });

  it("keeps successful feeds when one feed fails", async () => {
    const xml = fixture("bbc-world.xml");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(new Response(xml, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchAllFeeds([
      { name: "Broken Feed", url: "https://example.com/broken.xml" },
      { name: "BBC World", url: "https://example.com/bbc.xml" },
    ]);

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.source === "BBC World")).toBe(true);
  });
});
