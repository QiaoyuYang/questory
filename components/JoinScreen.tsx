"use client";

import { useEffect, useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import { GAME_MASTER, type InviteView, type PhotoUpload } from "@/lib/types";
import { Alert } from "./Alert";
import { BottomBar } from "./BottomBar";
import { BUTTON } from "./buttons";
import { CaptureButton } from "./CaptureButton";
import { CameraIcon } from "./icons";
import { Wordmark } from "./Wordmark";
import { Working } from "./Working";

type Props = {
  storyId: string;
  code: string;
  onJoined: (result: TurnResult) => void;
  /** The link's owner, or a partner who already joined: open the story itself. */
  onOpen: (role: "owner" | "partner") => void;
  onHome: () => void;
};

/** Where an invite link lands: the case a friend is asking for help with, and a camera to join it. */
export function JoinScreen({ storyId, code, onJoined, onOpen, onHome }: Props) {
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PhotoUpload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<PhotoUpload | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.inviteInfo(storyId, code).then(
      (result) => {
        if (cancelled) return;
        if (result.invite.role === "guest") setInvite(result.invite);
        else onOpen(result.invite.role);
      },
      (err: Error) => !cancelled && setLoadError(err.message),
    );
    return () => {
      cancelled = true;
    };
  }, [storyId, code, onOpen]);

  async function join(photo: PhotoUpload) {
    setError(null);
    setLastPhoto(photo);
    setPending(photo);
    try {
      onJoined(await api.joinStory(storyId, code, photo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setPending(null);
    }
  }

  const next = invite ? invite.chapter + 1 : 0;
  const open = invite !== null && invite.status === "active" && !invite.full && !invite.walkActive;

  return (
    <main className="mx-auto w-full max-w-[30rem] px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-44">
      <Wordmark />

      {pending ? (
        <div className="mt-8">
          <Working photo={pending} message={`${GAME_MASTER} is bringing you into the case…`} />
        </div>
      ) : loadError ? (
        <section className="mt-8">
          <p className="text-lg text-pretty" role="alert">
            {loadError}
          </p>
          <button type="button" onClick={onHome} className={`${BUTTON.secondary} mt-6 w-full`}>
            Go to your stories
          </button>
        </section>
      ) : !invite ? (
        <div className="mt-8" aria-busy="true">
          <div className="lane-line lane-line-moving" />
        </div>
      ) : (
        <section className="mt-8">
          <p className="font-sign text-lg font-bold text-lane">A friend needs your help</p>
          <h1 className="mt-1 font-sign text-[1.75rem] leading-tight font-bold">{invite.title}</h1>
          <p className="mt-2 font-story text-xl leading-snug italic text-pretty">{invite.logline}</p>
          <p className="mt-5 text-pretty">
            {invite.status === "complete"
              ? "This case is already solved."
              : invite.full
                ? "This case already has both its players."
                : invite.walkActive
                  ? `Your friend is on chapter ${invite.chapter} right now, with ${invite.questsCompleted} of ${invite.evidenceTotal} pieces of evidence found. When their walk ends, open this link again to play chapter ${next}.`
                  : `Your friend found ${invite.questsCompleted} of ${invite.evidenceTotal} pieces of evidence. Play chapter ${next} on your own streets to find more.`}
          </p>
          {open && (
            <p className="mt-3 text-sm text-concrete text-pretty">
              You&apos;ll both see the story&apos;s photos and evidence cards. The app never shares your location, but a
              photo can show where you are.
            </p>
          )}
          {!open && (
            <button type="button" onClick={onHome} className={`${BUTTON.secondary} mt-6 w-full`}>
              Start your own story
            </button>
          )}
        </section>
      )}

      {!pending && open && (
        <BottomBar>
          {error && <Alert message={error} retry={lastPhoto ? () => join(lastPhoto) : null} />}
          <CaptureButton onPhoto={join} onError={setError} className="w-full">
            <CameraIcon />
            Take a photo to join
          </CaptureButton>
        </BottomBar>
      )}
    </main>
  );
}
