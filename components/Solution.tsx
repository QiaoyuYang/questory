/* eslint-disable @next/next/no-img-element */
"use client";

import type { StoryView, TurnView } from "@/lib/types";
import type { Zoomed } from "./PhotoViewer";

type Props = {
  story: StoryView;
  turns: TurnView[];
  onZoom: (image: Zoomed) => void;
};

/** The end of a solved case on the main screen: the answer, and every piece of evidence that led to it. */
export function Solution({ story, turns, onZoom }: Props) {
  const found = turns.flatMap((turn) => (turn.card ? [{ turn, card: turn.card }] : []));

  return (
    <>
      {story.secret && (
        <section className="fade-in mt-6 rounded-[14px] bg-kerb px-4 py-3.5" aria-labelledby="answer-title">
          <h2 id="answer-title" className="font-sign text-lg font-bold text-lane">
            The answer
          </h2>
          <p className="mt-1 font-story text-lg leading-relaxed text-pretty">{story.secret}</p>
        </section>
      )}

      {found.length > 0 && (
        <section className="fade-in mt-6" aria-labelledby="found-title">
          <h2 id="found-title" className="font-sign text-lg font-bold">
            The evidence
          </h2>
          <ol className="mt-2 grid grid-cols-4 gap-2">
            {found.map(({ turn, card }) => {
              const src = turn.cardUrl ?? turn.photoUrl;
              return (
                <li key={turn.id}>
                  {src ? (
                    <button
                      type="button"
                      aria-label={`Open ${card.title} full screen`}
                      onClick={() => onZoom({ src, alt: card.title, size: turn.photoSize, overlay: null })}
                      className="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-[10px]"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className="aspect-square rounded-[10px] bg-kerb" />
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );
}
