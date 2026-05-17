import { describe, expect, it } from "vitest";

import { aggregateArcCounts, countPendingArcStatuses } from "../arc-metrics";

describe("countPendingArcStatuses", () => {
  it("counts proposed and closure candidates while excluding active and closed", () => {
    expect(
      countPendingArcStatuses([
        "proposed",
        "active",
        "closure_candidate",
        "closed",
        "proposed",
      ]),
    ).toBe(3);
  });
});

describe("aggregateArcCounts", () => {
  it("aggregates mention count and max day number per arc", () => {
    const counts = aggregateArcCounts([
      { arc_id: "arc-a", day_number: 1 },
      { arc_id: "arc-b", day_number: 2 },
      { arc_id: "arc-a", day_number: 3 },
      { arc_id: "arc-a", day_number: 2 },
    ]);

    expect(counts.get("arc-a")).toEqual({ mentionCount: 3, dayCount: 3 });
    expect(counts.get("arc-b")).toEqual({ mentionCount: 1, dayCount: 2 });
  });
});
