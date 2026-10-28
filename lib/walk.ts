/**
 * Time on foot and places found, worked out from turn timestamps. No GPS and no extra
 * permissions. The browser uses it, so it has no server-only imports.
 */

/** A longer gap between two turns means the player stopped and came back later. */
export const BREAK_MINUTES = 45;

type Turn = { kind: string; createdAt: string; photoUrl: string | null };

export type WalkStats = { minutes: number; places: number };

/** The newest chapter's turns: from the photo that opened it to its last turn. */
export function currentChapter<T extends Turn>(turns: T[]): T[] {
  const start = turns.findLastIndex((turn) => turn.kind === "genesis" || turn.kind === "resume");
  return start === -1 ? turns : turns.slice(start);
}

/** Minutes between consecutive turns, leaving out breaks, and the number of photos taken. */
export function walkStats(turns: Turn[]): WalkStats {
  let ms = 0;
  for (let i = 1; i < turns.length; i++) {
    const gap = Date.parse(turns[i].createdAt) - Date.parse(turns[i - 1].createdAt);
    if (gap > 0 && gap <= BREAK_MINUTES * 60_000) ms += gap;
  }
  return { minutes: Math.round(ms / 60_000), places: turns.filter((turn) => turn.photoUrl !== null).length };
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "24 minutes", or "1 hour 12 minutes". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return plural(minutes, "minute");
  const rest = minutes % 60;
  return plural(Math.floor(minutes / 60), "hour") + (rest ? ` ${plural(rest, "minute")}` : "");
}

/** "5 places". */
export function formatPlaces(places: number): string {
  return plural(places, "place");
}
