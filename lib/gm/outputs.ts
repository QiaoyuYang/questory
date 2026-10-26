import "server-only";
import { z } from "zod";

/** What the game master returns. These double as the structured-output schemas. */

export const QuestOutSchema = z.object({
  title: z.string().describe("Quest title, 2 to 6 words, sentence case."),
  objective: z
    .string()
    .describe("One sentence telling the player what to find or do. At most 25 words."),
  hint: z.string().describe("A gentle extra clue for when they get stuck. One sentence."),
  targetMode: z
    .enum(["in_view", "seek"])
    .describe(
      "in_view: the target is clearly visible in the current photo. seek: the player must find something nearby that fits a description.",
    ),
  targetPhrase: z
    .string()
    .describe(
      'A 1 to 4 word concrete noun phrase naming the target, e.g. "red door", "stone bench", "street sign". No verbs, no articles.',
    ),
  targetDescription: z
    .string()
    .describe("A short player-facing description of what counts, e.g. \"the green door with brass numbers\"."),
  successCriteria: z
    .string()
    .describe("Private to you: what a proof photo must show for this quest to count."),
  cardCaption: z.string().describe("At most 8 words, printed on the quest card."),
  cardFlourish: z
    .string()
    .describe("One small visual detail to paint onto the quest card that fits the story."),
});
export type QuestOut = z.infer<typeof QuestOutSchema>;

const BindingSchema = z.object({
  abstract: z.string().describe("The story element, e.g. \"the informant's dead drop\"."),
  concrete: z.string().describe("The real thing it is bound to, e.g. \"the faded red mailbox on the corner\"."),
});

export const GenesisSchema = z.object({
  title: z.string().describe("The story's title, 2 to 5 words."),
  logline: z.string().describe("One spoiler-free sentence the player sees."),
  premise: z.string().describe("Private: the hidden truth behind the story."),
  antagonist: z.string().describe("Private: who or what opposes the player, and why."),
  stakes: z.string().describe("Private: what happens if the player fails."),
  ending: z.string().describe("Private: how the story resolves when every beat is done."),
  beats: z
    .array(z.string())
    .describe("Private: 5 to 7 story beats in order, written as goals that work anywhere."),
  characters: z.array(
    z.object({ name: z.string(), role: z.string(), notes: z.string() }),
  ),
  narration: z.string().describe("The opening, 2 to 4 sentences, set in the place in the photo."),
  observations: z.array(z.string()).describe("Concrete things you see in the photo."),
  canonAdd: z.array(z.string()).describe("Facts established by the opening."),
  bindingsAdd: z.array(BindingSchema),
  quest: QuestOutSchema,
});
export type GenesisOut = z.infer<typeof GenesisSchema>;

const planFields = {
  planChange: z
    .enum(["none", "rebind", "replan"])
    .describe("none: plan unchanged. rebind: same beats, new real-world bindings. replan: the remaining beats change."),
  planReason: z.string().describe("Private: why, in one sentence. Empty when planChange is none."),
  revisedBeats: z
    .array(z.string())
    .nullable()
    .describe("Only when planChange is replan: the new list of unfinished beats. Otherwise null."),
};

export const TurnSchema = z.object({
  verdict: z.enum(["success", "partial", "fail"]).describe("Your judgment of the proof photo."),
  narration: z.string().describe("2 to 4 sentences reacting to the proof photo, in the story."),
  observations: z.array(z.string()).describe("Concrete things you see in the photo."),
  canonAdd: z.array(z.string()).describe("Facts this turn establishes."),
  bindingsAdd: z.array(BindingSchema),
  inventoryAdd: z.array(z.string()).describe("Items or clues the player gains."),
  inventoryRemove: z.array(z.string()).describe("Items the player uses up or loses."),
  ...planFields,
  beatComplete: z.boolean().describe("True when this success finishes the current beat."),
  chapterComplete: z.boolean().describe("True when this walk's chapter should end now."),
  storyComplete: z.boolean().describe("True when every beat is done and the story is over."),
  recap: z
    .string()
    .nullable()
    .describe("When the chapter or story ends: a 'previously on' summary under 80 words. Otherwise null."),
  quest: QuestOutSchema.nullable().describe(
    "The next quest. On a fail, restate the current quest (adjusted if needed). Null when the chapter or story ends.",
  ),
});
export type TurnOut = z.infer<typeof TurnSchema>;

export const ResumeSchema = z.object({
  narration: z
    .string()
    .describe("2 to 4 sentences: pick the story back up in this new place and set the hook."),
  observations: z.array(z.string()),
  canonAdd: z.array(z.string()),
  bindingsAdd: z.array(BindingSchema),
  ...planFields,
  quest: QuestOutSchema,
});
export type ResumeOut = z.infer<typeof ResumeSchema>;

export const ReactionSchema = z.object({
  reaction: z.string().describe("One or two sentences, in the story's voice."),
  relevance: z
    .enum(["clue", "color", "none"])
    .describe("clue: it matters to the story. color: atmosphere only. none: unrelated."),
  canonAdd: z.string().nullable().describe("When relevance is clue: one short new fact. Otherwise null."),
});
export type ReactionOut = z.infer<typeof ReactionSchema>;

export const EpilogueSchema = z.object({
  narration: z.string().describe("2 to 4 sentences closing this walk on a hook."),
  recap: z.string().describe("A 'previously on' summary under 80 words for next time."),
});
export type EpilogueOut = z.infer<typeof EpilogueSchema>;
