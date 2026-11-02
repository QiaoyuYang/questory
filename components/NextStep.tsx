"use client";

import { useEffect, useState } from "react";
import type { QuestView, TurnView } from "@/lib/types";
import type { Zoomed } from "./PhotoViewer";
import { QuestThumb } from "./QuestThumb";

/** Milliseconds left of the walk an errand starts with, counted down every second. */
function useWalkLeft(until: string | null): number {
  const end = until === null ? 0 : Date.parse(until);
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      const next = Math.max(0, end - Date.now());
      setLeft(next);
      if (next === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [end]);

  return left;
}

type Props = {
  quest: QuestView;
  /** The turn a closer look was given at, to show where to look on its photo. */
  lookTurn: TurnView | null;
  onZoom: (zoomed: Zoomed) => void;
};

/**
 * The next step, spelled out. An errand keeps what to find to itself until its walk is over,
 * so the walk can go anywhere and nothing turns up too early. The step pulses when it shows.
 */
export function NextStep({ quest, lookTurn, onZoom }: Props) {
  const left = useWalkLeft(quest.walkUntil);
  const walking = left > 0;
  const minutes = Math.ceil(left / 60_000);

  return (
    <div
      key={walking ? "walk" : "quest"}
      className="callout flex w-full items-center gap-3 rounded-[14px] border border-lane/50 bg-kerb px-3.5 py-2.5"
    >
      {!walking && lookTurn && <QuestThumb turn={lookTurn} onZoom={onZoom} />}
      <div className="min-w-0 flex-1">
        <p className="flex min-h-6 items-center gap-2 text-sm">
          <span className="shrink-0 text-xs font-bold tracking-wider text-lane uppercase">Next step</span>
          {!walking && <span className="min-w-0 truncate font-semibold text-concrete">{quest.title}</span>}
        </p>
        <p className="mt-0.5 line-clamp-3 font-sign text-lg leading-snug font-semibold text-pretty">
          {walking ? "Walk wherever you like." : quest.objective}
        </p>
        {walking && (
          <p role="timer" className="mt-1 text-sm font-semibold text-lane">
            Your next quest arrives in {minutes} minute{minutes === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </div>
  );
}
