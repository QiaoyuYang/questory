"use client";

import { useState } from "react";
import { WALK_LENGTHS, isWalkLength, type WalkLength } from "@/lib/walk";
import { Segmented } from "./Segmented";

const KEY = "questory:walk-length";

const OPTIONS: { id: `${WalkLength}`; label: string; hint: string }[] = [
  { id: "15", label: "15 min", hint: "A quick break" },
  { id: "30", label: "30 min", hint: "A walk after lunch" },
  { id: "60", label: "1 hour", hint: "A longer walk" },
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

type Props = { value: WalkLength; onChange: (length: WalkLength) => void; hint?: boolean; className?: string };

/** How long the player wants to walk. Each quest that sends them somewhere starts with a quarter of it. */
export function WalkLengthPicker({ value, onChange, hint = false, className = "" }: Props) {
  const selected = String(value) as `${WalkLength}`;
  return (
    <div className={className}>
      <Segmented
        label="How long a walk"
        options={OPTIONS}
        value={selected}
        onChange={(id) => onChange(Number(id) as WalkLength)}
      />
      {hint && <p className="mt-2 text-sm text-concrete">{OPTIONS.find((option) => option.id === selected)?.hint}</p>}
    </div>
  );
}
