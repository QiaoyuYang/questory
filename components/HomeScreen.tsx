"use client";

import { useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import { GAME_MASTER, GENRES, type GenreId, type PhotoUpload, type StorySummary } from "@/lib/types";
import { Alert } from "./Alert";
import { BottomBar } from "./BottomBar";
import { CaptureButton } from "./CaptureButton";
import { CameraIcon, ChevronRightIcon } from "./icons";
import { Wordmark } from "./Wordmark";
import { Working } from "./Working";

type Props = {
  stories: StorySummary[] | null;
  mode: "mock" | "live" | null;
  onStarted: (result: TurnResult) => void;
  onOpen: (storyId: string) => void;
};

function genreName(id: string) {
  return GENRES.find((genre) => genre.id === id)?.name ?? id;
}

function describe(story: StorySummary) {
  if (story.status === "complete") return `${genreName(story.genre)} · solved`;
  return `${genreName(story.genre)} · chapter ${story.chapter} · evidence ${story.questsCompleted}/${story.evidenceTotal}`;
}

export function HomeScreen({ stories, mode, onStarted, onOpen }: Props) {
  const [genre, setGenre] = useState<GenreId>("mystery");
  const [pending, setPending] = useState<PhotoUpload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<PhotoUpload | null>(null);
  const returning = stories !== null && stories.length > 0;

  async function start(photo: PhotoUpload) {
    setError(null);
    setLastPhoto(photo);
    setPending(photo);
    try {
      onStarted(await api.startStory(genre, photo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The story couldn't start. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[30rem] px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-44">
      <Wordmark />

      {pending ? (
        <div className="mt-8">
          <Working photo={pending} message={`${GAME_MASTER} is starting your story…`} />
        </div>
      ) : (
        <>
          {returning ? (
            <section className="mt-8" aria-labelledby="stories-title">
              <h1 id="stories-title" className="font-sign text-2xl font-bold">
                Your stories
              </h1>
              <ul className="mt-3 overflow-hidden rounded-[14px] bg-kerb">
                {stories.map((story) => (
                  <li key={story.id} className="border-b border-seam/70 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onOpen(story.id)}
                      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-seam/40 active:bg-seam/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-sign text-xl leading-tight font-bold">{story.title}</span>
                        <span className="mt-0.5 block text-sm text-concrete">{describe(story)}</span>
                      </span>
                      {story.walkActive && (
                        <span className="shrink-0 rounded-full bg-walk/15 px-2 py-0.5 text-xs font-semibold text-walk">
                          Walking
                        </span>
                      )}
                      <ChevronRightIcon className="shrink-0 text-concrete" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="mt-8">
              <h1 className="font-story text-[2rem] leading-[1.15] font-medium text-balance">
                Your street is page one.
              </h1>
              <p className="mt-3 max-w-[34ch] text-concrete">
                Take a photo of where you&apos;re standing, and {GAME_MASTER}, your storyteller, opens a case right
                there. Walk, follow the next step, and collect six pieces of evidence to solve it.
              </p>
            </section>
          )}

          <fieldset className="mt-8">
            <legend className="font-sign text-xl font-bold">{returning ? "New story" : "What kind of story?"}</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {GENRES.map((option) => {
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
          </fieldset>

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
              retry={lastPhoto ? () => start(lastPhoto) : null}
              retryLabel="Try again with the same photo"
            />
          )}
          <CaptureButton onPhoto={start} onError={setError} className="w-full">
            <CameraIcon />
            {returning ? "Take a photo to begin" : "Take your first photo"}
          </CaptureButton>
        </BottomBar>
      )}
    </main>
  );
}
