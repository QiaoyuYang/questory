import "server-only";
import { getConfig, type Config } from "@/lib/config";
import { editPhoto } from "@/lib/meta/image";
import { locateTarget } from "@/lib/meta/sam";
import type { Usage } from "@/lib/meta/structured";
import type { Photo } from "@/lib/photo";
import { getStore } from "@/lib/store";
import { GAME_MASTER, type TargetOverlay } from "@/lib/types";
import { visitorKey } from "@/lib/visitor";
import { activateNextBeat, activeBeatId, makeBeats, replan } from "./beats";
import { getBrain } from "./brain";
import { storyCardPrompt } from "./card";
import { addCanon, applyPhotoTurn, makeQuest, mustMoveStory } from "./rules";
import { TEAM_SIZE, walkPlayer, type QuestState, type StoryState, type TurnRecord } from "./state";

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
  playerId: string,
  photoId: string | null,
  photo: Photo | null,
): TurnRecord {
  return {
    id: crypto.randomUUID(),
    storyId: state.id,
    number: state.turnCount + 1,
    kind,
    createdAt: now(),
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

async function commit(state: StoryState, turn: TurnRecord) {
  state.turnCount = turn.number;
  state.updatedAt = now();
  const store = getStore();
  await store.saveTurn(turn);
  await store.saveStory(state);
  return { state, turn };
}

/** First photo of a new story: the game master invents the plan and the first quest. */
export async function startStory(playerId: string, genre: string, photo: Photo) {
  const config = getConfig();
  const store = getStore();
  await spendCall(config, playerId);
  const [photoId, genesis] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).genesis(genre, photo.dataUrl),
  ]);
  const { data, usage } = genesis;
  logUsage("genesis", usage);

  const createdAt = now();
  const state: StoryState = {
    version: 1,
    id: crypto.randomUUID(),
    playerId,
    genre,
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
      beats: activateNextBeat(makeBeats(data.beats, 0)),
    },
    characters: data.characters,
    partners: [],
    // Made now so the share sheet can open the moment the owner taps Invite: phones only
    // allow it straight after a tap, with no network wait in between.
    invite: { code: crypto.randomUUID(), size: TEAM_SIZE },
    canon: [],
    bindings: [],
    inventory: [],
    evidence: [],
    quest: null,
    chapter: 1,
    turnCount: 0,
    questsCompleted: 0,
    walk: { active: true, startedAt: createdAt, questsDone: 0, photosSinceProgress: 0, playerId },
    recap: "",
    status: "active",
  };

  const turn = newTurn(state, "genesis", playerId, photoId, photo);
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.canonAdded = addCanon(state, data.canonAdd, turn.number);
  turn.usage = [usage];
  state.bindings.push(...data.bindingsAdd.map((b) => ({ ...b, turn: turn.number })));
  state.quest = makeQuest(data.quest, activeBeatId(state.skeleton.beats), turn.number);
  turn.quest = state.quest;
  turn.overlay = await groundQuest(config, state.quest, photo);
  return commit(state, turn);
}

/** Only the player on the current walk can add to it. */
function checkWalker(state: StoryState, playerId: string) {
  if (!state.walk.active) throw new GameRuleError("Start a walk first.");
  if (walkPlayer(state) !== playerId) {
    throw new GameRuleError("Your partner is playing this chapter. You can take the next one.");
  }
}

/**
 * Any photo the player takes during a walk: what the quest asked for, or whatever caught
 * their eye. The game master decides what it means for the story.
 */
export async function takePhoto(state: StoryState, photo: Photo, playerId: string) {
  checkWalker(state, playerId);
  const config = getConfig();
  const store = getStore();
  await spendCall(config, playerId);
  const mustProgress = mustMoveStory(state);
  const [photoId, played] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).photo(state, photo.dataUrl, { mustProgress }),
  ]);
  const { data, usage } = played;
  logUsage("photo", usage);

  const turn = newTurn(state, "photo", playerId, photoId, photo);
  const applied = applyPhotoTurn(state, data, turn.number);
  turn.outcome = applied.outcome;
  turn.card = applied.card;
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.usage = [usage];
  turn.canonAdded = applied.canonAdded;
  // A kept quest stays with the photo it was issued from.
  turn.quest = applied.questIssued ? state.quest : null;
  turn.overlay = applied.questIssued ? await groundQuest(config, state.quest, photo) : null;
  return commit(state, turn);
}

/**
 * First photo of a new walk on an existing story. A friend who opened the invite link
 * joins the case this way: whoever starts a chapter plays it.
 */
export async function resumeStory(state: StoryState, photo: Photo, playerId: string) {
  if (state.status === "complete") throw new GameRuleError("This story is finished. Start a new one.");
  if (state.walk.active) {
    throw new GameRuleError(
      walkPlayer(state) === playerId ? "A walk is already in progress." : "Your partner is playing this chapter right now.",
    );
  }
  // The route has already checked the invite code for anyone who isn't in the story yet.
  const joining = playerId !== state.playerId && !state.partners.includes(playerId);
  if (joining && state.partners.length >= (state.invite?.size ?? TEAM_SIZE) - 1) {
    throw new GameRuleError("This case already has all its players.");
  }
  const config = getConfig();
  const store = getStore();
  await spendCall(config, playerId);
  if (joining) state.partners.push(playerId);
  state.chapter += 1;
  state.walk = { active: true, startedAt: now(), questsDone: 0, photosSinceProgress: 0, playerId };

  const [photoId, resumed] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).resume(state, photo.dataUrl, { newPlayer: joining }),
  ]);
  const { data, usage } = resumed;
  logUsage("resume", usage);

  const turn = newTurn(state, "resume", playerId, photoId, photo);
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.usage = [usage];
  turn.canonAdded = addCanon(state, data.canonAdd, turn.number);
  state.bindings.push(...data.bindingsAdd.map((b) => ({ ...b, turn: turn.number })));
  if (data.planChange === "replan") state.skeleton.beats = replan(state.skeleton.beats, data.revisedBeats);
  state.skeleton.beats = activateNextBeat(state.skeleton.beats);
  state.quest = makeQuest(data.quest, activeBeatId(state.skeleton.beats), turn.number);
  turn.quest = state.quest;
  turn.overlay = await groundQuest(config, state.quest, photo);
  return commit(state, turn);
}

/** The player stops walking; the game master closes the chapter. */
export async function endWalk(state: StoryState, playerId: string) {
  checkWalker(state, playerId);
  const config = getConfig();
  await spendCall(config, playerId);
  const { data, usage } = await getBrain(config).epilogue(state);
  logUsage("epilogue", usage);

  const turn = newTurn(state, "end", playerId, null, null);
  turn.narration = data.narration.trim();
  turn.usage = [usage];
  state.recap = data.recap.trim();
  state.quest = null;
  state.walk = { ...state.walk, active: false };
  return commit(state, turn);
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
    const card = await editPhoto(photo, storyCardPrompt(state.genre, turn.card), turn.photoSize, {
      baseURL: config.meta.baseURL,
      apiKey: config.meta.apiKey,
      model: config.meta.imageModel,
      reasoningStrength: config.meta.imageReasoning || undefined,
    });
    turn.cardId = await store.putImage(card);
    turn.cardStatus = "ready";
  } catch (error) {
    console.warn("[questory] Muse Image could not paint the card:", error);
    turn.cardStatus = "failed";
  }
  await store.saveTurn(turn);
  return turn;
}
