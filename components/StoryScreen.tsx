/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import type { Outcome, PhotoUpload, QuestView, StoryView, TurnView } from "@/lib/types";
import { CaptureButton } from "./CaptureButton";
import { QuestPhoto } from "./QuestPhoto";
import { StoryCard } from "./StoryCard";
import { Working } from "./Working";

type Loaded = { story: StoryView; turns: TurnView[] };

type Props = {
  storyId: string;
  initial: Loaded | null;
  onHome: () => void;
};

// A side note gets no banner: the narration says what the photo added.
const OUTCOME: Record<Outcome, { label: string; tone: string } | null> = {
  follows_quest: { label: "Quest complete", tone: "text-walk" },
  moves_story: { label: "The story moves on", tone: "text-walk" },
  side_note: null,
};

const KIND_LABEL: Record<TurnView["kind"], string> = {
  genesis: "The beginning",
  photo: "Something you noticed",
  resume: "A new walk",
  end: "Walk ended",
};

function outcomeOf(turn: TurnView) {
  return turn.outcome ? OUTCOME[turn.outcome] : null;
}

function turnLabel(turn: TurnView) {
  return outcomeOf(turn)?.label ?? KIND_LABEL[turn.kind];
}

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

/** What the game master just said, with a banner when the photo moved the story. */
function GameMasterNote({ turn, showPhoto }: { turn: TurnView; showPhoto: boolean }) {
  const outcome = outcomeOf(turn);
  return (
    <section className="mt-6" aria-label="The game master">
      {outcome && <p className={`font-sign text-xl font-bold ${outcome.tone}`}>{outcome.label}</p>}
      <div className="flex items-start gap-4">
        <p className="font-story text-[1.1875rem] leading-[1.65] text-pretty">{turn.narration}</p>
        {showPhoto && turn.photoUrl && (
          <img
            src={turn.photoUrl}
            alt="The photo you sent"
            className="mt-1.5 h-20 w-16 shrink-0 rounded-md object-cover"
          />
        )}
      </div>
    </section>
  );
}

/** The game master's suggestion for the next photo. Following it is optional. */
function QuestPanel({ quest }: { quest: QuestView }) {
  const [hint, setHint] = useState(false);
  return (
    <section aria-labelledby="quest-title" className="mt-7 border-t-2 border-lane pt-4">
      <h2 id="quest-title" className="font-sign text-[1.875rem] leading-tight font-bold text-lane">
        {quest.title}
      </h2>
      <p className="mt-1.5 text-lg font-medium text-pretty">{quest.objective}</p>
      <p className="mt-2 text-concrete">
        {quest.targetMode === "in_view" ? "In your photo: " : "Somewhere nearby: "}
        {quest.targetDescription}
      </p>
      <button
        type="button"
        aria-expanded={hint}
        onClick={() => setHint((open) => !open)}
        className="mt-3 font-semibold text-paint underline underline-offset-4"
      >
        {hint ? "Hide hint" : "Show hint"}
      </button>
      {hint && <p className="mt-2 font-story text-concrete italic">{quest.hint}</p>}
    </section>
  );
}

/** Shown when the game master left no quest: any photo keeps the story going. */
function OpenPanel() {
  return (
    <section aria-labelledby="quest-title" className="mt-7 border-t-2 border-lane pt-4">
      <h2 id="quest-title" className="font-sign text-[1.875rem] leading-tight font-bold text-lane">
        Look around
      </h2>
      <p className="mt-1.5 text-lg font-medium text-pretty">Photograph anything that catches your eye.</p>
    </section>
  );
}

function Journal({ story, turns }: { story: StoryView; turns: TurnView[] }) {
  return (
    <section className="mt-14 border-t border-seam pt-6" aria-labelledby="journal-title">
      <h2 id="journal-title" className="font-sign text-2xl font-bold">
        Story so far
      </h2>
      {story.recap && <p className="mt-2 font-story leading-relaxed text-concrete">{story.recap}</p>}

      {story.canon.length > 0 && (
        <div className="mt-6">
          <h3 className="font-sign text-lg font-semibold">What you know</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-lane">
            {story.canon.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      )}

      {story.inventory.length > 0 && (
        <div className="mt-6">
          <h3 className="font-sign text-lg font-semibold">You carry</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-lane">
            {story.inventory.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="group mt-6">
        <summary className="cursor-pointer font-sign text-lg font-semibold">
          Every turn ({turns.length})
        </summary>
        <ol className="mt-3 space-y-5">
          {[...turns].reverse().map((turn) => (
            <li key={turn.id} className="flex gap-3">
              {turn.photoUrl ? (
                <img src={turn.cardUrl ?? turn.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-md bg-kerb" />
              )}
              <div>
                <p className="text-sm font-semibold text-concrete">{turnLabel(turn)}</p>
                <p className="font-story text-[0.98rem] leading-relaxed">{turn.narration}</p>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

export function StoryScreen({ storyId, initial, onHome }: Props) {
  const [data, setData] = useState<Loaded | null>(initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ message: string; photo: string | null } | null>(null);
  const [error, setError] = useState<{ message: string; retry: (() => void) | null } | null>(null);
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

  async function run(message: string, photo: string | null, task: () => Promise<TurnResult>) {
    setError(null);
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
    run("The game master is taking a look…", photo.photo, () => api.takeTurn(storyId, "photo", photo));
  const resume = (photo: PhotoUpload) =>
    run("Picking the story back up…", photo.photo, () => api.takeTurn(storyId, "resume", photo));
  const end = () => run("Closing the chapter…", null, () => api.endWalk(storyId));

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-10">
        <p role="alert">{loadError}</p>
        <button type="button" onClick={onHome} className="mt-4 font-semibold underline underline-offset-4">
          Back to your stories
        </button>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-16" aria-busy="true">
        <div className="lane-line lane-line-moving" />
        <p className="mt-3 text-concrete">Opening your story…</p>
      </main>
    );
  }

  const walkLive = story.walkActive && story.status === "active";
  const questLive = walkLive && story.quest !== null;
  // Only a closer look needs its photo: the outline shows where to look.
  const questPhoto = questLive && story.quest!.targetMode === "in_view" ? questTurn : null;
  // The latest photo appears once: as the quest photo, as its card, or as a thumbnail.
  const thumbnail = latest !== null && !latest.card && latest.id !== questPhoto?.id;

  return (
    <main className="mx-auto w-full max-w-[30rem] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-48">
      <header className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onHome}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-concrete hover:text-paint"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Stories
        </button>
        <span className="text-concrete">
          {story.status === "complete" ? "Finished" : `Chapter ${story.chapter}`}
        </span>
      </header>

      <h1 className="font-sign text-[2.25rem] leading-[1.05] font-bold text-balance">{story.title}</h1>
      {turns.length <= 1 && <p className="mt-1.5 text-concrete">{story.logline}</p>}

      <div className="mt-5">
        {busy ? (
          <Working photo={busy.photo} message={busy.message} />
        ) : (
          <>
            {questPhoto && <QuestPhoto turn={questPhoto} questTitle={story.quest!.title} />}
            {latest && <GameMasterNote turn={latest} showPhoto={thumbnail} />}
            {latest?.card && <StoryCard turn={latest} onRepaint={() => repaint(latest)} />}
            {questLive && <QuestPanel quest={story.quest!} />}
            {walkLive && !questLive && <OpenPanel />}
            {walkLive && (
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 text-concrete">
                {questLive && <p>Or photograph anything that catches your eye.</p>}
                <button type="button" onClick={end} className="ml-auto underline underline-offset-4 hover:text-paint">
                  End this walk
                </button>
              </div>
            )}

            {!story.walkActive && story.status === "active" && (
              <section className="mt-8 border-t-2 border-lane pt-4">
                <h2 className="font-sign text-[1.875rem] leading-tight font-bold text-lane">
                  Chapter {story.chapter} is done
                </h2>
                <p className="mt-1.5 text-concrete">
                  Next time you&apos;re out, take a photo wherever you are. The story picks up from there.
                </p>
                <CaptureButton onPhoto={resume} onError={photoError} className="mt-5 w-full">
                  Start the next walk
                </CaptureButton>
              </section>
            )}

            {story.status === "complete" && (
              <section className="mt-8 border-t-2 border-lane pt-4">
                <h2 className="font-sign text-[1.875rem] leading-tight font-bold text-lane">The end</h2>
                <p className="mt-1.5 text-concrete">
                  You finished this story in {story.chapter} {story.chapter === 1 ? "walk" : "walks"} and{" "}
                  {story.questsCompleted} {story.questsCompleted === 1 ? "quest" : "quests"}.
                </p>
                <button
                  type="button"
                  onClick={onHome}
                  className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-[10px] bg-lane px-5 text-lg font-semibold text-asphalt"
                >
                  Start a new story
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-6 rounded-[10px] border-l-4 border-hand bg-kerb p-4">
          <p>{error.message}</p>
          {error.retry && (
            <button type="button" onClick={error.retry} className="mt-2 font-semibold underline underline-offset-4">
              Try again
            </button>
          )}
        </div>
      )}

      <Journal story={story} turns={turns} />

      {walkLive && !busy && (
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-lane bg-asphalt/95 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto w-full max-w-[30rem] px-4">
            <button
              type="button"
              onClick={() =>
                document.getElementById("quest-title")?.scrollIntoView({
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                  block: "center",
                })
              }
              className="block w-full truncate py-1 text-left font-sign text-lg font-semibold text-lane"
            >
              {story.quest?.title ?? "Look around"}
            </button>
            <CaptureButton onPhoto={takePhoto} onError={photoError} className="mt-1.5 w-full">
              Take a photo
            </CaptureButton>
          </div>
        </div>
      )}
    </main>
  );
}
