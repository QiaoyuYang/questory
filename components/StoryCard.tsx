/* eslint-disable @next/next/no-img-element */
"use client";

import type { TurnView } from "@/lib/types";
import { HeroFrame } from "./HeroFrame";
import type { Zoomed } from "./PhotoViewer";

type Props = {
  turn: TurnView;
  onRepaint: () => void;
  onZoom: (image: Zoomed) => void;
};

/**
 * The card Muse Image paints onto a photo that moved the story. The photo stands in
 * until it lands. A finished card carries its own title, so it needs no caption.
 */
export function StoryCard({ turn, onRepaint, onZoom }: Props) {
  if (!turn.card || !turn.photoUrl) return null;
  const ready = turn.cardStatus === "ready" && turn.cardUrl !== null;
  const failed = turn.cardStatus === "failed";
  const src = ready ? turn.cardUrl! : turn.photoUrl;
  const alt = ready ? `Evidence card: ${turn.card.title}` : "The photo you sent";

  return (
    <div className="relative">
      <HeroFrame
        size={turn.photoSize}
        label={ready ? "Open the card full screen" : "Open the photo full screen"}
        onClick={() => onZoom({ src, alt, size: turn.photoSize, overlay: null })}
      >
        <img
          key={ready ? "card" : "photo"}
          src={src}
          alt={alt}
          className={`fade-in block h-full w-full object-cover ${ready ? "" : "opacity-50 grayscale-[35%]"}`}
        />
      </HeroFrame>
      {!ready && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/65 px-3.5 py-2 text-[0.9375rem] font-semibold backdrop-blur">
            {failed ? (
              <>
                Your card didn&apos;t come out.
                <button type="button" onClick={onRepaint} className="text-lane underline underline-offset-4">
                  Try again
                </button>
              </>
            ) : (
              <>
                <span className="lane-line lane-line-moving h-[3px] w-8" aria-hidden="true" />
                Drawing your card…
              </>
            )}
          </span>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {ready ? `Evidence card: ${turn.card.title}` : failed ? "Your card didn't come out." : "Drawing your card."}
      </p>
    </div>
  );
}
