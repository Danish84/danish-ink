"use client";

import { useEffect, useState } from "react";

export function LocalTime({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  // During SSR and initial hydration, use UTC to prevent hydration mismatch.
  // After hydration, switch to the user's local timezone.
  const displayTime = new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...(isClient ? {} : { timeZone: "UTC" }),
  });

  return (
    <time dateTime={value} className={className}>
      {displayTime}
    </time>
  );
}
