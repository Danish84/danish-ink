import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "../../supabase/server";
import { loadArc } from "../load-arc";

type FakeArcRow = {
  id: string;
  slug: string;
  title: string;
  status: "active" | "closure_candidate" | "closed";
  opened_at: string;
  closed_at: string | null;
} | null;

type FakeSummary = {
  date: string;
  slot: "morning" | "evening";
  content: string | null;
  generated_at: string;
  status: "success" | "error";
};

type FakeAssignment = {
  paragraph_index: number;
  day_number: number;
  summaries: FakeSummary | FakeSummary[] | null;
};

type FakeData = {
  arcRow: FakeArcRow;
  assignments: FakeAssignment[];
};

function makeFakeClient(data: FakeData) {
  return {
    from(table: string) {
      if (table === "arcs") {
        const builder = {
          select() {
            return builder;
          },
          eq() {
            return builder;
          },
          maybeSingle() {
            return Promise.resolve({ data: data.arcRow, error: null });
          },
        };
        return builder;
      }
      if (table === "slot_arcs") {
        const builder = {
          select() {
            return builder;
          },
          eq() {
            return builder;
          },
          returns() {
            return Promise.resolve({ data: data.assignments, error: null });
          },
        };
        return builder;
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

const ARC: FakeArcRow = {
  id: "arc-1",
  slug: "gaza-talks",
  title: "Gaza Talks",
  status: "active",
  opened_at: "2026-05-10T00:00:00.000Z",
  closed_at: null,
};

const mockedCreateClient = vi.mocked(createClient);

beforeEach(() => {
  mockedCreateClient.mockReset();
});

describe("loadArc", () => {
  it("returns arc and entries for a known slug", async () => {
    const assignments: FakeAssignment[] = [
      {
        paragraph_index: 0,
        day_number: 1,
        summaries: {
          date: "2026-05-10",
          slot: "morning",
          content: "First paragraph about Gaza.\n\nSecond paragraph.",
          generated_at: "2026-05-10T06:00:00.000Z",
          status: "success",
        },
      },
    ];
    mockedCreateClient.mockResolvedValue(
      makeFakeClient({ arcRow: ARC, assignments }) as never,
    );

    const result = await loadArc({ slug: "gaza-talks" });

    expect(result).not.toBeNull();
    expect(result!.arc.slug).toBe("gaza-talks");
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0]).toEqual({
      paragraph: "First paragraph about Gaza.",
      date: "2026-05-10",
      slot: "morning",
      generatedAt: "2026-05-10T06:00:00.000Z",
      dayNumber: 1,
    });
  });

  it("returns null when the slug does not resolve to an arc", async () => {
    mockedCreateClient.mockResolvedValue(
      makeFakeClient({ arcRow: null, assignments: [] }) as never,
    );

    const result = await loadArc({ slug: "missing" });

    expect(result).toBeNull();
  });

  it("sorts entries reverse-chronological with evening before morning on date ties", async () => {
    const assignments: FakeAssignment[] = [
      {
        paragraph_index: 0,
        day_number: 1,
        summaries: {
          date: "2026-05-10",
          slot: "morning",
          content: "Day 1 morning.",
          generated_at: "2026-05-10T06:00:00.000Z",
          status: "success",
        },
      },
      {
        paragraph_index: 0,
        day_number: 1,
        summaries: {
          date: "2026-05-10",
          slot: "evening",
          content: "Day 1 evening.",
          generated_at: "2026-05-10T06:00:00.000Z",
          status: "success",
        },
      },
      {
        paragraph_index: 0,
        day_number: 2,
        summaries: {
          date: "2026-05-11",
          slot: "morning",
          content: "Day 2 morning.",
          generated_at: "2026-05-11T06:00:00.000Z",
          status: "success",
        },
      },
    ];
    mockedCreateClient.mockResolvedValue(
      makeFakeClient({ arcRow: ARC, assignments }) as never,
    );

    const result = await loadArc({ slug: "gaza-talks" });

    expect(result!.entries.map((e) => `${e.date}-${e.slot}`)).toEqual([
      "2026-05-11-morning",
      "2026-05-10-evening",
      "2026-05-10-morning",
    ]);
  });

  it("filters out entries with non-success status or empty paragraph content", async () => {
    const assignments: FakeAssignment[] = [
      {
        paragraph_index: 0,
        day_number: 1,
        summaries: {
          date: "2026-05-10",
          slot: "morning",
          content: "Real paragraph.",
          generated_at: "2026-05-10T06:00:00.000Z",
          status: "success",
        },
      },
      {
        paragraph_index: 0,
        day_number: 1,
        summaries: {
          date: "2026-05-10",
          slot: "evening",
          content: "Errored content.",
          generated_at: "2026-05-10T18:00:00.000Z",
          status: "error",
        },
      },
      {
        paragraph_index: 0,
        day_number: 2,
        summaries: {
          date: "2026-05-11",
          slot: "morning",
          content: null,
          generated_at: "2026-05-11T06:00:00.000Z",
          status: "success",
        },
      },
      {
        paragraph_index: 5,
        day_number: 2,
        summaries: {
          date: "2026-05-11",
          slot: "evening",
          content: "Only one paragraph here.",
          generated_at: "2026-05-11T18:00:00.000Z",
          status: "success",
        },
      },
    ];
    mockedCreateClient.mockResolvedValue(
      makeFakeClient({ arcRow: ARC, assignments }) as never,
    );

    const result = await loadArc({ slug: "gaza-talks" });

    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0].paragraph).toBe("Real paragraph.");
  });

  it("returns the arc with an empty entries array when slot_arcs is empty", async () => {
    mockedCreateClient.mockResolvedValue(
      makeFakeClient({ arcRow: ARC, assignments: [] }) as never,
    );

    const result = await loadArc({ slug: "gaza-talks" });

    expect(result).not.toBeNull();
    expect(result!.arc.id).toBe("arc-1");
    expect(result!.entries).toEqual([]);
  });
});
