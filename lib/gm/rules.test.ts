import assert from "node:assert/strict";
import { test } from "node:test";
import { activateNextBeat, completeActiveBeat, makeBeats } from "./beats";
import type { PhotoTurnOut, QuestOut } from "./outputs";
import {
  FREE_PHOTOS,
  QUESTS_PER_CHAPTER,
  applyPhotoTurn,
  makeQuest,
  mustMoveStory,
  nounPhrase,
  updateInventory,
} from "./rules";
import type { StoryState } from "./state";

const QUEST: QuestOut = {
  title: "The marked door",
  targetMode: "in_view",
  objective: "Walk up to the green door. What number is painted above it?",
  targetPhrase: "green door",
  targetDescription: "the green door on the left",
  successCriteria: "A close look at the door.",
};

/** A story on turn 1 with an open quest and beats b1 (active) to b3. */
function story(): StoryState {
  const state: StoryState = {
    version: 1,
    id: "story",
    playerId: "player",
    genre: "mystery",
    theme: null,
    mode: "solo",
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:00.000Z",
    title: "The courier's letter",
    logline: "A trail starts here.",
    skeleton: {
      secret: "",
      premise: "",
      antagonist: "",
      stakes: "",
      ending: "",
      beats: activateNextBeat(makeBeats(["one", "two", "three"], 0)),
    },
    characters: [],
    partners: [],
    invite: null,
    canon: [{ fact: "The courier marks hiding places with chalk.", turn: 1 }],
    bindings: [],
    inventory: [],
    evidence: [],
    quest: null,
    chapter: 1,
    turnCount: 1,
    questsCompleted: 0,
    walk: { active: true, startedAt: "2026-10-26T00:00:00.000Z", questsDone: 0, photosSinceProgress: 0, playerId: null },
    recap: "",
    lastNarration: "",
    status: "active",
  };
  state.quest = makeQuest(QUEST, "b1", 1);
  return state;
}

/** A game master reply: a side note that keeps the quest, unless overridden. */
function reply(overrides: Partial<PhotoTurnOut> = {}): PhotoTurnOut {
  return {
    outcome: "side_note",
    narration: "You file it away.",
    card: { title: "A scuffed step", proves: "Someone was here" },
    observations: [],
    canonAdd: [],
    bindingsAdd: [],
    inventoryAdd: [],
    inventoryRemove: [],
    planChange: "none",
    planReason: "",
    revisedBeats: null,
    revisedSecret: null,
    recap: null,
    quest: null,
    ...overrides,
  };
}

const beatSummary = (state: StoryState) => state.skeleton.beats.map((b) => `${b.id}:${b.status}`).join(" ");

test("a side note keeps the open quest and counts toward the nudge", () => {
  const state = story();
  const questId = state.quest!.id;
  const result = applyPhotoTurn(state, reply(), 2);

  assert.equal(result.outcome, "side_note");
  assert.equal(result.questIssued, false);
  assert.equal(state.quest?.id, questId);
  assert.equal(state.walk.photosSinceProgress, 1);
  assert.equal(state.walk.questsDone, 0);
  // A side note finishes no beat and turns up no evidence.
  assert.equal(beatSummary(state), "b1:active b2:pending b3:pending");
  assert.equal(result.card, null);
  assert.deepEqual(state.evidence, []);
  assert.equal(state.walk.active, true);
});

test("a photo that follows the quest moves the story and brings the next quest", () => {
  const state = story();
  const oldId = state.quest!.id;
  const next = { ...QUEST, title: "Something red", targetMode: "seek" as const };
  const result = applyPhotoTurn(state, reply({ outcome: "follows_quest", quest: next }), 2);

  assert.equal(result.outcome, "follows_quest");
  assert.equal(result.questIssued, true);
  assert.notEqual(state.quest?.id, oldId);
  assert.equal(state.quest?.title, "Something red");
  assert.equal(state.quest?.issuedTurn, 2);
  // The new quest belongs to the beat that is active after this turn.
  assert.equal(state.quest?.beatId, "b2");
  assert.equal(beatSummary(state), "b1:done b2:active b3:pending");
  assert.deepEqual([state.questsCompleted, state.walk.questsDone, state.walk.photosSinceProgress], [1, 1, 0]);
});

test(`after ${FREE_PHOTOS} side notes in a row, the next photo has to move the story`, () => {
  const state = story();
  for (let turn = 2; turn < 2 + FREE_PHOTOS; turn++) {
    assert.equal(mustMoveStory(state), false);
    applyPhotoTurn(state, reply(), turn);
  }
  assert.equal(mustMoveStory(state), true);

  // The game master was told to move the story; a side note is counted as a step anyway.
  const result = applyPhotoTurn(state, reply({ quest: QUEST }), 2 + FREE_PHOTOS);
  assert.equal(result.outcome, "moves_story");
  assert.equal(state.walk.questsDone, 1);
  assert.equal(state.walk.photosSinceProgress, 0);
  assert.equal(mustMoveStory(state), false);
});

test("a step forward without a new quest leaves no quest open", () => {
  const state = story();
  const result = applyPhotoTurn(state, reply({ outcome: "moves_story" }), 2);
  assert.equal(result.questIssued, false);
  assert.equal(state.quest, null);
  assert.equal(state.walk.active, true);
});

test(`step ${QUESTS_PER_CHAPTER} of a walk closes the chapter, which saves the recap and ends the walk`, () => {
  const state = story();
  state.skeleton.beats = activateNextBeat(makeBeats(["one", "two", "three", "four", "five", "six"], 0));
  for (let turn = 2; turn < 1 + QUESTS_PER_CHAPTER; turn++) {
    applyPhotoTurn(state, reply({ outcome: "follows_quest", quest: QUEST }), turn);
    assert.equal(state.walk.active, true);
  }
  applyPhotoTurn(
    state,
    reply({ outcome: "follows_quest", recap: " You found the door. ", quest: QUEST }),
    1 + QUESTS_PER_CHAPTER,
  );
  assert.equal(state.walk.active, false);
  assert.equal(state.quest, null);
  assert.equal(state.recap, "You found the door.");
  assert.equal(state.status, "active");
});

test("the step that finishes the last beat solves the case", () => {
  const state = story();
  state.skeleton.beats = completeActiveBeat(completeActiveBeat(state.skeleton.beats));
  applyPhotoTurn(state, reply(), 2);
  assert.equal(state.status, "active");
  applyPhotoTurn(state, reply({ outcome: "moves_story" }), 3);
  assert.equal(beatSummary(state), "b1:done b2:done b3:done");
  assert.equal(state.status, "complete");
  assert.equal(state.walk.active, false);
});

test("canon and inventory skip duplicates, ignoring case", () => {
  const state = story();
  state.inventory = ["A brass key"];
  const result = applyPhotoTurn(
    state,
    reply({
      canonAdd: ["the courier marks hiding places with chalk.", "The door is number 14.", "The door is number 14."],
      inventoryAdd: ["a brass key", "A torn letter"],
    }),
    2,
  );
  assert.deepEqual(result.canonAdded, ["The door is number 14."]);
  assert.deepEqual(state.inventory, ["A brass key", "A torn letter"]);
  assert.deepEqual(updateInventory(state.inventory, [], [" a BRASS key "]), ["A torn letter"]);
});

test("every step forward turns up a piece of evidence, painted as a card", () => {
  const card = { title: " The marked door ", proves: "Number 14, freshly painted" };
  assert.equal(applyPhotoTurn(story(), reply({ card }), 2).card, null);

  const state = story();
  assert.deepEqual(applyPhotoTurn(state, reply({ outcome: "follows_quest", card }), 2).card, {
    title: "The marked door",
    caption: "Number 14, freshly painted",
  });
  // A reply that left the evidence blank still gets a card, so the count stays true.
  const blank = { title: ".", proves: "." };
  assert.equal(applyPhotoTurn(state, reply({ outcome: "moves_story", card: blank }), 3).card?.title, "New evidence");
  assert.deepEqual(state.evidence, [
    { title: "The marked door", caption: "Number 14, freshly painted", turn: 2, by: null },
    { title: "New evidence", caption: "", turn: 3, by: null },
  ]);
});

test("the answer changes only when the game master sends a new one that fits the evidence", () => {
  const state = story();
  state.skeleton.secret = "The courier hid it.";
  applyPhotoTurn(state, reply({ outcome: "follows_quest", revisedSecret: "  " }), 2);
  assert.equal(state.skeleton.secret, "The courier hid it.");
  applyPhotoTurn(state, reply({ outcome: "follows_quest", revisedSecret: " The neighbour hid it. " }), 3);
  assert.equal(state.skeleton.secret, "The neighbour hid it.");
});

test("evidence remembers who found it, for cases two players share", () => {
  const state = story();
  state.walk.playerId = "friend";
  applyPhotoTurn(state, reply({ outcome: "follows_quest" }), 2);
  assert.equal(state.evidence[0].by, "friend");
});

test("target phrases lose leading articles and trailing punctuation", () => {
  assert.equal(nounPhrase("The tall arched doorway."), "tall arched doorway");
  assert.equal(nounPhrase(" A red door "), "red door");
  assert.equal(nounPhrase("theater sign"), "theater sign");
  assert.equal(nounPhrase("the"), "the");
  assert.equal(makeQuest({ ...QUEST, targetPhrase: "The Green Door" }, null, 3).targetPhrase, "green door");
});
