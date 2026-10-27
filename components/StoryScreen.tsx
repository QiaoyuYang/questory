"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import { currentChapter, walkStats } from "@/lib/walk";
import { GAME_MASTER, type PhotoUpload, type StoryView, type TurnView } from "@/lib/types";
import { Alert } from "./Alert";
import { BottomBar } from "./BottomBar";
import { BUTTON } from "./buttons";
import { CaptureButton } from "./CaptureButton";
import { BookIcon, CameraIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { outcomeLabel } from "./labels";
import { PhotoViewer, type Zoomed } from "./PhotoViewer";
import { QuestSheet } from "./QuestSheet";
import { Scene, sceneViews, type SceneView } from "./Scene";
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

type Panel = "story" | "quest" | "end" | null;

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function StoryScreen({ storyId, initial, onHome }: Props) {
  const [data, setData] = useState<Loaded | null>(initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ message: string; photo: PhotoUpload | null } | null>(null);
  const [error, setError] = useState<{ message: string; retry: (() => void) | null } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  // The picture the player picked for a turn; a new turn starts from its default.
  const [picked, setPicked] = useState<{ turnId: string; view: SceneView } | null>(null);
  const [zoomed, setZoomed] = useState<Zoomed | null>(null);
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

  // Ask Muse Image for a story card. State only changes when the request settles.
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

  // A photo that moved the story gets its card painted automatically ("none" shows as painting).
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

  const walkLive = story.walkActive && story.status === "active";
  const between = !story.walkActive && story.status === "active";
  const quest = walkLive ? story.quest : null;
  // Only a closer look needs its photo, and only when SAM outlined the target: without
  // the outline it is the same photo again.
  const lookTurn = quest?.targetMode === "in_view" && questTurn?.overlay?.outline ? questTurn : null;
  const views = scene ? sceneViews(scene, lookTurn) : [];
  const view = picked && picked.turnId === scene?.id && views.includes(picked.view) ? picked.view : views[0];
  const outcome = latest ? outcomeLabel(latest) : null;

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
              {story.status === "complete" ? "Finished" : `Chapter ${story.chapter}`}
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
            {scene && view && (
              <Scene
                turn={scene}
                lookTurn={lookTurn}
                quest={quest}
                views={views}
                view={view}
                onView={(next) => setPicked({ turnId: scene.id, view: next })}
                onRepaint={() => repaint(scene)}
                onZoom={setZoomed}
              />
            )}
            {latest && (
              <section aria-label={GAME_MASTER} className="mt-5">
                {outcome && (
                  <p className="font-sign text-lg font-bold text-walk">
                    {outcome}
                    {latest.card && <span className="text-concrete"> · card earned</span>}
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

          {walkLive && (
            <button
              type="button"
              onClick={() => setPanel("quest")}
              className="flex min-h-11 w-full items-center gap-2.5 text-left"
            >
              <span className="shrink-0 rounded-full bg-lane/15 px-2 py-0.5 text-xs font-bold tracking-wider text-lane uppercase">
                Next
              </span>
              <span className="min-w-0 flex-1 truncate font-sign text-lg font-semibold">
                {quest ? quest.title : "Look around"}
              </span>
              <ChevronRightIcon className="shrink-0 text-concrete" />
            </button>
          )}
          {between && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">Chapter {story.chapter} is done</p>
              <WalkSummary stats={walkStats(currentChapter(turns))} />
              <p className="text-sm text-concrete">Start the next one here, or on your next walk.</p>
            </div>
          )}
          {story.status === "complete" && (
            <div className="py-1">
              <p className="font-sign text-lg font-bold text-lane">The end</p>
              <WalkSummary stats={walkStats(turns)} total />
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => setPanel("story")} className={BUTTON.tool}>
              <BookIcon />
              Story
            </button>
            {walkLive && (
              <>
                <CaptureButton onPhoto={takePhoto} onError={photoError} className="flex-1">
                  <CameraIcon />
                  Take a photo
                </CaptureButton>
              </>
            )}
            {between && (
              <>
                <CaptureButton onPhoto={resume} onError={photoError} className="flex-1">
                  <CameraIcon />
                  Start chapter {story.chapter + 1}
                </CaptureButton>
              </>
            )}
            {story.status === "complete" && (
              <button type="button" onClick={onHome} className={`${BUTTON.primary} flex-1`}>
                Start a new story
              </button>
            )}
          </div>
        </BottomBar>
      )}

      <StorySheet
        open={panel === "story"}
        onClose={() => setPanel(null)}
        story={story}
        turns={turns}
        onZoom={setZoomed}
      />
      <QuestSheet
        key={quest?.id ?? "open"}
        open={panel === "quest"}
        onClose={() => setPanel(null)}
        quest={quest}
        onPhoto={takePhoto}
        onError={photoError}
      />
      <Sheet open={panel === "end"} onClose={() => setPanel(null)} title="End this walk?" done={false}>
        <p className="text-lg text-pretty">
          {GAME_MASTER} will close this chapter. The next one starts with your next photo, wherever you are.
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
      <PhotoViewer image={zoomed} onClose={() => setZoomed(null)} />
    </main>
  );
}
