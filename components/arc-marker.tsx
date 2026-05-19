"use client";

import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";

type ArcStatus = "active" | "closure_candidate" | "closed" | "proposed";

type Props = {
  slug: string;
  title: string;
  dayNumber: number;
  status: ArcStatus;
};

const PANEL_BREAKPOINT = "(min-width: 1280px)";
const PANEL_MIN_TOP = 84;

function setPanelStart(anchor: HTMLAnchorElement) {
  const markerTop = anchor.getBoundingClientRect().top + window.scrollY;
  const panelTop = Math.max(markerTop, PANEL_MIN_TOP);
  document.documentElement.style.setProperty(
    "--arc-panel-start-y",
    `${panelTop}px`,
  );
}

export function ArcMarker({ slug, title, dayNumber }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const href = `/arc/${slug}`;
  const isActive = pathname === href;
  const otherArcOpen =
    typeof pathname === "string" &&
    pathname !== "/" &&
    pathname.startsWith("/arc/") &&
    pathname !== href;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Honor modifier-key navigations and non-primary clicks.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    if (!window.matchMedia(PANEL_BREAKPOINT).matches) {
      // Below xl, let the default <a> navigation happen.
      return;
    }

    event.preventDefault();
    setPanelStart(event.currentTarget);

    if (isActive) {
      // Toggle: clicking the active marker closes the panel.
      if (window.history.length > 1) {
        router.back();
      } else {
        router.replace("/", { scroll: false });
      }
      return;
    }

    if (otherArcOpen) {
      // Cross-arc swap — avoid an extra history entry per arc hop.
      router.replace(href, { scroll: false });
      return;
    }

    router.push(href, { scroll: false });
  };

  return (
    <a
      className="arc-marker"
      href={href}
      onClick={handleClick}
      data-active={isActive ? "true" : undefined}
    >
      &mdash; {title}, day {dayNumber}
    </a>
  );
}
