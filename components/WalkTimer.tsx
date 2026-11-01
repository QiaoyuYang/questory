"use client";

import { useEffect, useState } from "react";

/**
 * How far off an errand's find is, in whole minutes, counting down from when the quest was given.
 * A photo for the errand counts once the player gets there.
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
      {minutes > 0 ? `About ${minutes} minute${minutes === 1 ? "" : "s"} away` : "You should be close now"}
    </p>
  );
}
