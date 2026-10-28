import assert from "node:assert/strict";
import { test } from "node:test";
import { fromSingleWalk } from "./migrate";

const quest = { id: "q", title: "The door" };

test("a story saved mid-walk gives its walk, step and last words to the walker's seat", () => {
  const old = {
    playerId: "owner",
    chapter: 2,
    quest,
    lastNarration: "The door is open.",
    walk: { active: true, startedAt: "t", questsDone: 2, photosSinceProgress: 1, playerId: "friend" },
  };
  assert.deepEqual(fromSingleWalk(old), {
    playerId: "owner",
    chapter: 2,
    seats: [
      { playerId: "friend", lead: "a", quest, walking: true, startedAt: "t", photosSinceProgress: 1, lastNarration: "The door is open." },
    ],
    closed: 1,
    progress: { a: 2, b: 0 },
  });
});

test("a story saved between chapters has its last chapter closed, and the owner's seat", () => {
  const old = { playerId: "owner", chapter: 1, quest: null, walk: { active: false, startedAt: null, questsDone: 3, playerId: null } };
  const migrated = fromSingleWalk(old) as { seats: { playerId: string; walking: boolean }[]; closed: number; progress: object };
  assert.deepEqual([migrated.seats[0].playerId, migrated.seats[0].walking], ["owner", false]);
  assert.equal(migrated.closed, 1);
  assert.deepEqual(migrated.progress, { a: 0, b: 0 });
});

test("a story that already has seats is left alone", () => {
  const current = { playerId: "owner", chapter: 1, seats: [] };
  assert.equal(fromSingleWalk(current), current);
});
