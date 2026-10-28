/**
 * Time on foot and places found, worked out from turn timestamps. No GPS and no extra
 * permissions. The browser uses it, so it has no server-only imports.
 */

/** A longer gap between two turns means the player stopped and came back later. */
export const BREAK_MINUTES = 45;

type Player = "you" | "partner";

/** `playedBy` is set on turns from a shared case; without it, the viewer played the turn. */
type Turn = { kind: string; createdAt: string; photoUrl: string | null; playedBy?: Player };

export type WalkStats = { minutes: number; places: number };

/** The newest chapter's turns: from the photo that opened it to its last turn. */
export function currentChapter<T extends Turn>(turns: T[]): T[] {
  const start = turns.findLastIndex((turn) => turn.kind === "genesis" || turn.kind === "resume");
  return start === -1 ? turns : turns.slice(start);
}

const by = (turn: Turn): Player => turn.playedBy ?? "you";

/**
 * Minutes on foot and photos taken. Time counts between two turns by the same person,
 * leaving out breaks, so in a shared case the wait between one player's chapter and
 * the next player's never counts. With `player`, only that player's share.
 */
export function walkStats(turns: Turn[], player?: Player): WalkStats {
  const counts = (turn: Turn) => player === undefined || by(turn) === player;
  let ms = 0;
  for (let i = 1; i < turns.length; i++) {
    const [before, after] = [turns[i - 1], turns[i]];
    if (by(before) !== by(after) || !counts(after)) continue;
    const gap = Date.parse(after.createdAt) - Date.parse(before.createdAt);
    if (gap > 0 && gap <= BREAK_MINUTES * 60_000) ms += gap;
  }
  return {
    minutes: Math.round(ms / 60_000),
    places: turns.filter((turn) => turn.photoUrl !== null && counts(turn)).length,
  };
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
