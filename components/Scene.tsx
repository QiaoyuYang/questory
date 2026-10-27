/* eslint-disable @next/next/no-img-element */
"use client";

import type { QuestView, TurnView } from "@/lib/types";
import { HeroFrame } from "./HeroFrame";
import type { Zoomed } from "./PhotoViewer";
import { QuestPhoto } from "./QuestPhoto";
import { Segmented } from "./Segmented";
import { StoryCard } from "./StoryCard";

export type SceneView = "card" | "photo" | "look";

const LABEL: Record<SceneView, string> = {
  card: "Your card",
  photo: "Your photo",
  look: "Where to look",
};

/**
 * What the big picture can show: the newest photo (or the card it earned), and for a
 * closer-look quest, the photo with its target outlined. When those are the same plain
 * photo, the outlined one is enough.
 */
export function sceneViews(turn: TurnView, lookTurn: TurnView | null): SceneView[] {
  const views: SceneView[] = [];
  if (turn.card) views.push("card");
  else if (lookTurn?.id !== turn.id) views.push("photo");
  if (lookTurn) views.push("look");
  return views;
}

type Props = {
  turn: TurnView;
  lookTurn: TurnView | null;
  quest: QuestView | null;
  views: SceneView[];
  view: SceneView;
  onView: (view: SceneView) => void;
  onRepaint: () => void;
  onZoom: (image: Zoomed) => void;
};

export function Scene({ turn, lookTurn, quest, views, view, onView, onRepaint, onZoom }: Props) {
  return (
    <div>
      {view === "card" && <StoryCard turn={turn} onRepaint={onRepaint} onZoom={onZoom} />}
      {view === "photo" && turn.photoUrl && (
        <HeroFrame
          size={turn.photoSize}
          label="Open your photo full screen"
          onClick={() => onZoom({ src: turn.photoUrl!, alt: "Your photo", size: turn.photoSize, overlay: null })}
        >
          <img src={turn.photoUrl} alt="Your photo" className="fade-in block h-full w-full object-cover" />
        </HeroFrame>
      )}
      {view === "look" && lookTurn && <QuestPhoto turn={lookTurn} questTitle={quest?.title ?? ""} onZoom={onZoom} />}
      {views.length > 1 && (
        <Segmented
          className="mt-3"
          label="What the picture shows"
          options={views.map((id) => ({ id, label: LABEL[id] }))}
          value={view}
          onChange={onView}
        />
      )}
    </div>
  );
}
