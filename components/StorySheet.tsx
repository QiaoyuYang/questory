/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { StoryView, TurnView } from "@/lib/types";
import { turnLabel } from "./labels";
import type { Zoomed } from "./PhotoViewer";
import { Segmented } from "./Segmented";
import { Sheet } from "./Sheet";

type Tab = "clues" | "items" | "journal";

const TABS: { id: Tab; label: string }[] = [
  { id: "clues", label: "Clues" },
  { id: "items", label: "Items" },
  { id: "journal", label: "Journal" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  story: StoryView;
  turns: TurnView[];
  onZoom: (image: Zoomed) => void;
};

/** Everything the story has built up, kept out of the way until the player asks for it. */
export function StorySheet({ open, onClose, story, turns, onZoom }: Props) {
  const [tab, setTab] = useState<Tab>("clues");

  return (
    <Sheet open={open} onClose={onClose} title={story.title}>
      <Segmented label="Story sections" options={TABS} value={tab} onChange={setTab} />

      <div className="mt-5">
        {tab === "clues" && (
          <>
            <p className="font-story text-concrete italic text-pretty">{story.logline}</p>
            {story.recap && (
              <>
                <h3 className="mt-5 font-sign text-lg font-bold">Last time</h3>
                <p className="mt-1 font-story leading-relaxed text-pretty">{story.recap}</p>
              </>
            )}
            <h3 className="mt-5 font-sign text-lg font-bold">What you know</h3>
            {story.canon.length > 0 ? (
              <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-lane">
                {story.canon.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-concrete">Nothing yet. Every photo can turn something up.</p>
            )}
          </>
        )}

        {tab === "items" &&
          (story.inventory.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5 marker:text-lane">
              {story.inventory.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-concrete">Nothing in your pockets yet.</p>
          ))}

        {tab === "journal" && (
          <ol className="space-y-5">
            {[...turns].reverse().map((turn) => {
              const src = turn.cardUrl ?? turn.photoUrl;
              return (
                <li key={turn.id} className="flex gap-3">
                  {src ? (
                    <button
                      type="button"
                      aria-label="Open this picture full screen"
                      onClick={() => onZoom({ src, alt: turnLabel(turn), size: turn.photoSize, overlay: null })}
                      className="h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-[10px]"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-[10px] bg-asphalt" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-concrete">{turnLabel(turn)}</p>
                    <p className="font-story text-[0.98rem] leading-relaxed text-pretty">{turn.narration}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Sheet>
  );
}
