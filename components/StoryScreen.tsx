"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import { markSeen } from "@/lib/client/seen";
import { shareLink } from "@/lib/client/share";
import { currentChapter, walkStats } from "@/lib/walk";
import { GAME_MASTER, type PhotoUpload, type StoryView, type TurnView } from "@/lib/types";
import { Alert } from "./Alert";
import { BottomBar } from "./BottomBar";
import { BUTTON } from "./buttons";
import { CaptureButton } from "./CaptureButton";
import { CameraIcon, ChevronLeftIcon, MagnifierIcon } from "./icons";
import { PhotoViewer, type Zoomed } from "./PhotoViewer";
import { QuestThumb } from "./QuestThumb";
import { Scene } from "./Scene";
import { Sheet } from "./Sheet";
import { StorySheet } from "./StorySheet";
import { WalkSummary } from "./WalkSummary";
import { Working } from "./Working";

type Loaded = { story: StoryView; turns: TurnView[] };

type Props = {
  storyId: string;
  initial: Loaded | null;
  onHome: () => void;
};

type Panel = "story" | "end" | "delete" | "invite" | null;

/** How often a shared case checks on the other player while they have it. */
const WATCH_MS = 20_000;

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function StoryScreen({ storyId, initial, onHome }: Props) {
  const [data, setData] = useState<Loaded | null>(initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ message: string; photo: PhotoUpload | null } | null>(null);
  const [error, setError] = useState<{ message: string; retry: (() => void) | null } | null>(null);
  // A two-player case asks for the friend's link as soon as its opening is in.
  const [panel, setPanel] = useState<Panel>(() =>
    initial?.story.invitable && initial.turns.length === 1 ? "invite" : null,
  );
  const [zoomed, setZoomed] = useState<Zoomed | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const requested = useRef(new Set<string>());

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    api
      .getStory(storyId)
      .then((loaded) => !cancelled && setData(loaded))
      .catch((err: Error) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [storyId, initial]);

  const story = data?.story ?? null;
  const turns = useMemo(() => data?.turns ?? [], [data]);

  // Whatever this screen shows counts as seen, so the story list only flags what the
  // other player did since.
  const updatedAt = story?.updatedAt;
  useEffect(() => {
    if (updatedAt) markSeen(storyId, updatedAt);
  }, [storyId, updatedAt]);

  // In a shared case, keep up with the other player while the viewer isn't walking.
  const watching =
    story !== null && story.mode === "team" && story.status === "active" && !busy && (!story.walkActive || story.partnerWalking);
  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") api.getStory(storyId).then(setData, () => {});
    }, WATCH_MS);
    return () => window.clearInterval(timer);
  }, [watching, storyId]);

  // The turn that issued the current quest: a closer look is outlined on its photo.
  const questTurn = useMemo(() => {
    const questId = story?.quest?.id;
    return questId ? (turns.find((turn) => turn.quest?.id === questId && turn.photoUrl) ?? null) : null;
  }, [story, turns]);
  const latest = turns.at(-1) ?? null;
  // The newest turn with a photo. Ending a walk adds a turn without one.
  const scene = useMemo(() => turns.findLast((turn) => turn.photoUrl !== null) ?? null, [turns]);

  const replaceTurn = useCallback((turn: TurnView) => {
    setData((current) =>
      current ? { ...current, turns: current.turns.map((t) => (t.id === turn.id ? turn : t)) } : current,
    );
  }, []);

  // Ask Muse Image to draw the evidence. State only changes when the request settles.
  const requestCard = useCallback(
    (turn: TurnView) => {
      requested.current.add(turn.id);
      api.paintCard(storyId, turn.id).then(
        (result) => replaceTurn(result.turn),
        () => replaceTurn({ ...turn, cardStatus: "failed" }),
      );
    },
    [storyId, replaceTurn],
  );

  // A photo that moved the story gets its evidence drawn automatically ("none" shows as in progress).
  const cardTurn = latest?.card && latest.photoUrl ? latest : null;
  useEffect(() => {
    if (!cardTurn || requested.current.has(cardTurn.id)) return;
    const stale =
      cardTurn.cardStatus === "pending" && Date.now() - Date.parse(cardTurn.createdAt) > 3 * 60_000;
    if (cardTurn.cardStatus === "none" || stale) requestCard(cardTurn);
  }, [cardTurn, requestCard]);

  const repaint = (turn: TurnView) => {
    replaceTurn({ ...turn, cardStatus: "pending" });
    requestCard(turn);
  };

  async function run(message: string, photo: PhotoUpload | null, task: () => Promise<TurnResult>) {
    setError(null);
    setNotice(null);
    setPanel(null);
    setBusy({ message, photo });
    try {
      const result = await task();
      setData((current) => ({
        story: result.story,
        turns: [...(current?.turns ?? []), result.turn],
      }));
      scrollToTop();
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "That didn't work. Try again.",
        retry: () => run(message, photo, task),
      });
    } finally {
      setBusy(null);
    }
  }

  const photoError = (message: string) => setError({ message, retry: null });
  const takePhoto = (photo: PhotoUpload) =>
    run(`${GAME_MASTER} is taking a look…`, photo, () => api.takeTurn(storyId, "photo", photo));
  const resume = (photo: PhotoUpload) =>
    run(`${GAME_MASTER} is starting the next chapter…`, photo, () => api.takeTurn(storyId, "resume", photo));
  const end = () => run(`${GAME_MASTER} is closing the chapter…`, null, () => api.endWalk(storyId));

  function reload() {
    setError(null);
    api.getStory(storyId).then(setData, (err: Error) => setError({ message: err.message, retry: null }));
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.deleteStory(storyId);
      onHome();
    } catch (err) {
      setDeleting(false);
      setPanel(null);
      setError({ message: err instanceof Error ? err.message : "The story couldn't be deleted. Try again.", retry: null });
    }
  }

  // The share sheet only opens straight after a tap, so the link is built right here
  // from the code the story was made with.
  async function invite() {
    if (!story?.inviteCode) return;
    setError(null);
    const link = new URL("/", window.location.origin);
    link.searchParams.set("join", `${story.id}.${story.inviteCode}`);
    try {
      const result = await shareLink({
        title: story.title,
        text: `Help me solve this case on Questory: ${story.logline}`,
        url: link.toString(),
      });
      if (result === "cancelled") return;
      setPanel(null);
      if (result === "copied") setNotice("Invite link copied. Send it to your friend.");
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "The invite link didn't work. Try again.", retry: null });
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <p role="alert">{loadError}</p>
        <button type="button" onClick={onHome} className="mt-4 font-semibold underline underline-offset-4">
          Back to your stories
        </button>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-[max(4rem,env(safe-area-inset-top))]" aria-busy="true">
        <div className="lane-line lane-line-moving" />
        <p className="mt-3 text-concrete">Opening your story…</p>
      </main>
    );
  }

  const walkLive = story.walkActive && story.status === "active" && !story.partnerWalking;
  const between = !story.walkActive && story.status === "active";
  const quest = walkLive ? story.quest : null;
  // A closer look shows where to look on the photo it came from.
  const lookTurn = quest?.targetMode === "in_view" ? questTurn : null;
  const chapter = currentChapter(turns);
  const evidenceFound = turns.filter((turn) => turn.card).length;

  return (
    <main className="mx-auto w-full max-w-[30rem] px-4 pb-56">
      <header className="sticky top-0 z-10 -mx-4 bg-asphalt/85 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="grid min-h-13 grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center">
          <button
            type="button"
            onClick={onHome}
            className="inline-flex min-h-11 items-center justify-self-start rounded-md pr-2 text-concrete hover:text-paint"
          >
            <ChevronLeftIcon />
            Stories
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate font-sign text-lg leading-tight font-bold">{story.title}</h1>
            <p className="text-xs text-concrete">
              {story.status === "complete" ? "Solved" : `Chapter ${story.chapter}`}
            </p>
          </div>
          {walkLive && !busy && (
            <button
              type="button"
              onClick={() => setPanel("end")}
              className="min-h-11 justify-self-end rounded-md px-2 text-concrete hover:text-paint"
            >
              End walk
            </button>
          )}
        </div>
      </header>

      <div className="mt-2">
        {busy ? (
          <Working photo={busy.photo} message={busy.message} />
        ) : (
          <>
            {scene && <Scene turn={scene} onRepaint={() => repaint(scene)} onZoom={setZoomed} />}
            {latest && (
              <section aria-label={GAME_MASTER} className="mt-5">
                {latest.card && (
                  <p className="font-sign text-lg font-bold text-walk">
                    {latest.playedBy === "partner" ? "Your partner found new evidence" : "New evidence"}
                  </p>
                )}
                <p className="font-story text-[1.1875rem] leading-[1.6] text-pretty">{latest.narration}</p>
              </section>
            )}
          </>
        )}
      </div>

      {!busy && (
        <BottomBar>
          {error && <Alert message={error.message} retry={error.retry} />}

          {/* The next step is spelled out here, with where to look for a closer look. A new one pulses. */}
          {walkLive &&
            (quest ? (
              <div
                key={quest.id}
                className="callout flex w-full items-center gap-3 rounded-[14px] border border-lane/50 bg-kerb px-3.5 py-2.5"
              >
                {lookTurn && <QuestThumb turn={lookTurn} onZoom={setZoomed} />}
                <div className="min-w-0 flex-1">
                  <p className="flex min-h-6 items-center gap-2 text-sm">
                    <span className="shrink-0 text-xs font-bold tracking-wider text-lane uppercase">Next step</span>
                    <span className="min-w-0 truncate font-semibold text-concrete">{quest.title}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-3 font-sign text-lg leading-snug font-semibold text-pretty">
                    {quest.objective}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-1 text-pretty">
                Take a photo of whatever catches your eye. {GAME_MASTER} will work it into the story.
              </p>
            ))}
          {story.partnerWalking && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">Your partner is playing chapter {story.chapter}</p>
              <p className="text-sm text-concrete">Their evidence shows up here as they find it.</p>
            </div>
          )}
          {between && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">Chapter {story.chapter} is done</p>
              <WalkSummary stats={walkStats(chapter)} who={chapter[0]?.playedBy} />
              <p className="text-sm text-concrete">
                {story.invitable
                  ? `Chapter ${story.chapter + 1} is your friend's, on their own streets.`
                  : `You can start chapter ${story.chapter + 1} now or on your next walk.`}
              </p>
            </div>
          )}
          {story.status === "complete" && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">The end</p>
              {story.shared ? (
                <>
                  <WalkSummary stats={walkStats(turns, "you")} />
                  <WalkSummary stats={walkStats(turns, "partner")} who="partner" />
                </>
              ) : (
                <WalkSummary stats={walkStats(turns)} total />
              )}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => setPanel("story")} className={BUTTON.tool}>
              <span className="relative">
                <MagnifierIcon />
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 left-4 rounded-full bg-lane px-1.5 text-[0.6875rem] leading-4 font-bold whitespace-nowrap text-asphalt"
                >
                  {evidenceFound}/{story.evidenceTotal}
                </span>
              </span>
              Evidence
              <span className="sr-only">
                , {evidenceFound} of {story.evidenceTotal} found
              </span>
            </button>
            {walkLive && (
              <CaptureButton onPhoto={takePhoto} onError={photoError} className="flex-1">
                <CameraIcon />
                Take a photo
              </CaptureButton>
            )}
            {between &&
              (story.invitable ? (
                <button type="button" onClick={() => void invite()} className={`${BUTTON.primary} flex-1`}>
                  Send your friend the link
                </button>
              ) : (
                <CaptureButton onPhoto={resume} onError={photoError} className="flex-1">
                  <CameraIcon />
                  Start chapter {story.chapter + 1}
                </CaptureButton>
              ))}
            {story.partnerWalking && (
              <button type="button" onClick={reload} className={`${BUTTON.secondary} flex-1`}>
                Refresh
              </button>
            )}
            {story.status === "complete" && (
              <button type="button" onClick={onHome} className={`${BUTTON.primary} flex-1`}>
                Back to your stories
              </button>
            )}
          </div>
          {between && story.invitable && (
            <CaptureButton onPhoto={resume} onError={photoError} variant="link" className="mt-1">
              Or play chapter {story.chapter + 1} yourself
            </CaptureButton>
          )}
          {notice && (
            <p role="status" className="mt-2 text-sm text-walk">
              {notice}
            </p>
          )}
        </BottomBar>
      )}

      <StorySheet
        open={panel === "story"}
        onClose={() => setPanel(null)}
        story={story}
        turns={turns}
        onZoom={setZoomed}
        onInvite={story.invitable ? () => void invite() : null}
        onDelete={story.role === "owner" ? () => setPanel("delete") : null}
      />
      <Sheet open={panel === "invite"} onClose={() => setPanel(null)} title="Invite your friend">
        <p className="text-lg text-pretty">
          You play chapter 1 here. Then your friend plays chapter 2 on their own streets, and you solve it together.
        </p>
        <button type="button" onClick={() => void invite()} className={`${BUTTON.primary} mt-6 w-full`}>
          Send the link
        </button>
        <p className="mt-3 text-sm text-concrete">Not now? It&apos;s in the Evidence sheet whenever you&apos;re ready.</p>
      </Sheet>
      <Sheet open={panel === "end"} onClose={() => setPanel(null)} title="End this walk?" done={false}>
        <p className="text-lg text-pretty">
          {GAME_MASTER} will end chapter {story.chapter} now, on a cliffhanger, even if you&apos;re partway through it.
          Start chapter {story.chapter + 1} whenever you&apos;re ready, from wherever you are.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              setPanel(null);
              void end();
            }}
            className={BUTTON.primary}
          >
            End walk
          </button>
          <button type="button" onClick={() => setPanel(null)} className={BUTTON.secondary}>
            Keep walking
          </button>
        </div>
      </Sheet>
      <Sheet open={panel === "delete"} onClose={() => setPanel(null)} title="Delete this story?" done={false}>
        <p className="text-lg text-pretty">Its photos and evidence are deleted too. You can&apos;t undo this.</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button type="button" onClick={() => void remove()} disabled={deleting} className={BUTTON.danger}>
            {deleting ? "Deleting…" : "Delete story"}
          </button>
          <button type="button" onClick={() => setPanel(null)} className={BUTTON.secondary}>
            Keep it
          </button>
        </div>
      </Sheet>
      <PhotoViewer image={zoomed} onClose={() => setZoomed(null)} />
    </main>
  );
}
