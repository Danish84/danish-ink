import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { feedSourcesFromEnv } from "./feeds";
import { fetchAllFeeds, type FeedSource, type NormalizedItem } from "./rss";
import {
  createServiceClient,
  saveDigest,
  type SaveDigestInput,
  type SavedDigest,
} from "./persistence";
import { summarize, type Slot } from "./summarize";
import {
  assignSavedSummaryArcs,
  sweepClosureCandidates,
  type PersistArcAssignmentsResult,
  type SavedSummaryForArcs,
} from "./arcs";

type Logger = Pick<typeof console, "log" | "error">;

export type RunAgentOptions = {
  slot: Slot;
  date?: string;
  feeds?: FeedSource[];
  logger?: Logger;
  loadFeeds?: () => FeedSource[];
  fetchFeeds?: (sources: FeedSource[]) => Promise<NormalizedItem[]>;
  summarizeDigest?: typeof summarize;
  save?: (input: SaveDigestInput) => Promise<SavedDigest | void>;
  assignArcsAfterSave?: (
    summary: SavedSummaryForArcs,
  ) => Promise<PersistArcAssignmentsResult | void>;
  sweepArcClosures?: () => Promise<number>;
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
  assignArcsAfterSave = async (summary) => {
    return assignSavedSummaryArcs({
      summary,
      client: createServiceClient(),
    });
  },
  sweepArcClosures = async () => sweepClosureCandidates(createServiceClient()),
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

    const saved = await save({ date, slot, content, status: "success" });
    logger.log(`[agent] Saved ${date} ${slot}`);

    if (saved?.id) {
      try {
        const arcResult = await assignArcsAfterSave({
          id: saved.id,
          date: saved.date,
          slot: saved.slot,
          content: saved.content,
        });
        if (arcResult) {
          const matched =
            arcResult.matched.proposed +
            arcResult.matched.active +
            arcResult.matched.closure_candidate +
            arcResult.matched.closed;
          logger.log(
            `[agent] Assigned story arcs for ${date} ${slot}: decisions=${arcResult.decisions}, matched=${matched}, created=${arcResult.created}, none=${arcResult.none}`,
          );
          if (matched === 0 && arcResult.created === 0) {
            logger.error(
              `[agent] Arc assignment produced no persisted arcs for ${date} ${slot}`,
            );
          }
        } else {
          logger.log(`[agent] Assigned story arcs for ${date} ${slot}`);
        }
      } catch (arcErr) {
        logger.error(
          `[agent] Arc assignment failed: ${
            arcErr instanceof Error ? arcErr.message : arcErr
          }`,
        );
      }
    }

    try {
      const closureCandidates = await sweepArcClosures();
      if (closureCandidates > 0) {
        logger.log(
          `[agent] Flagged ${closureCandidates} arc${
            closureCandidates === 1 ? "" : "s"
          } for closure`,
        );
      }
    } catch (closureErr) {
      logger.error(
        `[agent] Closure sweep failed: ${
          closureErr instanceof Error ? closureErr.message : closureErr
        }`,
      );
    }
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
