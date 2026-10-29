import { GAME_MASTER, type Outcome } from "@/lib/types";
import { LEADS, activateNextBeat, activeBeatId, unfinishedBeats, updateBeats, type Lead } from "./beats";
import type { CheckIn, CheckOut, GenesisOut, PhotoTurnOut, QuestOut } from "./outputs";
import type { QuestState, Seat, StoryState, TurnRecord } from "./state";

/**
 * How turns change the story. Pure bookkeeping on the state object, kept apart from the
 * engine (which talks to the models and the store) so it can be tested.
 */

/** Chapters in a case. */
export const CHAPTERS = 3;

/**
 * Steps forward on each lead in a chapter. Each one finishes a beat and turns up a piece
 * of evidence, so a player finds this many per chapter, alone or with a friend.
 */
export const STEPS_PER_CHAPTER = 4;

/** Steps forward on one lead over a whole case. */
export const LEAD_STEPS = CHAPTERS * STEPS_PER_CHAPTER;

/** Players a case takes when its owner invites a friend. */
export const TEAM_SIZE = 2;

/**
 * How many photos in a row may leave the story where it is. The next photo has to move
 * it, so a player who ignores the quests still gets a story.
 */
export const FREE_PHOTOS = 2;

/** True when the player's coming photo has to move the story forward. */
export function mustMoveStory(seat: Seat): boolean {
  return seat.photosSinceProgress >= FREE_PHOTOS;
}

export function seatOf(state: StoryState, playerId: string): Seat | null {
  return state.seats.find((seat) => seat.playerId === playerId) ?? null;
}

export function otherLead(lead: Lead): Lead {
  return lead === "a" ? "b" : "a";
}

/** The leads a case has: two in a two-player case, one otherwise. */
export function leadsInPlay(state: StoryState): Lead[] {
  const leads = LEADS.filter((lead) => state.skeleton.beats.some((beat) => beat.lead === lead));
  return leads.length > 0 ? leads : ["a"];
}

/** Every case but a two-player one: one lead, walked by one player at a time. */
export function singleLead(state: StoryState): boolean {
  return leadsInPlay(state).length === 1;
}

/** A lead nobody has taken: a two-player case's second lead, before the friend joins. */
export function unclaimedLead(state: StoryState): Lead | null {
  return leadsInPlay(state).find((lead) => !state.seats.some((seat) => seat.lead === lead)) ?? null;
}

/** Steps forward still to make on a lead in this chapter. */
export function stepsLeft(state: StoryState, lead: Lead): number {
  const room = Math.max(0, STEPS_PER_CHAPTER - state.progress[lead]);
  return Math.min(room, unfinishedBeats(state.skeleton.beats, lead));
}

/** The lead has made its steps for this chapter, or has none left at all. */
export function leadPartDone(state: StoryState, lead: Lead): boolean {
  return stepsLeft(state, lead) === 0;
}

export function chapterComplete(state: StoryState): boolean {
  return leadsInPlay(state).every((lead) => leadPartDone(state, lead));
}

/**
 * A two-player chapter whose leads are both done, waiting for its ending. The ending is
 * told on its own (closeChapter in engine.ts), from everything both players found, so it
 * reads the same whichever lead finished first.
 */
export function closeDue(state: StoryState): boolean {
  return state.status === "active" && !singleLead(state) && state.closed < state.chapter && chapterComplete(state);
}

/** The opening's plan as lists: what each chapter finds out, and each lead's beats in order. */
export function planOf(data: Pick<GenesisOut, "chapters">): { findsOut: string[]; lead: string[]; partnerLead: string[] } {
  const chapters = Array.from({ length: CHAPTERS }, (_, i) => data.chapters[`chapter${i + 1}`]).filter(Boolean);
  const steps = (of: Record<string, string>) => Array.from({ length: STEPS_PER_CHAPTER }, (_, i) => of[`step${i + 1}`] ?? "");
  return {
    findsOut: chapters.map((chapter) => chapter.findsOut.trim()).filter(Boolean),
    lead: chapters.flatMap((chapter) => steps(chapter.steps)),
    partnerLead: chapters.flatMap((chapter) => (chapter.partnerSteps ? steps(chapter.partnerSteps) : [])),
  };
}

/**
 * SAM wants a bare noun phrase: "tall arched doorway", not "the tall arched doorway.", and no
 * count, since it finds "dark spots" but not "two dark spots".
 */
export function nounPhrase(phrase: string): string {
  const lower = phrase.trim().toLowerCase();
  const bare = lower
    .replace(
      /^(?:(?:the|a|an|this|that|these|those|\d+|one|two|three|four|five|six|seven|eight|nine|ten|few|several|some|couple of|pair of)\s+)+/,
      "",
    )
    .replace(/[.,;:!?]+$/, "")
    .trim();
  return bare || lower;
}

/**
 * What SAM looks for, in order: the target, then the thing around it that stands out, for a
 * target too small or faint to find, then the description, which it sometimes finds after
 * missing a short phrase ("white and green parking sign" but not "parking sign").
 */
export function targetPhrases(
  quest: Pick<QuestState, "targetPhrase" | "targetLandmark" | "targetDescription">,
): string[] {
  return [...new Set([quest.targetPhrase, quest.targetLandmark, nounPhrase(quest.targetDescription)])].filter(Boolean);
}

/**
 * The text after a photo check. The check only takes things out, so it never drops or adds an
 * evidence card, and when it found nothing made up, the text stands word for word.
 */
export function checked(written: CheckIn, check: CheckOut): CheckIn {
  if (check.madeUp.length === 0) return written;
  return {
    narration: check.narration.trim() || written.narration,
    card: written.card && check.card?.title.trim() ? check.card : written.card,
    facts: check.facts.map((fact) => fact.trim()).filter(Boolean),
  };
}

export function makeQuest(out: QuestOut, beatId: string | null, turn: number): QuestState {
  return {
    id: crypto.randomUUID(),
    title: out.title.trim(),
    objective: out.objective.trim(),
    targetMode: out.targetMode,
    targetPhrase: nounPhrase(out.targetPhrase),
    targetLandmark: nounPhrase(out.targetLandmark),
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

/** Where a player's next walk goes: their lead, and whether it opens the next chapter. */
export type WalkPlan = { lead: Lead; joining: boolean; newChapter: boolean };

/**
 * Whether a player can start a walk now, and where it goes, or why not. Ending a walk
 * partway leaves the chapter open, so the next walk picks it up. `takeOver` lets a player
 * whose part is done walk the other lead too, while no friend has taken it.
 */
export function planWalk(state: StoryState, playerId: string, takeOver = false): WalkPlan | { refused: string } {
  if (state.status === "complete") return { refused: "This story is finished. Start a new one." };
  const seat = seatOf(state, playerId);
  if (seat?.walking) return { refused: "A walk is already in progress." };
  if (singleLead(state) && state.seats.some((other) => other.walking)) {
    return { refused: "Your partner is out on this case right now. You can play once their walk ends." };
  }
  const joining = playerId !== state.playerId && !state.partners.includes(playerId);
  if (joining && state.partners.length >= (state.invite?.size ?? TEAM_SIZE) - 1) {
    return { refused: "This case already has all its players." };
  }
  if (closeDue(state)) {
    return { refused: `${GAME_MASTER} is still putting chapter ${state.chapter} together. Try again in a moment.` };
  }
  const newChapter = state.closed === state.chapter;
  let lead = seat?.lead ?? unclaimedLead(state) ?? "a";
  if (!newChapter && leadPartDone(state, lead)) {
    const other = otherLead(lead);
    if (!takeOver || unclaimedLead(state) !== other || leadPartDone(state, other)) {
      return {
        refused: `Your part of chapter ${state.chapter} is done. The next chapter opens when your partner finishes theirs.`,
      };
    }
    lead = other;
  }
  return { lead, joining, newChapter };
}

/** Put the player on their walk. Mutates `state` and returns the player's seat. */
export function startWalk(state: StoryState, playerId: string, plan: WalkPlan, at: string): Seat {
  if (plan.joining) state.partners.push(playerId);
  if (plan.newChapter) {
    state.chapter += 1;
    state.progress = { a: 0, b: 0 };
  }
  const walk = { lead: plan.lead, quest: null, walking: true, startedAt: at, photosSinceProgress: 0 };
  let seat = seatOf(state, playerId);
  if (seat) Object.assign(seat, walk);
  else {
    seat = { playerId, ...walk, lastNarration: "" };
    state.seats.push(seat);
  }
  state.skeleton.beats = activateNextBeat(state.skeleton.beats);
  return seat;
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

/** "Wheeled out, not carried" reads machine-made, and the part before the contrast says it all. */
export function withoutContrast(text: string): string {
  return text.replace(/,\s*(?:not|rather than|instead of)\b.*$/i, "").trim();
}

/** The evidence a step forward turns up. A reply that left it blank still gets a card. */
function evidenceCard(card: PhotoTurnOut["card"]): NonNullable<TurnRecord["card"]> {
  if (!named(card.title)) return { title: "New evidence", caption: "" };
  const caption = withoutContrast(card.proves);
  return { title: card.title.trim(), caption: named(caption) ? caption : "" };
}

/**
 * Keep the answer fitting the evidence. The game master sends a new one when what the
 * player found points somewhere else; the player never sees the change.
 */
export function reviseSecret(state: StoryState, revised: string | null) {
  const secret = revised?.trim();
  if (secret) state.skeleton.secret = secret;
}

/** Apply the game master's reading of `playerId`'s photo to the story. Mutates `state`. */
export function applyPhotoTurn(state: StoryState, data: PhotoTurnOut, turn: number, playerId: string): PhotoTurnResult {
  const seat = seatOf(state, playerId);
  if (!seat) throw new Error("That player has no seat in this story.");
  const { lead } = seat;
  // The game master was told this photo has to count, so hold it to that.
  const outcome: Outcome = data.outcome === "side_note" && mustMoveStory(seat) ? "moves_story" : data.outcome;
  const moved = outcome !== "side_note";
  const card = moved ? evidenceCard(data.card) : null;

  const canonAdded = addCanon(state, data.canonAdd, turn);
  state.bindings.push(...data.bindingsAdd.map((binding) => ({ ...binding, turn })));
  state.inventory = updateInventory(state.inventory, data.inventoryAdd, data.inventoryRemove);
  state.skeleton.beats = updateBeats(state.skeleton.beats, lead, {
    // Every step forward finishes a beat on the player's lead; a side note finishes nothing.
    beatComplete: moved,
    replanWith: data.planChange === "replan" ? data.revisedBeats : null,
  });
  reviseSecret(state, data.revisedSecret);
  seat.lastNarration = data.narration.trim();

  if (card) {
    state.evidence.push({ title: card.title, caption: card.caption, turn, by: playerId });
    state.questsCompleted += 1;
    state.progress[lead] += 1;
    seat.photosSinceProgress = 0;
  } else {
    seat.photosSinceProgress += 1;
  }

  // The step that finishes a player's part of a chapter ends their walk. With one lead it
  // ends the chapter, or the story, and the game master was told in advance so it could
  // write the hook or the ending. A two-player chapter waits for both leads (see closeDue).
  if (moved && leadPartDone(state, lead)) {
    seat.quest = null;
    seat.walking = false;
    if (singleLead(state)) {
      state.closed = state.chapter;
      if (data.recap) state.recap = data.recap.trim();
      if (unfinishedBeats(state.skeleton.beats) === 0) state.status = "complete";
    }
    return { outcome, canonAdded, questIssued: false, card };
  }

  if (data.quest) {
    seat.quest = makeQuest(data.quest, activeBeatId(state.skeleton.beats, lead), turn);
    return { outcome, canonAdded, questIssued: true, card };
  }
  // A side note can leave the open quest in place; a step forward has used it up.
  if (moved) seat.quest = null;
  return { outcome, canonAdded, questIssued: false, card };
}

/** Tell a two-player chapter's ending: the chapter closes, and the case too after the last one. Mutates `state`. */
export function applyClose(state: StoryState, close: { narration: string; recap: string; revisedSecret: string | null }) {
  state.closed = state.chapter;
  state.recap = close.recap.trim();
  reviseSecret(state, close.revisedSecret);
  if (unfinishedBeats(state.skeleton.beats) === 0) state.status = "complete";
  for (const seat of state.seats) {
    seat.walking = false;
    seat.quest = null;
    seat.lastNarration = close.narration.trim();
  }
}
