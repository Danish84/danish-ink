import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFeedXml } from "../rss";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");

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
