import Image from "next/image";
import Link from "next/link";
import { PlayCode } from "@/components/PlayCode";
import { Wordmark } from "@/components/Wordmark";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";

/** Three moments from a real case, played on a phone. */
const MOMENTS = [
  {
    src: "/landing/opening.webp",
    alt: "A photo of a bakery on a street corner, with the opening of a case below it: the bakery's sourdough starter has gone, and the next step is a closer look at the bench outside.",
    title: "Your street starts the case",
    text: "Take a photo of where you are, even indoors. Wren writes the opening around it, and the first quest sends you outside.",
  },
  {
    src: "/landing/evidence.webp",
    alt: "The photo redrawn as an evidence card called The waiting bench, with Wren's note that someone sat there before the bakery opened.",
    title: "What you find becomes evidence",
    text: "Each quest sends you a short walk away, and the photo you take there is redrawn as evidence.",
  },
  {
    src: "/landing/case.webp",
    alt: "The case so far: two pieces of evidence found, and ten more to find before the answer.",
    title: "Gather the evidence",
    text: "Each chapter adds four pieces of evidence, and the twelfth solves the case.",
  },
];

/** The same case for two, from the friend's phone. */
const TOGETHER = [
  {
    src: "/landing/join.webp",
    alt: "A friend's phone opening the invite: a case about prize tomato seedlings missing from a shed, with a button to join it.",
    title: "Send a friend the link",
    text: "They see the case and take the other lead, on their own walk, now or later.",
  },
  {
    src: "/landing/together.webp",
    alt: "The shared case: one piece of evidence found by you and one by your partner, with 22 more to find.",
    title: "Solve it together",
    text: "Every piece shows who found it, and a chapter ends once you've both found your part.",
  },
];

/** A phone screen and what it shows. */
function Moment({ src, alt, title, text, number, delay }: (typeof MOMENTS)[number] & { number?: number; delay: number }) {
  return (
    <li className="rise w-[72%] shrink-0 snap-center md:w-auto" style={{ animationDelay: `${delay}ms` }}>
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-kerb shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] md:max-w-[17rem]">
        <Image src={src} alt={alt} width={600} height={1300} sizes="(min-width: 768px) 272px, 72vw" className="block h-auto w-full" />
      </div>
      {number && <p className="mt-5 font-sign text-lg font-bold text-lane">{number}</p>}
      <h3 className={`${number ? "" : "mt-5 "}font-sign text-xl font-bold`}>{title}</h3>
      <p className="mt-1 max-w-[19rem] text-concrete">{text}</p>
    </li>
  );
}

const ROW =
  "-mx-4 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-10 md:overflow-visible md:px-0";

/** What Questory is, shown with a real case, and the way in: a code on a computer, a button on a phone. */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-14 md:px-10 md:pt-12">
      <Wordmark />

      <section className="mt-10 grid gap-8 md:mt-14 md:grid-cols-[1fr_auto] md:items-center md:gap-16">
        <div>
          <h1 className="max-w-2xl font-sign text-[2.5rem] leading-[1.05] font-bold text-balance md:text-6xl">
            Turn photos of your street into a story
          </h1>
          <p className="mt-5 max-w-xl font-story text-lg leading-relaxed md:text-xl">
            Wren, an AI game master, builds a case from what you photograph, and its quests lead you outside to solve
            it.
          </p>
          <Link href="/play" className={`${BUTTON.primary} mt-7 w-full md:hidden`}>
            <CameraIcon className="h-6 w-6" />
            Play
          </Link>
        </div>
        <div className="hidden md:block">
          <PlayCode />
        </div>
      </section>

      <section className="mt-14 md:mt-20" aria-labelledby="plays-title">
        <h2 id="plays-title" className="font-sign text-2xl font-bold md:text-3xl">
          How to play
        </h2>
        <div className="lane-line mt-3 w-24" aria-hidden="true" />
        <ol className={ROW}>
          {MOMENTS.map((moment, i) => (
            <Moment key={moment.src} {...moment} number={i + 1} delay={i * 150} />
          ))}
        </ol>
      </section>

      <section className="mt-14 md:mt-20" aria-labelledby="friend-title">
        <h2 id="friend-title" className="font-sign text-2xl font-bold md:text-3xl">
          Play with a friend
        </h2>
        <div className="lane-line mt-3 w-24" aria-hidden="true" />
        <p className="mt-6 max-w-xl text-lg">
          A case can have two players. You each follow your own lead on your own walk, and the evidence comes together
          in one case.
        </p>
        <ul className={ROW}>
          {TOGETHER.map((moment) => (
            <Moment key={moment.src} {...moment} delay={0} />
          ))}
        </ul>
      </section>

      <footer className="mt-14 border-t border-seam pt-6 text-sm text-concrete md:flex md:justify-between md:gap-8">
        <p>No account to make, and it never asks where you are.</p>
        <p className="mt-2 md:mt-0">
          Built for the Meta Global AI Developer Hackathon with Muse Wonder, Muse Spark, SAM 3.1 and Muse Image.
        </p>
      </footer>
    </main>
  );
}
