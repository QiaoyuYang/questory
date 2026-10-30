import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";
import { SectionHeading } from "@/components/SectionHeading";
import { SiteFooter, SiteHeader } from "@/components/SiteNav";
import { StatTiles } from "@/components/StatTiles";
import { POKEMON_REVIEW, TOGETHER_FACTS, WALKING_FACTS } from "@/lib/impact";
import { linkPreview } from "@/lib/site";

const DESCRIPTION = "Why Questory is played on foot, and with a friend.";

export const metadata: Metadata = {
  title: "Impact",
  description: DESCRIPTION,
  ...linkPreview("Impact · Questory", DESCRIPTION),
};

const TEXT = "mt-6 max-w-2xl text-lg text-pretty";
const LINK = "font-semibold text-paint underline underline-offset-4 hover:text-lane";
const SECTION = "mt-14 md:mt-20";

/** Why the game is played on foot and in pairs, with the research behind each number. */
export default function Impact() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-14 md:px-10 md:pt-12">
      <SiteHeader current="impact" />

      <h1 className="mt-10 font-sign text-[2.5rem] leading-[1.05] font-bold md:mt-14 md:text-6xl">Impact</h1>
      <p className="mt-5 max-w-2xl font-story text-lg leading-relaxed md:text-xl">
        Every case is solved on foot, alone or with a friend.
      </p>

      <section className="mt-12 md:mt-16" aria-labelledby="foot-title">
        <SectionHeading id="foot-title">On foot</SectionHeading>
        <StatTiles facts={WALKING_FACTS} className="mt-8" />
        <p className={TEXT}>Each quest is a short walk away, so a case adds up to a few walks.</p>
      </section>

      <section className={SECTION} aria-labelledby="together-title">
        <SectionHeading id="together-title">Together</SectionHeading>
        <StatTiles facts={TOGETHER_FACTS} className="mt-8" />
        <p className={TEXT}>
          With a friend, you each walk your own streets and solve one case together, even from different cities. In{" "}
          <a href={POKEMON_REVIEW.url} className={LINK}>
            {POKEMON_REVIEW.name}
          </a>{" "}
          of Pokémon GO studies, the social benefits came most from playing with others.
        </p>
      </section>

      <section className={SECTION} aria-labelledby="back-title">
        <SectionHeading id="back-title">Coming back</SectionHeading>
        <p className={TEXT}>
          The same review found that Pokémon GO got people moving, but the extra activity often didn&apos;t last. A
          Questory case runs over several walks, so the story gives you a reason to go out again.
        </p>
      </section>

      <Link href="/play" className={`${BUTTON.primary} mt-12 w-full md:hidden`}>
        <CameraIcon className="h-6 w-6" />
        Play
      </Link>

      <SiteFooter current="impact" />
    </main>
  );
}
