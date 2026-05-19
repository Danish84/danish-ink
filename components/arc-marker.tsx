"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

type ArcStatus = "active" | "closure_candidate" | "closed" | "proposed";

type Props = {
  slug: string;
  title: string;
  dayNumber: number;
  status: ArcStatus;
};

const PANEL_BREAKPOINT = "(min-width: 1280px)";

export function ArcMarker({ slug, title, dayNumber }: Props) {
  const router = useRouter();
  const href = `/arc/${slug}`;

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
    router.push(href, { scroll: false });
  };

  return (
    <a className="arc-marker" href={href} onClick={handleClick}>
      &mdash; {title}, day {dayNumber}
    </a>
  );
}
