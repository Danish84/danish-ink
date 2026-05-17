import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  deleteFullyOrphanedArcs,
  formatBackfillSummary,
  parseBackfillArgs,
  runBackfillArcs,
  type BackfillSummary,
} from "../backfill-arcs";
import type { ArcForAssignment } from "../arcs";

const summaries: BackfillSummary[] = [
  {
    id: "summary-1",
    date: "2026-05-15",
    slot: "morning",
    content: "First paragraph.\n\nSecond paragraph.",
  },
  {
    id: "summary-2",
    date: "2026-05-16",
    slot: "evening",
    content: "Third paragraph.",
  },
];

const activeArc: ArcForAssignment = {
  id: "arc-1",
  title: "Geneva talks",
  description: null,
  status: "active",
};

describe("parseBackfillArgs", () => {
  it("parses optional range and reset flags", () => {
    expect(
      parseBackfillArgs([
        "--from=2026-05-01",
        "--to=2026-05-16",
        "--reset",
      ]),
    ).toEqual({
      from: "2026-05-01",
      to: "2026-05-16",
      reset: true,
    });
  });
});

describe("runBackfillArcs", () => {
  it("skips already assigned paragraphs without reset", async () => {
    const client = assignedIndexClient({ "summary-1": [0], "summary-2": [0] });
    const assign = vi.fn().mockResolvedValue([
      { paragraph_index: 1, type: "existing", arc_id: "arc-1" },
    ]);
    const persist = vi.fn().mockResolvedValue({
      created: 0,
      matched: { proposed: 0, active: 1, closure_candidate: 0, closed: 0 },
    });

    const result = await runBackfillArcs({
      client,
      logger: silentLogger(),
      loadSummariesForBackfill: vi.fn().mockResolvedValue(summaries),
      loadArcs: vi.fn().mockResolvedValue([activeArc]),
      assign,
      persist,
    });

    expect(result.paragraphsSkipped).toBe(2);
    expect(assign).toHaveBeenCalledOnce();
    expect(assign.mock.calls[0][0].paragraphs).toEqual([
      { index: 1, text: "Second paragraph." },
    ]);
    expect(persist).toHaveBeenCalledOnce();
  });

  it("runs reset before assignment and reports deleted arcs", async () => {
    const resetExistingAssignments = vi.fn().mockResolvedValue(2);

    const result = await runBackfillArcs({
      client: assignedIndexClient({}),
      reset: true,
      logger: silentLogger(),
      loadSummariesForBackfill: vi.fn().mockResolvedValue([summaries[1]]),
      resetExistingAssignments,
      loadArcs: vi.fn().mockResolvedValue([]),
      assign: vi.fn().mockResolvedValue([]),
      persist: vi.fn().mockResolvedValue({
        created: 0,
        matched: { proposed: 0, active: 0, closure_candidate: 0, closed: 0 },
      }),
    });

    expect(resetExistingAssignments).toHaveBeenCalledWith(expect.anything(), {
      from: undefined,
      to: undefined,
    });
    expect(result.arcsDeleted).toBe(2);
    expect(result.paragraphsSkipped).toBe(0);
  });

  it("continues past per-summary failures", async () => {
    const logger = silentLogger();
    const assign = vi
      .fn()
      .mockRejectedValueOnce(new Error("model failed"))
      .mockResolvedValueOnce([]);

    const result = await runBackfillArcs({
      client: assignedIndexClient({}),
      logger,
      loadSummariesForBackfill: vi.fn().mockResolvedValue(summaries),
      loadArcs: vi.fn().mockResolvedValue([]),
      assign,
      persist: vi.fn().mockResolvedValue({
        created: 0,
        matched: { proposed: 0, active: 0, closure_candidate: 0, closed: 0 },
      }),
    });

    expect(result.failures).toBe(1);
    expect(result.summariesProcessed).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("model failed"),
    );
  });
});

describe("formatBackfillSummary", () => {
  it("prints concise counts", () => {
    expect(
      formatBackfillSummary(
        {
          summariesProcessed: 3,
          arcsCreated: 1,
          arcsMatched: {
            proposed: 0,
            active: 2,
            closure_candidate: 0,
            closed: 1,
          },
          arcsDeleted: 4,
          paragraphsSkipped: 5,
          failures: 0,
        },
        true,
      ),
    ).toContain("arcsDeleted=4");
  });
});

describe("deleteFullyOrphanedArcs", () => {
  it("deletes only arcs with zero remaining references", async () => {
    const deleted: string[] = [];
    const client = orphanClient({
      remainingReferences: { keep: 1, delete: 0 },
      deleted,
    });

    await expect(
      deleteFullyOrphanedArcs(client, ["keep", "delete"]),
    ).resolves.toBe(1);
    expect(deleted).toEqual(["delete"]);
  });
});

function silentLogger() {
  return {
    log: vi.fn(),
    error: vi.fn(),
  };
}

function assignedIndexClient(indexes: Record<string, number[]>) {
  return {
    from(table: string) {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn((column: string, value: string) => {
          if (table === "slot_arcs" && column === "summary_id") {
            return Promise.resolve({
              data: (indexes[value] ?? []).map((paragraph_index) => ({
                paragraph_index,
              })),
              error: null,
            });
          }
          return chain;
        }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

function orphanClient({
  remainingReferences,
  deleted,
}: {
  remainingReferences: Record<string, number>;
  deleted: string[];
}) {
  return {
    from(table: string) {
      let filterValue = "";
      const chain = {
        select: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn((column: string, value: string) => {
          if (table === "arcs" && column === "id") {
            deleted.push(value);
          }
          filterValue = value;
          return chain;
        }),
        then(resolve: (value: unknown) => void) {
          const data =
            table === "slot_arcs"
              ? Array.from({
                  length: remainingReferences[filterValue] ?? 0,
                }).map(() => ({ arc_id: filterValue }))
              : null;
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}
