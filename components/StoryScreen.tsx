"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import { markSeen } from "@/lib/client/seen";
import { inviteLink, shareLink } from "@/lib/client/share";
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

type Panel = "story" | "end" | "delete" | null;

/** What the screen shows while it waits: the photo being worked on, and what's happening. */
type Hold = { message: string; src: string | null; size: { width: number; height: number } | null };

/** How often a shared case checks on the other player while they have it. */
const WATCH_MS = 20_000;
/** How often the screen checks on evidence being drawn somewhere else. */
const DRAWING_MS = 5_000;
/** Evidence that still has no picture after this long gets drawn again. */
const STALE_MS = 3 * 60_000;

const ANALYZING = "Analyzing the evidence…";

/** A photo that turned up evidence whose picture isn't drawn yet. */
function awaitsPicture(turn: TurnView): boolean {
  return turn.card !== null && turn.photoUrl !== null && (turn.cardStatus === "none" || turn.cardStatus === "pending");
}

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function StoryScreen({ storyId, initial, onHome }: Props) {
  const [data, setData] = useState<Loaded | null>(initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Hold | null>(null);
  const [error, setError] = useState<{ message: string; retry: (() => void) | null } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
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

  // Ask Muse Image to draw the evidence. Settles with the turn as it came out, failed included.
  const paint = useCallback(
    (turn: TurnView) => {
      requested.current.add(turn.id);
      return api.paintCard(storyId, turn.id).then(
        (result) => result.turn,
        (): TurnView => ({ ...turn, cardStatus: "failed" }),
      );
    },
    [storyId],
  );

  // New evidence waits for its picture, so the story and the picture show up together.
  // run() waits for the viewer's own photos. This covers a picture still being drawn
  // after a reload or on the other player's phone: whoever took the photo draws it, and
  // anyone else checks back until it's done.
  const drawing = latest && awaitsPicture(latest) ? latest : null;
  useEffect(() => {
    if (!drawing || requested.current.has(drawing.id)) return;
    const stale = Date.now() - Date.parse(drawing.createdAt) > STALE_MS;
    if ((drawing.playedBy === "you" && drawing.cardStatus === "none") || stale) {
      void paint(drawing).then(replaceTurn);
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") api.getStory(storyId).then(setData, () => {});
    }, DRAWING_MS);
    return () => window.clearInterval(timer);
  }, [drawing, paint, replaceTurn, storyId]);

  // Whatever this screen shows counts as seen, so the story list only flags what the
  // other player did since. Evidence still waiting for its picture isn't shown yet.
  const updatedAt = story?.updatedAt;
  const shown = drawing === null;
  useEffect(() => {
    if (updatedAt && shown) markSeen(storyId, updatedAt);
  }, [storyId, updatedAt, shown]);

  const hold: Hold | null =
    busy ?? (drawing && { message: ANALYZING, src: drawing.photoUrl, size: drawing.photoSize });

  // In a shared case, keep up with the other player while the viewer isn't walking.
  const watching =
    story !== null && story.mode === "team" && story.status === "active" && !hold && (!story.walkActive || story.partnerWalking);
  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") api.getStory(storyId).then(setData, () => {});
    }, WATCH_MS);
    return () => window.clearInterval(timer);
  }, [watching, storyId]);

  const repaint = (turn: TurnView) => {
    replaceTurn({ ...turn, cardStatus: "pending" });
    void paint(turn).then(replaceTurn);
  };

  async function run(message: string, photo: PhotoUpload | null, task: () => Promise<TurnResult>) {
    setError(null);
    setNotice(null);
    setPanel(null);
    setBusy({ message, src: photo?.photo ?? null, size: photo && { width: photo.width, height: photo.height } });
    try {
      const result = await task();
      const turn = awaitsPicture(result.turn) ? await paint(result.turn) : result.turn;
      setData((current) => ({
        story: result.story,
        turns: [...(current?.turns ?? []), turn],
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
    run(ANALYZING, photo, () => api.takeTurn(storyId, "photo", photo));
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
    try {
      const result = await shareLink({
        title: story.title,
        text: `Help me solve this case on Questory: ${story.logline}`,
        url: inviteLink(story.id, story.inviteCode),
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
  // In a two-player case the next chapter belongs to whoever didn't play the last one.
  const theirTurn = between && story.upNext === "partner";
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
          {walkLive && !hold && (
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
        {hold ? (
          <Working src={hold.src} size={hold.size} message={hold.message} />
        ) : (
          <>
            {scene && <Scene turn={scene} onRepaint={() => repaint(scene)} onZoom={setZoomed} />}
            {latest && (
              <section aria-label={GAME_MASTER} className="fade-in mt-5">
                {latest.card ? (
                  <p className="font-sign text-lg font-bold text-walk">
                    {latest.playedBy === "partner" ? "Your partner found new evidence" : "New evidence"}
                  </p>
                ) : (
                  // The narration speaks to whoever played the turn, so say whose it was.
                  latest.playedBy === "partner" && (
                    <p className="font-sign text-lg font-bold text-concrete">On your partner&apos;s walk</p>
                  )
                )}
                <p className="font-story text-[1.1875rem] leading-[1.6] text-pretty">{latest.narration}</p>
              </section>
            )}
          </>
        )}
      </div>

      {!hold && (
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
                {theirTurn
                  ? `Chapter ${story.chapter + 1} is your friend's, on their own streets.`
                  : story.shared
                    ? `Chapter ${story.chapter + 1} is yours, on your own streets.`
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
              (theirTurn ? (
                story.invitable && (
                  <button type="button" onClick={() => void invite()} className={`${BUTTON.primary} flex-1`}>
                    Send your friend the link
                  </button>
                )
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
          {between && theirTurn && (
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
