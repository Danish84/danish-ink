"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  slug: string | null;
};

const EXIT_DURATION_MS = 220;
const PANEL_VIEWPORT_TOP = 48;
const PANEL_RETURN_KEY = "danish.ink.arcPanelReturnTo";

function getPanelTop(slug: string | null) {
  const markerHref = slug ? `/arc/${slug}` : null;
  const activeMarker = document.querySelector<HTMLAnchorElement>(
    ".arc-marker[data-active='true']",
  );
  const slugMarker = markerHref
    ? Array.from(document.querySelectorAll<HTMLAnchorElement>(".arc-marker")).find(
        (marker) => marker.getAttribute("href") === markerHref,
      )
    : null;
  const activeSection = (activeMarker ?? slugMarker)?.closest("section");
  const activeHeading = activeSection?.querySelector("h2");
  const firstHeading = document.querySelector("main section h2");
  const heading = activeHeading ?? firstHeading;

  if (!heading) return null;

  const headingTop = heading.getBoundingClientRect().top;
  return Math.max(PANEL_VIEWPORT_TOP, Math.round(headingTop));
}

export function ArcPanelChrome({ children, slug }: Props) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateAway = () => {
    const returnTo =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(PANEL_RETURN_KEY)
        : null;

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PANEL_RETURN_KEY);
    }

    router.replace(returnTo ?? "/", { scroll: false });
  };

  const close = () => {
    if (isClosing) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      navigateAway();
      return;
    }

    setIsClosing(true);
    closeTimer.current = setTimeout(() => {
      navigateAway();
    }, EXIT_DURATION_MS);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    const updatePanelTop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const panelTop = getPanelTop(slug);
        if (panelTop === null) {
          document.documentElement.style.removeProperty(
            "--arc-panel-viewport-top",
          );
          return;
        }
        document.documentElement.style.setProperty(
          "--arc-panel-viewport-top",
          `${panelTop}px`,
        );
      });
    };

    updatePanelTop();
    const delayedUpdate = window.setTimeout(updatePanelTop, 100);
    window.addEventListener("scroll", updatePanelTop, { passive: true });
    window.addEventListener("resize", updatePanelTop);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(delayedUpdate);
      window.removeEventListener("scroll", updatePanelTop);
      window.removeEventListener("resize", updatePanelTop);
      document.documentElement.style.removeProperty(
        "--arc-panel-viewport-top",
      );
    };
  }, [slug]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClosing]);

  return (
    <div className="arc-panel-wrap">
      <aside
        className={`arc-panel${isClosing ? " is-closing" : ""}`}
        data-arc-panel
      >
        <button
          type="button"
          className="panel-close"
          aria-label="Close arc panel"
          onClick={close}
        >
          &times;
        </button>
        <div key={slug ?? "empty"} className="arc-content-fade-wrap">
          {children}
        </div>
      </aside>
    </div>
  );
}
