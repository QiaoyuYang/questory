import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";
import { ScreenParts } from "@/components/ScreenParts";
import { SectionHeading } from "@/components/SectionHeading";
import { SiteFooter, SiteHeader } from "@/components/SiteNav";
import { TurnDiagram } from "@/components/TurnDiagram";
import { GITHUB_URL, linkPreview } from "@/lib/site";

const DESCRIPTION = "How Wren, an AI agent built on Meta's models, turns your photos into a case.";

export const metadata: Metadata = {
  title: "How it works",
  description: DESCRIPTION,
  ...linkPreview("How it works · Questory", DESCRIPTION),
};

/** What the player does, over and over, until the case is solved. */
const LOOP = [
  "You take a photo of where you are.",
  "Wren tells you what it means for the case and gives you a quest.",
  "You walk to what the quest asks for and take the next photo.",
];

/** The three layers of Wren's memory of a case, as in the README. */
const LAYERS = [
  {
    name: "Skeleton",
    holds: "The hidden plan: the answer, what each chapter finds out and the steps on each lead.",
    changes: "It changes only when your photos no longer fit the plan.",
  },
  {
    name: "Bindings",
    holds: "Which real thing is which story element.",
    changes: "They can be added or swapped with any photo.",
  },
  {
    name: "Canon",
    holds: "Facts already established in play.",
    changes: "New facts are added, and old ones never change.",
  },
];

const TEXT = "mt-4 max-w-2xl text-lg text-pretty";
const LINK = "font-semibold text-paint underline underline-offset-4 hover:text-lane";
const SECTION = "mt-14 md:mt-20";

/** From the top down: the loop you play, the agent and subagents behind it, then what happens to each photo and how a case holds together. */
export default function HowItWorks() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-14 md:px-10 md:pt-12">
      <SiteHeader current="how-it-works" />

      <h1 className="mt-10 font-sign text-[2.5rem] leading-[1.05] font-bold md:mt-14 md:text-6xl">How it works</h1>
      <p className="mt-5 max-w-2xl font-story text-lg leading-relaxed md:text-xl">
        Questory is a game you play on a walk. Wren, an AI agent, runs it with three subagents, each a different Meta
        model.
      </p>

      <section className="mt-12 md:mt-16" aria-labelledby="loop-title">
        <SectionHeading id="loop-title">The game loop</SectionHeading>
        <ol className="mt-6 grid gap-3 md:grid-cols-3 md:gap-5">
          {LOOP.map((step, i) => (
            <li key={step} className="rounded-[14px] bg-kerb px-4 py-3.5">
              <p className="font-sign text-lg font-bold text-lane">{i + 1}</p>
              <p className="mt-0.5 text-lg text-pretty">{step}</p>
            </li>
          ))}
        </ol>
        <p className={TEXT}>
          A photo that moves the case forward becomes a piece of evidence. The case is solved when the evidence points to
          the answer, usually over a few walks.
        </p>
      </section>

      <section className={SECTION} aria-labelledby="agent-title">
        <SectionHeading id="agent-title">Wren and its subagents</SectionHeading>
        <p className={TEXT}>
          Wren runs on Muse Wonder. It plans the case, reads each photo with what it remembers, writes what happens and
          sets the next quest. Wren can&apos;t walk, so you do. Each subagent is another Meta model with one job, and this
          screen shows all three at work.
        </p>
        <ScreenParts className="mt-8" />
      </section>

      <section className={SECTION} aria-labelledby="photo-title">
        <SectionHeading id="photo-title">What happens to each photo</SectionHeading>
        <TurnDiagram className="mt-8" />
      </section>

      <section className="mt-10 md:mt-12" aria-labelledby="case-title">
        <SectionHeading id="case-title">How Wren keeps a case together</SectionHeading>
        <p className={TEXT}>
          At the start, Wren decides the answer and plans a trail of places and objects that leads to it. Each quest goes
          where the last find pointed. When the evidence stops pointing to the answer, Wren changes the answer to fit what
          you found.
        </p>
        <p className={TEXT}>
          Its memory of a case has three layers, saved after every photo, so a case can pick up again days later.
        </p>
        <ul className="mt-6 grid gap-3 md:grid-cols-3 md:gap-5">
          {LAYERS.map((layer) => (
            <li key={layer.name} className="rounded-[14px] bg-kerb px-4 py-3.5">
              <p className="font-sign text-xl font-bold text-lane">{layer.name}</p>
              <p className="mt-1 text-pretty">{layer.holds}</p>
              <p className="mt-2 text-[0.9375rem] text-concrete text-pretty">{layer.changes}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={SECTION} aria-labelledby="two-title">
        <SectionHeading id="two-title">Two players</SectionHeading>
        <p className={TEXT}>
          A shared case has two leads, one for each player, that come at the answer from different sides. You each follow
          yours on your own walk, at the same time or not. Wren sees what both of you found and writes each
          chapter&apos;s ending from all of it. A short lock on each case means two photos sent at once both count.
        </p>
      </section>

      <section className={SECTION} aria-labelledby="built-title">
        <SectionHeading id="built-title">Built with</SectionHeading>
        <p className={TEXT}>
          Questory is a Next.js app on{" "}
          <a href="https://vercel.com" className={LINK}>
            Vercel
          </a>
          , and stories, photos and evidence pictures are stored in{" "}
          <a href="https://appwrite.io" className={LINK}>
            Appwrite
          </a>
          . The code is on{" "}
          <a href={GITHUB_URL} className={LINK}>
            GitHub
          </a>
          .
        </p>
      </section>

      <Link href="/play" className={`${BUTTON.primary} mt-12 w-full md:hidden`}>
        <CameraIcon className="h-6 w-6" />
        Play
      </Link>

      <SiteFooter current="how-it-works" />
    </main>
  );
}
