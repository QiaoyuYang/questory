/* eslint-disable @next/next/no-img-element */
"use client";

import { useId, useState } from "react";
import type { TargetOverlay, TurnView } from "@/lib/types";

/** The game master's outline around the quest target, with the rest of the photo dimmed. */
function TargetOutline({ overlay }: { overlay: TargetOverlay }) {
  const maskId = `spot${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  if (!overlay.outline) return null;
  const { width, height } = overlay;
  const { path, transform } = overlay.outline;
  const stroke = Math.max(width, height) * 0.006;
  const shape = { d: path, transform: transform || undefined };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      // Matches the photo's object-cover crop, so the outline stays on the object.
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width={width} height={height} fill="white" />
          <path {...shape} fill="black" />
        </mask>
      </defs>
      <g className="fade-in [animation-delay:1.3s]">
        <rect width={width} height={height} fill="#1e2227" opacity={0.45} mask={`url(#${maskId})`} />
      </g>
      <path
        {...shape}
        fill="none"
        stroke="#1e2227"
        strokeOpacity={0.55}
        strokeWidth={stroke * 2.6}
        strokeLinejoin="round"
        pathLength={1}
        className="target-trace"
      />
      <path
        {...shape}
        fill="none"
        stroke="#f4bc1c"
        strokeWidth={stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        className="target-trace"
      />
    </svg>
  );
}

type Props = {
  turn: TurnView;
  questTitle: string;
  onRepaint: () => void;
};

/** The photo the quest was issued from: painted by Muse Image when ready, outlined by SAM before that. */
export function QuestCard({ turn, questTitle, onRepaint }: Props) {
  const [preferPhoto, setPreferPhoto] = useState(false);
  const painted = turn.cardStatus === "ready" && turn.cardUrl !== null && turn.cardUrl !== turn.photoUrl;
  const showPainted = painted && !preferPhoto;
  const painting = turn.cardStatus === "pending" || turn.cardStatus === "none";
  const size = turn.photoSize;

  if (!turn.photoUrl) return null;

  return (
    <figure>
      <div
        // Tall portrait photos are cropped to keep the quest text near the top of the screen.
        className="relative mx-auto max-h-[min(46svh,32rem)] overflow-hidden rounded-[14px] bg-kerb"
        style={size ? { aspectRatio: `${size.width} / ${size.height}` } : undefined}
      >
        <img
          key={showPainted ? "card" : "photo"}
          src={showPainted ? turn.cardUrl! : turn.photoUrl}
          alt={showPainted ? `Quest card: ${questTitle}` : `Your photo for the quest: ${questTitle}`}
          className="fade-in block h-full w-full object-cover"
        />
        {!showPainted && turn.overlay && <TargetOutline key={turn.id} overlay={turn.overlay} />}
      </div>

      {(painting || painted || turn.cardStatus === "failed") && (
      <figcaption className="mt-2 flex min-h-8 items-center justify-between gap-3 text-sm text-concrete">
        {painting && (
          <span className="flex items-center gap-2">
            <span className="lane-line lane-line-moving h-[3px] w-10" aria-hidden="true" />
            Painting the quest card…
          </span>
        )}
        {turn.cardStatus === "failed" && (
          <span>
            The quest card didn&apos;t paint.{" "}
            <button type="button" onClick={onRepaint} className="font-semibold text-paint underline underline-offset-4">
              Try again
            </button>
          </span>
        )}
        {painted && (
          <div className="flex gap-1 rounded-full bg-kerb p-1" role="group" aria-label="Show">
            {[
              { label: "Quest card", photo: false },
              { label: "Photo", photo: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={preferPhoto === option.photo}
                onClick={() => setPreferPhoto(option.photo)}
                className={`rounded-full px-3 py-1 font-medium ${
                  preferPhoto === option.photo ? "bg-paint text-asphalt" : "text-concrete hover:text-paint"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </figcaption>
      )}
    </figure>
  );
}
