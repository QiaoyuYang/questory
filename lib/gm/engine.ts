import "server-only";
import { getConfig, type Config } from "@/lib/config";
import { editPhoto } from "@/lib/meta/image";
import { locateTarget } from "@/lib/meta/sam";
import type { Usage } from "@/lib/meta/structured";
import type { Photo } from "@/lib/photo";
import { getStore } from "@/lib/store";
import type { TargetOverlay } from "@/lib/types";
import { getBrain } from "./brain";
import { questCardPrompt } from "./card";
import type { QuestOut } from "./outputs";
import type { Beat, QuestState, StoryState, TurnRecord } from "./state";

export class GameRuleError extends Error {}

const now = () => new Date().toISOString();

function logUsage(label: string, usage: Usage) {
  console.info(
    `[questory] ${label} ${usage.model}: in=${usage.inputTokens} (cached ${usage.cachedTokens}) out=${usage.outputTokens} (reasoning ${usage.reasoningTokens})`,
  );
}

function makeBeats(goals: string[], startIndex: number): Beat[] {
  return goals
    .map((goal) => goal.trim())
    .filter(Boolean)
    .map((goal, i) => ({ id: `b${startIndex + i + 1}`, goal, status: "pending" as const }));
}

function activateNextBeat(beats: Beat[]): Beat[] {
  if (beats.some((beat) => beat.status === "active")) return beats;
  const index = beats.findIndex((beat) => beat.status === "pending");
  return index === -1 ? beats : beats.map((beat, i) => (i === index ? { ...beat, status: "active" } : beat));
}

function activeBeatId(state: StoryState): string | null {
  return state.skeleton.beats.find((beat) => beat.status === "active")?.id ?? null;
}

function completeActiveBeat(beats: Beat[]): Beat[] {
  return activateNextBeat(beats.map((beat) => (beat.status === "active" ? { ...beat, status: "done" } : beat)));
}

function replan(beats: Beat[], goals: string[] | null): Beat[] {
  if (!goals || goals.length === 0) return beats;
  const kept = beats.filter((beat) => beat.status === "done" || beat.status === "skipped");
  const highest = beats.reduce((max, beat) => Math.max(max, Number(beat.id.slice(1)) || 0), 0);
  return activateNextBeat([...kept, ...makeBeats(goals, highest)]);
}

function makeQuest(out: QuestOut, state: StoryState, turn: number, previous?: QuestState): QuestState {
  return {
    id: previous?.id ?? crypto.randomUUID(),
    title: out.title.trim(),
    objective: out.objective.trim(),
    hint: out.hint.trim(),
    targetMode: out.targetMode,
    targetPhrase: out.targetPhrase.trim().toLowerCase(),
    targetDescription: out.targetDescription.trim(),
    successCriteria: out.successCriteria.trim(),
    cardCaption: out.cardCaption.trim(),
    cardFlourish: out.cardFlourish.trim(),
    beatId: activeBeatId(state),
    issuedTurn: previous?.issuedTurn ?? turn,
    attempts: previous ? previous.attempts + 1 : 0,
  };
}

function addCanon(state: StoryState, facts: string[], turn: number): string[] {
  const known = new Set(state.canon.map((entry) => entry.fact.toLowerCase()));
  const added = facts.map((fact) => fact.trim()).filter((fact) => fact && !known.has(fact.toLowerCase()));
  state.canon.push(...added.map((fact) => ({ fact, turn })));
  return added;
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

function newTurn(state: StoryState, kind: TurnRecord["kind"], photoId: string | null, photo: Photo | null): TurnRecord {
  return {
    id: crypto.randomUUID(),
    storyId: state.id,
    number: state.turnCount + 1,
    kind,
    createdAt: now(),
    photoId,
    photoSize: photo ? { width: photo.width, height: photo.height } : null,
    cardId: null,
    cardStatus: "none",
    verdict: null,
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
    logline: data.logline.trim(),
    skeleton: {
      premise: data.premise,
      antagonist: data.antagonist,
      stakes: data.stakes,
      ending: data.ending,
      beats: activateNextBeat(makeBeats(data.beats, 0)),
    },
    characters: data.characters,
    canon: [],
    bindings: [],
    inventory: [],
    quest: null,
    chapter: 1,
    turnCount: 0,
    questsCompleted: 0,
    walk: { active: true, startedAt: createdAt, questsDone: 0 },
    recap: "",
    status: "active",
  };

  const turn = newTurn(state, "genesis", photoId, photo);
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.canonAdded = addCanon(state, data.canonAdd, turn.number);
  turn.usage = [usage];
  state.bindings.push(...data.bindingsAdd.map((b) => ({ ...b, turn: turn.number })));
  state.quest = makeQuest(data.quest, state, turn.number);
  turn.quest = state.quest;
  turn.overlay = await groundQuest(config, state.quest, photo);
  return commit(state, turn);
}

/** The player sends proof that they completed the current quest. */
export async function completeQuest(state: StoryState, photo: Photo) {
  if (!state.walk.active || !state.quest) throw new GameRuleError("There's no quest in progress. Start a walk first.");
  const config = getConfig();
  const store = getStore();
  const [photoId, judged] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).judge(state, photo.dataUrl),
  ]);
  const { data, usage } = judged;
  logUsage("judge", usage);

  const turn = newTurn(state, "complete", photoId, photo);
  turn.verdict = data.verdict;
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.usage = [usage];
  turn.canonAdded = addCanon(state, data.canonAdd, turn.number);
  state.bindings.push(...data.bindingsAdd.map((b) => ({ ...b, turn: turn.number })));

  const lower = (s: string) => s.trim().toLowerCase();
  const removing = new Set(data.inventoryRemove.map(lower));
  state.inventory = state.inventory.filter((item) => !removing.has(lower(item)));
  for (const item of data.inventoryAdd.map((s) => s.trim()).filter(Boolean)) {
    if (!state.inventory.some((owned) => lower(owned) === lower(item))) state.inventory.push(item);
  }

  if (data.planChange === "replan") state.skeleton.beats = replan(state.skeleton.beats, data.revisedBeats);

  const passed = data.verdict !== "fail";
  if (passed) {
    state.questsCompleted += 1;
    state.walk.questsDone += 1;
    if (data.beatComplete) state.skeleton.beats = completeActiveBeat(state.skeleton.beats);
  }

  const storyOver = passed && data.storyComplete;
  const chapterOver = storyOver || (passed && (data.chapterComplete || data.quest === null));

  if (chapterOver) {
    state.quest = null;
    state.walk = { ...state.walk, active: false };
    if (data.recap) state.recap = data.recap.trim();
    if (storyOver) state.status = "complete";
  } else if (passed) {
    state.quest = data.quest ? makeQuest(data.quest, state, turn.number) : null;
  } else {
    // A miss keeps the same quest; the game master may restate it with a better hint.
    const current = state.quest;
    state.quest = data.quest ? makeQuest(data.quest, state, turn.number, current) : { ...current, attempts: current.attempts + 1 };
  }

  turn.quest = state.quest;
  // Only a newly issued quest is grounded in this photo; a restated one keeps its original card.
  const issuedNow = state.quest !== null && state.quest.issuedTurn === turn.number;
  turn.overlay = issuedNow ? await groundQuest(config, state.quest, photo) : null;
  return commit(state, turn);
}

/** First photo of a new walk on an existing story. */
export async function resumeStory(state: StoryState, photo: Photo) {
  if (state.status === "complete") throw new GameRuleError("This story is finished. Start a new one.");
  if (state.walk.active) throw new GameRuleError("A walk is already in progress.");
  const config = getConfig();
  const store = getStore();
  state.chapter += 1;
  state.walk = { active: true, startedAt: now(), questsDone: 0 };

  const [photoId, resumed] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).resume(state, photo.dataUrl),
  ]);
  const { data, usage } = resumed;
  logUsage("resume", usage);

  const turn = newTurn(state, "resume", photoId, photo);
  turn.narration = data.narration.trim();
  turn.observations = data.observations;
  turn.usage = [usage];
  turn.canonAdded = addCanon(state, data.canonAdd, turn.number);
  state.bindings.push(...data.bindingsAdd.map((b) => ({ ...b, turn: turn.number })));
  if (data.planChange === "replan") state.skeleton.beats = replan(state.skeleton.beats, data.revisedBeats);
  state.skeleton.beats = activateNextBeat(state.skeleton.beats);
  state.quest = makeQuest(data.quest, state, turn.number);
  turn.quest = state.quest;
  turn.overlay = await groundQuest(config, state.quest, photo);
  return commit(state, turn);
}

/** "Show the GM": a quick in-story reaction that never advances the plot. */
export async function showGameMaster(state: StoryState, photo: Photo) {
  if (!state.walk.active) throw new GameRuleError("Start a walk first.");
  const config = getConfig();
  const store = getStore();
  const [photoId, reacted] = await Promise.all([
    store.putImage({ bytes: photo.bytes, mime: photo.mime }),
    getBrain(config).react(state, photo.dataUrl),
  ]);
  const { data, usage } = reacted;
  logUsage("react", usage);

  const turn = newTurn(state, "show", photoId, photo);
  turn.narration = data.reaction.trim();
  turn.usage = [usage];
  if (data.relevance === "clue" && data.canonAdd) turn.canonAdded = addCanon(state, [data.canonAdd], turn.number);
  return commit(state, turn);
}

/** The player stops walking; the game master closes the chapter. */
export async function endWalk(state: StoryState) {
  if (!state.walk.active) throw new GameRuleError("There's no walk in progress.");
  const config = getConfig();
  const { data, usage } = await getBrain(config).epilogue(state);
  logUsage("epilogue", usage);

  const turn = newTurn(state, "end", null, null);
  turn.narration = data.narration.trim();
  turn.usage = [usage];
  state.recap = data.recap.trim();
  state.quest = null;
  state.walk = { ...state.walk, active: false };
  return commit(state, turn);
}

/** Paint the quest card for a turn with Muse Image. Safe to call more than once. */
export async function paintQuestCard(state: StoryState, turn: TurnRecord): Promise<TurnRecord> {
  if (!turn.quest || !turn.photoId || !turn.photoSize) {
    throw new GameRuleError("This turn has no quest to paint.");
  }
  if (turn.cardStatus === "ready") return turn;

  const config = getConfig();
  const store = getStore();

  if (config.mock || !config.features.questCards) {
    // Without Muse Image the card is the photo itself; the outline overlay still shows the target.
    turn.cardId = turn.photoId;
    turn.cardStatus = "ready";
    await store.saveTurn(turn);
    return turn;
  }

  const photo = await store.getImage(turn.photoId);
  if (!photo) throw new GameRuleError("The photo for this turn is missing.");

  turn.cardStatus = "pending";
  await store.saveTurn(turn);
  try {
    const card = await editPhoto(photo, questCardPrompt(state.genre, turn.quest), turn.photoSize, {
      baseURL: config.meta.baseURL,
      apiKey: config.meta.apiKey,
      model: config.meta.imageModel,
      reasoningStrength: config.meta.imageReasoning || undefined,
    });
    turn.cardId = await store.putImage(card);
    turn.cardStatus = "ready";
  } catch (error) {
    console.warn("[questory] Muse Image could not paint the quest card:", error);
    turn.cardStatus = "failed";
  }
  await store.saveTurn(turn);
  return turn;
}
