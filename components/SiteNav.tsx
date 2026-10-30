import Link from "next/link";
import type { ReactNode } from "react";
import { GITHUB_URL } from "@/lib/site";
import { Wordmark } from "./Wordmark";

/** The site's own pages, around the game. */
type Page = "home" | "how-it-works" | "privacy";

const PAGES: { href: string; label: string; page: Page | null }[] = [
  { href: "/how-it-works", label: "How it works", page: "how-it-works" },
  { href: "/privacy", label: "Privacy", page: "privacy" },
  { href: GITHUB_URL, label: "GitHub", page: null },
];

const LINK = "rounded-md hover:text-paint aria-[current=page]:text-paint";

function Links({ current, label, className }: { current: Page; label: string; className: string }) {
  return (
    <nav aria-label={label} className={className}>
      {PAGES.map(({ href, label, page }) =>
        page ? (
          <Link key={href} href={href} aria-current={page === current ? "page" : undefined} className={LINK}>
            {label}
          </Link>
        ) : (
          <a key={href} href={href} className={LINK}>
            {label}
          </a>
        ),
      )}
    </nav>
  );
}

/** The wordmark leads home. A computer also gets the other pages up here; a phone finds them in the footer. */
export function SiteHeader({ current }: { current: Page }) {
  return (
    <header className="flex items-start justify-between gap-8">
      <Link href="/" aria-label="Questory home" className="rounded-md">
        <Wordmark />
      </Link>
      <Links current={current} label="Pages" className="hidden gap-8 pt-2 text-lg font-semibold text-concrete md:flex" />
    </header>
  );
}

export function SiteFooter({ current, children }: { current: Page; children?: ReactNode }) {
  return (
    <footer className="mt-14 border-t border-seam pt-6 text-sm text-concrete md:mt-20">
      <Links current={current} label="More about Questory" className="flex flex-wrap gap-x-7 gap-y-2 text-base font-semibold" />
      {children && <p className="mt-4">{children}</p>}
      <p className={children ? "mt-1" : "mt-4"}>
        Built for the Meta Global AI Developer Hackathon with Muse Wonder, Muse Spark, SAM 3.1 and Muse Image.
      </p>
    </footer>
  );
}
