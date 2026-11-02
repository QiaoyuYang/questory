"use client";

import { useState } from "react";
import { SCENERIES, isScenery, type Scenery } from "@/lib/walk";
import { Segmented } from "./Segmented";

const KEY = "questory:scenery";

const OPTIONS: { id: Scenery; label: string }[] = [
  { id: "city", label: "City streets" },
  { id: "green", label: "Park or suburb" },
];

/** Where the player is walking, starting from what was chosen last on this phone. */
export function useScenery(): [Scenery, (scenery: Scenery) => void] {
  const [scenery, setScenery] = useState<Scenery>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return isScenery(saved) ? saved : SCENERIES[0];
    } catch {
      return SCENERIES[0];
    }
  });

  function choose(next: Scenery) {
    setScenery(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Without storage the choice still holds for this walk.
    }
  }

  return [scenery, choose];
}

type Props = { value: Scenery; onChange: (scenery: Scenery) => void; className?: string };

/** City streets or somewhere greener, so the quests ask for things that are there. */
export function SceneryPicker({ value, onChange, className = "" }: Props) {
  return (
    <Segmented label="Where you're walking" options={OPTIONS} value={value} onChange={onChange} className={className} />
  );
}
