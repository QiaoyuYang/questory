import type { Beat } from "./state";

/**
 * Bookkeeping for the story's beats: goals that work anywhere, played in order.
 * Pure functions, so they can be tested without the rest of the engine.
 */

/** Turn goals into pending beats, numbered after `startIndex`. Blank goals are dropped. */
export function makeBeats(goals: string[], startIndex: number): Beat[] {
  return goals
    .map((goal) => goal.trim())
    .filter(Boolean)
    .map((goal, i) => ({ id: `b${startIndex + i + 1}`, goal, status: "pending" as const }));
}

/** Make the first pending beat active, unless one already is. */
export function activateNextBeat(beats: Beat[]): Beat[] {
  if (beats.some((beat) => beat.status === "active")) return beats;
  const index = beats.findIndex((beat) => beat.status === "pending");
  return index === -1 ? beats : beats.map((beat, i) => (i === index ? { ...beat, status: "active" } : beat));
}

/** How many beats are left to play: the active one and the pending ones after it. */
export function unfinishedBeats(beats: Beat[]): number {
  return beats.filter((beat) => beat.status === "pending" || beat.status === "active").length;
}

/** The beat the story is working on, if any. */
export function activeBeatId(beats: Beat[]): string | null {
  return beats.find((beat) => beat.status === "active")?.id ?? null;
}

/** Mark the active beat done and move on to the next one. */
export function completeActiveBeat(beats: Beat[]): Beat[] {
  return activateNextBeat(beats.map((beat) => (beat.status === "active" ? { ...beat, status: "done" } : beat)));
}

/**
 * Replace every unfinished beat with new goals. Done and skipped beats stay, so when a
 * turn both finishes a beat and replans, complete the beat first.
 */
export function replan(beats: Beat[], goals: string[] | null): Beat[] {
  if (!goals || goals.length === 0) return beats;
  const kept = beats.filter((beat) => beat.status === "done" || beat.status === "skipped");
  const highest = beats.reduce((max, beat) => Math.max(max, Number(beat.id.slice(1)) || 0), 0);
  return activateNextBeat([...kept, ...makeBeats(goals, highest)]);
}

/**
 * The beats after a photo turn. The finished beat is completed before any replan,
 * because replan keeps only finished beats.
 */
export function updateBeats(beats: Beat[], turn: { beatComplete: boolean; replanWith: string[] | null }): Beat[] {
  const afterBeat = turn.beatComplete ? completeActiveBeat(beats) : beats;
  return turn.replanWith ? replan(afterBeat, turn.replanWith) : afterBeat;
}
