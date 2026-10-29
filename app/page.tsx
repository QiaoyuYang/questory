import Link from "next/link";
import { PlayCode } from "@/components/PlayCode";
import { Wordmark } from "@/components/Wordmark";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";

const STEPS = [
  {
    title: "Start a case",
    text: "Pick a genre or type your own idea, then take a photo of where you are. Wren, the game master, turns it into the opening of a case.",
  },
  {
    title: "Follow the quests",
    text: "A quest asks for a closer look at something in your photo, or sends you a block or two away to photograph something real.",
  },
  {
    title: "Collect the evidence",
    text: "Every step forward turns up a piece of evidence with its own picture. Each chapter ends on a hook, and the third one solves the case.",
  },
];

/** What Questory is, for anyone who opens the site, and the way in: a code on a computer, a button on a phone. */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-16 md:px-10 md:pt-14">
      <Wordmark />

      <section className="mt-10 grid gap-10 md:mt-16 md:grid-cols-[1fr_auto] md:items-center md:gap-16">
        <div>
          <h1 className="font-sign text-[2.5rem] leading-[1.05] font-bold md:text-6xl">
            A story game that gets you walking
          </h1>
          <p className="mt-5 max-w-xl font-story text-lg leading-relaxed md:text-xl">
            Take a photo of wherever you are. Wren, an AI game master, turns it into the start of a case, and each
            quest sends you somewhere nearby to photograph something real.
          </p>
          <Link href="/play" className={`${BUTTON.primary} mt-8 w-full md:hidden`}>
            <CameraIcon className="h-6 w-6" />
            Play
          </Link>
        </div>
        <div className="hidden md:block">
          <PlayCode />
        </div>
      </section>

      <section className="mt-16 md:mt-24" aria-labelledby="how-title">
        <h2 id="how-title" className="font-sign text-2xl font-bold md:text-3xl">
          How to play
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-[16px] bg-kerb p-5">
              <span className="font-sign text-lg font-bold text-lane">{i + 1}</span>
              <h3 className="mt-1 font-sign text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-concrete">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-2xl text-concrete">
          Play alone or with a friend, each on your own walk. There&apos;s no account to make, and it never asks where you are.
        </p>
      </section>

      <footer className="mt-16 border-t border-seam pt-6 text-sm text-concrete">
        Built on the Meta Model API for the Meta Global AI Developer Hackathon.
      </footer>
    </main>
  );
}
