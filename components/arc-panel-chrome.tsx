"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function ArcPanelChrome({ children }: Props) {
  const router = useRouter();

  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace("/", { scroll: false });
    }
  };

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
  }, []);

  return (
    <div className="arc-panel-wrap">
      <aside className="arc-panel" data-arc-panel>
        <button
          type="button"
          className="panel-close"
          aria-label="Close arc panel"
          onClick={close}
        >
          &times;
        </button>
        {children}
      </aside>
    </div>
  );
}
