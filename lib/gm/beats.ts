import type { Beat } from "./state";

/**
 * Bookkeeping for the story's beats: goals that work anywhere, played in order along a
 * lead. A two-player case has two leads, one per player, played at the same time; every
 * other case has one. Pure functions, so they can be tested without the rest of the engine.
 */

export const LEADS = ["a", "b"] as const;
export type Lead = (typeof LEADS)[number];

/** Turn goals into pending beats on a lead, numbered after `startIndex`. Blank goals are dropped. */
export function makeBeats(goals: string[], startIndex: number, lead: Lead = "a"): Beat[] {
  return goals
    .map((goal) => goal.trim())
    .filter(Boolean)
    .map((goal, i) => ({ id: `b${startIndex + i + 1}`, goal, status: "pending" as const, lead }));
}

/** Give every lead an active beat, its first pending one, unless it already has one. */
export function activateNextBeat(beats: Beat[]): Beat[] {
  const starting = new Set<number>();
  for (const lead of LEADS) {
    if (beats.some((beat) => beat.lead === lead && beat.status === "active")) continue;
    const index = beats.findIndex((beat) => beat.lead === lead && beat.status === "pending");
    if (index !== -1) starting.add(index);
  }
  return starting.size === 0 ? beats : beats.map((beat, i) => (starting.has(i) ? { ...beat, status: "active" } : beat));
}

/** How many beats are left to play, on one lead or on all of them. */
export function unfinishedBeats(beats: Beat[], lead?: Lead): number {
  return beats.filter(
    (beat) => (lead === undefined || beat.lead === lead) && (beat.status === "pending" || beat.status === "active"),
  ).length;
}

/** The beat a lead is working on, if any. */
export function activeBeatId(beats: Beat[], lead: Lead): string | null {
  return beats.find((beat) => beat.lead === lead && beat.status === "active")?.id ?? null;
}

/** A lead's unfinished beats in order, the active one first. */
export function openBeats(beats: Beat[], lead: Lead): Beat[] {
  return beats.filter((beat) => beat.lead === lead && (beat.status === "active" || beat.status === "pending"));
}

/** Mark a lead's active beat done and move that lead on to its next one. */
export function completeActiveBeat(beats: Beat[], lead: Lead): Beat[] {
  return activateNextBeat(
    beats.map((beat) => (beat.lead === lead && beat.status === "active" ? { ...beat, status: "done" } : beat)),
  );
}

/**
 * Replace a lead's unfinished beats with new goals. Done and skipped beats stay, and so
 * does the other lead, so when a turn both finishes a beat and replans, complete the beat
 * first. The lead keeps as many beats as it had, so the case keeps its length: extra goals
 * are dropped, and missing ones are made up from the old plan's last beats.
 */
export function replan(beats: Beat[], goals: string[] | null, lead: Lead): Beat[] {
  const fresh = (goals ?? []).map((goal) => goal.trim()).filter(Boolean);
  if (fresh.length === 0) return beats;
  const unfinished = beats.filter((beat) => beat.lead === lead && (beat.status === "pending" || beat.status === "active"));
  const goalsKept = [...fresh, ...unfinished.slice(fresh.length).map((beat) => beat.goal)].slice(0, unfinished.length);
  const kept = beats.filter((beat) => !unfinished.includes(beat));
  const highest = beats.reduce((max, beat) => Math.max(max, Number(beat.id.slice(1)) || 0), 0);
  return activateNextBeat([...kept, ...makeBeats(goalsKept, highest, lead)]);
}

/**
 * A lead's beats after a photo turn. The finished beat is completed before any replan,
 * because replan keeps only finished beats.
 */
export function updateBeats(
  beats: Beat[],
  lead: Lead,
  turn: { beatComplete: boolean; replanWith: string[] | null },
): Beat[] {
  const afterBeat = turn.beatComplete ? completeActiveBeat(beats, lead) : beats;
  return turn.replanWith ? replan(afterBeat, turn.replanWith, lead) : afterBeat;
}
