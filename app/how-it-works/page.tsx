import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/SiteNav";
import { GITHUB_URL, linkPreview } from "@/lib/site";
import { TurnDiagram } from "@/components/TurnDiagram";

const DESCRIPTION = "How Questory uses four models from the Meta Model API to build a case from your photos.";

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

/** The models behind a turn, and how a case holds together, for anyone curious and for judges. */
export default function HowItWorks() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-14 md:px-10 md:pt-12">
      <SiteHeader current="how-it-works" />

      <h1 className="mt-10 font-sign text-[2.5rem] leading-[1.05] font-bold md:mt-14 md:text-6xl">How it works</h1>
      <p className="mt-5 max-w-2xl font-story text-lg leading-relaxed md:text-xl">
        Questory uses four models from the Meta Model API. Every photo you take goes through them in one turn.
      </p>

      <section className="mt-12 md:mt-16" aria-labelledby="turn-title">
        <Heading id="turn-title">A turn</Heading>
        <TurnDiagram className="mt-8" />
      </section>

      <section className="mt-10 md:mt-12" aria-labelledby="case-title">
        <Heading id="case-title">The case</Heading>
        <p className={TEXT}>
          Every case has one question and a hidden answer that Wren decides at the start. Wren plans each chapter as
          places and objects to find, and each quest goes where the last find pointed, so the evidence forms a trail.
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
        <p className={TEXT}>Wren keeps each story in three layers, saved after every turn.</p>
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
