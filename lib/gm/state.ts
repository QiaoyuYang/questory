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
import { LEADS, unfinishedBeats } from "./beats";
import { fromSingleWalk } from "./migrate";
import {
  TEAM_SIZE,
  closeDue,
  leadPartDone,
  otherLead,
  seatOf,
  singleLead,
  stepsLeft,
  unclaimedLead,
} from "./rules";

/**
 * The full story state, server side. The game master's memory lives in three layers:
 *
 * - skeleton: the hidden plan (the secret, premise, antagonist, beats). Beats are goals
 *   that work anywhere; they can be re-planned, but only when the world forces it.
 * - bindings: how abstract beats map onto real things the player photographed.
 *   These change freely, every turn.
 * - canon: facts already established in play. Permanent; never contradicted.
 *
 * Each player has a seat: their lead, their next step and their walk. Two players can be
 * partway through turns at once, so turns are saved onto the story as it is by then (see
 * commit in engine.ts).
 */

const GenreSchema = z.enum(GENRES.map((g) => g.id) as [string, ...string[]]);

export const QuestStateSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  targetMode: z.enum(["in_view", "seek"]),
  targetPhrase: z.string(),
  /** What stands out around the target, outlined when the target itself can't be found. Older quests have none. */
  targetLandmark: z.string().default(""),
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
  /** Whose lead it's on. A two-player case has two; stories from before leads have one. */
  lead: z.enum(LEADS).default("a"),
});
export type Beat = z.infer<typeof BeatSchema>;

/** One player's place in a story. */
export const SeatSchema = z.object({
  playerId: z.string(),
  /** The lead they follow. Their photos only move this one. */
  lead: z.enum(LEADS),
  quest: QuestStateSchema.nullable(),
  /** Out on a walk now. Ending a walk pauses it, and the chapter waits for them. */
  walking: z.boolean(),
  startedAt: z.string().nullable(),
  /** Photos in a row that left the story where it was. */
  photosSinceProgress: z.number(),
  /** The game master's last narration to this player, so the next one can carry on from it without repeating it. */
  lastNarration: z.string(),
});
export type Seat = z.infer<typeof SeatSchema>;

export const StoryStateSchema = z.preprocess(
  fromSingleWalk,
  z.object({
    version: z.literal(1),
    id: z.string(),
    /** The player who started the story. */
    playerId: z.string(),
    /** Players who joined through the invite link. Stories saved before it start empty. */
    partners: z.array(z.string()).default([]),
    /** The invite link's code and how many players the case takes, made when the owner first shares it. */
    invite: z.object({ code: z.string(), size: z.number() }).nullable().default(null),
    genre: GenreSchema,
    /** The player's own idea for a custom story, already cleaned (see cleanTheme). */
    theme: z.string().nullable().default(null),
    /** One player, or two following a lead each. Stories saved before it are solo. */
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
      /** What each chapter finds out, in order. Stories saved before chapters were planned have none. */
      chapters: z.array(z.string()).default([]),
      /** In a two-player case, the side of the case each lead finds out. */
      focus: z.object({ a: z.string(), b: z.string() }).nullable().default(null),
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
    seats: z.array(SeatSchema),
    chapter: z.number(),
    /** The last chapter whose ending has been told: equal to `chapter` between chapters. */
    closed: z.number(),
    /** Steps forward on each lead in the current chapter. */
    progress: z.object({ a: z.number(), b: z.number() }),
    turnCount: z.number(),
    questsCompleted: z.number(),
    recap: z.string(),
    status: z.enum(["active", "complete"]),
  }),
);
export type StoryState = z.infer<typeof StoryStateSchema>;

export const TurnRecordSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  number: z.number(),
  // "complete" (proof photo) and "show" are from before every photo went through one turn,
  // and "end" from when ending a walk closed its chapter. "close" tells a two-player chapter's ending.
  kind: z.enum(["genesis", "photo", "resume", "end", "close", "complete", "show"]),
  createdAt: z.string(),
  /** The chapter it belongs to. Null on turns from before it was kept. */
  chapter: z.number().nullable().default(null),
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
  /** Who played the turn. Null on a chapter's ending, which is both players', and on turns from before stories could be shared, which the owner played. */
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

/** Where the viewer stands in the story right now. */
function stageOf(state: StoryState, viewerId: string): StoryView["stage"] {
  if (state.status === "complete") return "solved";
  const seat = seatOf(state, viewerId);
  if (seat?.walking) return "walking";
  if (closeDue(state)) return "closing";
  if (state.closed === state.chapter) return "between";
  // A case from before leads has one walk at a time.
  if (singleLead(state) && state.seats.some((other) => other.walking)) return "watching";
  return leadPartDone(state, seat?.lead ?? unclaimedLead(state) ?? "a") ? "waiting" : "ready";
}

/** The story as `viewerId` sees it: the owner, or a partner who joined through the invite. */
export function storyView(state: StoryState, viewerId: string): StoryView {
  const complete = state.status === "complete";
  const size = state.invite?.size ?? TEAM_SIZE;
  const seat = seatOf(state, viewerId);
  const stage = stageOf(state, viewerId);
  const two = state.mode === "team" && !singleLead(state);
  // The partner's lead: the one the viewer isn't on, whether or not the friend has taken it yet.
  const partnerLead = otherLead(seat?.lead ?? "a");
  const partnerSeat = state.seats.find((other) => other.playerId !== viewerId) ?? null;
  return {
    id: state.id,
    title: state.title,
    logline: state.logline,
    genre: state.genre as StoryView["genre"],
    theme: state.theme,
    mode: state.mode,
    chapter: state.chapter,
    status: state.status,
    walkActive: state.seats.some((other) => other.walking),
    stage,
    role: viewerId === state.playerId ? "owner" : "partner",
    shared: state.partners.length > 0,
    partner: two
      ? {
          joined: state.partners.length > 0,
          walking: partnerSeat?.walking ?? false,
          left: complete ? 0 : stepsLeft(state, partnerLead),
        }
      : null,
    // Before the friend joins, the player can walk their lead too, so the chapter can end.
    canTakeOver: stage === "waiting" && two && unclaimedLead(state) === partnerLead && !leadPartDone(state, partnerLead),
    invitable: state.mode === "team" && viewerId === state.playerId && !complete && state.partners.length < size - 1,
    inviteCode: state.mode === "team" && viewerId === state.playerId ? (state.invite?.code ?? null) : null,
    quest: seat?.walking ? questView(seat.quest) : null,
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

/** A turn as `viewerId` sees it. Turns without a player are the owner's, except a chapter's ending, which is everyone's. */
export function turnView(turn: TurnRecord, viewerId: string, ownerId: string): TurnView {
  return {
    id: turn.id,
    number: turn.number,
    playedBy: turn.kind === "close" || (turn.playerId ?? ownerId) === viewerId ? "you" : "partner",
    kind: turn.kind === "complete" || turn.kind === "show" ? "photo" : turn.kind,
    createdAt: turn.createdAt,
    chapter: turn.chapter,
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
