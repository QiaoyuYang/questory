/* eslint-disable @next/next/no-img-element */
"use client";

import type { StoryView, TurnView } from "@/lib/types";
import { LockIcon } from "./icons";
import type { Zoomed } from "./PhotoViewer";

type Props = {
  story: StoryView;
  turns: TurnView[];
  onZoom: (image: Zoomed) => void;
};

/**
 * The case file: every piece of evidence found so far, an empty slot for each one still
 * out there, and the answer they add up to, locked until the last step.
 */
export function EvidenceList({ story, turns, onZoom }: Props) {
  const found = turns.flatMap((turn) => (turn.card ? [{ turn, card: turn.card }] : []));
  const missing = Math.max(story.evidenceTotal - found.length, 0);

  return (
    <>
      {/* Once the case is solved, the answer comes first. */}
      {story.secret && (
        <section className="mb-6 rounded-[14px] bg-asphalt px-4 py-3.5">
          <h3 className="font-sign text-lg font-bold text-lane">The answer</h3>
          <p className="mt-1 font-story text-lg leading-relaxed text-pretty">{story.secret}</p>
        </section>
      )}

      {found.length > 0 && (
        <ol className="space-y-3">
          {found.map(({ turn, card }) => {
            const src = turn.cardUrl ?? turn.photoUrl;
            return (
              <li key={turn.id} className="flex items-center gap-3">
                {src ? (
                  <button
                    type="button"
                    aria-label={`Open ${card.title} full screen`}
                    onClick={() => onZoom({ src, alt: card.title, size: turn.photoSize, overlay: null })}
                    className="h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-[10px]"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-[10px] bg-asphalt" />
                )}
                <div className="min-w-0">
                  <p className="font-sign text-lg leading-tight font-bold">{card.title}</p>
                  {card.caption && <p className="text-[0.9375rem] text-concrete">{card.caption}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {missing > 0 && (
        <div className={found.length > 0 ? "mt-5" : ""}>
          <p className="text-concrete">
            {found.length > 0 ? `${missing} more to find` : `${missing} pieces of evidence to find`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2" aria-hidden="true">
            {Array.from({ length: missing }, (_, i) => (
              <span
                key={i}
                className="grid h-12 w-12 place-items-center rounded-[10px] border-2 border-dashed border-seam font-sign text-xl font-bold text-concrete"
              >
                ?
              </span>
            ))}
          </div>
        </div>
      )}

      {story.status === "active" && (
        <section className="mt-6 rounded-[14px] bg-asphalt px-4 py-3.5">
          <h3 className="flex items-center gap-2 font-sign text-lg font-bold text-lane">
            <LockIcon className="h-5 w-5" />
            The answer
          </h3>
          <p className="mt-1 text-concrete">Find all {story.evidenceTotal} to solve the case.</p>
        </section>
      )}
    </>
  );
}
