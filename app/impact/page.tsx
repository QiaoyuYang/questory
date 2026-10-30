import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";
import { SectionHeading } from "@/components/SectionHeading";
import { SiteFooter, SiteHeader } from "@/components/SiteNav";
import { StatTiles } from "@/components/StatTiles";
import { TOGETHER_FACTS, WALKING_FACTS } from "@/lib/impact";
import { linkPreview } from "@/lib/site";

const DESCRIPTION = "Why Questory is played on foot, and with a friend.";

export const metadata: Metadata = {
  title: "Impact",
  description: DESCRIPTION,
  ...linkPreview("Impact · Questory", DESCRIPTION),
};

const TEXT = "mt-6 max-w-2xl text-lg text-pretty";
const SECTION = "mt-14 md:mt-20";

/** Why the game is played on foot and with a friend: each section is the numbers, then what Questory does about them. */
export default function Impact() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-14 md:px-10 md:pt-12">
      <SiteHeader current="impact" />

      <h1 className="mt-10 font-sign text-[2.5rem] leading-[1.05] font-bold md:mt-14 md:text-6xl">Impact</h1>
      <p className="mt-5 max-w-2xl font-story text-lg leading-relaxed text-pretty md:text-xl">
        Every case is solved on foot, and you can solve one with a friend far away.
      </p>

      <section className="mt-12 md:mt-16" aria-labelledby="foot-title">
        <SectionHeading id="foot-title">On foot</SectionHeading>
        <StatTiles facts={WALKING_FACTS} className="mt-8" />
        <p className={TEXT}>A case takes a few walks to solve, and the story gives you a reason to go back out.</p>
      </section>

      <section className={SECTION} aria-labelledby="together-title">
        <SectionHeading id="together-title">Together</SectionHeading>
        <StatTiles facts={TOGETHER_FACTS} className="mt-8" />
        <p className={TEXT}>
          With a friend, you each walk your own streets, even in different cities, and the evidence comes together in one
          case.
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
