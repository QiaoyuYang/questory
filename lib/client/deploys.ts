/**
 * Vercel's free plan has no skew protection, so a page left open across a deploy keeps
 * running its old code against the new server. Every API reply names the deploy that
 * sent it (see next.config.ts). When a newer one answers, the page reloads itself once
 * nothing is in flight.
 */
export const BUILD_HEADER = "x-questory-build";

const RELOADED_KEY = "questory:reloaded-for";
/** How long after a reply the page waits before it may reload. */
const SETTLE_MS = 1000;
/** Coming back after this long away checks for a deploy before the player does anything. */
const AWAY_MS = 3 * 60_000;

// The deploy behind this page's first reply, and a newer one that has answered since.
let pageBuild: string | null = null;
let newerBuild: string | null = null;
let inFlight = 0;

export function requestStarted() {
  inFlight += 1;
}

export function requestSettled(build: string | null) {
  inFlight -= 1;
  if (build) {
    pageBuild ??= build;
    if (build !== pageBuild) newerBuild = build;
  }
  // A moment later, once anything the reply sets off has started, like drawing a turn's
  // picture or the screen asking for it.
  window.setTimeout(reloadIfNewer, SETTLE_MS);
}

function reloadIfNewer() {
  // Not while the page is hidden either: that's the camera, and its photo would be lost.
  if (!newerBuild || inFlight > 0 || document.visibilityState !== "visible") return;
  try {
    // Once per deploy, in case the reload lands on the old one again.
    if (sessionStorage.getItem(RELOADED_KEY) === newerBuild) return;
    sessionStorage.setItem(RELOADED_KEY, newerBuild);
  } catch {
    return;
  }
  window.location.reload();
}

/** Checks in with the server when the player comes back after a while away. */
export function watchForDeploys(checkIn: () => Promise<unknown>): () => void {
  let hiddenAt = 0;
  const onChange = () => {
    if (document.visibilityState === "hidden") hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) checkIn().catch(() => {});
  };
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
