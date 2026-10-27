"use client";

import { useState } from "react";
import type { QuestView } from "@/lib/types";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  quest: QuestView | null;
  /** Shows the outlined photo, for a closer-look quest. */
  onLook: (() => void) | null;
};

/** The game master's suggestion for the next photo, with the hint held back until asked for. */
export function QuestSheet({ open, onClose, quest, onLook }: Props) {
  const [hint, setHint] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title="Next step">
      {quest ? (
        <>
          <h3 className="font-sign text-[1.75rem] leading-tight font-bold text-lane">{quest.title}</h3>
          <p className="mt-2 text-lg text-pretty">{quest.objective}</p>
          <p className="mt-3 text-concrete">
            {quest.targetMode === "in_view" ? "In your photo: " : "Somewhere nearby: "}
            {quest.targetDescription}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {onLook && (
              <button type="button" onClick={onLook} className="min-h-11 font-semibold text-paint underline underline-offset-4">
                Show me where
              </button>
            )}
            {quest.hint && !hint && (
              <button
                type="button"
                onClick={() => setHint(true)}
                className="min-h-11 font-semibold text-paint underline underline-offset-4"
              >
                Need a hint?
              </button>
            )}
          </div>
          {hint && <p className="mt-2 font-story text-lg text-pretty italic">{quest.hint}</p>}
          <p className="mt-6 text-sm text-concrete">
            Quests are optional. Photograph anything that catches your eye, and the story will use it.
          </p>
        </>
      ) : (
        <p className="text-lg text-pretty">Photograph anything that catches your eye, and the story will use it.</p>
      )}
    </Sheet>
  );
}
