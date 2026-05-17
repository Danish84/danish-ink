import { describe, expect, it, vi } from "vitest";
import { runAgent } from "../index";
import type { FeedSource, NormalizedItem } from "../rss";

const feeds: FeedSource[] = [
  { name: "BBC World", url: "https://example.com/bbc.xml" },
];

const items: NormalizedItem[] = [
  {
    title: "Geneva talks reach preliminary agreement",
    description: "Three nations sign a framework after negotiations.",
    source: "BBC World",
    pubDate: new Date("2026-05-16T09:00:00Z"),
  },
];

function silentLogger() {
  return {
    log: vi.fn(),
    error: vi.fn(),
  };
}

describe("runAgent", () => {
  it("saves a success row when the pipeline completes", async () => {
    const fetchFeeds = vi.fn().mockResolvedValue(items);
    const summarizeDigest = vi.fn().mockResolvedValue("Generated digest.");
    const save = vi.fn().mockResolvedValue({
      id: "summary-1",
      date: "2026-05-16",
      slot: "morning",
      content: "Generated digest.",
      status: "success",
      generated_at: "2026-05-16T10:00:00Z",
    });
    const assignArcsAfterSave = vi.fn().mockResolvedValue(undefined);
    const sweepArcClosures = vi.fn().mockResolvedValue(0);

    await runAgent({
      slot: "morning",
      date: "2026-05-16",
      feeds,
      logger: silentLogger(),
      fetchFeeds,
      summarizeDigest,
      save,
      assignArcsAfterSave,
      sweepArcClosures,
    });

    expect(fetchFeeds).toHaveBeenCalledWith(feeds);
    expect(summarizeDigest).toHaveBeenCalledWith({
      items,
      slot: "morning",
    });
    expect(save).toHaveBeenCalledWith({
      date: "2026-05-16",
      slot: "morning",
      content: "Generated digest.",
      status: "success",
    });
    expect(assignArcsAfterSave).toHaveBeenCalledWith({
      id: "summary-1",
      date: "2026-05-16",
      slot: "morning",
      content: "Generated digest.",
    });
    expect(sweepArcClosures).toHaveBeenCalledOnce();
  });

  it("keeps a successful summary when arc assignment fails", async () => {
    const logger = silentLogger();
    const fetchFeeds = vi.fn().mockResolvedValue(items);
    const summarizeDigest = vi.fn().mockResolvedValue("Generated digest.");
    const save = vi.fn().mockResolvedValue({
      id: "summary-1",
      date: "2026-05-16",
      slot: "morning",
      content: "Generated digest.",
      status: "success",
      generated_at: "2026-05-16T10:00:00Z",
    });
    const assignArcsAfterSave = vi
      .fn()
      .mockRejectedValue(new Error("arc model timeout"));
    const sweepArcClosures = vi.fn().mockResolvedValue(0);

    await expect(
      runAgent({
        slot: "morning",
        date: "2026-05-16",
        feeds,
        logger,
        fetchFeeds,
        summarizeDigest,
        save,
        assignArcsAfterSave,
        sweepArcClosures,
      }),
    ).resolves.toBeUndefined();

    expect(save).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      "[agent] Arc assignment failed: arc model timeout",
    );
    expect(sweepArcClosures).toHaveBeenCalledOnce();
  });

  it("keeps a successful summary when the closure sweep fails", async () => {
    const logger = silentLogger();
    const fetchFeeds = vi.fn().mockResolvedValue(items);
    const summarizeDigest = vi.fn().mockResolvedValue("Generated digest.");
    const save = vi.fn().mockResolvedValue({
      id: "summary-1",
      date: "2026-05-16",
      slot: "morning",
      content: "Generated digest.",
      status: "success",
      generated_at: "2026-05-16T10:00:00Z",
    });
    const assignArcsAfterSave = vi.fn().mockResolvedValue(undefined);
    const sweepArcClosures = vi
      .fn()
      .mockRejectedValue(new Error("closure query failed"));

    await expect(
      runAgent({
        slot: "morning",
        date: "2026-05-16",
        feeds,
        logger,
        fetchFeeds,
        summarizeDigest,
        save,
        assignArcsAfterSave,
        sweepArcClosures,
      }),
    ).resolves.toBeUndefined();

    expect(save).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      "[agent] Closure sweep failed: closure query failed",
    );
  });

  it("records an error row when RSS fetching fails", async () => {
    const fetchFeeds = vi.fn().mockRejectedValue(new Error("rss exploded"));
    const summarizeDigest = vi.fn();
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(
      runAgent({
        slot: "evening",
        date: "2026-05-16",
        feeds,
        logger: silentLogger(),
        fetchFeeds,
        summarizeDigest,
        save,
      }),
    ).rejects.toThrow("rss exploded");

    expect(summarizeDigest).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith({
      date: "2026-05-16",
      slot: "evening",
      content: null,
      status: "error",
      error_msg: "rss exploded",
    });
  });

  it("records an error row when Claude summarization fails", async () => {
    const fetchFeeds = vi.fn().mockResolvedValue(items);
    const summarizeDigest = vi
      .fn()
      .mockRejectedValue(new Error("Claude timeout"));
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(
      runAgent({
        slot: "morning",
        date: "2026-05-16",
        feeds,
        logger: silentLogger(),
        fetchFeeds,
        summarizeDigest,
        save,
      }),
    ).rejects.toThrow("Claude timeout");

    expect(save).toHaveBeenCalledWith({
      date: "2026-05-16",
      slot: "morning",
      content: null,
      status: "error",
      error_msg: "Claude timeout",
    });
  });

  it("records an error row when no feeds return items", async () => {
    const fetchFeeds = vi.fn().mockResolvedValue([]);
    const summarizeDigest = vi.fn();
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(
      runAgent({
        slot: "morning",
        date: "2026-05-16",
        feeds,
        logger: silentLogger(),
        fetchFeeds,
        summarizeDigest,
        save,
      }),
    ).rejects.toThrow("No items returned from any feed");

    expect(summarizeDigest).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith({
      date: "2026-05-16",
      slot: "morning",
      content: null,
      status: "error",
      error_msg: "No items returned from any feed",
    });
  });

  it("attempts an error row when the success save fails", async () => {
    const fetchFeeds = vi.fn().mockResolvedValue(items);
    const summarizeDigest = vi.fn().mockResolvedValue("Generated digest.");
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("Supabase write failed"))
      .mockResolvedValueOnce(undefined);

    await expect(
      runAgent({
        slot: "evening",
        date: "2026-05-16",
        feeds,
        logger: silentLogger(),
        fetchFeeds,
        summarizeDigest,
        save,
      }),
    ).rejects.toThrow("Supabase write failed");

    expect(save).toHaveBeenNthCalledWith(2, {
      date: "2026-05-16",
      slot: "evening",
      content: null,
      status: "error",
      error_msg: "Supabase write failed",
    });
  });
});
