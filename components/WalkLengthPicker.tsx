"use client";

import { useState } from "react";
import { WALK_LENGTHS, isWalkLength, type WalkLength } from "@/lib/walk";
import { Segmented } from "./Segmented";

const KEY = "questory:walk-length";

const OPTIONS: { id: `${WalkLength}`; label: string }[] = [
  { id: "15", label: "15 min" },
  { id: "30", label: "30 min" },
  { id: "60", label: "1 hour" },
];

/** How long to walk, starting from what was chosen last on this phone. */
export function useWalkLength(): [WalkLength, (length: WalkLength) => void] {
  const [length, setLength] = useState<WalkLength>(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      return isWalkLength(saved) ? saved : WALK_LENGTHS[0];
    } catch {
      return WALK_LENGTHS[0];
    }
  });

  function choose(next: WalkLength) {
    setLength(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      // Without storage the choice still holds for this walk.
    }
  }

  return [length, choose];
}

type Props = { value: WalkLength; onChange: (length: WalkLength) => void; className?: string };

/** How long the player wants to walk, which sets how big the case is. */
export function WalkLengthPicker({ value, onChange, className = "" }: Props) {
  return (
    <Segmented
      label="How long a walk"
      options={OPTIONS}
      value={String(value) as `${WalkLength}`}
      onChange={(id) => onChange(Number(id) as WalkLength)}
      className={className}
    />
  );
}
