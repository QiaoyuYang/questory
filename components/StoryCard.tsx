/* eslint-disable @next/next/no-img-element */
"use client";

import type { TurnView } from "@/lib/types";

type Props = {
  turn: TurnView;
  onRepaint: () => void;
};

/** The card Muse Image paints onto a photo that moved the story. The photo stands in until it lands. */
export function StoryCard({ turn, onRepaint }: Props) {
  if (!turn.card || !turn.photoUrl) return null;
  const ready = turn.cardStatus === "ready" && turn.cardUrl !== null;
  const failed = turn.cardStatus === "failed";
  const size = turn.photoSize;

  return (
    <figure className="mt-5">
      <div
        className="relative mx-auto max-h-[min(46svh,32rem)] overflow-hidden rounded-[14px] bg-kerb"
        style={size ? { aspectRatio: `${size.width} / ${size.height}` } : undefined}
      >
        <img
          key={ready ? "card" : "photo"}
          src={ready ? turn.cardUrl! : turn.photoUrl}
          alt={ready ? `Story card: ${turn.card.title}` : "The photo you sent"}
          className={`fade-in block h-full w-full object-cover ${ready ? "" : "opacity-50 grayscale-[35%]"}`}
        />
      </div>
      <figcaption className="mt-2 flex min-h-8 items-center text-sm text-concrete" aria-live="polite">
        {ready ? (
          <span>
            Card earned: <span className="font-semibold text-paint">{turn.card.title}</span>
          </span>
        ) : failed ? (
          <span>
            The card didn&apos;t paint.{" "}
            <button type="button" onClick={onRepaint} className="font-semibold text-paint underline underline-offset-4">
              Try again
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="lane-line lane-line-moving h-[3px] w-10" aria-hidden="true" />
            Painting your card…
          </span>
        )}
      </figcaption>
    </figure>
  );
}
