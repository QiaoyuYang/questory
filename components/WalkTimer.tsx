"use client";

import { useEffect, useState } from "react";

/**
 * Counts down, in whole minutes, the walk an errand starts with. A photo for the errand counts
 * once it's over.
 */
export function WalkTimer({ until }: { until: string }) {
  const end = Date.parse(until);
  const [left, setLeft] = useState(() => end - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setLeft(end - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [end]);

  const minutes = Math.ceil(left / 60_000);
  return (
    <p role="timer" className="mt-1 text-sm font-semibold text-lane">
      {minutes > 0 ? `Keep walking, next evidence in ${minutes} minute${minutes === 1 ? "" : "s"}` : "Look for it now"}
    </p>
  );
}
