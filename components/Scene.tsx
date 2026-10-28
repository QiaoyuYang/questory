/* eslint-disable @next/next/no-img-element */
"use client";

import type { TurnView } from "@/lib/types";
import { HeroFrame } from "./HeroFrame";
import type { Zoomed } from "./PhotoViewer";
import { StoryCard } from "./StoryCard";

type Props = {
  turn: TurnView;
  onRepaint: () => void;
  onZoom: (image: Zoomed) => void;
};

/** The big picture: the newest photo, or the evidence it turned up once that's drawn. */
export function Scene({ turn, onRepaint, onZoom }: Props) {
  if (turn.card) return <StoryCard turn={turn} onRepaint={onRepaint} onZoom={onZoom} />;
  if (!turn.photoUrl) return null;
  return (
    <HeroFrame
      size={turn.photoSize}
      label="Open your photo full screen"
      onClick={() => onZoom({ src: turn.photoUrl!, alt: "Your photo", size: turn.photoSize, overlay: null })}
    >
      <img src={turn.photoUrl} alt="Your photo" className="fade-in block h-full w-full object-cover" />
    </HeroFrame>
  );
}
