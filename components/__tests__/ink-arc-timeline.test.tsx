// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InkArcTimeline } from "../ink-arc-timeline";

const chapters = [
  {
    id: "chapter-old",
    arcSlug: "test-arc",
    date: "2026-05-01",
    title: "First turn",
    body: ["The first body."],
    cast: ["first cast"],
    elsewhere: [],
    sourceIds: ["source-1"],
  },
  {
    id: "chapter-middle",
    arcSlug: "test-arc",
    date: "2026-05-02",
    title: "Middle turn",
    body: ["The middle body."],
    cast: [],
    elsewhere: [{ slug: "related-arc", label: "Related arc" }],
    sourceIds: ["source-1"],
  },
  {
    id: "chapter-new",
    arcSlug: "test-arc",
    date: "2026-05-03",
    title: "Latest turn",
    body: ["The latest body."],
    cast: ["latest cast"],
    elsewhere: [{ slug: "other-arc", label: "Other arc" }],
    sourceIds: ["source-1"],
  },
];

afterEach(() => {
  cleanup();
});

describe("InkArcTimeline", () => {
  it("defaults to newest-first and switches to oldest-first", () => {
    render(<InkArcTimeline chapters={chapters} />);

    expect(renderedChapterTitles()).toEqual([
      "Latest turn",
      "Middle turn",
      "First turn",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "from the beginning" }));

    expect(renderedChapterTitles()).toEqual([
      "First turn",
      "Middle turn",
      "Latest turn",
    ]);
  });

  it("renders cast as plain labels and elsewhere as links", () => {
    render(<InkArcTimeline chapters={chapters} />);

    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).getByText("latest cast").closest("a")).toBeNull();

    const elsewhere = within(sidebar).getByRole("link", { name: "Other arc" });
    expect(elsewhere.getAttribute("href")).toBe("/ink/arc/other-arc");
  });

  it("hides empty sidebar labels for the active chapter", () => {
    render(<InkArcTimeline chapters={chapters} />);
    positionChapters({
      "chapter-new": { top: 900, height: 100 },
      "chapter-middle": { top: 250, height: 100 },
      "chapter-old": { top: 700, height: 100 },
    });

    fireEvent.scroll(window);

    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).queryByRole("heading", { name: "cast" })).toBeNull();
    expect(within(sidebar).getByRole("heading", { name: "elsewhere" })).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "Related arc" })).toBeTruthy();
  });
});

function renderedChapterTitles() {
  return screen
    .getAllByRole("heading", { level: 2 })
    .filter((heading) => heading.closest(".ink-arc-chapter"))
    .map((heading) => heading.textContent);
}

function positionChapters(
  positions: Record<string, { top: number; height: number }>,
) {
  for (const [id, position] of Object.entries(positions)) {
    const node = document.querySelector(`[data-testid="${id}"]`);
    if (!node) continue;

    Object.defineProperty(node, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        top: position.top,
        bottom: position.top + position.height,
        left: 0,
        right: 100,
        width: 100,
        height: position.height,
        x: 0,
        y: position.top,
        toJSON: () => ({}),
      }),
    });
  }
}
