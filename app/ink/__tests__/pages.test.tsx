// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import InkBriefingPage from "../[date]/page";
import InkHomePage from "../page";

afterEach(() => {
  cleanup();
});

describe("/ink", () => {
  it("renders the latest briefing preview, full briefing link, also-today pointers, and shelf", () => {
    render(<InkHomePage />);

    expect(
      screen.getByRole("heading", {
        name: "Europe's debt language gets quieter, which is not the same as calm",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Read full briefing" }),
    ).toHaveAttribute("href", "/ink/2026-05-23");

    expect(screen.getByText("Also today")).toBeInTheDocument();
    expect(
      screen.getByText("Debt language softens from reassurance to calibration."),
    ).toBeInTheDocument();

    const shelf = screen.getByRole("region", { name: "Arc shelf" });
    const shelfLinks = within(shelf)
      .getAllByRole("link")
      .map((link) => link.textContent);

    expect(shelfLinks).toEqual([
      "Alpine bond weather",
      "Grain corridor insurance",
      "Sahel grid clock",
      "Strait cable repairs",
    ]);
    expect(screen.queryByText("Coral court filing")).not.toBeInTheDocument();
  });

  it("reveals more arcs and searches the shelf", () => {
    render(<InkHomePage />);

    expect(screen.queryByText("Coral court filing")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Read more" }));
    expect(screen.getByText("Coral court filing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Search arcs" }));
    fireEvent.change(screen.getByPlaceholderText("Search arcs"), {
      target: { value: "coral" },
    });

    const shelf = screen.getByRole("region", { name: "Arc shelf" });
    const shelfLinks = within(shelf)
      .getAllByRole("link")
      .map((link) => link.textContent);

    expect(shelfLinks).toEqual(["Coral court filing"]);
  });
});

describe("/ink/[date]", () => {
  it("renders a known briefing with issue sections and bottom adjacent navigation", async () => {
    const page = await InkBriefingPage({
      params: Promise.resolve({ date: "2026-05-22" }),
    });

    render(page);

    expect(
      screen.getByRole("link", { name: "Back to ink" }),
    ).toHaveAttribute("href", "/ink");
    expect(
      screen.getByRole("heading", { name: "The calendar becomes the concession" }),
    ).toBeInTheDocument();

    expect(screen.getByText("LEAD")).toBeInTheDocument();
    expect(screen.getByText("WHAT CHANGED")).toBeInTheDocument();
    expect(screen.getByText("ELSEWHERE")).toBeInTheDocument();
    expect(screen.getByText("KICKER")).toBeInTheDocument();

    expect(screen.getByText("arc 16")).toBeInTheDocument();
    expect(screen.getByText("Sahel grid clock")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open arc 16: Sahel grid clock" }),
    ).toHaveAttribute("href", "/ink/arc/sahel-grid-clock");
    expect(screen.getByText("Bond markets exhale selectively")).toBeInTheDocument();

    const archiveNav = screen.getByRole("navigation", {
      name: "Briefing archive",
    });
    expect(
      within(archiveNav).getByRole("link", { name: /Previous briefing/i }),
    ).toHaveAttribute("href", "/ink/2026-05-21");
    expect(
      within(archiveNav).getByRole("link", { name: /Next briefing/i }),
    ).toHaveAttribute("href", "/ink/2026-05-23");
  });

  it("returns not-found for an unknown date", async () => {
    await expect(
      InkBriefingPage({
        params: Promise.resolve({ date: "1999-01-01" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("only renders adjacent links that exist", async () => {
    const page = await InkBriefingPage({
      params: Promise.resolve({ date: "2026-05-23" }),
    });

    render(page);

    const archiveNav = screen.getByRole("navigation", {
      name: "Briefing archive",
    });

    expect(
      within(archiveNav).getByRole("link", { name: /Previous briefing/i }),
    ).toHaveAttribute("href", "/ink/2026-05-22");
    expect(
      within(archiveNav).queryByRole("link", { name: /Next briefing/i }),
    ).not.toBeInTheDocument();
  });
});
