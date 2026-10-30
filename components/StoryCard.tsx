/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
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
 * until it lands, and the card then fades in over it, so the photo turns into the
 * evidence in place. A finished card carries its own title, so it needs no caption.
 */
export function StoryCard({ turn, onRepaint, onZoom }: Props) {
  const [loaded, setLoaded] = useState(false);
  if (!turn.card || !turn.photoUrl) return null;
  const ready = turn.cardStatus === "ready" && turn.cardUrl !== null;
  const failed = turn.cardStatus === "failed";
  const src = ready ? turn.cardUrl! : turn.photoUrl;
  const alt = ready ? `Evidence: ${turn.card.title}` : "The photo you sent";

  return (
    <div className="relative">
      <HeroFrame
        size={turn.photoSize}
        label={ready ? "Open the card full screen" : "Open the photo full screen"}
        onClick={() => onZoom({ src, alt, size: turn.photoSize, overlay: null })}
      >
        {/* Grayed as it was while the card was painted, so the handover doesn't show. */}
        <img
          src={turn.photoUrl}
          alt={ready ? "" : alt}
          className={`block h-full w-full object-cover ${ready ? "opacity-70" : "opacity-50"} grayscale-[35%]`}
        />
        {ready && (
          <img
            src={turn.cardUrl!}
            alt={alt}
            ref={(img) => {
              if (img?.complete && img.naturalWidth > 0) setLoaded(true);
            }}
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover ${loaded ? "reveal" : "opacity-0"}`}
          />
        )}
      </HeroFrame>
      {!ready && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/65 px-3.5 py-2 text-[0.9375rem] font-semibold backdrop-blur">
            {failed ? (
              <>
                This picture didn&apos;t come out.
                <button type="button" onClick={onRepaint} className="text-lane underline underline-offset-4">
                  Try again
                </button>
              </>
            ) : (
              <>
                <span className="lane-line lane-line-moving h-[3px] w-8" aria-hidden="true" />
                Analyzing the evidence…
              </>
            )}
          </span>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {ready ? `Evidence: ${turn.card.title}` : failed ? "This picture didn't come out." : "Analyzing the evidence."}
      </p>
    </div>
  );
}
