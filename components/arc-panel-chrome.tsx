"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  slug: string | null;
};

const EXIT_DURATION_MS = 220;

export function ArcPanelChrome({ children, slug }: Props) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateAway = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace("/", { scroll: false });
    }
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
