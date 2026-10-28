/**
 * Time on foot and places found, worked out from turn timestamps. No GPS and no extra
 * permissions. The browser uses it, so it has no server-only imports.
 */

/** A longer gap between two turns means the player stopped and came back later. */
export const BREAK_MINUTES = 45;

type Player = "you" | "partner";

/** `playedBy` is set on turns from a shared case; without it, the viewer played the turn. */
type Turn = { kind: string; createdAt: string; photoUrl: string | null; playedBy?: Player; chapter?: number | null };

export type WalkStats = { minutes: number; places: number };

/** The newest chapter's turns: from the photo that opened it to its last turn. */
export function currentChapter<T extends Turn>(turns: T[]): T[] {
  const start = turns.findLastIndex((turn) => turn.kind === "genesis" || turn.kind === "resume");
  return start === -1 ? turns : turns.slice(start);
}

/**
 * A chapter's turns, by both players, across every walk it took. Turns from before
 * chapters were kept on them fall back to the newest chapter's.
 */
export function chapterTurns<T extends Turn>(turns: T[], chapter: number): T[] {
  const kept = turns.filter((turn) => turn.chapter === chapter);
  return kept.length > 0 ? kept : currentChapter(turns);
}

const by = (turn: Turn): Player => turn.playedBy ?? "you";

/**
 * Minutes on foot and photos taken. Time counts between two turns by the same person,
 * leaving out breaks, so in a shared case neither player's time includes the other's,
 * whether they walk at the same time or one after the other. With `player`, only that
 * player's share.
 */
export function walkStats(all: Turn[], player?: Player): WalkStats {
  // A chapter's ending is no one's walk.
  const turns = all.filter((turn) => turn.kind !== "close");
  let ms = 0;
  for (const who of player ? [player] : (["you", "partner"] as const)) {
    const own = turns.filter((turn) => by(turn) === who);
    for (let i = 1; i < own.length; i++) {
      const gap = Date.parse(own[i].createdAt) - Date.parse(own[i - 1].createdAt);
      if (gap > 0 && gap <= BREAK_MINUTES * 60_000) ms += gap;
    }
  }
  return {
    minutes: Math.round(ms / 60_000),
    places: turns.filter((turn) => turn.photoUrl !== null && (player === undefined || by(turn) === player)).length,
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
