import assert from "node:assert/strict";
import { test } from "node:test";
import { activateNextBeat, completeActiveBeat, makeBeats } from "./beats";
import type { PhotoTurnOut, QuestOut } from "./outputs";
import {
  FREE_PHOTOS,
  STEPS_PER_CHAPTER,
  applyClose,
  applyPhotoTurn,
  closeDue,
  makeQuest,
  mustMoveStory,
  nounPhrase,
  planWalk,
  seatOf,
  startWalk,
  updateInventory,
} from "./rules";
import type { Seat, StoryState } from "./state";

const QUEST: QuestOut = {
  title: "The marked door",
  targetMode: "in_view",
  objective: "Walk up to the green door. What number is painted above it?",
  targetPhrase: "green door",
  targetDescription: "the green door on the left",
  successCriteria: "A close look at the door.",
};

const goals = (count: number) => Array.from({ length: count }, (_, i) => `goal ${i + 1}`);

/** A one-player story on turn 1 with an open quest and beats b1 (active) to b3. */
function story(beats: string[] = ["one", "two", "three"]): StoryState {
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
      beats: activateNextBeat(makeBeats(beats, 0)),
      chapters: [],
      focus: null,
    },
    characters: [],
    partners: [],
    invite: null,
    canon: [{ fact: "The courier marks hiding places with chalk.", turn: 1 }],
    bindings: [],
    inventory: [],
    evidence: [],
    seats: [],
    chapter: 1,
    closed: 0,
    progress: { a: 0, b: 0 },
    turnCount: 1,
    questsCompleted: 0,
    recap: "",
    status: "active",
  };
  startWalk(state, "player", { lead: "a", joining: false, newChapter: false }, state.createdAt).quest = makeQuest(
    QUEST,
    "b1",
    1,
  );
  return state;
}

/** A two-player case: the owner walks lead a, and "friend" has joined to take lead b. */
function shared(): StoryState {
  const state = story([]);
  state.mode = "team";
  state.invite = { code: "code", size: 2 };
  const steps = 3 * STEPS_PER_CHAPTER;
  state.skeleton.beats = activateNextBeat([...makeBeats(goals(steps), 0, "a"), ...makeBeats(goals(steps), steps, "b")]);
  state.partners.push("friend");
  return state;
}

const seat = (state: StoryState, playerId = "player"): Seat => seatOf(state, playerId)!;

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

const step = (overrides: Partial<PhotoTurnOut> = {}) => reply({ outcome: "follows_quest", quest: QUEST, ...overrides });

const beatSummary = (state: StoryState) => state.skeleton.beats.map((b) => `${b.id}:${b.status}`).join(" ");

test("a side note keeps the open quest and counts toward the nudge", () => {
  const state = story();
  const questId = seat(state).quest!.id;
  const result = applyPhotoTurn(state, reply(), 2, "player");

  assert.equal(result.outcome, "side_note");
  assert.equal(result.questIssued, false);
  assert.equal(seat(state).quest?.id, questId);
  assert.equal(seat(state).photosSinceProgress, 1);
  assert.equal(state.progress.a, 0);
  // A side note finishes no beat and turns up no evidence.
  assert.equal(beatSummary(state), "b1:active b2:pending b3:pending");
  assert.equal(result.card, null);
  assert.deepEqual(state.evidence, []);
  assert.equal(seat(state).walking, true);
  assert.equal(seat(state).lastNarration, "You file it away.");
});

test("a photo that follows the quest moves the story and brings the next quest", () => {
  const state = story();
  const oldId = seat(state).quest!.id;
  const next = { ...QUEST, title: "Something red", targetMode: "seek" as const };
  const result = applyPhotoTurn(state, reply({ outcome: "follows_quest", quest: next }), 2, "player");

  assert.equal(result.outcome, "follows_quest");
  assert.equal(result.questIssued, true);
  assert.notEqual(seat(state).quest?.id, oldId);
  assert.equal(seat(state).quest?.title, "Something red");
  assert.equal(seat(state).quest?.issuedTurn, 2);
  // The new quest belongs to the beat that is active after this turn.
  assert.equal(seat(state).quest?.beatId, "b2");
  assert.equal(beatSummary(state), "b1:done b2:active b3:pending");
  assert.deepEqual([state.questsCompleted, state.progress.a, seat(state).photosSinceProgress], [1, 1, 0]);
});

test(`after ${FREE_PHOTOS} side notes in a row, the next photo has to move the story`, () => {
  const state = story();
  for (let turn = 2; turn < 2 + FREE_PHOTOS; turn++) {
    assert.equal(mustMoveStory(seat(state)), false);
    applyPhotoTurn(state, reply(), turn, "player");
  }
  assert.equal(mustMoveStory(seat(state)), true);

  // The game master was told to move the story; a side note is counted as a step anyway.
  const result = applyPhotoTurn(state, reply({ quest: QUEST }), 2 + FREE_PHOTOS, "player");
  assert.equal(result.outcome, "moves_story");
  assert.equal(state.progress.a, 1);
  assert.equal(seat(state).photosSinceProgress, 0);
  assert.equal(mustMoveStory(seat(state)), false);
});

test("a step forward without a new quest leaves no quest open", () => {
  const state = story();
  const result = applyPhotoTurn(state, reply({ outcome: "moves_story" }), 2, "player");
  assert.equal(result.questIssued, false);
  assert.equal(seat(state).quest, null);
  assert.equal(seat(state).walking, true);
});

test(`step ${STEPS_PER_CHAPTER} of a chapter closes it, which saves the recap and ends the walk`, () => {
  const state = story(goals(3 * STEPS_PER_CHAPTER));
  for (let turn = 2; turn < 1 + STEPS_PER_CHAPTER; turn++) {
    applyPhotoTurn(state, step(), turn, "player");
    assert.equal(seat(state).walking, true);
  }
  applyPhotoTurn(state, step({ recap: " You found the door. " }), 1 + STEPS_PER_CHAPTER, "player");
  assert.equal(seat(state).walking, false);
  assert.equal(seat(state).quest, null);
  assert.equal(state.recap, "You found the door.");
  assert.equal(state.closed, 1);
  assert.equal(state.status, "active");

  // The next walk opens chapter 2.
  const plan = planWalk(state, "player");
  assert.deepEqual(plan, { lead: "a", joining: false, newChapter: true });
  startWalk(state, "player", plan as Exclude<typeof plan, { refused: string }>, state.createdAt);
  assert.deepEqual([state.chapter, state.progress.a, seat(state).walking], [2, 0, true]);
});

test("ending a walk partway leaves the chapter open for the next one", () => {
  const state = story(goals(3 * STEPS_PER_CHAPTER));
  applyPhotoTurn(state, step(), 2, "player");
  seat(state).walking = false;
  assert.deepEqual(planWalk(state, "player"), { lead: "a", joining: false, newChapter: false });
  startWalk(state, "player", { lead: "a", joining: false, newChapter: false }, state.createdAt);
  assert.deepEqual([state.chapter, state.progress.a], [1, 1]);
});

test("the step that finishes the last beat solves the case", () => {
  const state = story();
  state.skeleton.beats = completeActiveBeat(completeActiveBeat(state.skeleton.beats, "a"), "a");
  applyPhotoTurn(state, reply(), 2, "player");
  assert.equal(state.status, "active");
  applyPhotoTurn(state, reply({ outcome: "moves_story" }), 3, "player");
  assert.equal(beatSummary(state), "b1:done b2:done b3:done");
  assert.equal(state.status, "complete");
  assert.equal(seat(state).walking, false);
});

test("in a two-player case, each photo moves only its player's lead", () => {
  const state = shared();
  startWalk(state, "friend", { lead: "b", joining: false, newChapter: false }, state.createdAt);
  applyPhotoTurn(state, step(), 2, "friend");
  applyPhotoTurn(state, step(), 3, "friend");
  applyPhotoTurn(state, step(), 4, "player");
  assert.deepEqual(state.progress, { a: 1, b: 2 });
  const active = state.skeleton.beats.filter((beat) => beat.status === "active").map((beat) => `${beat.lead}:${beat.id}`);
  assert.deepEqual(active, ["a:b2", "b:b15"]);
  assert.deepEqual(
    state.evidence.map((piece) => piece.by),
    ["friend", "friend", "player"],
  );
});

test("a two-player chapter waits for both leads, whichever finishes first, then closes once", () => {
  for (const first of ["player", "friend"]) {
    const state = shared();
    startWalk(state, "friend", { lead: "b", joining: false, newChapter: false }, state.createdAt);
    const second = first === "player" ? "friend" : "player";
    let turn = 2;
    for (let i = 0; i < STEPS_PER_CHAPTER; i++) applyPhotoTurn(state, step(), turn++, first);
    // The first player's part is done: their walk ends, but the chapter doesn't.
    assert.equal(seat(state, first).walking, false);
    assert.equal(state.closed, 0);
    assert.equal(closeDue(state), false);
    assert.match((planWalk(state, first) as { refused: string }).refused, /Your part of chapter 1 is done/);

    for (let i = 0; i < STEPS_PER_CHAPTER; i++) applyPhotoTurn(state, step({ recap: "ignored" }), turn++, second);
    // Neither photo told the ending: it waits to be told on its own.
    assert.equal(state.recap, "");
    assert.equal(closeDue(state), true);
    assert.match((planWalk(state, first) as { refused: string }).refused, /putting chapter 1 together/);

    applyClose(state, { narration: "Between you, it adds up.", recap: "You two found the way in.", revisedSecret: null });
    assert.deepEqual([state.closed, closeDue(state), state.recap], [1, false, "You two found the way in."]);
    assert.equal(seat(state, second).lastNarration, "Between you, it adds up.");

    // Each player opens their own part of chapter 2; only the first one to start moves the chapter on.
    startWalk(state, second, planWalk(state, second) as { lead: "a" | "b"; joining: boolean; newChapter: boolean }, state.createdAt);
    assert.deepEqual(planWalk(state, first), { lead: seat(state, first).lead, joining: false, newChapter: false });
    assert.equal(state.chapter, 2);
  }
});

test("the last two-player chapter's ending solves the case", () => {
  const state = shared();
  state.skeleton.beats = state.skeleton.beats.map((beat) => ({ ...beat, status: "done" }));
  state.chapter = 3;
  state.progress = { a: STEPS_PER_CHAPTER, b: STEPS_PER_CHAPTER };
  state.closed = 2;
  assert.equal(closeDue(state), true);
  applyClose(state, { narration: "Teo did it.", recap: "You two solved it.", revisedSecret: " Teo hid it. " });
  assert.equal(state.status, "complete");
  assert.equal(state.skeleton.secret, "Teo hid it.");
});

test("a friend who hasn't joined leaves their lead free, so the owner can walk it too", () => {
  const state = shared();
  state.partners = [];
  for (let turn = 2; turn < 2 + STEPS_PER_CHAPTER; turn++) applyPhotoTurn(state, step(), turn, "player");
  assert.match((planWalk(state, "player") as { refused: string }).refused, /Your part/);
  assert.deepEqual(planWalk(state, "player", true), { lead: "b", joining: false, newChapter: false });

  // Once a friend takes the lead, it's theirs.
  startWalk(state, "friend", { lead: "b", joining: true, newChapter: false }, state.createdAt);
  assert.match((planWalk(state, "player", true) as { refused: string }).refused, /Your part/);
});

test("a case has room for one friend, and a case from before leads has one walker at a time", () => {
  const full = shared();
  assert.deepEqual(planWalk(full, "stranger"), { refused: "This case already has all its players." });

  const relay = story();
  relay.mode = "team";
  relay.invite = { code: "code", size: 2 };
  assert.match((planWalk(relay, "friend") as { refused: string }).refused, /out on this case right now/);
  seat(relay).walking = false;
  assert.deepEqual(planWalk(relay, "friend"), { lead: "a", joining: true, newChapter: false });
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
    "player",
  );
  assert.deepEqual(result.canonAdded, ["The door is number 14."]);
  assert.deepEqual(state.inventory, ["A brass key", "A torn letter"]);
  assert.deepEqual(updateInventory(state.inventory, [], [" a BRASS key "]), ["A torn letter"]);
});

test("every step forward turns up a piece of evidence, painted as a card", () => {
  const card = { title: " The marked door ", proves: "Number 14, freshly painted" };
  assert.equal(applyPhotoTurn(story(), reply({ card }), 2, "player").card, null);

  const state = story();
  assert.deepEqual(applyPhotoTurn(state, reply({ outcome: "follows_quest", card }), 2, "player").card, {
    title: "The marked door",
    caption: "Number 14, freshly painted",
  });
  // A reply that left the evidence blank still gets a card, so the count stays true.
  const blank = { title: ".", proves: "." };
  assert.equal(applyPhotoTurn(state, reply({ outcome: "moves_story", card: blank }), 3, "player").card?.title, "New evidence");
  assert.deepEqual(state.evidence, [
    { title: "The marked door", caption: "Number 14, freshly painted", turn: 2, by: "player" },
    { title: "New evidence", caption: "", turn: 3, by: "player" },
  ]);
});

test("the answer changes only when the game master sends a new one that fits the evidence", () => {
  const state = story();
  state.skeleton.secret = "The courier hid it.";
  applyPhotoTurn(state, reply({ outcome: "follows_quest", revisedSecret: "  " }), 2, "player");
  assert.equal(state.skeleton.secret, "The courier hid it.");
  applyPhotoTurn(state, reply({ outcome: "follows_quest", revisedSecret: " The neighbour hid it. " }), 3, "player");
  assert.equal(state.skeleton.secret, "The neighbour hid it.");
});

test("target phrases lose leading articles and trailing punctuation", () => {
  assert.equal(nounPhrase("The tall arched doorway."), "tall arched doorway");
  assert.equal(nounPhrase(" A red door "), "red door");
  assert.equal(nounPhrase("theater sign"), "theater sign");
  assert.equal(nounPhrase("the"), "the");
  assert.equal(makeQuest({ ...QUEST, targetPhrase: "The Green Door" }, null, 3).targetPhrase, "green door");
});
