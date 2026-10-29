"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { renderSVG } from "uqr";
import { BUTTON } from "./buttons";

const never = () => () => {};

/**
 * A code to scan with a phone, for whoever opens the site on a computer. It points at the
 * address this page was opened from, so on a laptop running the dev server it reaches the
 * phone on the same Wi-Fi too.
 */
export function PlayCode() {
  const origin = useSyncExternalStore(never, () => window.location.origin, () => null);
  const url = origin && `${origin}/play`;
  return (
    <div className="w-72 rounded-[20px] bg-kerb p-6">
      <p className="font-sign text-2xl font-bold">Play on your phone</p>
      <p className="mt-1 text-concrete">Scan this with your phone&apos;s camera.</p>
      <div
        role="img"
        aria-label={url ? `A code that opens ${url}` : "A code that opens the game"}
        className="mt-4 aspect-square overflow-hidden rounded-[12px] bg-paint [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={url ? { __html: renderSVG(url, { border: 2 }) } : undefined}
      />
      {url && <p className="mt-3 text-center font-semibold break-all">{url.replace(/^https?:\/\//, "")}</p>}
      <Link href="/play" className={`${BUTTON.link} mt-3`}>
        Or try it here with photos from this computer
      </Link>
    </div>
  );
}
