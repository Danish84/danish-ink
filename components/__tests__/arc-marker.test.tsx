// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
const back = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, back }),
  usePathname: () => mockPathname,
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
  mockPathname = "/";
  window.sessionStorage.clear();
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
    expect(window.sessionStorage.getItem("danish.ink.arcPanelReturnTo")).toBe(
      "/",
    );
  });

  it("applies data-active=true when the pathname matches its arc slug", () => {
    stubMatchMedia(true);
    mockPathname = "/arc/grain-corridor";

    render(
      <ArcMarker
        slug="grain-corridor"
        title="Grain Corridor"
        dayNumber={4}
        status="active"
      />,
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("data-active")).toBe("true");
  });

  it("does not apply data-active when the pathname is a different arc", () => {
    stubMatchMedia(true);
    mockPathname = "/arc/other-arc";

    render(
      <ArcMarker
        slug="grain-corridor"
        title="Grain Corridor"
        dayNumber={4}
        status="active"
      />,
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("data-active")).toBeNull();
  });

  it("clicking when active replaces to the stored briefing URL without scrolling", () => {
    stubMatchMedia(true);
    mockPathname = "/arc/grain-corridor";
    window.sessionStorage.setItem(
      "danish.ink.arcPanelReturnTo",
      "/?date=2026-05-18",
    );

    render(
      <ArcMarker
        slug="grain-corridor"
        title="Grain Corridor"
        dayNumber={4}
        status="active"
      />,
    );

    const link = screen.getByRole("link");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    expect(replace).toHaveBeenCalledWith("/?date=2026-05-18", {
      scroll: false,
    });
    expect(back).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(window.sessionStorage.getItem("danish.ink.arcPanelReturnTo")).toBe(
      null,
    );
  });

  it("clicking when active with no stored return URL replaces to /", () => {
    stubMatchMedia(true);
    mockPathname = "/arc/grain-corridor";

    render(
      <ArcMarker
        slug="grain-corridor"
        title="Grain Corridor"
        dayNumber={4}
        status="active"
      />,
    );

    fireEvent.click(screen.getByRole("link"));

    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
    expect(back).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("cross-arc click uses router.replace with scroll:false", () => {
    stubMatchMedia(true);
    mockPathname = "/arc/other-arc";

    render(
      <ArcMarker
        slug="grain-corridor"
        title="Grain Corridor"
        dayNumber={4}
        status="active"
      />,
    );

    fireEvent.click(screen.getByRole("link"));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/arc/grain-corridor", {
      scroll: false,
    });
    expect(push).not.toHaveBeenCalled();
  });
});
