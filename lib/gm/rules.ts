import { GAME_MASTER, type Outcome } from "@/lib/types";
import type { WalkLength } from "@/lib/walk";
import { LEADS, activateNextBeat, activeBeatId, unfinishedBeats, updateBeats, type Lead } from "./beats";
import type { CheckIn, CheckOut, GenesisOut, PhotoTurnOut, QuestOut } from "./outputs";
import type { QuestState, Seat, StoryState, TurnRecord } from "./state";

/**
 * How turns change the story. Pure bookkeeping on the state object, kept apart from the
 * engine (which talks to the models and the store) so it can be tested.
 */

/**
 * How big a case is: its chapters, and the steps forward on each lead in a chapter. Each step
 * finishes a beat and turns up a piece of evidence, so a player finds `steps` per chapter,
 * alone or with a friend.
 */
export type CaseSize = { chapters: number; steps: number };

/**
 * The case for each length of walk, small enough to solve on it: each step takes an errand
 * of ERRAND_MINUTES, except a chapter's one closer look on the spot. An hour gets the full
 * case.
 */
export const CASE_SIZES: Record<WalkLength, CaseSize> = {
  15: { chapters: 1, steps: 3 },
  30: { chapters: 2, steps: 3 },
  60: { chapters: 3, steps: 4 },
};

/** Minutes of walking before an errand's quest shows and its evidence can turn up. Time stands in for distance. */
export const ERRAND_MINUTES = 5;

/** Players a case takes when its owner invites a friend. */
export const TEAM_SIZE = 2;

/**
 * How many photos in a row may leave the story where it is. The next photo that can count
 * has to move it, so a player who ignores the quests still gets a story.
 */
export const FREE_PHOTOS = 2;

/** True when the player's coming photo has to move the story forward. */
export function mustMoveStory(seat: Seat): boolean {
  return seat.photosSinceProgress >= FREE_PHOTOS;
}

/**
 * When a photo was sent, and the minutes of walking an errand starts with. Time stands in
 * for distance, so the game never needs the player's location.
 */
export type Clock = { at: string; walkMinutes: number };

/**
 * The clock for an errand given at `at`: ERRAND_MINUTES of walking, or none with the walk timer
 * off. A walk that starts indoors opens with going outside, which isn't timed.
 */
export function errandClock(at: string, walkTimer: boolean, indoors = false): Clock {
  return { at, walkMinutes: walkTimer && !indoors ? ERRAND_MINUTES : 0 };
}

/** True while the player is still on the walk their errand started with, so a photo for it can't count yet. */
export function onTheWay(quest: QuestState | null, at: string): boolean {
  return quest?.walkUntil != null && Date.parse(at) < Date.parse(quest.walkUntil);
}

/**
 * The step on `lead` whose quest is the chapter's closer look. Never the first, which is always
 * an errand; otherwise it moves around, picked from the story, the chapter and the lead.
 */
export function closerLookStep(state: StoryState, lead: Lead): number {
  let hash = 0;
  for (const char of `${state.id}:${state.chapter}:${lead}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 2 + (hash % Math.max(1, state.size.steps - 1));
}

/**
 * True when the player's next quest has to be the chapter's closer look: their errand is for the
 * step before it, and they haven't had one this chapter. So every chapter gets exactly one, right
 * after an errand, and the rest of the case is found on foot.
 */
export function closerLookDue(state: StoryState, seat: Seat): boolean {
  return (
    seat.quest?.targetMode === "seek" &&
    seat.closerLookChapter !== state.chapter &&
    state.progress[seat.lead] === closerLookStep(state, seat.lead) - 2
  );
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
  const room = Math.max(0, state.size.steps - state.progress[lead]);
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

/** The plan for a case of `size` as lists: what each chapter finds out, and each lead's beats in order. */
export function planOf(
  data: Pick<GenesisOut, "chapters">,
  size: CaseSize,
): { findsOut: string[]; lead: string[]; partnerLead: string[] } {
  const chapters = Array.from({ length: size.chapters }, (_, i) => data.chapters[`chapter${i + 1}`]).filter(Boolean);
  const steps = (of: Record<string, string>) => Array.from({ length: size.steps }, (_, i) => of[`step${i + 1}`] ?? "");
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

/**
 * A new quest, given at a photo that showed `seen`. An errand given at `clock.at` starts with
 * a walk; a closer look is where the player stands.
 */
export function makeQuest(
  out: QuestOut,
  beatId: string | null,
  turn: number,
  clock?: Clock,
  seen: string[] = [],
): QuestState {
  const walks = out.targetMode === "seek" && clock !== undefined && clock.walkMinutes > 0;
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
    walkUntil: walks ? new Date(Date.parse(clock.at) + clock.walkMinutes * 60_000).toISOString() : null,
    seen,
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
    seat = { playerId, ...walk, lastNarration: "", closerLookChapter: null };
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

/**
 * Apply the game master's reading of `playerId`'s photo to the story. Mutates `state`.
 * `clock` says when the photo was sent; without it, errands start with no walk.
 */
export function applyPhotoTurn(
  state: StoryState,
  data: PhotoTurnOut,
  turn: number,
  playerId: string,
  clock?: Clock,
): PhotoTurnResult {
  const seat = seatOf(state, playerId);
  if (!seat) throw new Error("That player has no seat in this story.");
  const { lead } = seat;
  // An errand counts once its walk is over, and only from somewhere other than where it was
  // given. Until then a photo keeps the errand and its walk. Past that, the game master was
  // told this photo has to count, so hold it to that.
  const early = clock !== undefined && onTheWay(seat.quest, clock.at);
  const stayed = seat.quest?.targetMode === "seek" && data.samePlace;
  const counts = !early && !stayed;
  let outcome: Outcome = data.outcome;
  if (!counts) outcome = "side_note";
  else if (outcome === "side_note" && mustMoveStory(seat)) outcome = "moves_story";
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

  if (data.quest && counts) {
    seat.quest = makeQuest(data.quest, activeBeatId(state.skeleton.beats, lead), turn, clock, data.observations);
    if (seat.quest.targetMode === "in_view") seat.closerLookChapter = state.chapter;
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
