/* eslint-disable @next/next/no-img-element */
"use client";

import { useId } from "react";
import type { TargetOverlay, TurnView } from "@/lib/types";

/** SAM's outline around the quest target, with the rest of the photo dimmed. */
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
};

/** The photo a closer-look quest came from, with the target outlined. */
export function QuestPhoto({ turn, questTitle }: Props) {
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
          src={turn.photoUrl}
          alt={`Your photo, with the target of ${questTitle} outlined`}
          className="fade-in block h-full w-full object-cover"
        />
        {turn.overlay && <TargetOutline key={turn.id} overlay={turn.overlay} />}
      </div>
    </figure>
  );
}
