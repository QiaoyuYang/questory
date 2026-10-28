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
import { unfinishedBeats } from "./beats";

/**
 * The full story state, server side. The game master's memory lives in three layers:
 *
 * - skeleton: the hidden plan (the secret, premise, antagonist, beats). Beats are goals
 *   that work anywhere; they can be re-planned, but only when the world forces it.
 * - bindings: how abstract beats map onto real things the player photographed.
 *   These change freely, every turn.
 * - canon: facts already established in play. Permanent; never contradicted.
 */

const GenreSchema = z.enum(GENRES.map((g) => g.id) as [string, ...string[]]);

export const QuestStateSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  targetMode: z.enum(["in_view", "seek"]),
  targetPhrase: z.string(),
  targetDescription: z.string(),
  successCriteria: z.string(),
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
  /** The player who started the story. */
  playerId: z.string(),
  /** Players who joined through the invite link and took a chapter. Stories saved before it start empty. */
  partners: z.array(z.string()).default([]),
  /** The invite link's code and how many players the case takes, made when the owner first shares it. */
  invite: z.object({ code: z.string(), size: z.number() }).nullable().default(null),
  genre: GenreSchema,
  /** The player's own idea for a custom story, already cleaned (see cleanTheme). */
  theme: z.string().nullable().default(null),
  /** One player, or two taking a chapter each. Stories saved before it are solo. */
  mode: z.enum(["solo", "team"]).default("solo"),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string(),
  /** The case: the question the story answers. Older stories have a one-line pitch instead. */
  logline: z.string(),
  skeleton: z.object({
    /** The answer to the case, revealed when the story ends. Stories saved before it start empty. */
    secret: z.string().default(""),
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
  /** One piece per step forward, named on that step's card. Stories saved before it start empty. */
  evidence: z
    .array(
      // `by` is who found it; null on evidence from before stories could be shared, which the owner found.
      z.object({ title: z.string(), caption: z.string(), turn: z.number(), by: z.string().nullable().default(null) }),
    )
    .default([]),
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
    /** Who is playing this walk. Only they can send photos or end it. Null means the owner. */
    playerId: z.string().nullable().default(null),
  }),
  recap: z.string(),
  /** The game master's last narration, so the next one can carry on from it without repeating it. */
  lastNarration: z.string().default(""),
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
  /** Set when the photo moved the story: what Muse Image paints onto it. */
  card: z.object({ title: z.string(), caption: z.string() }).nullable().default(null),
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
  /** Who played the turn. Null on turns from before stories could be shared, which the owner played. */
  playerId: z.string().nullable().default(null),
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
    targetMode: quest.targetMode,
  };
}

/** Old proof and "show" turns read as photo turns. */
function viewOutcome(turn: TurnRecord): Outcome | null {
  if (turn.outcome) return turn.outcome;
  if (turn.kind === "complete") return turn.verdict === "fail" ? "side_note" : "follows_quest";
  if (turn.kind === "show") return "side_note";
  return null;
}

/** Who is playing the current walk. Walks from before stories could be shared were the owner's. */
export function walkPlayer(state: StoryState): string {
  return state.walk.playerId ?? state.playerId;
}

/** Players a case takes when its owner invites a friend. */
export const TEAM_SIZE = 2;

/** The story as `viewerId` sees it: the owner, or a partner who joined through the invite. */
export function storyView(state: StoryState, viewerId: string): StoryView {
  const complete = state.status === "complete";
  const size = state.invite?.size ?? TEAM_SIZE;
  return {
    id: state.id,
    title: state.title,
    logline: state.logline,
    genre: state.genre as StoryView["genre"],
    theme: state.theme,
    mode: state.mode,
    chapter: state.chapter,
    status: state.status,
    walkActive: state.walk.active,
    role: viewerId === state.playerId ? "owner" : "partner",
    shared: state.partners.length > 0,
    partnerWalking: state.walk.active && walkPlayer(state) !== viewerId,
    invitable: state.mode === "team" && viewerId === state.playerId && !complete && state.partners.length < size - 1,
    upNext: state.mode === "team" && walkPlayer(state) === viewerId ? "partner" : "you",
    inviteCode: state.mode === "team" && viewerId === state.playerId ? (state.invite?.code ?? null) : null,
    quest: questView(state.quest),
    questsCompleted: state.questsCompleted,
    // Every step forward finishes a beat and turns up a piece of evidence.
    evidenceTotal: state.questsCompleted + (complete ? 0 : unfinishedBeats(state.skeleton.beats)),
    secret: complete && state.skeleton.secret ? state.skeleton.secret : null,
    inventory: state.inventory,
    canon: state.canon.map((entry) => entry.fact),
    recap: state.recap,
    updatedAt: state.updatedAt,
  };
}

export function storySummary(state: StoryState, viewerId: string): StorySummary {
  const view = storyView(state, viewerId);
  return {
    id: view.id,
    title: view.title,
    genre: view.genre,
    theme: view.theme,
    mode: view.mode,
    chapter: view.chapter,
    status: view.status,
    walkActive: view.walkActive,
    role: view.role,
    questsCompleted: view.questsCompleted,
    evidenceTotal: view.evidenceTotal,
    updatedAt: view.updatedAt,
  };
}

/** A turn as `viewerId` sees it. Turns without a player are the owner's. */
export function turnView(turn: TurnRecord, viewerId: string, ownerId: string): TurnView {
  return {
    id: turn.id,
    number: turn.number,
    playedBy: (turn.playerId ?? ownerId) === viewerId ? "you" : "partner",
    kind: turn.kind === "complete" || turn.kind === "show" ? "photo" : turn.kind,
    createdAt: turn.createdAt,
    photoUrl: mediaUrl(turn.photoId),
    photoSize: turn.photoSize,
    card: turn.card ? { title: turn.card.title, caption: turn.card.caption } : null,
    cardUrl: turn.cardStatus === "ready" ? mediaUrl(turn.cardId) : null,
    cardStatus: turn.cardStatus,
    outcome: viewOutcome(turn),
    narration: turn.narration,
    quest: questView(turn.quest),
    overlay: turn.overlay,
    canonAdded: turn.canonAdded,
  };
}
