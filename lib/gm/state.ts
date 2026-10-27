import "server-only";
import { z } from "zod";
import {
  GENRES,
  type Outcome,
  type QuestView,
  type StorySummary,
  type StoryView,
  type TurnView,
} from "@/lib/types";

/**
 * The full story state, server side. The game master's memory lives in three layers:
 *
 * - skeleton: the hidden plan (premise, antagonist, beats). Beats are goals that work
 *   anywhere; they can be re-planned, but only when the world forces it.
 * - bindings: how abstract beats map onto real things the player photographed.
 *   These change freely, every turn.
 * - canon: facts already established in play. Permanent; never contradicted.
 */

const GenreSchema = z.enum(GENRES.map((g) => g.id) as [string, ...string[]]);

export const QuestStateSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  hint: z.string(),
  targetMode: z.enum(["in_view", "seek"]),
  targetPhrase: z.string(),
  targetDescription: z.string(),
  successCriteria: z.string(),
  cardCaption: z.string(),
  cardFlourish: z.string(),
  beatId: z.string().nullable(),
  issuedTurn: z.number(),
});
export type QuestState = z.infer<typeof QuestStateSchema>;

export const BeatSchema = z.object({
  id: z.string(),
  goal: z.string(),
  status: z.enum(["pending", "active", "done", "skipped"]),
});
export type Beat = z.infer<typeof BeatSchema>;

export const StoryStateSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  playerId: z.string(),
  genre: GenreSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string(),
  logline: z.string(),
  skeleton: z.object({
    premise: z.string(),
    antagonist: z.string(),
    stakes: z.string(),
    ending: z.string(),
    beats: z.array(BeatSchema),
  }),
  characters: z.array(z.object({ name: z.string(), role: z.string(), notes: z.string() })),
  canon: z.array(z.object({ fact: z.string(), turn: z.number() })),
  bindings: z.array(z.object({ abstract: z.string(), concrete: z.string(), turn: z.number() })),
  inventory: z.array(z.string()),
  quest: QuestStateSchema.nullable(),
  chapter: z.number(),
  turnCount: z.number(),
  questsCompleted: z.number(),
  walk: z.object({
    active: z.boolean(),
    startedAt: z.string().nullable(),
    /** Photos this walk that moved the story forward. */
    questsDone: z.number(),
    /** Photos in a row that left the story where it was. Stories saved before this field start at 0. */
    photosSinceProgress: z.number().default(0),
  }),
  recap: z.string(),
  status: z.enum(["active", "complete"]),
});
export type StoryState = z.infer<typeof StoryStateSchema>;

export const TurnRecordSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  number: z.number(),
  // "complete" (proof photo) and "show" are from before every photo went through one turn.
  kind: z.enum(["genesis", "photo", "resume", "end", "complete", "show"]),
  createdAt: z.string(),
  photoId: z.string().nullable(),
  photoSize: z.object({ width: z.number(), height: z.number() }).nullable(),
  cardId: z.string().nullable(),
  cardStatus: z.enum(["none", "pending", "ready", "failed"]),
  outcome: z.enum(["follows_quest", "moves_story", "side_note"]).nullable().default(null),
  /** Only on old proof-photo turns. */
  verdict: z.enum(["success", "partial", "fail"]).nullish(),
  narration: z.string(),
  quest: QuestStateSchema.nullable(),
  overlay: z
    .object({
      phrase: z.string(),
      width: z.number(),
      height: z.number(),
      box: z.object({ left: z.number(), top: z.number(), right: z.number(), bottom: z.number() }),
      confidence: z.number().nullable(),
      outline: z.object({ path: z.string(), transform: z.string() }).nullable(),
    })
    .nullable(),
  canonAdded: z.array(z.string()),
  observations: z.array(z.string()),
  usage: z.array(
    z.object({
      model: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      reasoningTokens: z.number(),
      cachedTokens: z.number(),
    }),
  ),
});
export type TurnRecord = z.infer<typeof TurnRecordSchema>;

export function mediaUrl(id: string | null): string | null {
  return id ? `/api/media/${encodeURIComponent(id)}` : null;
}

export function questView(quest: QuestState | null): QuestView | null {
  if (!quest) return null;
  return {
    id: quest.id,
    title: quest.title,
    objective: quest.objective,
    hint: quest.hint,
    targetMode: quest.targetMode,
    targetDescription: quest.targetDescription,
  };
}

/** Old proof and "show" turns read as photo turns. */
function viewOutcome(turn: TurnRecord): Outcome | null {
  if (turn.outcome) return turn.outcome;
  if (turn.kind === "complete") return turn.verdict === "fail" ? "side_note" : "follows_quest";
  if (turn.kind === "show") return "side_note";
  return null;
}

export function storyView(state: StoryState): StoryView {
  return {
    id: state.id,
    title: state.title,
    logline: state.logline,
    genre: state.genre as StoryView["genre"],
    chapter: state.chapter,
    status: state.status,
    walkActive: state.walk.active,
    quest: questView(state.quest),
    questsCompleted: state.questsCompleted,
    inventory: state.inventory,
    canon: state.canon.map((entry) => entry.fact),
    recap: state.recap,
    updatedAt: state.updatedAt,
  };
}

export function storySummary(state: StoryState): StorySummary {
  const view = storyView(state);
  return {
    id: view.id,
    title: view.title,
    genre: view.genre,
    chapter: view.chapter,
    status: view.status,
    walkActive: view.walkActive,
    questsCompleted: view.questsCompleted,
    updatedAt: view.updatedAt,
  };
}

export function turnView(turn: TurnRecord): TurnView {
  return {
    id: turn.id,
    number: turn.number,
    kind: turn.kind === "complete" || turn.kind === "show" ? "photo" : turn.kind,
    createdAt: turn.createdAt,
    photoUrl: mediaUrl(turn.photoId),
    photoSize: turn.photoSize,
    cardUrl: turn.cardStatus === "ready" ? mediaUrl(turn.cardId) : null,
    cardStatus: turn.cardStatus,
    outcome: viewOutcome(turn),
    narration: turn.narration,
    quest: questView(turn.quest),
    overlay: turn.overlay,
    canonAdded: turn.canonAdded,
  };
}
