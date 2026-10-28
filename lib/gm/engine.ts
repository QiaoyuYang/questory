import "server-only";
import { getConfig, type Config } from "@/lib/config";
import { editPhoto, refusedOnContent } from "@/lib/meta/image";
import { locateTarget } from "@/lib/meta/sam";
import type { Usage } from "@/lib/meta/structured";
import type { Photo } from "@/lib/photo";
import { getStore } from "@/lib/store";
import { GAME_MASTER, type NewInvite, type TargetOverlay } from "@/lib/types";
import { visitorKey } from "@/lib/visitor";
import { activateNextBeat, activeBeatId, makeBeats, replan } from "./beats";
import { getBrain } from "./brain";
import { storyCardPrompt } from "./card";
import {
  TEAM_SIZE,
  addCanon,
  applyClose,
  applyPhotoTurn,
  closeDue,
  makeQuest,
  mustMoveStory,
  planOf,
  planWalk,
  reviseSecret,
  seatOf,
  singleLead,
  startWalk,
  unclaimedLead,
  type WalkPlan,
} from "./rules";
import type { QuestState, StoryState, TurnRecord } from "./state";

export class GameRuleError extends Error {}

/** Today's limit on paid model calls is used up. */
export class DailyLimitError extends Error {}

const now = () => new Date().toISOString();

function logUsage(label: string, usage: Usage) {
  console.info(
    `[questory] ${label} ${usage.model}: in=${usage.inputTokens} (cached ${usage.cachedTokens}) out=${usage.outputTokens} (reasoning ${usage.reasoningTokens})`,
  );
}

/**
 * Count a paid model call against today's limits before making it: the player's own and
 * everyone's together. Mock turns count too, so the limits can be tried without
 * spending credit.
 */
async function spendCall(config: Config, playerId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const store = getStore();
  // The player's own limit comes first, so the calls it turns away don't use up everyone's.
  if (config.playerDailyCallLimit > 0) {
    const key = `${day}-${await visitorKey(day, playerId, config.meta.apiKey)}`;
    if (!(await store.countCall(key, config.playerDailyCallLimit))) {
      throw new DailyLimitError("That's all for today. Come back after midnight UTC.");
    }
  }
  if (config.dailyCallLimit > 0 && !(await store.countCall(day, config.dailyCallLimit))) {
    throw new DailyLimitError(`${GAME_MASTER} is done for today. Come back after midnight UTC.`);
  }
}

function mockOverlay(photo: Photo, phrase: string): TargetOverlay {
  const w = Math.round(photo.width * 0.34);
  const h = Math.round(photo.height * 0.42);
  const left = Math.round((photo.width - w) / 2);
  const top = Math.round((photo.height - h) / 2);
  const rx = w / 2;
  const ry = h / 2;
  const cy = top + ry;
  return {
    phrase,
    width: photo.width,
    height: photo.height,
    box: { left, top, right: left + w, bottom: top + h },
    confidence: null,
    outline: {
      path: `M${left} ${cy}A${rx} ${ry} 0 1 0 ${left + w} ${cy}A${rx} ${ry} 0 1 0 ${left} ${cy}Z`,
      transform: "",
    },
  };
}

/** Find an in_view quest's target in the photo. Best effort: a miss just means no outline. */
async function groundQuest(config: Config, quest: QuestState | null, photo: Photo): Promise<TargetOverlay | null> {
  if (!quest || quest.targetMode !== "in_view" || !config.features.sam) return null;
  if (config.mock) return mockOverlay(photo, quest.targetPhrase);
  try {
    return await locateTarget(photo.dataUrl, photo, quest.targetPhrase, {
      baseURL: config.meta.baseURL,
      apiKey: config.meta.apiKey,
      model: config.meta.samModel,
    });
  } catch (error) {
    console.warn(`[questory] SAM could not locate "${quest.targetPhrase}":`, error);
    return null;
  }
}

function newTurn(
  state: StoryState,
  kind: TurnRecord["kind"],
  playerId: string | null,
  photoId: string | null,
  photo: Photo | null,
): TurnRecord {
  return {
    id: crypto.randomUUID(),
    storyId: state.id,
    number: state.turnCount + 1,
    kind,
    createdAt: now(),
    chapter: state.chapter,
    playerId,
    photoId,
    photoSize: photo ? { width: photo.width, height: photo.height } : null,
    card: null,
    cardId: null,
    cardStatus: "none",
    outcome: null,
    narration: "",
    quest: null,
    overlay: null,
    canonAdded: [],
    observations: [],
    usage: [],
  };
}

/** Throw the reason a walk can't start, or return where it goes. */
function allowed(plan: WalkPlan | { refused: string }): WalkPlan {
  if ("refused" in plan) throw new GameRuleError(plan.refused);
  return plan;
}

/**
 * Save a turn onto the story as it is now, not as it was when the turn began: the other
 * player may have saved one meanwhile. `apply` makes this turn's changes to that fresh copy
 * (and may refuse, if the story moved on in a way that rules the turn out). A null turn
 * saves a change to the story alone.
 */
async function commit(
  storyId: string,
  turn: TurnRecord | null,
  apply: (state: StoryState, number: number) => void,
): Promise<{ state: StoryState; turn: TurnRecord | null }> {
  const store = getStore();
  return store.withLock(storyId, async () => {
    const state = await store.getStory(storyId);
    if (!state) throw new GameRuleError("This story no longer exists.");
    const number = state.turnCount + 1;
    apply(state, number);
    state.updatedAt = now();
    if (turn) {
      turn.number = number;
      state.turnCount = number;
      await store.saveTurn(turn);
    }
    await store.saveStory(state);
    return { state, turn };
  });
}

/** A commit that saves a turn always returns it. */
async function commitTurn(storyId: string, turn: TurnRecord, apply: (state: StoryState, number: number) => void) {
  const { state } = await commit(storyId, turn, apply);
  return { state, turn };
}

type NewStory = {
  genre: string;
  /** The player's own idea, cleaned, for a custom story. */
  theme: string | null;
  mode: "solo" | "team";
  /** A two-player case's id and invite code, when its link went out before the case began. */
  invite: NewInvite | null;
};

/** First photo of a new story: the game master invents the plan and the first quest. */
export async function startStory(playerId: string, story: NewStory, photo: Photo) {
  const { genre, theme, mode } = story;
  const config = getConfig();
  const store = getStore();
  let invite = story.invite;
  const existing = invite ? await store.getStory(invite.storyId) : null;
  if (existing) {
    // Sent again after a reply that never arrived: the case already began, so open it.
    if (existing.playerId === playerId && existing.turnCount === 1) {
      const [opening] = await store.listTurns(existing.id);
      if (opening) return { state: existing, turn: opening };
    }
    // Otherwise the link already has a case of its own, and this one gets a new link.
    invite = null;
  }
  await spendCall(config, playerId);
  const [photoId, genesis] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).genesis(genre, theme, mode, photo.dataUrl),
  ]);
  const { data, usage } = genesis;
  logUsage("genesis", usage);

  const createdAt = now();
  const plan = planOf(data);
  // A two-player case gets the second lead, for the friend.
  const lead = makeBeats(plan.lead, 0, "a");
  const partnerLead = mode === "team" ? makeBeats(plan.partnerLead, lead.length, "b") : [];
  const state: StoryState = {
    version: 1,
    id: invite?.storyId ?? crypto.randomUUID(),
    playerId,
    genre,
    theme,
    mode,
    createdAt,
    updatedAt: createdAt,
    title: data.title.trim(),
    logline: data.question.trim(),
    skeleton: {
      secret: data.secret.trim(),
      premise: data.premise,
      antagonist: data.antagonist,
      stakes: data.stakes,
      ending: data.ending,
      beats: activateNextBeat([...lead, ...partnerLead]),
      chapters: plan.findsOut,
      focus: partnerLead.length > 0 ? { a: data.focus?.trim() ?? "", b: data.partnerFocus?.trim() ?? "" } : null,
    },
    characters: data.characters,
    partners: [],
    // Made by now so the share sheet can open the moment the owner taps to send the link:
    // phones only allow it straight after a tap, with no network wait in between.
    invite: mode === "team" ? { code: invite?.code ?? crypto.randomUUID(), size: TEAM_SIZE } : null,
    canon: [],
    bindings: [],
    inventory: [],
    evidence: [],
    seats: [],
    chapter: 1,
    closed: 0,
    progress: { a: 0, b: 0 },
    turnCount: 0,
    questsCompleted: 0,
    recap: "",
    status: "active",
  };
  const seat = startWalk(state, playerId, { lead: "a", joining: false, newChapter: false }, createdAt);

  const turn = newTurn(state, "genesis", playerId, photoId, photo);
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.canonAdded = addCanon(state, data.canonAdd, turn.number);
  turn.usage = [usage];
  state.bindings.push(...data.bindingsAdd.map((b) => ({ ...b, turn: turn.number })));
  seat.quest = makeQuest(data.quest, activeBeatId(state.skeleton.beats, "a"), turn.number);
  seat.lastNarration = turn.narration;
  turn.quest = seat.quest;
  turn.overlay = await groundQuest(config, seat.quest, photo);
  state.turnCount = turn.number;
  await store.saveTurn(turn);
  await store.saveStory(state);
  return { state, turn };
}

/**
 * Any photo the player takes during a walk: what the quest asked for, or whatever caught
 * their eye. The game master decides what it means for the story.
 */
export async function takePhoto(state: StoryState, photo: Photo, playerId: string) {
  const seat = seatOf(state, playerId);
  if (!seat?.walking) throw new GameRuleError("Start a walk first.");
  const config = getConfig();
  const store = getStore();
  await spendCall(config, playerId);
  const [photoId, played] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).photo(state, photo.dataUrl, { playerId, mustProgress: mustMoveStory(seat) }),
  ]);
  const { data, usage } = played;
  logUsage("photo", usage);
  if (data.revisedSecret?.trim()) console.info(`[questory] the answer changed to fit the evidence: ${data.revisedSecret}`);

  const turn = newTurn(state, "photo", playerId, photoId, photo);
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.usage = [usage];
  // Found before saving, so the lock is held only for the save itself.
  const overlay = data.quest ? await groundQuest(config, makeQuest(data.quest, null, 0), photo) : null;
  const secretSeen = state.skeleton.secret;
  return commitTurn(state.id, turn, (fresh, number) => {
    if (!seatOf(fresh, playerId)?.walking) throw new GameRuleError("This walk has ended.");
    // If the other player's turn changed the answer meanwhile, this reply never saw it.
    const revisedSecret = fresh.skeleton.secret === secretSeen ? data.revisedSecret : null;
    const applied = applyPhotoTurn(fresh, { ...data, revisedSecret }, number, playerId);
    turn.chapter = fresh.chapter;
    turn.outcome = applied.outcome;
    turn.card = applied.card;
    turn.canonAdded = applied.canonAdded;
    // A kept quest stays with the photo it was issued from.
    turn.quest = applied.questIssued ? seatOf(fresh, playerId)!.quest : null;
    turn.overlay = applied.questIssued ? overlay : null;
  });
}

/**
 * First photo of a walk: the next chapter, a chapter picked back up after a break, or a
 * friend's first walk on a two-player case. `takeOver` walks the other lead too, while no
 * friend has taken it.
 */
export async function resumeStory(state: StoryState, photo: Photo, playerId: string, options: { takeOver?: boolean } = {}) {
  const plan = allowed(planWalk(state, playerId, options.takeOver));
  const config = getConfig();
  const store = getStore();
  // A partner's first walk on the case gets a handoff, even if they've followed it so far.
  const firstWalk =
    playerId !== state.playerId && !(await store.listTurns(state.id)).some((turn) => turn.playerId === playerId);
  await spendCall(config, playerId);
  // The game master sees the walk as it starts: the player on their lead, in the chapter they're playing.
  const starting = structuredClone(state);
  startWalk(starting, playerId, plan, now());
  const takeOver = !plan.newChapter && plan.lead !== (seatOf(state, playerId)?.lead ?? plan.lead);

  const [photoId, resumed] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).resume(starting, photo.dataUrl, {
      playerId,
      newPlayer: firstWalk,
      newChapter: plan.newChapter,
      takeOver,
    }),
  ]);
  const { data, usage } = resumed;
  logUsage("resume", usage);

  const turn = newTurn(starting, "resume", playerId, photoId, photo);
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.usage = [usage];
  const overlay = await groundQuest(config, makeQuest(data.quest, null, 0), photo);
  const secretSeen = state.skeleton.secret;
  return commitTurn(state.id, turn, (fresh, number) => {
    // The other player may have opened the chapter meanwhile, or taken the free lead.
    const seat = startWalk(fresh, playerId, allowed(planWalk(fresh, playerId, options.takeOver)), turn.createdAt);
    turn.chapter = fresh.chapter;
    turn.canonAdded = addCanon(fresh, data.canonAdd, number);
    fresh.bindings.push(...data.bindingsAdd.map((b) => ({ ...b, turn: number })));
    if (data.planChange === "replan") fresh.skeleton.beats = replan(fresh.skeleton.beats, data.revisedBeats, seat.lead);
    if (fresh.skeleton.secret === secretSeen) reviseSecret(fresh, data.revisedSecret);
    seat.quest = makeQuest(data.quest, activeBeatId(fresh.skeleton.beats, seat.lead), number);
    seat.lastNarration = turn.narration;
    turn.quest = seat.quest;
    turn.overlay = overlay;
  });
}

/**
 * Tell a two-player chapter's ending, once both leads are done; after the last chapter,
 * the answer. Whoever finishes a chapter's last step asks for it, and the other player's
 * screen asks too if it's still missing later. Only one ending is ever saved.
 */
export async function closeChapter(state: StoryState, playerId: string) {
  const store = getStore();
  // Told already, by the other player's request or an earlier one of this player's.
  const told = async () => {
    const [fresh, turns] = await Promise.all([store.getStory(state.id), store.listTurns(state.id)]);
    const turn = turns.findLast((t) => t.kind === "close" && t.chapter === fresh?.closed);
    if (!fresh || !turn) throw new GameRuleError("This chapter isn't finished yet.");
    return { state: fresh, turn };
  };
  if (!closeDue(state)) {
    if (state.closed < state.chapter) throw new GameRuleError("This chapter isn't finished yet.");
    return told();
  }
  const config = getConfig();
  await spendCall(config, playerId);
  const { data, usage } = await getBrain(config).close(state);
  logUsage("close", usage);

  const turn = newTurn(state, "close", null, null, null);
  turn.narration = data.narration.trim();
  turn.usage = [usage];
  const saved = await commit(state.id, turn, (fresh) => {
    if (!closeDue(fresh)) throw new ToldAlready();
    applyClose(fresh, data);
  }).catch((error) => {
    if (error instanceof ToldAlready) return null;
    throw error;
  });
  return saved ? { state: saved.state, turn } : told();
}

class ToldAlready extends Error {}

/** A friend takes a two-player case's second seat through its link, and follows it from then on. */
export async function joinStory(state: StoryState, playerId: string): Promise<StoryState> {
  if (state.playerId === playerId || state.partners.includes(playerId)) return state;
  if (state.status === "complete") throw new GameRuleError("This case is already solved.");
  const size = state.invite?.size ?? TEAM_SIZE;
  const { state: saved } = await commit(state.id, null, (fresh) => {
    if (fresh.partners.includes(playerId)) return;
    if (fresh.partners.length >= size - 1) throw new GameRuleError("This case already has both its players.");
    fresh.partners.push(playerId);
    // In a two-player case the friend takes the free lead now; their first photo starts it.
    const lead = singleLead(fresh) ? null : unclaimedLead(fresh);
    if (lead) {
      fresh.seats.push({ playerId, lead, quest: null, walking: false, startedAt: null, photosSinceProgress: 0, lastNarration: "" });
    }
  });
  return saved;
}

/** The player stops walking. The chapter stays open, and their next walk picks it up. */
export async function endWalk(state: StoryState, playerId: string): Promise<StoryState> {
  if (!seatOf(state, playerId)?.walking) throw new GameRuleError("You're not on a walk.");
  const { state: saved } = await commit(state.id, null, (fresh) => {
    const seat = seatOf(fresh, playerId);
    if (!seat) return;
    seat.walking = false;
    seat.quest = null;
  });
  return saved;
}

/**
 * Paint the evidence card for a photo that moved the story, with Muse Image. Safe to
 * call more than once.
 */
export async function paintCard(state: StoryState, turn: TurnRecord, playerId: string): Promise<TurnRecord> {
  if (!turn.card || !turn.photoId || !turn.photoSize) {
    throw new GameRuleError("This turn has no card to paint.");
  }
  if (turn.cardStatus === "ready") return turn;

  const config = getConfig();
  const store = getStore();

  if (config.mock || !config.features.questCards) {
    // Without Muse Image the card is the photo itself.
    turn.cardId = turn.photoId;
    turn.cardStatus = "ready";
    await store.saveTurn(turn);
    return turn;
  }

  const photo = await store.getImage(turn.photoId);
  if (!photo) throw new GameRuleError("The photo for this turn is missing.");
  await spendCall(config, playerId);

  turn.cardStatus = "pending";
  await store.saveTurn(turn);
  try {
    const card = await drawCard(config, playerId, state, turn.card, photo, turn.photoSize);
    // When Muse Image won't draw it at all, the photo is the evidence.
    turn.cardId = card ? await store.putImage(card) : turn.photoId;
    turn.cardStatus = "ready";
  } catch (error) {
    console.warn("[questory] Muse Image could not paint the card:", error);
    turn.cardStatus = "failed";
  }
  await store.saveTurn(turn);
  return turn;
}

/**
 * Muse Image turns a few cards down on content grounds. Asking again would only be refused
 * again, so a refused card gets one plainer try, in the genre's own style rather than the
 * player's theme. Null when that is refused too.
 */
async function drawCard(
  config: Config,
  playerId: string,
  state: StoryState,
  card: NonNullable<TurnRecord["card"]>,
  photo: { bytes: Uint8Array; mime: string },
  size: { width: number; height: number },
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const options = {
    baseURL: config.meta.baseURL,
    apiKey: config.meta.apiKey,
    model: config.meta.imageModel,
    reasoningStrength: config.meta.imageReasoning || undefined,
  };
  try {
    return await editPhoto(photo, storyCardPrompt(state.genre, card, state.theme), size, options);
  } catch (error) {
    if (!refusedOnContent(error)) throw error;
    console.warn("[questory] Muse Image turned the card down on content grounds; trying a plainer one.");
  }
  await spendCall(config, playerId);
  try {
    return await editPhoto(photo, storyCardPrompt(state.genre, card, null), size, options);
  } catch (error) {
    if (!refusedOnContent(error)) throw error;
    console.warn("[questory] Muse Image turned the plainer card down too; the photo stands in.");
    return null;
  }
}
