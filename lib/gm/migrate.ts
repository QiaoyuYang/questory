/**
 * Stories saved before two players could walk a case at once kept one walk, one next
 * step and one last narration for the whole story, and every chapter ended with its walk.
 * This gives that walk to the seat of whoever was on it. No server-only import, so it can
 * be tested.
 */

type SingleWalkStory = {
  playerId: string;
  chapter: number;
  quest?: unknown;
  lastNarration?: string;
  walk?: {
    active?: boolean;
    startedAt?: string | null;
    questsDone?: number;
    photosSinceProgress?: number;
    playerId?: string | null;
  };
};

export function fromSingleWalk(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || "seats" in raw) return raw;
  const { quest = null, walk = {}, lastNarration = "", ...rest } = raw as SingleWalkStory;
  const active = walk.active === true;
  return {
    ...rest,
    seats: [
      {
        playerId: walk.playerId ?? rest.playerId,
        lead: "a",
        quest: active ? quest : null,
        walking: active,
        startedAt: walk.startedAt ?? null,
        photosSinceProgress: walk.photosSinceProgress ?? 0,
        lastNarration,
      },
    ],
    closed: active ? rest.chapter - 1 : rest.chapter,
    progress: { a: active ? (walk.questsDone ?? 0) : 0, b: 0 },
  };
}
