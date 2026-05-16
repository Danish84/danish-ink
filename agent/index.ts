import { parseArgs } from "node:util";
import { fetchAllFeeds, type FeedSource } from "./rss";
import { saveDigest } from "./persistence";
import { summarize, type Slot } from "./summarize";

const FEEDS: FeedSource[] = [
  { name: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
];

function parseSlot(): Slot {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { slot: { type: "string" } },
    strict: false,
  });
  if (values.slot !== "morning" && values.slot !== "evening") {
    throw new Error("Pass --slot=morning or --slot=evening");
  }
  return values.slot;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const slot = parseSlot();
  const date = todayDateString();
  console.log(`[agent] Generating ${slot} digest for ${date}`);

  try {
    const items = await fetchAllFeeds(FEEDS);
    if (items.length === 0) {
      throw new Error("No items returned from any feed");
    }
    console.log(`[agent] Fetched ${items.length} items`);

    const content = await summarize({ items, slot });
    console.log(`[agent] Generated digest (${content.length} chars)`);

    await saveDigest({ date, slot, content, status: "success" });
    console.log(`[agent] Saved ${date} ${slot}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agent] FAILED: ${message}`);
    try {
      await saveDigest({
        date,
        slot,
        content: null,
        status: "error",
        error_msg: message,
      });
      console.error(`[agent] Recorded error row for ${date} ${slot}`);
    } catch (saveErr) {
      console.error(
        `[agent] Could not record error row: ${saveErr instanceof Error ? saveErr.message : saveErr}`,
      );
    }
    process.exit(1);
  }
}

main();
