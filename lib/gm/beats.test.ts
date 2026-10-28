import assert from "node:assert/strict";
import { test } from "node:test";
import { activateNextBeat, completeActiveBeat, makeBeats, replan, updateBeats } from "./beats";
import type { Beat } from "./state";

const summary = (beats: Beat[]) => beats.map((beat) => `${beat.id}:${beat.status}`).join(" ");

/** Beats b1 to b5, with the first `done` of them finished. */
function storyWith(done: number): Beat[] {
  let beats = activateNextBeat(makeBeats(["one", "two", "three", "four", "five"], 0));
  for (let i = 0; i < done; i++) beats = completeActiveBeat(beats, "a");
  return beats;
}

test("new beats are numbered after the start index, and blank goals are dropped", () => {
  assert.equal(summary(makeBeats(["one", "  ", "two"], 3)), "b4:pending b5:pending");
});

test("completing a beat activates the next one", () => {
  assert.equal(summary(completeActiveBeat(storyWith(0), "a")), "b1:done b2:active b3:pending b4:pending b5:pending");
});

test("a turn that finishes a beat and replans keeps the finished beat", () => {
  // b1 is done and b2 is active. The player finishes b2, and the game master replaces the rest.
  const beats = updateBeats(storyWith(1), "a", { beatComplete: true, replanWith: ["new goal", "another new goal"] });
  assert.equal(summary(beats), "b1:done b2:done b6:active b7:pending b8:pending");
  // Two new goals for three open beats: the old plan's last one stays, so the case keeps its length.
  assert.deepEqual(beats.slice(2).map((beat) => beat.goal), ["new goal", "another new goal", "five"]);
});

test("a turn that replans without finishing a beat replaces the active beat too", () => {
  const beats = updateBeats(storyWith(1), "a", { beatComplete: false, replanWith: ["new goal"] });
  assert.equal(summary(beats), "b1:done b6:active b7:pending b8:pending b9:pending");
  // Extra goals are dropped for the same reason.
  const longer = updateBeats(storyWith(3), "a", { beatComplete: false, replanWith: ["x", "y", "z"] });
  assert.equal(summary(longer), "b1:done b2:done b3:done b6:active b7:pending");
});

test("a turn with no plan change only advances the beat", () => {
  assert.equal(summary(updateBeats(storyWith(1), "a", { beatComplete: true, replanWith: null })), "b1:done b2:done b3:active b4:pending b5:pending");
  assert.equal(summary(updateBeats(storyWith(1), "a", { beatComplete: false, replanWith: null })), "b1:done b2:active b3:pending b4:pending b5:pending");
});

test("replanning with no new goals leaves the beats alone", () => {
  const beats = storyWith(1);
  assert.equal(replan(beats, null, "a"), beats);
  assert.equal(replan(beats, [], "a"), beats);
});

test("two leads each keep an active beat, and a step or a replan on one leaves the other alone", () => {
  const beats = activateNextBeat([...makeBeats(["a1", "a2"], 0, "a"), ...makeBeats(["b1", "b2"], 2, "b")]);
  assert.equal(summary(beats), "b1:active b2:pending b3:active b4:pending");
  assert.equal(summary(completeActiveBeat(beats, "b")), "b1:active b2:pending b3:done b4:active");
  const replanned = updateBeats(beats, "a", { beatComplete: true, replanWith: ["new"] });
  assert.equal(summary(replanned), "b1:done b3:active b4:pending b5:active");
  assert.deepEqual(replanned.map((beat) => beat.lead), ["a", "b", "b", "a"]);
});
