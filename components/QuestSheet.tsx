"use client";

import { useState } from "react";
import { GAME_MASTER, type PhotoUpload, type QuestView } from "@/lib/types";
import { CaptureButton } from "./CaptureButton";
import { CameraIcon } from "./icons";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  quest: QuestView | null;
  onPhoto: (photo: PhotoUpload) => void;
  onError: (message: string) => void;
};

/** The game master's lead for the next photo, with the camera right under it. */
export function QuestSheet({ open, onClose, quest, onPhoto, onError }: Props) {
  const [hint, setHint] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title="Next step">
      {quest ? (
        <>
          <h3 className="font-sign text-[1.75rem] leading-tight font-bold text-lane">{quest.title}</h3>
          <p className="mt-2 text-lg text-pretty">{quest.objective}</p>
          <p className="mt-3 text-concrete">
            {quest.targetMode === "in_view" ? "In your photo: " : "Somewhere nearby: "}
            {quest.targetDescription}
          </p>
          {quest.hint &&
            (hint ? (
              <p className="mt-4 font-story text-lg text-pretty italic">{quest.hint}</p>
            ) : (
              <button
                type="button"
                onClick={() => setHint(true)}
                className="mt-3 min-h-11 font-semibold text-paint underline underline-offset-4"
              >
                Need a hint?
              </button>
            ))}
        </>
      ) : (
        <p className="text-lg text-pretty">
          Snap whatever catches your eye. {GAME_MASTER} will work it into the story.
        </p>
      )}
      <CaptureButton onPhoto={onPhoto} onError={onError} className="mt-6 w-full">
        <CameraIcon />
        Take a photo
      </CaptureButton>
    </Sheet>
  );
}
