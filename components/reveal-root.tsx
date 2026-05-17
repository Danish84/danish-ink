"use client";

import { useEffect, useState } from "react";

// Module-level flag: set to true after the first full page load in this tab.
// Soft client navigations (date picker) preserve the JS module, so this stays
// true and the reveal animation does not re-fire. A hard refresh reloads the
// module and the flag resets — the cascade replays.
let hasAnimated = false;

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function RevealRoot({ children, className }: Props) {
  const [shouldAnimate] = useState(() => !hasAnimated);

  useEffect(() => {
    hasAnimated = true;
  }, []);

  return (
    <div data-reveal={shouldAnimate ? "enter" : "idle"} className={className}>
      {children}
    </div>
  );
}
