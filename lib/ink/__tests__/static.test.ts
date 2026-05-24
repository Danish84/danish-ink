import { describe, expect, it } from "vitest";

import {
  formatArcLabel,
  getAdjacentBriefings,
  getArcBySlug,
  getBriefingByDate,
  getChaptersForArc,
  getLatestBriefing,
  getShelfArcs,
  inkArcs,
  inkBriefings,
  inkSources,
  sortChapters,
} from "../static";

describe("ink static data helpers", () => {
  it("selects the latest briefing by date", () => {
    expect(getLatestBriefing()?.date).toBe("2026-05-23");
  });

  it("looks up briefings by date", () => {
    expect(getBriefingByDate("2026-05-22")?.lead.title).toContain(
      "calendar",
    );
    expect(getBriefingByDate("1999-01-01")).toBeNull();
  });

  it("calculates previous and next dated briefings", () => {
    const adjacent = getAdjacentBriefings("2026-05-22");

    expect(adjacent.previous?.date).toBe("2026-05-21");
    expect(adjacent.next?.date).toBe("2026-05-23");
    expect(getAdjacentBriefings("missing")).toEqual({
      previous: null,
      next: null,
    });
  });

  it("looks up arcs by slug and formats editorial labels", () => {
    const arc = getArcBySlug("alpine-bond-weather");

    expect(arc?.title).toBe("Alpine bond weather");
    expect(arc?.chapters).toHaveLength(4);
    expect(formatArcLabel(arc!)).toBe("arc 14");
    expect(getArcBySlug("missing")).toBeNull();
  });

  it("sorts the shelf by manual rank and then recency", () => {
    const shelf = getShelfArcs();

    expect(shelf.map((arc) => arc.slug)).toEqual([
      "alpine-bond-weather",
      "grain-corridor-insurance",
      "sahel-grid-clock",
      "strait-cable-repairs",
    ]);
    expect(shelf.some((arc) => arc.state === "closed")).toBe(false);
  });

  it("orders chapters newest-first and oldest-first", () => {
    expect(
      getChaptersForArc("alpine-bond-weather").map((chapter) => chapter.date),
    ).toEqual(["2026-05-23", "2026-05-19", "2026-05-16", "2026-05-11"]);

    expect(
      getChaptersForArc("alpine-bond-weather", "oldest-first").map(
        (chapter) => chapter.date,
      ),
    ).toEqual(["2026-05-11", "2026-05-16", "2026-05-19", "2026-05-23"]);
  });

  it("does not mutate chapter input while sorting", () => {
    const chapters = getChaptersForArc("alpine-bond-weather", "oldest-first");
    const original = chapters.map((chapter) => chapter.date);
    sortChapters(chapters, "newest-first");

    expect(chapters.map((chapter) => chapter.date)).toEqual(original);
  });

  it("keeps sources normalized and referenced by id", () => {
    const sourceIds = new Set(inkSources.map((source) => source.id));
    const referencedIds = [
      ...inkBriefings.flatMap((briefing) => [
        ...briefing.lead.sourceIds,
        ...briefing.whatChanged.flatMap((item) => item.sourceIds),
        ...briefing.elsewhere.flatMap((item) => item.sourceIds),
      ]),
      ...getChaptersForArc("alpine-bond-weather").flatMap(
        (chapter) => chapter.sourceIds,
      ),
    ];

    expect(referencedIds.every((id) => sourceIds.has(id))).toBe(true);
  });

  it("limits arc state to the static v1 enum", () => {
    expect(new Set(inkArcs.map((arc) => arc.state))).toEqual(
      new Set(["active", "slow", "dormant", "closed"]),
    );
  });
});
