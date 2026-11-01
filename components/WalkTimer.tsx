"use client";

import { useEffect, useState } from "react";

/** "2:05" */
function minutesAndSeconds(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Counts down the walk an errand starts with. A photo for the errand counts once it's over. */
export function WalkTimer({ until }: { until: string }) {
  const end = Date.parse(until);
  const [left, setLeft] = useState(() => end - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setLeft(end - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [end]);

  return (
    <p role="timer" className="mt-1 text-sm font-semibold text-lane">
      {left > 0 ? (
        <>
          Keep walking for <span className="tabular-nums">{minutesAndSeconds(left)}</span>, then look for it
        </>
      ) : (
        "Look for it now"
      )}
    </p>
  );
}
