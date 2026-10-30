import Image from "next/image";

/** Each part of the screen, with where its marker sits in percent of the screenshot's width and height. */
const PARTS = [
  { x: 87, y: 7, text: "Muse Image painted the evidence from your photo." },
  { x: 88, y: 56, text: "Wren wrote the story on Muse Wonder, and Muse Spark checked it against your photo." },
  { x: 7.5, y: 81.5, text: "Wren set the next step, and SAM 3.1 outlined the door in your photo, so you know where to look." },
];

const DOT =
  "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lane font-sign text-sm font-bold text-asphalt ring-4 ring-asphalt";

/**
 * A real game screen with a marker on each part and the models that made it beside it,
 * so the agent and its subagents show up on a screen players know.
 */
export function ScreenParts({ className = "" }: { className?: string }) {
  return (
    <figure className={`grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-14 ${className}`}>
      <div className="mx-auto w-[72%] max-w-[17rem] overflow-hidden rounded-[2rem] border-[6px] border-kerb shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] md:mx-0 md:w-[17rem]">
        <div className="relative">
          <Image
            src="/landing/evidence.webp"
            alt="A game screen: a painted evidence picture called The waiting bench, the story under it, and the next step with a small copy of the photo where a door is outlined."
            width={600}
            height={1300}
            sizes="(min-width: 768px) 272px, 72vw"
            className="block h-auto w-full"
          />
          {PARTS.map((part, i) => (
            <span
              key={part.text}
              className={`${DOT} absolute -translate-x-1/2 -translate-y-1/2`}
              style={{ left: `${part.x}%`, top: `${part.y}%` }}
              aria-hidden="true"
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>
      <figcaption>
        <ol className="flex max-w-md flex-col gap-5">
          {PARTS.map((part, i) => (
            <li key={part.text} className="flex gap-4">
              <span className={`${DOT} mt-0.5`} aria-hidden="true">
                {i + 1}
              </span>
              <p className="text-lg text-pretty">{part.text}</p>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
