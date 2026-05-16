import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { feedSourcesFromEnv } from "./feeds";
import { fetchAllFeeds, type FeedSource, type NormalizedItem } from "./rss";
import { saveDigest, type SaveDigestInput } from "./persistence";
import { summarize, type Slot } from "./summarize";

type Logger = Pick<typeof console, "log" | "error">;

export type RunAgentOptions = {
  slot: Slot;
  date?: string;
  feeds?: FeedSource[];
  logger?: Logger;
  loadFeeds?: () => FeedSource[];
  fetchFeeds?: (sources: FeedSource[]) => Promise<NormalizedItem[]>;
  summarizeDigest?: typeof summarize;
  save?: (input: SaveDigestInput) => Promise<void>;
};

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

export async function runAgent({
  slot,
  date = todayDateString(),
  feeds,
  logger = console,
  loadFeeds = feedSourcesFromEnv,
  fetchFeeds = fetchAllFeeds,
  summarizeDigest = summarize,
  save = saveDigest,
}: RunAgentOptions): Promise<void> {
  logger.log(`[agent] Generating ${slot} digest for ${date}`);

  try {
    const sources = feeds ?? loadFeeds();
    logger.log(`[agent] Fetching ${sources.length} feeds`);

    const items = await fetchFeeds(sources);
    if (items.length === 0) {
      throw new Error("No items returned from any feed");
    }
    logger.log(`[agent] Fetched ${items.length} items`);

    const content = await summarizeDigest({ items, slot });
    logger.log(`[agent] Generated digest (${content.length} chars)`);

    await save({ date, slot, content, status: "success" });
    logger.log(`[agent] Saved ${date} ${slot}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[agent] FAILED: ${message}`);
    try {
      await save({
        date,
        slot,
        content: null,
        status: "error",
        error_msg: message,
      });
      logger.error(`[agent] Recorded error row for ${date} ${slot}`);
    } catch (saveErr) {
      logger.error(
        `[agent] Could not record error row: ${saveErr instanceof Error ? saveErr.message : saveErr}`,
      );
    }
    throw err;
  }
}

async function main() {
  try {
    await runAgent({ slot: parseSlot() });
  } catch {
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
