import "server-only";
import { z } from "zod";
import { clipText } from "@/lib/meta/structured";

/** What the game master returns. These double as the structured-output schemas. */

// Length caps sit well above a normal reply and far below a runaway one. The Meta
// API enforces them while generating, and zod checks them again on the way back.
// A reply over a cap is retried once, then clipped at a sentence boundary
// (see lib/meta/structured.ts).
const NARRATION = 700;
const RECAP = 600;
const REACTION = 600;
const PLAN = 1200;
const SENTENCE = 300;
const LABEL = 100;
const LIST = 12;

const text = (max: number) => z.string().max(max);

/** Drop the half sentence left behind when generation stops at a length cap. */
export function endOnSentence(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length < max * 0.9 || /[.!?\u2026]["'\u201d\u2019)]*$/.test(trimmed)) return trimmed;
  return clipText(trimmed, trimmed.length - 1);
}

/** Prose the player reads: it ends on a full sentence even when the cap cut it short. */
const prose = (max: number) => z.string().overwrite((value) => endOnSentence(value, max)).max(max);
const list = <T extends z.ZodType>(item: T) => z.array(item).max(LIST);

// What the game master writes when it mistakes the recap for notes to itself:
// beat ids, plan headings, raw JSON.
const PLAN_NOTES =
  /\bb\d+\b|\bbeats?\s+b?\d|\b(?:premise|antagonist|stakes|ending|canon|inventory|objective)\s*:|\bhidden plan\b|\bjson\b|\binternal state\b|[{}[\]]/i;

/** Keep the recap up to the first sentence that reads like the game master's private notes. */
export function stripPlanNotes(recap: string): string {
  const sentences = recap.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)\s*/g) ?? [recap];
  const kept: string[] = [];
  for (const sentence of sentences) {
    if (PLAN_NOTES.test(sentence)) break;
    kept.push(sentence);
  }
  return kept.join("").trim();
}

/** The player reads the recap, so it also loses any leaked notes. */
const recapText = () =>
  z
    .string()
    .overwrite((value) => stripPlanNotes(endOnSentence(value, RECAP)))
    .max(RECAP);

const RECAP_RULES =
  "Shown to the player when they come back: 2 or 3 sentences, at most 60 words, second person, past tense, covering only what they have seen and done. Never mention the hidden plan, beats or these instructions.";

export const QuestOutSchema = z.object({
  title: text(LABEL).describe("Quest title, 2 to 6 words, sentence case."),
  objective: text(SENTENCE).describe("One sentence telling the player what to find or do. At most 25 words."),
  hint: text(SENTENCE).describe("A gentle extra clue for when they get stuck. One sentence."),
  targetMode: z
    .enum(["in_view", "seek"])
    .describe(
      "in_view: the target is clearly visible in the current photo. seek: the player must find something nearby that fits a description.",
    ),
  targetPhrase: text(LABEL).describe(
    'A 1 to 4 word concrete noun phrase naming the target, e.g. "red door", "stone bench", "street sign". No verbs, no articles.',
  ),
  targetDescription: text(SENTENCE).describe(
    "A short player-facing description of what counts, e.g. \"the green door with brass numbers\".",
  ),
  successCriteria: text(SENTENCE * 2).describe("Private to you: what a proof photo must show for this quest to count."),
  cardCaption: text(LABEL).describe("At most 8 words, printed on the quest card."),
  cardFlourish: text(SENTENCE).describe("One small visual detail to paint onto the quest card that fits the story."),
});
export type QuestOut = z.infer<typeof QuestOutSchema>;

const BindingSchema = z.object({
  abstract: text(SENTENCE).describe("The story element, e.g. \"the informant's dead drop\"."),
  concrete: text(SENTENCE).describe("The real thing it is bound to, e.g. \"the faded red mailbox on the corner\"."),
});

export const GenesisSchema = z.object({
  title: text(LABEL).describe("The story's title, 2 to 5 words."),
  logline: text(SENTENCE).describe("One spoiler-free sentence the player sees."),
  premise: text(PLAN).describe("Private: the hidden truth behind the story."),
  antagonist: text(PLAN).describe("Private: who or what opposes the player, and why."),
  stakes: text(PLAN).describe("Private: what happens if the player fails."),
  ending: text(PLAN).describe("Private: how the story resolves when every beat is done."),
  beats: list(text(SENTENCE)).describe("Private: 5 to 7 story beats in order, written as goals that work anywhere."),
  characters: list(z.object({ name: text(LABEL), role: text(LABEL), notes: text(SENTENCE) })),
  narration: prose(NARRATION).describe("The opening, 2 to 4 sentences, set in the place in the photo."),
  observations: list(text(SENTENCE)).describe("Concrete things you see in the photo."),
  canonAdd: list(text(SENTENCE)).describe("Facts established by the opening."),
  bindingsAdd: list(BindingSchema),
  quest: QuestOutSchema,
});
export type GenesisOut = z.infer<typeof GenesisSchema>;

const planFields = {
  planChange: z
    .enum(["none", "rebind", "replan"])
    .describe("none: plan unchanged. rebind: same beats, new real-world bindings. replan: the remaining beats change."),
  planReason: text(SENTENCE).describe("Private: why, in one sentence. Empty when planChange is none."),
  revisedBeats: list(text(SENTENCE))
    .nullable()
    .describe("Only when planChange is replan: the new list of unfinished beats. Otherwise null."),
};

export const TurnSchema = z.object({
  verdict: z.enum(["success", "partial", "fail"]).describe("Your judgment of the proof photo."),
  narration: prose(NARRATION).describe("2 to 4 sentences reacting to the proof photo, in the story."),
  observations: list(text(SENTENCE)).describe("Concrete things you see in the photo."),
  canonAdd: list(text(SENTENCE)).describe("Facts this turn establishes."),
  bindingsAdd: list(BindingSchema),
  inventoryAdd: list(text(SENTENCE)).describe("Items or clues the player gains."),
  inventoryRemove: list(text(SENTENCE)).describe("Items the player uses up or loses."),
  ...planFields,
  beatComplete: z.boolean().describe("True when this success finishes the current beat."),
  chapterComplete: z.boolean().describe("True when this walk's chapter should end now."),
  storyComplete: z.boolean().describe("True when every beat is done and the story is over."),
  recap: recapText()
    .nullable()
    .describe(`Only when the chapter or story ends; otherwise null. ${RECAP_RULES}`),
  quest: QuestOutSchema.nullable().describe(
    "The next quest. On a fail, restate the current quest (adjusted if needed). Null when the chapter or story ends.",
  ),
});
export type TurnOut = z.infer<typeof TurnSchema>;

export const ResumeSchema = z.object({
  narration: prose(NARRATION).describe("2 to 4 sentences: pick the story back up in this new place and set the hook."),
  observations: list(text(SENTENCE)),
  canonAdd: list(text(SENTENCE)),
  bindingsAdd: list(BindingSchema),
  ...planFields,
  quest: QuestOutSchema,
});
export type ResumeOut = z.infer<typeof ResumeSchema>;

export const ReactionSchema = z.object({
  reaction: prose(REACTION).describe("One or two sentences, in the story's voice."),
  relevance: z
    .enum(["clue", "color", "none"])
    .describe("clue: it matters to the story. color: atmosphere only. none: unrelated."),
  canonAdd: text(SENTENCE).nullable().describe("When relevance is clue: one short new fact. Otherwise null."),
});
export type ReactionOut = z.infer<typeof ReactionSchema>;

export const EpilogueSchema = z.object({
  narration: prose(NARRATION).describe("2 to 4 sentences closing this walk on a hook."),
  recap: recapText().describe(RECAP_RULES),
});
export type EpilogueOut = z.infer<typeof EpilogueSchema>;
