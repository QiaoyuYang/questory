import assert from "node:assert/strict";
import { test } from "node:test";
import { activateNextBeat, completeActiveBeat, makeBeats, replan, updateBeats } from "./beats";
import type { Beat } from "./state";

const summary = (beats: Beat[]) => beats.map((beat) => `${beat.id}:${beat.status}`).join(" ");

/** Beats b1 to b5, with the first `done` of them finished. */
function storyWith(done: number): Beat[] {
  let beats = activateNextBeat(makeBeats(["one", "two", "three", "four", "five"], 0));
  for (let i = 0; i < done; i++) beats = completeActiveBeat(beats);
  return beats;
}

test("new beats are numbered after the start index, and blank goals are dropped", () => {
  assert.equal(summary(makeBeats(["one", "  ", "two"], 3)), "b4:pending b5:pending");
});

test("completing a beat activates the next one", () => {
  assert.equal(summary(completeActiveBeat(storyWith(0))), "b1:done b2:active b3:pending b4:pending b5:pending");
});

test("a turn that finishes a beat and replans keeps the finished beat", () => {
  // b1 is done and b2 is active. The player finishes b2, and the game master replaces the rest.
  const beats = updateBeats(storyWith(1), { beatComplete: true, replanWith: ["new goal", "another new goal"] });
  assert.equal(summary(beats), "b1:done b2:done b6:active b7:pending");
});

test("a turn that replans without finishing a beat replaces the active beat too", () => {
  const beats = updateBeats(storyWith(1), { beatComplete: false, replanWith: ["new goal"] });
  assert.equal(summary(beats), "b1:done b6:active");
});

test("a turn with no plan change only advances the beat", () => {
  assert.equal(summary(updateBeats(storyWith(1), { beatComplete: true, replanWith: null })), "b1:done b2:done b3:active b4:pending b5:pending");
  assert.equal(summary(updateBeats(storyWith(1), { beatComplete: false, replanWith: null })), "b1:done b2:active b3:pending b4:pending b5:pending");
});

test("replanning with no new goals leaves the beats alone", () => {
  const beats = storyWith(1);
  assert.equal(replan(beats, null), beats);
  assert.equal(replan(beats, []), beats);
});
