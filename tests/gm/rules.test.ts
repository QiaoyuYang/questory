import assert from "node:assert/strict";
import { test } from "node:test";
import { activateNextBeat, completeActiveBeat, makeBeats } from "@/lib/gm/beats";
import type { PhotoTurnOut, QuestOut } from "@/lib/gm/outputs";
import {
  CASE_SIZES,
  FREE_PHOTOS,
  applyClose,
  applyPhotoTurn,
  checked,
  closeDue,
  closerLookDue,
  closerLookStep,
  errandClock,
  makeQuest,
  mustMoveStory,
  nounPhrase,
  planWalk,
  seatOf,
  startWalk,
  targetPhrases,
  updateInventory,
  withoutContrast,
} from "@/lib/gm/rules";
import type { Seat, StoryState } from "@/lib/gm/state";

const QUEST: QuestOut = {
  title: "The marked door",
  targetMode: "in_view",
  objective: "Walk up to the green door. What number is painted above it?",
  targetPhrase: "green door",
  targetLandmark: "green door",
  targetDescription: "the green door on the left",
  successCriteria: "A close look at the door.",
};

const goals = (count: number) => Array.from({ length: count }, (_, i) => `goal ${i + 1}`);

/** The full case, which an hour's walk gets and older cases have. */
const HOUR = CASE_SIZES[60];

/** A one-player story on turn 1 with an open quest and beats b1 (active) to b3. */
function story(beats: string[] = ["one", "two", "three"]): StoryState {
  const state: StoryState = {
    version: 1,
    id: "story",
    playerId: "player",
    genre: "mystery",
    theme: null,
    mode: "solo",
    size: HOUR,
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
  const steps = HOUR.chapters * HOUR.steps;
  state.skeleton.beats = activateNextBeat([...makeBeats(goals(steps), 0, "a"), ...makeBeats(goals(steps), steps, "b")]);
  state.partners.push("friend");
  return state;
}

const seat = (state: StoryState, playerId = "player"): Seat => seatOf(state, playerId)!;

/** A game master reply: a side note that keeps the quest, unless overridden. */
function reply(overrides: Partial<PhotoTurnOut> = {}): PhotoTurnOut {
  return {
    samePlace: false,
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

test("an errand counts only from somewhere other than where it was given, and a closer look anywhere", () => {
  const errand = story();
  seat(errand).quest!.targetMode = "seek";
  seat(errand).photosSinceProgress = FREE_PHOTOS;
  // Still where the errand was given: the story waits, even when the next photo has to move it,
  // and the errand stays open.
  const stayed = applyPhotoTurn(errand, step({ samePlace: true }), 2, "player");
  assert.deepEqual([stayed.outcome, stayed.questIssued, stayed.card], ["side_note", false, null]);
  assert.equal(seat(errand).quest?.targetMode, "seek");
  assert.equal(applyPhotoTurn(errand, step(), 3, "player").outcome, "follows_quest");

  const closer = story();
  assert.equal(applyPhotoTurn(closer, step({ samePlace: true }), 2, "player").outcome, "follows_quest");
});

test("a new quest remembers what the photo it was given at showed", () => {
  const state = story();
  applyPhotoTurn(state, step({ observations: ["a green door", "a bike rack"] }), 2, "player");
  assert.deepEqual(seat(state).quest?.seen, ["a green door", "a bike rack"]);
});

test("an errand counts only once the walk it starts with is over, and a closer look at once", () => {
  const at = (minute: number) => ({ at: `2026-10-26T00:0${minute}:00.000Z`, walkMinutes: 3 });
  const errand = story();
  applyPhotoTurn(errand, step({ quest: { ...QUEST, targetMode: "seek" } }), 2, "player", at(0));
  assert.equal(seat(errand).quest?.walkUntil, "2026-10-26T00:03:00.000Z");

  // On the way: the story waits, and the errand keeps its walk, even if a new quest comes back.
  const early = applyPhotoTurn(errand, step(), 3, "player", at(2));
  assert.deepEqual([early.outcome, early.questIssued, seat(errand).quest?.walkUntil], ["side_note", false, "2026-10-26T00:03:00.000Z"]);
  assert.equal(applyPhotoTurn(errand, step(), 4, "player", at(3)).outcome, "follows_quest");

  const closer = story();
  applyPhotoTurn(closer, step(), 2, "player", at(0));
  assert.equal(seat(closer).quest?.walkUntil, null);
  // With no minutes set, an errand starts with no walk.
  assert.equal(makeQuest({ ...QUEST, targetMode: "seek" }, null, 1, { ...at(0), walkMinutes: 0 }).walkUntil, null);
});

test("a quest that leaves what counts blank is judged by its objective", () => {
  const blank = makeQuest({ ...QUEST, targetMode: "seek", targetDescription: " ", successCriteria: "" }, null, 1);
  assert.equal(blank.targetDescription, QUEST.objective);
  assert.equal(blank.successCriteria, QUEST.objective);
  assert.equal(makeQuest(QUEST, null, 1).targetDescription, "the green door on the left");
});

test("a walk that starts indoors goes outside with no walk first, and every other errand starts with one", () => {
  const errand: QuestOut = { ...QUEST, targetMode: "seek" };
  const at = "2026-10-26T00:00:00.000Z";
  assert.equal(makeQuest(errand, null, 1, errandClock(at, true)).walkUntil, "2026-10-26T00:05:00.000Z");
  assert.equal(makeQuest(errand, null, 1, errandClock(at, true, true)).walkUntil, null);
  assert.equal(makeQuest(errand, null, 1, errandClock(at, false)).walkUntil, null);
});

test("once a chapter, an errand ends in a closer look, and the close-up is the evidence", () => {
  const where = new Set<number>();
  for (const id of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    const state = story(goals(HOUR.steps));
    state.id = id;
    // The walk opens on an errand; each reply gives the kind of quest its reply format allows.
    seat(state).quest!.targetMode = "seek";
    const photos: string[] = [];
    for (let turn = 2; seat(state).quest && turn < 20; turn++) {
      const kind = seat(state).quest!.targetMode;
      const due = closerLookDue(state, seat(state));
      const { card } = applyPhotoTurn(state, step({ quest: { ...QUEST, targetMode: due ? "in_view" : "seek" } }), turn, "player");
      photos.push(card ? `${kind}: evidence` : kind);
    }
    // Every errand's photo is evidence, but at the chosen step the photo shows the place and the close-up is.
    const at = closerLookStep(state, "a");
    const steps = Array.from({ length: HOUR.steps }, (_, i) => (i + 1 === at ? ["seek", "in_view: evidence"] : ["seek: evidence"]));
    assert.deepEqual(photos, steps.flat());
    assert.equal(state.evidence.length, HOUR.steps);
    where.add(at);
  }
  assert.ok(where.size > 1);
});

test("a chapter's closer look comes only once, even when a side note brings it early", () => {
  const state = story(goals(HOUR.steps));
  seat(state).quest!.targetMode = "seek";
  for (let i = 0; closerLookStep(state, "a") !== 2; i++) state.id = `story-${i}`;
  applyPhotoTurn(state, step({ quest: { ...QUEST, targetMode: "seek" } }), 2, "player");
  assert.equal(closerLookDue(state, seat(state)), true);
  applyPhotoTurn(state, reply({ quest: QUEST }), 3, "player");
  assert.equal(seat(state).quest?.targetMode, "in_view");
  // Back on an errand with that step still to find, but this chapter has had its closer look.
  applyPhotoTurn(state, reply({ quest: { ...QUEST, targetMode: "seek" } }), 4, "player");
  assert.equal(closerLookDue(state, seat(state)), false);
});

test("a place that comes back without its closer look counts as the evidence", () => {
  const state = story(goals(HOUR.steps));
  seat(state).quest!.targetMode = "seek";
  for (let i = 0; closerLookStep(state, "a") !== 2; i++) state.id = `story-${i}`;
  applyPhotoTurn(state, step({ quest: { ...QUEST, targetMode: "seek" } }), 2, "player");
  assert.notEqual(applyPhotoTurn(state, step({ quest: null }), 3, "player").card, null);
  assert.equal(state.progress.a, 2);
});

test("a 15-minute case is one chapter of three steps, solved on the walk", () => {
  const state = story(goals(3));
  state.size = CASE_SIZES[15];
  for (let turn = 2; turn < 5; turn++) applyPhotoTurn(state, step(), turn, "player");
  assert.deepEqual([state.status, seat(state).walking], ["complete", false]);
});

test("a 30-minute case ends its first chapter after three steps", () => {
  const state = story(goals(6));
  state.size = CASE_SIZES[30];
  for (let turn = 2; turn < 5; turn++) applyPhotoTurn(state, step(), turn, "player");
  assert.deepEqual([state.closed, state.status], [1, "active"]);
});

test("a step forward without a new quest leaves no quest open", () => {
  const state = story();
  const result = applyPhotoTurn(state, reply({ outcome: "moves_story" }), 2, "player");
  assert.equal(result.questIssued, false);
  assert.equal(seat(state).quest, null);
  assert.equal(seat(state).walking, true);
});

test(`step ${HOUR.steps} of a chapter closes it, which saves the recap and ends the walk`, () => {
  const state = story(goals(HOUR.chapters * HOUR.steps));
  for (let turn = 2; turn < 1 + HOUR.steps; turn++) {
    applyPhotoTurn(state, step(), turn, "player");
    assert.equal(seat(state).walking, true);
  }
  applyPhotoTurn(state, step({ recap: " You found the door. " }), 1 + HOUR.steps, "player");
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
  const state = story(goals(HOUR.chapters * HOUR.steps));
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
    for (let i = 0; i < HOUR.steps; i++) applyPhotoTurn(state, step(), turn++, first);
    // The first player's part is done: their walk ends, but the chapter doesn't.
    assert.equal(seat(state, first).walking, false);
    assert.equal(state.closed, 0);
    assert.equal(closeDue(state), false);
    assert.match((planWalk(state, first) as { refused: string }).refused, /Your part of chapter 1 is done/);

    for (let i = 0; i < HOUR.steps; i++) applyPhotoTurn(state, step({ recap: "ignored" }), turn++, second);
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
  state.progress = { a: HOUR.steps, b: HOUR.steps };
  state.closed = 2;
  assert.equal(closeDue(state), true);
  applyClose(state, { narration: "Teo did it.", recap: "You two solved it.", revisedSecret: " Teo hid it. " });
  assert.equal(state.status, "complete");
  assert.equal(state.skeleton.secret, "Teo hid it.");
});

test("a friend who hasn't joined leaves their lead free, so the owner can walk it too", () => {
  const state = shared();
  state.partners = [];
  for (let turn = 2; turn < 2 + HOUR.steps; turn++) applyPhotoTurn(state, step(), turn, "player");
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
  // A reply that left the evidence blank still gets a card, named for the quest it answered, so the count stays true.
  const blank = { title: ".", proves: "." };
  state.seats[0].quest = makeQuest({ ...QUEST, title: "The bus stop bench" }, "b2", 2);
  assert.equal(applyPhotoTurn(state, reply({ outcome: "moves_story", card: blank }), 3, "player").card?.title, "The bus stop bench");
  assert.deepEqual(state.evidence, [
    { title: "The marked door", caption: "Number 14, freshly painted", turn: 2, by: "player" },
    { title: "The bus stop bench", caption: "", turn: 3, by: "player" },
  ]);
});

test("an evidence caption drops a contrast tacked on the end", () => {
  assert.equal(withoutContrast("Bell was wheeled out, not carried"), "Bell was wheeled out");
  assert.equal(withoutContrast("Lifted, rather than cut down"), "Lifted");
  assert.equal(withoutContrast("Number 14, freshly painted"), "Number 14, freshly painted");
  assert.equal(withoutContrast("Not a break-in"), "Not a break-in");
});

test("the answer changes only when the game master sends a new one that fits the evidence", () => {
  const state = story();
  state.skeleton.secret = "The courier hid it.";
  applyPhotoTurn(state, reply({ outcome: "follows_quest", revisedSecret: "  " }), 2, "player");
  assert.equal(state.skeleton.secret, "The courier hid it.");
  applyPhotoTurn(state, reply({ outcome: "follows_quest", revisedSecret: " The neighbour hid it. " }), 3, "player");
  assert.equal(state.skeleton.secret, "The neighbour hid it.");
});

test("target phrases lose leading articles, counts and trailing punctuation", () => {
  assert.equal(nounPhrase("The tall arched doorway."), "tall arched doorway");
  assert.equal(nounPhrase(" A red door "), "red door");
  assert.equal(nounPhrase("Two dark spots"), "dark spots");
  assert.equal(nounPhrase("a couple of white signs"), "white signs");
  assert.equal(nounPhrase("the 3 red doors"), "red doors");
  assert.equal(nounPhrase("one-way sign"), "one-way sign");
  assert.equal(nounPhrase("tennis court"), "tennis court");
  assert.equal(nounPhrase("theater sign"), "theater sign");
  assert.equal(nounPhrase("the"), "the");
  assert.equal(makeQuest({ ...QUEST, targetPhrase: "The Green Door" }, null, 3).targetPhrase, "green door");
  assert.equal(makeQuest({ ...QUEST, targetLandmark: "The Red Post Box" }, null, 3).targetLandmark, "red post box");
});

test("SAM looks for the target, then the thing around it, then the description, each once", () => {
  const plate = { targetPhrase: "framed plate", targetLandmark: "red post box", targetDescription: "The plate on the post box." };
  assert.deepEqual(targetPhrases(plate), ["framed plate", "red post box", "plate on the post box"]);
  const door = { targetPhrase: "arched doorway", targetLandmark: "arched doorway", targetDescription: "the arched doorway" };
  assert.deepEqual(targetPhrases(door), ["arched doorway"]);
  assert.deepEqual(targetPhrases({ targetPhrase: "red door", targetLandmark: "", targetDescription: "" }), ["red door"]);
});

test("a photo check takes out what it found, and never the evidence card", () => {
  const written = {
    narration: "Fresh scratches ring the cupboard lock. Tomas locked it last night.",
    card: { title: "Scratched lock", proves: "Someone forced it" },
    facts: ["The cupboard lock is scratched", "Tomas locked the cupboard last night"],
  };
  const check = {
    madeUp: ["Fresh scratches ring the cupboard lock"],
    narration: " Tomas locked the cupboard last night, and someone opened it anyway. ",
    card: null,
    facts: ["Tomas locked the cupboard last night", " "],
  };
  assert.deepEqual(checked(written, check), {
    narration: "Tomas locked the cupboard last night, and someone opened it anyway.",
    card: written.card,
    facts: ["Tomas locked the cupboard last night"],
  });
  const fixed = { ...check, card: { title: "The cupboard lock", proves: "Opened with a key" } };
  assert.deepEqual(checked(written, fixed).card, fixed.card);
  assert.equal(checked({ ...written, card: null }, fixed).card, null);
  assert.deepEqual(checked(written, { ...check, madeUp: [] }), written);
});
