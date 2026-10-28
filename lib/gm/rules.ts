import type { Outcome } from "@/lib/types";
import { activeBeatId, unfinishedBeats, updateBeats } from "./beats";
import type { PhotoTurnOut, QuestOut } from "./outputs";
import type { QuestState, StoryState, TurnRecord } from "./state";

/**
 * How a photo turn changes the story. Pure bookkeeping on the state object, kept apart
 * from the engine (which talks to the models and the store) so it can be tested.
 */

/** Steps forward in a story. Each one finishes a beat and turns up a piece of evidence. */
export const STORY_STEPS = 6;

/** Steps forward in a chapter. */
export const QUESTS_PER_CHAPTER = 3;

/**
 * How many photos in a row may leave the story where it is. The next photo has to move
 * it, so a player who ignores the quests still gets a story.
 */
export const FREE_PHOTOS = 2;

/** True when the coming photo has to move the story forward. */
export function mustMoveStory(state: StoryState): boolean {
  return state.walk.photosSinceProgress >= FREE_PHOTOS;
}

/** SAM wants a bare noun phrase: "tall arched doorway", not "the tall arched doorway." */
export function nounPhrase(phrase: string): string {
  const lower = phrase.trim().toLowerCase();
  const bare = lower
    .replace(/^(?:(?:the|a|an|this|that|these|those)\s+)+/, "")
    .replace(/[.,;:!?]+$/, "")
    .trim();
  return bare || lower;
}

export function makeQuest(out: QuestOut, beatId: string | null, turn: number): QuestState {
  return {
    id: crypto.randomUUID(),
    title: out.title.trim(),
    objective: out.objective.trim(),
    hint: out.hint.trim(),
    targetMode: out.targetMode,
    targetPhrase: nounPhrase(out.targetPhrase),
    targetDescription: out.targetDescription.trim(),
    successCriteria: out.successCriteria.trim(),
    beatId,
    issuedTurn: turn,
  };
}

/** Add new facts to the canon, skipping ones it already has. Returns the facts added. */
export function addCanon(state: StoryState, facts: string[], turn: number): string[] {
  const known = new Set(state.canon.map((entry) => entry.fact.toLowerCase()));
  const added: string[] = [];
  for (const fact of facts.map((f) => f.trim())) {
    if (!fact || known.has(fact.toLowerCase())) continue;
    known.add(fact.toLowerCase());
    added.push(fact);
  }
  state.canon.push(...added.map((fact) => ({ fact, turn })));
  return added;
}

/** Items match ignoring case and surrounding spaces. */
export function updateInventory(inventory: string[], add: string[], remove: string[]): string[] {
  const key = (item: string) => item.trim().toLowerCase();
  const removing = new Set(remove.map(key));
  const kept = inventory.filter((item) => !removing.has(key(item)));
  for (const item of add.map((s) => s.trim()).filter(Boolean)) {
    if (!kept.some((owned) => key(owned) === key(item))) kept.push(item);
  }
  return kept;
}

export type PhotoTurnResult = {
  outcome: Outcome;
  canonAdded: string[];
  /** True when the turn replaced the quest with a new one. */
  questIssued: boolean;
  /** The evidence card to paint onto the photo. Only a step forward earns one. */
  card: TurnRecord["card"];
};

const named = (text: string) => /\p{L}/u.test(text);

/** The evidence a step forward turns up. A reply that left it blank still gets a card. */
function evidenceCard(card: PhotoTurnOut["card"]): NonNullable<TurnRecord["card"]> {
  if (!named(card.title)) return { title: "New evidence", caption: "", flourish: "" };
  return {
    title: card.title.trim(),
    caption: named(card.proves) ? card.proves.trim() : "",
    flourish: card.flourish.trim(),
  };
}

/** Apply the game master's reading of a photo to the story. Mutates `state`. */
export function applyPhotoTurn(state: StoryState, data: PhotoTurnOut, turn: number): PhotoTurnResult {
  // The game master was told this photo has to count, so hold it to that.
  const outcome: Outcome = data.outcome === "side_note" && mustMoveStory(state) ? "moves_story" : data.outcome;
  const moved = outcome !== "side_note";
  const card = moved ? evidenceCard(data.card) : null;

  const canonAdded = addCanon(state, data.canonAdd, turn);
  state.bindings.push(...data.bindingsAdd.map((binding) => ({ ...binding, turn })));
  state.inventory = updateInventory(state.inventory, data.inventoryAdd, data.inventoryRemove);
  state.skeleton.beats = updateBeats(state.skeleton.beats, {
    // Every step forward finishes a beat; a side note finishes nothing.
    beatComplete: moved,
    replanWith: data.planChange === "replan" ? data.revisedBeats : null,
  });

  if (card) {
    state.evidence.push({ title: card.title, caption: card.caption, turn, by: state.walk.playerId });
    state.questsCompleted += 1;
    state.walk.questsDone += 1;
    state.walk.photosSinceProgress = 0;
  } else {
    state.walk.photosSinceProgress += 1;
  }

  // The last beat solves the case. The game master is told in advance when a step ends
  // a chapter or the story, so it can write the hook or the ending.
  const storyOver = moved && unfinishedBeats(state.skeleton.beats) === 0;
  if (storyOver || (moved && state.walk.questsDone >= QUESTS_PER_CHAPTER)) {
    state.quest = null;
    state.walk = { ...state.walk, active: false };
    if (data.recap) state.recap = data.recap.trim();
    if (storyOver) state.status = "complete";
    return { outcome, canonAdded, questIssued: false, card };
  }

  if (data.quest) {
    state.quest = makeQuest(data.quest, activeBeatId(state.skeleton.beats), turn);
    return { outcome, canonAdded, questIssued: true, card };
  }
  // A side note can leave the open quest in place; a step forward has used it up.
  if (moved) state.quest = null;
  return { outcome, canonAdded, questIssued: false, card };
}
