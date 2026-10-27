import type { Outcome } from "@/lib/types";
import { activeBeatId, updateBeats } from "./beats";
import type { PhotoTurnOut, QuestOut } from "./outputs";
import type { QuestState, StoryState, TurnRecord } from "./state";

/**
 * How a photo turn changes the story. Pure bookkeeping on the state object, kept apart
 * from the engine (which talks to the models and the store) so it can be tested.
 */

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
  /** The card to paint onto the photo. Only a step forward earns one. */
  card: TurnRecord["card"];
};

/** Apply the game master's reading of a photo to the story. Mutates `state`. */
export function applyPhotoTurn(state: StoryState, data: PhotoTurnOut, turn: number): PhotoTurnResult {
  // The game master was told this photo has to count, so hold it to that.
  const outcome: Outcome = data.outcome === "side_note" && mustMoveStory(state) ? "moves_story" : data.outcome;
  const moved = outcome !== "side_note";
  const card =
    moved && data.card
      ? { title: data.card.title.trim(), caption: data.card.caption.trim(), flourish: data.card.flourish.trim() }
      : null;

  const canonAdded = addCanon(state, data.canonAdd, turn);
  state.bindings.push(...data.bindingsAdd.map((binding) => ({ ...binding, turn })));
  state.inventory = updateInventory(state.inventory, data.inventoryAdd, data.inventoryRemove);
  state.skeleton.beats = updateBeats(state.skeleton.beats, {
    // Only a step forward can finish a beat, a chapter or the story.
    beatComplete: moved && data.beatComplete,
    replanWith: data.planChange === "replan" ? data.revisedBeats : null,
  });

  if (moved) {
    state.questsCompleted += 1;
    state.walk.questsDone += 1;
    state.walk.photosSinceProgress = 0;
  } else {
    state.walk.photosSinceProgress += 1;
  }

  const storyOver = moved && data.storyComplete;
  if (storyOver || (moved && data.chapterComplete)) {
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
