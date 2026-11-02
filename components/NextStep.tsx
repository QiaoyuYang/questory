"use client";

import { useEffect, useState } from "react";
import type { QuestView, TurnView } from "@/lib/types";
import type { Zoomed } from "./PhotoViewer";
import { QuestThumb } from "./QuestThumb";

/**
 * True until the walk an errand starts with is over. Meanwhile its quest stays hidden and the
 * camera waits, so the walk can go anywhere and nothing turns up too early.
 */
export function useWalking(until: string | null): boolean {
  const end = until === null ? 0 : Date.parse(until);
  // The end of the last walk that's over.
  const [over, setOver] = useState(() => (end <= Date.now() ? end : 0));

  useEffect(() => {
    const timer = setTimeout(() => setOver(end), Math.max(0, end - Date.now()));
    return () => clearTimeout(timer);
  }, [end]);

  return end > 0 && over !== end;
}

/** Whole minutes until the quest shows, counted every second. */
function Countdown({ until }: { until: string }) {
  const end = Date.parse(until);
  const [left, setLeft] = useState(() => end - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setLeft(end - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [end]);

  const minutes = Math.max(1, Math.ceil(left / 60_000));
  return (
    <p role="timer" className="py-1 font-sign text-lg leading-snug font-semibold">
      Next quest in {minutes} minute{minutes === 1 ? "" : "s"}
    </p>
  );
}

type Props = {
  quest: QuestView;
  /** On the walk the quest starts with, before it shows. */
  walking: boolean;
  /** The turn a closer look was given at, to show where to look on its photo. */
  lookTurn: TurnView | null;
  onZoom: (zoomed: Zoomed) => void;
};

/** The next step, spelled out once its walk is over. It pulses when it shows. */
export function NextStep({ quest, walking, lookTurn, onZoom }: Props) {
  return (
    <div
      key={walking ? "walk" : "quest"}
      className="callout flex w-full items-center gap-3 rounded-[14px] border border-lane/50 bg-kerb px-3.5 py-2.5"
    >
      {walking && quest.walkUntil ? (
        <Countdown until={quest.walkUntil} />
      ) : (
        <>
          {lookTurn && <QuestThumb turn={lookTurn} onZoom={onZoom} />}
          <div className="min-w-0 flex-1">
            <p className="flex min-h-6 items-center gap-2 text-sm">
              <span className="shrink-0 text-xs font-bold tracking-wider text-lane uppercase">Next step</span>
              <span className="min-w-0 truncate font-semibold text-concrete">{quest.title}</span>
            </p>
            <p className="mt-0.5 line-clamp-3 font-sign text-lg leading-snug font-semibold text-pretty">
              {quest.objective}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
