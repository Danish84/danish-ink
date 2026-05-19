// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, back }),
}));

import { ArcMarker } from "../arc-marker";

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(min-width: 1280px)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

afterEach(() => {
  cleanup();
  push.mockReset();
  replace.mockReset();
  back.mockReset();
});

describe("ArcMarker", () => {
  it("renders an anchor pointing at the arc slug with title and day number", () => {
    stubMatchMedia(false);

    render(
      <ArcMarker
        slug="grain-corridor"
        title="Grain Corridor"
        dayNumber={4}
        status="active"
      />,
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/arc/grain-corridor");
    expect(link.textContent).toContain("Grain Corridor");
    expect(link.textContent).toContain("day 4");
  });

  it("router.push to the arc slug with scroll:false when viewport matches xl", () => {
    stubMatchMedia(true);

    render(
      <ArcMarker
        slug="grain-corridor"
        title="Grain Corridor"
        dayNumber={4}
        status="active"
      />,
    );

    const link = screen.getByRole("link");
    fireEvent.click(link);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/arc/grain-corridor", {
      scroll: false,
    });
  });
});
