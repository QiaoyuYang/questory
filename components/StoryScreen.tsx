"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, isDailyLimit, type TurnResult } from "@/lib/client/api";
import { markSeen } from "@/lib/client/seen";
import { inviteLink, shareLink } from "@/lib/client/share";
import { chapterTurns, walkStats } from "@/lib/walk";
import { GAME_MASTER, type PhotoUpload, type StoryView, type TurnView } from "@/lib/types";
import { Alert } from "./Alert";
import { BottomBar } from "./BottomBar";
import { BUTTON } from "./buttons";
import { CaptureButton, usePhotoVerb } from "./CaptureButton";
import { CameraIcon, ChevronLeftIcon, MagnifierIcon } from "./icons";
import { PhotoViewer, type Zoomed } from "./PhotoViewer";
import { QuestThumb } from "./QuestThumb";
import { Scene } from "./Scene";
import { Sheet } from "./Sheet";
import { Solution } from "./Solution";
import { StorySheet } from "./StorySheet";
import { WalkSummary } from "./WalkSummary";
import { Working } from "./Working";

type Loaded = { story: StoryView; turns: TurnView[] };

type Props = {
  storyId: string;
  initial: Loaded | null;
  onHome: () => void;
};

type Panel = "story" | "end" | null;

/** What the screen shows while it waits: the photo being worked on, and what's happening. */
type Hold = { message: string; src: string | null; size: { width: number; height: number } | null };

/** How often a shared case checks on the other player. */
const WATCH_MS = 15_000;
/** How often the screen checks on evidence being drawn somewhere else. */
const DRAWING_MS = 5_000;
/** Evidence that still has no picture after this long gets drawn again. */
const STALE_MS = 3 * 60_000;
/** How long the screen leaves a chapter's ending to the player who finished it before asking for it itself. */
const CLOSE_GRACE_MS = 30_000;

const ANALYZING = "Analyzing the evidence…";
const PUTTING_TOGETHER = `${GAME_MASTER} is putting it together…`;

/** A photo that turned up evidence whose picture isn't drawn yet. */
function awaitsPicture(turn: TurnView): boolean {
  return turn.card !== null && turn.photoUrl !== null && (turn.cardStatus === "none" || turn.cardStatus === "pending");
}

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

/** Add a turn the screen doesn't have yet. */
function withTurn(turns: TurnView[], turn: TurnView): TurnView[] {
  return turns.some((t) => t.id === turn.id) ? turns.map((t) => (t.id === turn.id ? turn : t)) : [...turns, turn];
}

/**
 * A phone can lose the reply to a long request, say while its screen is locked, and the
 * server draws the picture anyway. So when asking for one fails, ask the server how it came
 * out, and keep waiting while it's still being drawn.
 */
async function howItCameOut(storyId: string, turn: TurnView): Promise<TurnView> {
  const check = () =>
    api.getStory(storyId).then(
      (loaded) => loaded.turns.find((t) => t.id === turn.id),
      () => undefined,
    );
  const giveUpAt = Date.parse(turn.createdAt) + STALE_MS;
  let saved = await check();
  while (saved?.cardStatus === "pending" && Date.now() < giveUpAt) {
    await new Promise((resolve) => window.setTimeout(resolve, DRAWING_MS));
    saved = await check();
  }
  return saved?.cardStatus === "ready" ? saved : { ...turn, cardStatus: "failed" };
}

export function StoryScreen({ storyId, initial, onHome }: Props) {
  const [data, setData] = useState<Loaded | null>(initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Hold | null>(null);
  const [error, setError] = useState<{ message: string; retry: (() => void) | null } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [zoomed, setZoomed] = useState<Zoomed | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requested = useRef(new Set<string>());
  const verb = usePhotoVerb();

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
  // The partner's new evidence shows up once its picture is drawn on their phone.
  const shown = useMemo(() => turns.filter((turn) => turn.playedBy === "you" || !awaitsPicture(turn)), [turns]);
  const partnerDrawing = turns.find((turn) => turn.playedBy === "partner" && awaitsPicture(turn)) ?? null;

  // The turn that issued the current quest: a closer look is outlined on its photo.
  const questTurn = useMemo(() => {
    const questId = story?.quest?.id;
    return questId ? (turns.find((turn) => turn.quest?.id === questId && turn.photoUrl) ?? null) : null;
  }, [story, turns]);
  const latest = shown.at(-1) ?? null;
  // The newest turn with a photo. A chapter's ending has none.
  const scene = useMemo(() => shown.findLast((turn) => turn.photoUrl !== null) ?? null, [shown]);

  const replaceTurn = useCallback((turn: TurnView) => {
    setData((current) => (current ? { ...current, turns: withTurn(current.turns, turn) } : current));
  }, []);

  // Ask Muse Image to draw the evidence. Settles with the turn as it came out, failed included.
  const paint = useCallback(
    (turn: TurnView) => {
      requested.current.add(turn.id);
      return api.paintCard(storyId, turn.id).then(
        (result) => result.turn,
        () => howItCameOut(storyId, turn),
      );
    },
    [storyId],
  );

  const reload = useCallback(() => api.getStory(storyId).then(setData, () => {}), [storyId]);

  // New evidence waits for its picture, so the story and the picture show up together.
  // run() waits for the viewer's own photos; this covers a picture still being drawn after
  // a reload. A partner's picture is drawn on their phone, and drawn here only if it's stuck.
  const drawing = latest && latest.playedBy === "you" && awaitsPicture(latest) ? latest : null;
  const waitingOn = drawing ?? partnerDrawing;
  useEffect(() => {
    if (!waitingOn || requested.current.has(waitingOn.id)) return;
    const stale = Date.now() - Date.parse(waitingOn.createdAt) > STALE_MS;
    if ((waitingOn.playedBy === "you" && waitingOn.cardStatus === "none") || stale) {
      void paint(waitingOn).then(replaceTurn);
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, DRAWING_MS);
    return () => window.clearInterval(timer);
  }, [waitingOn, paint, replaceTurn, reload]);

  // Whatever this screen shows counts as seen, so the story list only flags what the
  // other player did since. Evidence still waiting for its picture isn't shown yet.
  const updatedAt = story?.updatedAt;
  const settled = drawing === null && partnerDrawing === null;
  useEffect(() => {
    if (updatedAt && settled) markSeen(storyId, updatedAt);
  }, [storyId, updatedAt, settled]);

  // Ask for the chapter's ending: straight away after the viewer's own last step (see
  // run), or here if the player who finished it hasn't got it told yet.
  const close = useCallback(async () => {
    const result = await api.closeChapter(storyId);
    setData((current) => ({ story: result.story, turns: withTurn(current?.turns ?? [], result.turn) }));
    // With the partner's last finds too, for the chapter's summary.
    await reload();
  }, [storyId, reload]);
  // run() asks for it itself after the viewer's own last step, so this waits for that.
  const closing = story?.stage === "closing" && busy === null;
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => void close().catch(() => reload()), CLOSE_GRACE_MS);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, DRAWING_MS);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
    };
  }, [closing, close, reload]);

  const hold: Hold | null =
    busy ??
    (drawing && { message: ANALYZING, src: drawing.photoUrl, size: drawing.photoSize }) ??
    (closing ? { message: PUTTING_TOGETHER, src: scene?.cardUrl ?? scene?.photoUrl ?? null, size: scene?.photoSize ?? null } : null);

  // In a shared case, keep up with the other player.
  const watching = story !== null && story.mode === "team" && story.status === "active" && !hold;
  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, WATCH_MS);
    return () => window.clearInterval(timer);
  }, [watching, reload]);

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
      setData((current) => ({ story: result.story, turns: withTurn(current?.turns ?? [], turn) }));
      // The step that finished a two-player chapter has its ending told next.
      if (result.story.stage === "closing") {
        setBusy({ message: PUTTING_TOGETHER, src: turn.cardUrl ?? turn.photoUrl, size: turn.photoSize });
        await close();
      } else if (result.story.mode === "team") {
        // The partner may have found something meanwhile.
        await reload();
      }
      scrollToTop();
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "That didn't work. Try again.",
        retry: isDailyLimit(err) ? null : () => run(message, photo, task),
      });
    } finally {
      setBusy(null);
    }
  }

  const photoError = (message: string) => setError({ message, retry: null });
  const takePhoto = (photo: PhotoUpload) => run(ANALYZING, photo, () => api.takeTurn(storyId, "photo", photo));
  const resume = (photo: PhotoUpload, takeOver = false) =>
    run(`${GAME_MASTER} is picking up the case…`, photo, () => api.takeTurn(storyId, "resume", photo, { takeOver }));

  async function end() {
    setPanel(null);
    setError(null);
    try {
      const result = await api.endWalk(storyId);
      setData((current) => (current ? { ...current, story: result.story } : current));
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "That didn't work. Try again.", retry: () => void end() });
    }
  }

  function refresh() {
    setError(null);
    api.getStory(storyId).then(setData, (err: Error) => setError({ message: err.message, retry: null }));
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

  const { stage, partner } = story;
  const quest = stage === "walking" ? story.quest : null;
  // A closer look shows where to look on the photo it came from.
  const lookTurn = quest?.targetMode === "in_view" ? questTurn : null;
  const chapter = chapterTurns(turns, story.chapter);
  const team = partner !== null;
  // A partner's first walk on the case starts their lead rather than picking one back up.
  const walkedYet = turns.some((turn) => turn.playedBy === "you" && turn.photoUrl !== null && turn.kind !== "close");
  // A chapter's ending is told after the step that finished it, so show that step too.
  const lastFind = latest?.kind === "close" ? (shown.at(-2) ?? null) : null;

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
            <p className="text-xs text-concrete">{story.status === "complete" ? "Solved" : `Chapter ${story.chapter}`}</p>
          </div>
          {stage === "walking" && !hold && (
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
            {lastFind && lastFind.kind !== "close" && <Telling turn={lastFind} />}
            {latest && <Telling turn={latest} solved={story.status === "complete"} />}
            {story.status === "complete" && <Solution story={story} turns={turns} onZoom={setZoomed} />}
          </>
        )}
      </div>

      {!hold && (
        <BottomBar>
          {error && <Alert message={error.message} retry={error.retry} />}

          {/* The next step is spelled out here, with where to look for a closer look. A new one pulses. */}
          {stage === "walking" &&
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
          {stage === "ready" && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">
                {team && !walkedYet ? "Your lead is waiting" : `Chapter ${story.chapter} is waiting for you`}
              </p>
              <p className="text-sm text-concrete">
                {team && !walkedYet
                  ? "Start it with a photo of wherever you are. Your partner follows their own lead."
                  : "Pick it back up with a photo of wherever you are now."}
              </p>
            </div>
          )}
          {stage === "waiting" && partner && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">Your part of chapter {story.chapter} is done</p>
              <p className="text-sm text-concrete text-pretty">
                {!partner.joined
                  ? "Your friend hasn't joined yet. The next chapter opens once their part is found too."
                  : `Your partner has ${partner.left} more to find${partner.walking ? " and is out walking now" : ""}. The next chapter opens when they're done.`}
              </p>
            </div>
          )}
          {stage === "watching" && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">Your partner is out on this case</p>
              <p className="text-sm text-concrete">Their evidence shows up here as they find it.</p>
            </div>
          )}
          {stage === "between" && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">Chapter {story.chapter} is done</p>
              {partner?.joined ? (
                <>
                  <WalkSummary stats={walkStats(chapter, "you")} />
                  <WalkSummary stats={walkStats(chapter, "partner")} who="partner" />
                </>
              ) : (
                <WalkSummary stats={walkStats(chapter)} />
              )}
              <p className="text-sm text-concrete">
                {team
                  ? `Start your part of chapter ${story.chapter + 1} whenever you're ready, wherever you are.`
                  : `You can start chapter ${story.chapter + 1} now or on your next walk.`}
              </p>
            </div>
          )}
          {stage === "solved" && (
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
              <MagnifierIcon />
              Evidence
            </button>
            {stage === "walking" && (
              <CaptureButton onPhoto={takePhoto} onError={photoError} className="flex-1">
                <CameraIcon />
                {verb} a photo
              </CaptureButton>
            )}
            {(stage === "ready" || stage === "between") && (
              <CaptureButton onPhoto={(photo) => resume(photo)} onError={photoError} className="flex-1">
                <CameraIcon />
                {stage === "between"
                  ? `Start chapter ${story.chapter + 1}`
                  : team && !walkedYet
                    ? "Start your lead"
                    : `Continue chapter ${story.chapter}`}
              </CaptureButton>
            )}
            {stage === "waiting" && story.invitable && (
              <button type="button" onClick={() => void invite()} className={`${BUTTON.primary} flex-1`}>
                Send your friend the link
              </button>
            )}
            {(stage === "watching" || (stage === "waiting" && !story.invitable)) && (
              <button type="button" onClick={refresh} className={`${BUTTON.secondary} flex-1`}>
                Refresh
              </button>
            )}
            {stage === "solved" && (
              <button type="button" onClick={onHome} className={`${BUTTON.primary} flex-1`}>
                Back to your stories
              </button>
            )}
          </div>
          {story.canTakeOver && (
            <CaptureButton onPhoto={(photo) => resume(photo, true)} onError={photoError} variant="link" className="mt-1">
              Or find their part yourself
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
      />
      <Sheet open={panel === "end"} onClose={() => setPanel(null)} title="End this walk?" done={false}>
        <p className="text-lg text-pretty">
          Chapter {story.chapter} waits for you. Next time, take a photo wherever you are, and {GAME_MASTER} picks it
          back up from there.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button type="button" onClick={() => void end()} className={BUTTON.primary}>
            End walk
          </button>
          <button type="button" onClick={() => setPanel(null)} className={BUTTON.secondary}>
            Keep walking
          </button>
        </div>
      </Sheet>
      <PhotoViewer image={zoomed} onClose={() => setZoomed(null)} />
    </main>
  );
}

/**
 * What the game master said on a turn, with whose turn it was when that isn't obvious. The
 * last telling of a solved case says so, whether it's a chapter's ending or a solo case's last step.
 */
function Telling({ turn, solved = false }: { turn: TurnView; solved?: boolean }) {
  const kicker = solved
    ? { text: "Case solved", tone: "text-walk" }
    : turn.kind === "close"
      ? { text: "Putting it together", tone: "text-walk" }
      : turn.card
        ? { text: turn.playedBy === "partner" ? "Your partner found new evidence" : "New evidence", tone: "text-walk" }
        : turn.playedBy === "partner"
          ? // The narration speaks to whoever played the turn, so say whose it was.
            { text: "On your partner's walk", tone: "text-concrete" }
          : null;
  return (
    <section aria-label={GAME_MASTER} className="fade-in mt-5">
      {kicker && <p className={`font-sign text-lg font-bold ${kicker.tone}`}>{kicker.text}</p>}
      <p className="font-story text-[1.1875rem] leading-[1.6] text-pretty">{turn.narration}</p>
    </section>
  );
}
