"use client";

import { useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import { changedSinceSeen } from "@/lib/client/seen";
import {
  GAME_MASTER,
  NEW_GENRES,
  THEME_LENGTH,
  cleanTheme,
  genreLabel,
  type GenreId,
  type PhotoUpload,
  type StorySummary,
} from "@/lib/types";
import { Alert } from "./Alert";
import { BottomBar } from "./BottomBar";
import { BUTTON } from "./buttons";
import { CaptureButton } from "./CaptureButton";
import { CameraIcon, ChevronRightIcon } from "./icons";
import { Segmented } from "./Segmented";
import { Sheet } from "./Sheet";
import { Wordmark } from "./Wordmark";
import { Working } from "./Working";

type Props = {
  stories: StorySummary[] | null;
  mode: "mock" | "live" | null;
  onStarted: (result: TurnResult) => void;
  onOpen: (storyId: string) => void;
  /** Delete a story the player started, or drop a shared one from their list. */
  onRemove: (story: StorySummary) => Promise<void>;
};

type Players = "solo" | "team";

const PLAYERS: { id: Players; label: string }[] = [
  { id: "solo", label: "Just me" },
  { id: "team", label: "With a friend" },
];

function describe(story: StorySummary) {
  const kind = genreLabel(story.genre, story.theme);
  if (story.status === "complete") return `${kind} · solved`;
  return `${kind} · chapter ${story.chapter} · evidence ${story.questsCompleted}/${story.evidenceTotal}`;
}

/** What a partner did since this browser last showed the story. */
function news(story: StorySummary): string | null {
  if (!changedSinceSeen(story.id, story.updatedAt)) return null;
  return story.status === "complete" ? "Solved" : "New";
}

export function HomeScreen({ stories, mode, onStarted, onOpen, onRemove }: Props) {
  const [genre, setGenre] = useState<GenreId>("mystery");
  const [theme, setTheme] = useState("");
  const [players, setPlayers] = useState<Players>("solo");
  const [pending, setPending] = useState<PhotoUpload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<PhotoUpload | null>(null);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState<StorySummary | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const returning = stories !== null && stories.length > 0;
  const needsTheme = genre === "custom" && !cleanTheme(theme);

  async function start(photo: PhotoUpload) {
    setError(null);
    setLastPhoto(photo);
    setPending(photo);
    try {
      onStarted(await api.startStory({ genre, theme, mode: players }, photo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The story couldn't start. Try again.");
    } finally {
      setPending(null);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await onRemove(removing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That story couldn't be deleted. Try again.");
    } finally {
      setRemoveBusy(false);
      setRemoving(null);
    }
  }

  const shared = removing?.role === "partner";

  return (
    <main className="mx-auto w-full max-w-[30rem] px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-44">
      <Wordmark />

      {pending ? (
        <div className="mt-8">
          <Working src={pending.photo} size={pending} message={`${GAME_MASTER} is starting your story…`} />
        </div>
      ) : (
        <>
          {returning ? (
            <section className="mt-8" aria-labelledby="stories-title">
              <div className="flex items-center justify-between">
                <h1 id="stories-title" className="font-sign text-2xl font-bold">
                  Your stories
                </h1>
                <button
                  type="button"
                  onClick={() => setEditing(!editing)}
                  className="-mr-1 min-h-11 rounded-md px-1 font-semibold text-lane"
                >
                  {editing ? "Done" : "Edit"}
                </button>
              </div>
              <ul className="mt-2 overflow-hidden rounded-[14px] bg-kerb">
                {stories.map((story) => {
                  const flag = news(story);
                  return (
                    <li key={story.id} className="flex items-center border-b border-seam/70 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => onOpen(story.id)}
                        disabled={editing}
                        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left enabled:hover:bg-seam/40 enabled:active:bg-seam/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-sign text-xl leading-tight font-bold">{story.title}</span>
                          <span className="mt-0.5 block text-sm text-concrete">{describe(story)}</span>
                        </span>
                        {flag && (
                          <span className="shrink-0 rounded-full bg-lane px-2 py-0.5 text-xs font-bold text-asphalt">
                            {flag}
                          </span>
                        )}
                        {story.role === "partner" && (
                          <span className="shrink-0 rounded-full bg-lane/15 px-2 py-0.5 text-xs font-semibold text-lane">
                            Shared
                          </span>
                        )}
                        {story.walkActive && (
                          <span className="shrink-0 rounded-full bg-walk/15 px-2 py-0.5 text-xs font-semibold text-walk">
                            Walking
                          </span>
                        )}
                        {!editing && <ChevronRightIcon className="shrink-0 text-concrete" />}
                      </button>
                      {editing && (
                        <button
                          type="button"
                          onClick={() => setRemoving(story)}
                          className="mr-2 min-h-11 shrink-0 rounded-md px-2 font-semibold text-hand"
                        >
                          {story.role === "owner" ? "Delete" : "Remove"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <section className="mt-8">
              <h1 className="font-story text-[2rem] leading-[1.15] font-medium text-balance">
                Your street is page one.
              </h1>
              <p className="mt-3 max-w-[34ch] text-concrete">
                Take a photo of where you&apos;re standing, and {GAME_MASTER}, your storyteller, opens a case right
                there. Walk, follow the next step, and collect evidence to solve it.
              </p>
            </section>
          )}

          <fieldset className="mt-8">
            <legend className="font-sign text-xl font-bold">{returning ? "New story" : "What kind of story?"}</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {NEW_GENRES.map((option) => {
                const selected = option.id === genre;
                return (
                  <label
                    key={option.id}
                    // An odd tile out spans the row.
                    className={`relative flex min-h-14 cursor-pointer items-center justify-center rounded-[12px] border-2 px-3 transition-colors odd:last:col-span-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-paint ${
                      selected ? "border-lane bg-kerb" : "border-seam hover:border-concrete"
                    }`}
                  >
                    <input
                      type="radio"
                      name="genre"
                      value={option.id}
                      checked={selected}
                      onChange={() => setGenre(option.id)}
                      className="sr-only"
                    />
                    <span className={`font-sign text-xl leading-tight font-bold ${selected ? "text-lane" : ""}`}>
                      {option.name}
                    </span>
                  </label>
                );
              })}
            </div>
            {genre === "custom" && (
              <input
                type="text"
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                maxLength={THEME_LENGTH}
                placeholder="Pirates, a haunted bakery, a cat detective…"
                aria-label="Your own kind of story"
                className="mt-3 min-h-12 w-full rounded-[12px] border-2 border-seam bg-kerb px-3.5 text-lg placeholder:text-concrete focus:border-lane focus:outline-none"
              />
            )}
          </fieldset>

          <section className="mt-7" aria-labelledby="players-title">
            <h2 id="players-title" className="font-sign text-xl font-bold">
              Who&apos;s playing?
            </h2>
            <Segmented className="mt-3" label="Who's playing" options={PLAYERS} value={players} onChange={setPlayers} />
            {players === "team" && (
              <p className="mt-2 text-sm text-concrete text-pretty">
                You play chapter 1, then send your friend a link to play chapter 2 on their own streets.
              </p>
            )}
          </section>

          {mode === "mock" && (
            <p className="mt-5 text-sm text-concrete">
              Demo mode: no Meta Model API key is set, so {GAME_MASTER} is reading from a script and can&apos;t see
              your photos.
            </p>
          )}
        </>
      )}

      {!pending && (
        <BottomBar>
          {error && (
            <Alert
              message={error}
              retry={lastPhoto && !needsTheme ? () => start(lastPhoto) : null}
              retryLabel="Try again with the same photo"
            />
          )}
          <CaptureButton onPhoto={start} onError={setError} disabled={needsTheme} className="w-full">
            <CameraIcon />
            {needsTheme ? `Tell ${GAME_MASTER} your idea first` : returning ? "Take a photo to begin" : "Take your first photo"}
          </CaptureButton>
        </BottomBar>
      )}

      <Sheet
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={shared ? "Remove it from your list?" : "Delete this story?"}
        done={false}
      >
        <p className="text-lg text-pretty">
          {shared
            ? `“${removing?.title ?? ""}” stays with your friend. Their link brings it back.`
            : `“${removing?.title ?? ""}” and its photos and evidence will be gone for good.`}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button type="button" onClick={() => void confirmRemove()} disabled={removeBusy} className={BUTTON.danger}>
            {removeBusy ? "One moment…" : shared ? "Remove" : "Delete story"}
          </button>
          <button type="button" onClick={() => setRemoving(null)} className={BUTTON.secondary}>
            Keep it
          </button>
        </div>
      </Sheet>
    </main>
  );
}
