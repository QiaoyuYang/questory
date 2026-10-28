"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { peekNextInvite } from "@/lib/client/share";
import type { InviteView } from "@/lib/types";
import { Alert } from "./Alert";
import { BottomBar } from "./BottomBar";
import { BUTTON } from "./buttons";
import { Wordmark } from "./Wordmark";

type Props = {
  storyId: string;
  code: string;
  onJoined: () => void;
  /** The link's owner, or a partner who already joined: open the story itself. */
  onOpen: (role: "owner" | "partner") => void;
  onHome: () => void;
};

/**
 * Where an invite link lands: the case a friend is asking for help with. Joining takes
 * the second seat and the case's other lead, to walk alongside the friend on their own
 * streets and follow what they find.
 */
export function JoinScreen({ storyId, code, onJoined, onOpen, onHome }: Props) {
  const [invite, setInvite] = useState<InviteView | null>(null);
  // The link went out before its case began: there's nothing to join yet.
  const [notStarted, setNotStarted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A story this browser already plays opens straight away.
  const show = useCallback(
    (result: { invite: InviteView | null }) => {
      setNotStarted(result.invite === null);
      if (!result.invite || result.invite.role === "guest") setInvite(result.invite);
      else onOpen(result.invite.role);
    },
    [onOpen],
  );

  useEffect(() => {
    let cancelled = false;
    api.inviteInfo(storyId, code).then(
      (result) => !cancelled && show(result),
      (err: Error) => !cancelled && setLoadError(err.message),
    );
    return () => {
      cancelled = true;
    };
  }, [storyId, code, show]);

  // Until the case begins, check back so this page opens up by itself.
  const waiting = notStarted;
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      api.inviteInfo(storyId, code).then(show, () => {});
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [waiting, storyId, code, show]);

  async function join() {
    setError(null);
    setJoining(true);
    try {
      await api.joinStory(storyId, code);
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setJoining(false);
    }
  }

  const ownLink = notStarted && peekNextInvite()?.storyId === storyId;
  const open = invite !== null && invite.status === "active" && !invite.full;

  return (
    <main className="mx-auto w-full max-w-[30rem] px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-44">
      <Wordmark />

      {loadError ? (
        <section className="mt-8">
          <p className="text-lg text-pretty" role="alert">
            {loadError}
          </p>
          <button type="button" onClick={onHome} className={`${BUTTON.secondary} mt-6 w-full`}>
            Go to your stories
          </button>
        </section>
      ) : notStarted ? (
        <section className="mt-8">
          {ownLink ? (
            <>
              <p className="font-sign text-lg font-bold text-lane">This is the link you sent</p>
              <p className="mt-2 text-lg text-pretty">
                The case begins with your first photo. Then this link opens it for your friend.
              </p>
              <button type="button" onClick={onHome} className={`${BUTTON.primary} mt-6 w-full`}>
                Start the case
              </button>
            </>
          ) : (
            <>
              <p className="font-sign text-lg font-bold text-lane">A friend needs your help</p>
              <h1 className="mt-1 font-sign text-[1.75rem] leading-tight font-bold">A case is about to begin</h1>
              <p className="mt-5 text-pretty">
                Your friend starts it with a photo on their walk. Leave this page open: the case shows up here when they
                do. Then you take the other lead, on your own walk.
              </p>
            </>
          )}
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
                : `Your friend follows one lead, and the other is yours, on your own walk, now or whenever suits you. ${
                    invite.questsCompleted > 0
                      ? `They've found ${invite.questsCompleted} ${invite.questsCompleted === 1 ? "piece" : "pieces"} of evidence so far.`
                      : "They've just started."
                  }`}
          </p>

          {!open && (
            <button type="button" onClick={onHome} className={`${BUTTON.secondary} mt-6 w-full`}>
              Start your own story
            </button>
          )}
        </section>
      )}

      {open && (
        <BottomBar>
          {error && <Alert message={error} retry={() => void join()} />}
          <button type="button" onClick={() => void join()} disabled={joining} className={`${BUTTON.primary} w-full`}>
            {joining ? "Joining…" : "Join the case"}
          </button>
        </BottomBar>
      )}
    </main>
  );
}
