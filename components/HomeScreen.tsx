"use client";

import { useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import { GENRES, type GenreId, type PhotoUpload, type StorySummary } from "@/lib/types";
import { CaptureButton } from "./CaptureButton";
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
  const quests = story.questsCompleted === 1 ? "1 quest done" : `${story.questsCompleted} quests done`;
  if (story.status === "complete") return `${genreName(story.genre)}, finished, ${quests}`;
  return `${genreName(story.genre)}, chapter ${story.chapter}, ${quests}`;
}

export function HomeScreen({ stories, mode, onStarted, onOpen }: Props) {
  const [genre, setGenre] = useState<GenreId>("mystery");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<PhotoUpload | null>(null);
  const returning = stories !== null && stories.length > 0;

  async function start(photo: PhotoUpload) {
    setError(null);
    setLastPhoto(photo);
    setPending(photo.photo);
    try {
      onStarted(await api.startStory(genre, photo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The story couldn't start. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[30rem] px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-16">
      <Wordmark />

      {pending ? (
        <div className="mt-10">
          <Working photo={pending} message="Reading your street and writing a story…" />
        </div>
      ) : (
        <>
          {returning ? (
            <section className="mt-10" aria-labelledby="continue-title">
              <h1 id="continue-title" className="font-sign text-2xl font-bold">
                Continue a story
              </h1>
              <ul className="mt-3 divide-y divide-seam border-y border-seam">
                {stories.map((story) => (
                  <li key={story.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(story.id)}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left hover:text-lane"
                    >
                      <span>
                        <span className="block font-sign text-[1.375rem] leading-tight font-bold">{story.title}</span>
                        <span className="mt-0.5 block text-[0.9375rem] text-concrete">{describe(story)}</span>
                      </span>
                      {story.walkActive && (
                        <span className="shrink-0 rounded-full bg-walk/15 px-2.5 py-1 text-sm font-medium text-walk">
                          Walk in progress
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <>
              <h1 className="mt-10 font-story text-[2.125rem] leading-[1.15] font-medium text-balance">
                Your street is page one.
              </h1>
              <p className="mt-4 max-w-[34ch] text-concrete">
                Take a photo of where you&apos;re standing. A game master writes a story around it and sends you on
                quests through your own neighborhood.
              </p>
            </>
          )}

          <fieldset className={returning ? "mt-12" : "mt-9"}>
            <legend className={`font-sign font-semibold ${returning ? "text-2xl font-bold" : "text-xl"}`}>
              {returning ? "Start a new story" : "What kind of story?"}
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {GENRES.map((option) => {
                const selected = option.id === genre;
                return (
                  <label
                    key={option.id}
                    className={`relative flex cursor-pointer flex-col rounded-[10px] border-2 p-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-paint ${
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
                    <span className={`font-sign text-[1.375rem] leading-tight font-bold ${selected ? "text-lane" : ""}`}>
                      {option.name}
                    </span>
                    <span className="mt-1 text-[0.9375rem] leading-snug text-concrete">{option.blurb}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <div role="alert" className="mt-6 rounded-[10px] border-l-4 border-hand bg-kerb p-4">
              <p>{error}</p>
              {lastPhoto && (
                <button
                  type="button"
                  onClick={() => start(lastPhoto)}
                  className="mt-2 font-semibold text-paint underline underline-offset-4"
                >
                  Try again with the same photo
                </button>
              )}
            </div>
          )}

          <CaptureButton onPhoto={start} onError={setError} className="mt-7 w-full">
            {returning ? "Take a photo to begin" : "Take your first photo"}
          </CaptureButton>

          {mode === "mock" && (
            <p className="mt-4 text-sm text-concrete">
              Demo mode: no Meta Model API key is set, so a scripted game master is running. It can&apos;t see your
              photos.
            </p>
          )}
        </>
      )}
    </main>
  );
}
