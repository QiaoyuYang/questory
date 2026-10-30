import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/SiteNav";
import { GITHUB_URL, linkPreview } from "@/lib/site";
import { TurnDiagram } from "@/components/TurnDiagram";

const DESCRIPTION = "How Wren, an AI agent built on Meta's models, turns your photos into a case.";

export const metadata: Metadata = {
  title: "How it works",
  description: DESCRIPTION,
  ...linkPreview("How it works · Questory", DESCRIPTION),
};

/** The three layers of story memory, as in the README. */
const LAYERS = [
  {
    name: "Skeleton",
    holds: "The hidden plan: the answer, what each chapter finds out and the steps on each lead.",
    changes: "It changes only when your photos no longer fit the plan.",
  },
  {
    name: "Bindings",
    holds: "Which real thing is which story element.",
    changes: "They can be added or swapped on any turn.",
  },
  {
    name: "Canon",
    holds: "Facts already established in play.",
    changes: "New facts are added, and old ones never change.",
  },
];

const H2 = "font-sign text-2xl font-bold md:text-3xl";
const TEXT = "mt-4 max-w-2xl text-lg text-pretty";
const LINK = "font-semibold text-paint underline underline-offset-4 hover:text-lane";

function Heading({ id, children }: { id: string; children: string }) {
  return (
    <>
      <h2 id={id} className={H2}>
        {children}
      </h2>
      <div className="lane-line mt-3 w-24" aria-hidden="true" />
    </>
  );
}

/** The game from the top down: the loop you play, the agent that runs it, then the models and memory behind a turn. */
export default function HowItWorks() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-14 md:px-10 md:pt-12">
      <SiteHeader current="how-it-works" />

      <h1 className="mt-10 font-sign text-[2.5rem] leading-[1.05] font-bold md:mt-14 md:text-6xl">How it works</h1>
      <p className="mt-5 max-w-2xl font-story text-lg leading-relaxed md:text-xl">
        Questory is a game you play on a walk. Wren, its game master, is an AI agent: it builds a case from your photos
        and sends you out to find the evidence.
      </p>

      <section className="mt-12 md:mt-16" aria-labelledby="loop-title">
        <Heading id="loop-title">The game loop</Heading>
        <p className={TEXT}>
          Each turn starts with a photo. Wren reads it, tells you what it means for the case and gives you a quest. A
          quest asks for a closer look at something in your photo, or sends you a block or two away to find something.
          Your photo of it starts the next turn.
        </p>
        <p className={TEXT}>
          A photo that answers a quest becomes a piece of evidence, and the evidence leads to the answer. A case has
          multiple chapters. You can stop after any photo, and your next photo picks the story up wherever you are.
        </p>
      </section>

      <section className="mt-14 md:mt-20" aria-labelledby="agent-title">
        <Heading id="agent-title">Wren, the agent</Heading>
        <p className={TEXT}>
          Wren is built on Muse Wonder. At the start of a case, it decides the answer and plans the evidence that leads
          to it. On every turn, it reads your photo with what it remembers of the story, decides what the photo means,
          writes what happens and sets the next quest. When your photos stop fitting the plan, it changes the plan.
        </p>
        <p className={TEXT}>
          Wren can&apos;t walk, so you do. Each quest is Wren asking you to go and look, and your photo is how it sees
          what you found.
        </p>
        <p className={TEXT}>
          Three other models work with Wren. Muse Spark checks Wren&apos;s lines against your photo and takes out
          anything the photo doesn&apos;t show. Wren uses the other two as tools: SAM 3.1 outlines what a closer-look
          quest points at, and Muse Image paints the evidence from your photo.
        </p>
      </section>

      <section className="mt-14 md:mt-20" aria-labelledby="turn-title">
        <Heading id="turn-title">A turn</Heading>
        <TurnDiagram className="mt-8" />
      </section>

      <section className="mt-10 md:mt-12" aria-labelledby="case-title">
        <Heading id="case-title">The case</Heading>
        <p className={TEXT}>
          Every case has one question and a hidden answer. Wren plans each chapter as places and objects to find, and
          each quest goes where the last find pointed, so the evidence forms a trail.
        </p>
        <p className={TEXT}>
          A photo can answer the current quest, take the story somewhere new, or be a side note that leaves the quest
          open. Each photo becomes something it could reasonably be in the story. After two side notes in a row, the
          next photo moves the story whatever it shows. If the evidence stops pointing to the answer, Wren changes the
          answer to fit everything found so far.
        </p>
      </section>

      <section className="mt-14 md:mt-20" aria-labelledby="memory-title">
        <Heading id="memory-title">Story memory</Heading>
        <p className={TEXT}>
          Wren keeps each story in three layers. They&apos;re saved after every turn, so a case can pick up again days
          later.
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

      <section className="mt-14 md:mt-20" aria-labelledby="two-title">
        <Heading id="two-title">Two players</Heading>
        <p className={TEXT}>
          A shared case has two leads that come at the answer from different sides, such as how it was done and who
          could have done it. Each player follows one lead without waiting for the other. Wren sees what both have found
          and mentions a partner&apos;s find when it changes what yours means. A chapter&apos;s ending is written from
          everything both players found. Turns are saved under a short per-story lock, so two photos sent at once both
          count. If your friend hasn&apos;t joined by the time your part is done, you can play their lead too.
        </p>
      </section>

      <section className="mt-14 md:mt-20" aria-labelledby="built-title">
        <Heading id="built-title">Built with</Heading>
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
