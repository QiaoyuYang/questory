import { Fragment } from "react";
import { GAME_MASTER } from "@/lib/types";

type Box = { kicker: string; title: string; text: string };

/**
 * One turn, in order. The third stop's two models run at the same time. The memory is
 * read again by the game master on the next photo, which the loop marks.
 */
const STOPS: { boxes: Box[]; memory?: boolean; loop?: boolean }[] = [
  {
    boxes: [{ kicker: "Phone", title: "Your photo", text: "Your phone resizes it, which drops its location data." }],
  },
  {
    loop: true,
    boxes: [
      {
        kicker: "Game master",
        title: "Muse Wonder",
        text: `Plays ${GAME_MASTER}. Reads the photo with the story so far, then writes what happens and the next quest.`,
      },
    ],
  },
  {
    boxes: [
      { kicker: "Photo check", title: "Muse Spark", text: `Takes out anything ${GAME_MASTER} describes that the photo doesn't show.` },
      { kicker: "Where to look", title: "SAM 3.1", text: "Outlines what a closer-look quest points at." },
    ],
  },
  {
    memory: true,
    loop: true,
    boxes: [
      {
        kicker: "Saved",
        title: "Story memory",
        text: "The hidden plan, which real thing is which, and the facts so far.",
      },
    ],
  },
  {
    boxes: [{ kicker: "Evidence", title: "Muse Image", text: "When the photo turns up evidence, paints it from your photo." }],
  },
];

// Column centers of the five-column grid below, which has 1.25rem gaps.
const FIRST_CENTER = "calc((100% - 5rem) * 0.1)";
const SECOND_CENTER = "calc((100% - 5rem) * 0.3 + 1.25rem)";

const LOOP_LINE = "border-dashed border-concrete/50";

/**
 * What happens to one photo, as stops along a lane line: down the screen on a phone, and
 * across on a computer, where a dashed loop takes the memory back to the game master.
 */
export function TurnDiagram({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      <div className="relative">
        <div className="lane-line-down absolute top-3 bottom-3 left-[10px] md:hidden" aria-hidden="true" />
        <div
          className="lane-line absolute top-[10px] hidden md:block"
          style={{ left: FIRST_CENTER, right: FIRST_CENTER }}
          aria-hidden="true"
        />
        <ol className="relative flex flex-col gap-7 md:grid md:grid-cols-5 md:gap-5">
          {STOPS.map((stop, i) => (
            <li key={stop.boxes[0].title} className="relative flex flex-col pl-10 md:pt-12 md:pl-0">
              <span
                className="absolute top-0 left-0 grid h-6 w-6 place-items-center rounded-full bg-lane font-sign text-sm font-bold text-asphalt ring-4 ring-asphalt md:left-1/2 md:-translate-x-1/2"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              {stop.boxes.map((box, j) => (
                <Fragment key={box.title}>
                  {j > 0 && <p className="py-1.5 text-center text-sm font-semibold text-concrete">At the same time</p>}
                  <div
                    className={`rounded-[14px] px-4 py-3.5 ${stop.memory ? "border-2 border-dashed border-seam" : "bg-kerb"}`}
                  >
                    <p className="text-xs font-bold tracking-wider text-lane uppercase">{box.kicker}</p>
                    <p className="mt-0.5 font-sign text-xl leading-tight font-bold">{box.title}</p>
                    <p className="mt-1 text-[0.9375rem] leading-snug text-concrete text-pretty">{box.text}</p>
                    {stop.memory && (
                      <p className="mt-1 text-[0.9375rem] leading-snug text-concrete md:hidden">
                        {GAME_MASTER} reads it again on the next photo.
                      </p>
                    )}
                  </div>
                </Fragment>
              ))}
              {/* The loop leaves the memory and comes back up into the game master. */}
              {stop.loop && (
                <div className="relative hidden min-h-4 flex-1 md:block" aria-hidden="true">
                  <div className={`mx-auto h-full w-0 border-l-2 ${LOOP_LINE}`} />
                  {!stop.memory && (
                    <span className="absolute top-0.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-concrete/70" />
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
      <div className="relative hidden h-16 md:block" aria-hidden="true">
        <div
          className={`absolute top-0 h-7 rounded-b-[16px] border-2 border-t-0 ${LOOP_LINE}`}
          style={{ left: SECOND_CENTER, right: SECOND_CENTER }}
        />
        <p className="absolute top-7 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-asphalt px-3 text-sm whitespace-nowrap text-concrete">
          {GAME_MASTER} reads it again on the next photo
        </p>
      </div>
      <figcaption className="sr-only">
        A photo goes from your phone to Muse Wonder, then to Muse Spark and SAM 3.1 at the same time, then into the
        story memory, and Muse Image paints any evidence. {GAME_MASTER} reads the memory again on the next photo.
      </figcaption>
    </figure>
  );
}
