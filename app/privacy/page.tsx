import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BUTTON } from "@/components/buttons";
import { CameraIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/SiteNav";
import { GITHUB_URL, linkPreview } from "@/lib/site";

const DESCRIPTION = "What happens to your photos and stories in Questory.";

export const metadata: Metadata = {
  title: "Privacy",
  description: DESCRIPTION,
  ...linkPreview("Privacy · Questory", DESCRIPTION),
};

const LINK = "font-semibold text-paint underline underline-offset-4 hover:text-lane";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-sign text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-lg text-pretty">{children}</p>
    </section>
  );
}

/** What happens to photos and stories, in plain words, before anyone takes a photo. */
export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-14 md:px-10 md:pt-12">
      <SiteHeader current="privacy" />

      <div className="max-w-2xl">
        <h1 className="mt-10 font-sign text-[2.5rem] leading-[1.05] font-bold md:mt-14 md:text-6xl">Privacy</h1>
        <p className="mt-5 font-story text-lg leading-relaxed md:text-xl">
          Questory has no accounts and never asks where you are. This is what happens to your photos and stories.
        </p>

        <Part title="Your photos go to Meta">
          Wren runs on Meta&apos;s AI models through the Meta Model API. Each photo you take in the game is sent there
          with the story so far, to write what happens, check it against the photo, outline what a quest points at and
          paint the evidence. Meta may use what it receives to improve its products. Leave people&apos;s faces and number
          plates out of your photos.
        </Part>
        <Part title="No account">
          There is no sign-up. A random ID in a cookie links your stories to this browser, so if you clear your cookies,
          you can&apos;t open them here again.
        </Part>
        <Part title="No location">
          The app never asks where you are. Your phone re-encodes each photo before sending it, which removes its location
          data, and walk times come from when photos were sent.
        </Part>
        <Part title="Where it's kept">
          Stories, photos and evidence pictures are stored in{" "}
          <a href="https://appwrite.io" className={LINK}>
            Appwrite
          </a>
          . Photos and pictures sit in an encrypted private bucket and are shown only through unguessable links.
        </Part>
        <Part title="Playing with a friend">
          An invite link shows only its own case, and a case has room for one friend, so a forwarded link can&apos;t let a
          third person in.
        </Part>
        <Part title="Deleting a story">
          Deleting a story also deletes its photos and evidence pictures. Tap Edit above your stories to delete one.
        </Part>
        <Part title="Questions">
          Open an issue on{" "}
          <a href={`${GITHUB_URL}/issues`} className={LINK}>
            GitHub
          </a>
          .
        </Part>
      </div>

      <Link href="/play" className={`${BUTTON.primary} mt-12 w-full md:hidden`}>
        <CameraIcon className="h-6 w-6" />
        Play
      </Link>

      <SiteFooter current="privacy" />
    </main>
  );
}
