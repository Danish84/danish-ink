import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  buildArcAssignmentPrompt,
  computeDayNumber,
  parseArcAssignmentResponse,
  persistArcAssignments,
  slugify,
  sweepClosureCandidates,
  type ArcForAssignment,
} from "../arcs";

const arcs: ArcForAssignment[] = [
  {
    id: "arc-active",
    slug: "geneva-talks",
    title: "Geneva ceasefire talks",
    description: "Negotiations over a proposed ceasefire framework.",
    status: "active",
  },
  {
    id: "arc-closed",
    slug: "old-election",
    title: "Old election challenge",
    description: "A finished court challenge.",
    status: "closed",
  },
];

describe("arc assignment prompt", () => {
  it("includes paragraphs and all supplied arc statuses", () => {
    const prompt = buildArcAssignmentPrompt(
      [{ index: 0, text: "Talks resumed in Geneva." }],
      arcs,
    );

    expect(prompt).toContain("Talks resumed in Geneva");
    expect(prompt).toContain("Geneva ceasefire talks");
    expect(prompt).toContain("closed");
    expect(prompt).toContain("arc-closed");
  });
});

describe("parseArcAssignmentResponse", () => {
  it("handles existing, new, and none decisions", () => {
    const decisions = parseArcAssignmentResponse(
      JSON.stringify({
        assignments: [
          { paragraph_index: 0, type: "existing", arc_id: "arc-active" },
          {
            paragraph_index: 1,
            type: "new",
            proposed_title: "El Fasher offensive",
            proposed_description: "A bounded campaign around El Fasher.",
          },
          { paragraph_index: 2, type: "none" },
        ],
      }),
      arcs,
    );

    expect(decisions).toEqual([
      { paragraph_index: 0, type: "existing", arc_id: "arc-active" },
      {
        paragraph_index: 1,
        type: "new",
        proposed_title: "El Fasher offensive",
        proposed_description: "A bounded campaign around El Fasher.",
      },
      { paragraph_index: 2, type: "none" },
    ]);
  });

  it("returns an empty assignment set for malformed output", () => {
    expect(parseArcAssignmentResponse("not json", arcs)).toEqual([]);
    expect(parseArcAssignmentResponse('{"wrong": true}', arcs)).toEqual([]);
  });

  it("downgrades invalid existing arc ids to new proposals", () => {
    const decisions = parseArcAssignmentResponse(
      JSON.stringify({
        assignments: [
          { paragraph_index: 0, type: "existing", arc_id: "hallucinated" },
        ],
      }),
      arcs,
    );

    expect(decisions).toEqual([
      {
        paragraph_index: 0,
        type: "new",
        proposed_title: "Review needed",
        proposed_description:
          "The model returned an existing arc id that was not in the prompt.",
      },
    ]);
  });
});

describe("slugify", () => {
  it("creates deterministic URL slugs", () => {
    expect(slugify("Gaza Ceasefire Talks, Nov. 2026")).toBe(
      "gaza-ceasefire-talks-nov-2026",
    );
  });
});

describe("computeDayNumber", () => {
  it("counts distinct prior dates only", async () => {
    const client = queryClient({
      slot_arcs: {
        select: [
          {
            summaries: { date: "2026-05-14" },
          },
          {
            summaries: { date: "2026-05-14" },
          },
          {
            summaries: { date: "2026-05-15" },
          },
        ],
      },
    });

    await expect(
      computeDayNumber(client, "arc-active", "2026-05-16"),
    ).resolves.toBe(3);
  });
});

describe("sweepClosureCandidates", () => {
  it("flips only arcs older than the 14-day threshold", async () => {
    const update = vi.fn();
    const eq = vi.fn();
    const lt = vi.fn();
    const select = vi.fn();
    const client = {
      from(table: string) {
        expect(table).toBe("arcs");
        const chain = {
          update: vi.fn((value: unknown) => {
            update(value);
            return chain;
          }),
          eq: vi.fn((column: string, value: unknown) => {
            eq(column, value);
            return chain;
          }),
          lt: vi.fn((column: string, value: unknown) => {
            lt(column, value);
            return chain;
          }),
          select: vi.fn(async (columns: string) => {
            select(columns);
            return { data: [{ id: "stale-arc" }], error: null };
          }),
        };
        return chain;
      },
    } as unknown as SupabaseClient;

    await expect(
      sweepClosureCandidates(client, new Date("2026-05-17T12:00:00Z")),
    ).resolves.toBe(1);

    expect(update).toHaveBeenCalledWith({ status: "closure_candidate" });
    expect(eq).toHaveBeenCalledWith("status", "active");
    expect(lt).toHaveBeenCalledWith(
      "last_mentioned_at",
      "2026-05-03T12:00:00.000Z",
    );
    expect(select).toHaveBeenCalledWith("id");
  });
});

describe("persistArcAssignments", () => {
  it("creates proposed arcs and slot assignments for new decisions", async () => {
    const calls: unknown[] = [];
    const client = queryClient({
      arcs: {
        select: null,
        insert: {
          id: "new-arc",
          slug: "el-fasher-offensive",
          title: "El Fasher offensive",
          description: "A bounded campaign around El Fasher.",
          status: "proposed",
        },
      },
      slot_arcs: { upsert: null },
      calls,
    });

    const result = await persistArcAssignments({
      client,
      summary: {
        id: "summary-1",
        date: "2026-05-16",
        slot: "morning",
        content: "Digest.",
      },
      arcs: [],
      decisions: [
        {
          paragraph_index: 0,
          type: "new",
          proposed_title: "El Fasher offensive",
          proposed_description: "A bounded campaign around El Fasher.",
        },
      ],
    });

    expect(result.created).toBe(1);
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: "slot_arcs",
        method: "upsert",
        value: expect.objectContaining({
          summary_id: "summary-1",
          paragraph_index: 0,
          arc_id: "new-arc",
          day_number: 1,
        }),
      }),
    );
  });

  it("updates last_mentioned_at for a proposed arc match", async () => {
    const calls: unknown[] = [];
    const client = queryClient({
      slot_arcs: {
        select: [],
        upsert: null,
      },
      arcs: { update: null },
      calls,
    });

    const result = await persistArcAssignments({
      client,
      summary: {
        id: "summary-1",
        date: "2026-05-16",
        slot: "morning",
        content: "Digest.",
      },
      arcs: [
        {
          id: "proposed-arc",
          title: "Fresh proposal",
          description: null,
          status: "proposed",
        },
      ],
      decisions: [
        { paragraph_index: 0, type: "existing", arc_id: "proposed-arc" },
        { paragraph_index: 1, type: "existing", arc_id: "proposed-arc" },
      ],
    });

    expect(result.matched.proposed).toBe(2);
    expect(
      calls.filter(
        (call) =>
          isCall(call) && call.table === "arcs" && call.method === "update",
      ),
    ).toHaveLength(2);
    expect(
      calls.filter(
        (call) =>
          isCall(call) &&
          call.table === "slot_arcs" &&
          call.method === "upsert" &&
          call.value.day_number === 1,
      ),
    ).toHaveLength(2);
  });
});

function isCall(
  call: unknown,
): call is { table: string; method: string; value: Record<string, unknown> } {
  return Boolean(call && typeof call === "object" && "table" in call);
}

function queryClient(responses: {
  [table: string]: Record<string, unknown>;
  calls?: unknown[];
}) {
  const calls = responses.calls ?? [];
  return {
    from(table: string) {
      const tableResponses = responses[table] ?? {};
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        lt: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => ({
          data: tableResponses.select ?? null,
          error: null,
        })),
        single: vi.fn(async () => ({
          data: tableResponses.insert ?? tableResponses.select ?? null,
          error: null,
        })),
        insert: vi.fn((value: unknown) => {
          calls.push({ table, method: "insert", value });
          return chain;
        }),
        update: vi.fn((value: unknown) => {
          calls.push({ table, method: "update", value });
          return chain;
        }),
        upsert: vi.fn(async (value: unknown) => {
          calls.push({ table, method: "upsert", value });
          return { data: tableResponses.upsert ?? null, error: null };
        }),
        then(resolve: (value: unknown) => void) {
          return Promise.resolve({
            data: tableResponses.select ?? null,
            error: null,
          }).then(resolve);
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}
