import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";
import { SectionHeading } from "@/components/SectionHeading";
import { SiteFooter, SiteHeader } from "@/components/SiteNav";
import { StatTiles } from "@/components/StatTiles";
import { INACTIVITY_FACTS, WALKING_FACTS } from "@/lib/impact";
import { linkPreview } from "@/lib/site";

const DESCRIPTION = "Why Questory is played on foot, outside.";

export const metadata: Metadata = {
  title: "Impact",
  description: DESCRIPTION,
  ...linkPreview("Impact · Questory", DESCRIPTION),
};

const TEXT = "mt-6 max-w-2xl text-lg text-pretty";
const SECTION = "mt-14 md:mt-20";

/** Why the game is played on foot, outside: each section is the numbers, then what Questory does about them. */
export default function Impact() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-14 md:px-10 md:pt-12">
      <SiteHeader current="impact" />

      <h1 className="mt-10 font-sign text-[2.5rem] leading-[1.05] font-bold md:mt-14 md:text-6xl">Impact</h1>
      <p className="mt-5 max-w-2xl font-story text-lg leading-relaxed text-pretty md:text-xl">
        A third of adults don&apos;t move enough, and the share keeps growing. A walk outside is one of the simplest
        things that helps, and Questory gives you a reason to take one.
      </p>

      <section className="mt-12 md:mt-16" aria-labelledby="less-title">
        <SectionHeading id="less-title">We&apos;re moving less</SectionHeading>
        <StatTiles facts={INACTIVITY_FACTS} className="mt-8" />
        <p className={TEXT}>
          Questory starts small. You choose how long to walk, from a 15-minute break to an hour, gradually building a
          habit of outdoor exercise.
        </p>
      </section>

      <section className={SECTION} aria-labelledby="walk-title">
        <SectionHeading id="walk-title">A walk outside helps</SectionHeading>
        <StatTiles facts={WALKING_FACTS} className="mt-8" />
        <p className={TEXT}>
          Every case is solved outside, on foot, with new evidence every few minutes along the way. The engaging story
          gives players a reason to keep walking.
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
