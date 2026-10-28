/* eslint-disable @next/next/no-img-element */
"use client";

import { useId } from "react";
import type { TargetOverlay, TurnView } from "@/lib/types";
import type { Zoomed } from "./PhotoViewer";

/**
 * SAM's outline around the quest target, with the rest of the photo dimmed. `weight`
 * thickens the line for small copies of the photo.
 */
export function TargetOutline({ overlay, weight = 1 }: { overlay: TargetOverlay; weight?: number }) {
  const maskId = `spot${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  if (!overlay.outline) return null;
  const { width, height } = overlay;
  const { path, transform } = overlay.outline;
  const stroke = Math.max(width, height) * 0.006 * weight;
  const shape = { d: path, transform: transform || undefined };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      // The frame has the photo's shape, so this lines up with it exactly.
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
  onZoom: (image: Zoomed) => void;
};

/**
 * Where to look, for a closer-look step: a small copy of the photo the step came from,
 * with its target outlined. A tap opens it full screen.
 */
export function QuestThumb({ turn, onZoom }: Props) {
  if (!turn.photoUrl) return null;
  const size = turn.photoSize ?? { width: 3, height: 4 };
  const alt = "Your photo, with where to look outlined";

  return (
    <button
      type="button"
      aria-label="See where to look"
      onClick={() => onZoom({ src: turn.photoUrl!, alt, size: turn.photoSize, overlay: turn.overlay })}
      className="relative h-16 shrink-0 cursor-zoom-in overflow-hidden rounded-[10px] bg-asphalt"
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
    >
      <img src={turn.photoUrl} alt={alt} className="block h-full w-full object-cover" />
      {turn.overlay && <TargetOutline key={turn.id} overlay={turn.overlay} weight={4} />}
    </button>
  );
}
