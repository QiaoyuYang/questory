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
  "Shown to the player when they come back: 2 sentences, at most 40 words, second person, past tense, covering only what they have seen and done. Never mention the hidden plan, beats or these instructions.";

export const QuestOutSchema = z.object({
  title: text(LABEL).describe(
    'Quest title, 2 to 4 words, sentence case. A small tease, not a label: "The worn corner", not "A closer look at the post box".',
  ),
  targetMode: z
    .enum(["in_view", "seek"])
    .describe(
      "in_view: a closer look at something clearly visible in this photo. seek: a small errand nearby that ends in a photo.",
    ),
  objective: text(SENTENCE).describe(
    'One plain sentence of at most 16 words telling the player what to do, e.g. "Find a date carved or painted nearby and photograph it." For in_view, ask about a detail they can only make out up close.',
  ),
  hint: text(SENTENCE).describe("One short sentence of at most 12 words for when they get stuck. Never empty."),
  targetPhrase: text(LABEL).describe(
    'A 1 to 4 word concrete noun phrase naming the target, e.g. "red door", "stone bench", "street sign". No verbs, no articles.',
  ),
  targetDescription: text(SENTENCE).describe(
    "At most 8 words describing what counts, e.g. \"the green door with brass numbers\".",
  ),
  successCriteria: text(SENTENCE * 2).describe("Private to you: what a photo must show to count as doing this quest."),
});
export type QuestOut = z.infer<typeof QuestOutSchema>;

/** A story card: Muse Image paints it onto the photo that moved the story. */
const CardSchema = z.object({
  title: text(LABEL).describe("2 to 4 words naming what the player found, sentence case. Lettered large across the top."),
  caption: text(LABEL).describe(
    'At most 6 words, lettered along the bottom of the card. A fragment, not a sentence, e.g. "Rubbed away, not forgotten".',
  ),
  flourish: text(SENTENCE).describe(
    "One small visual detail to paint onto the card that fits the story. A picture, never words, numbers or labels.",
  ),
});
export type CardOut = z.infer<typeof CardSchema>;

const BindingSchema = z.object({
  abstract: text(SENTENCE).describe("The story element, e.g. \"the informant's dead drop\"."),
  concrete: text(SENTENCE).describe("The real thing it is bound to, e.g. \"the faded red mailbox on the corner\"."),
});

export const GenesisSchema = z.object({
  title: text(LABEL).describe("The story's title, 2 to 5 words."),
  logline: text(SENTENCE).describe("One spoiler-free sentence the player sees, at most 15 words."),
  premise: text(PLAN).describe("Private: the hidden truth behind the story."),
  antagonist: text(PLAN).describe("Private: who or what opposes the player, and why."),
  stakes: text(PLAN).describe("Private: what happens if the player fails."),
  ending: text(PLAN).describe("Private: how the story resolves when every beat is done."),
  beats: list(text(SENTENCE)).describe("Private: 5 to 7 story beats in order, written as goals that work anywhere."),
  characters: list(z.object({ name: text(LABEL), role: text(LABEL), notes: text(SENTENCE) })),
  narration: prose(NARRATION).describe("The opening: 2 or 3 sentences, at most 45 words, set in the place in the photo."),
  observations: list(text(SENTENCE)).describe("Concrete things you see in the photo."),
  canonAdd: list(text(SENTENCE)).describe(
    "Every fact the opening narration tells the player, such as who is missing or what was seen, at most 12 words each. The player reads these as clues, so nothing from the hidden plan.",
  ),
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

/** Any photo the player sends during a walk. */
export const PhotoTurnSchema = z.object({
  outcome: z
    .enum(["follows_quest", "moves_story", "side_note"])
    .describe(
      "follows_quest: the photo does what the current quest asked; be generous. moves_story: it does not, but you use what it shows to move the story forward anyway. side_note: it adds a clue or atmosphere, and the story waits for more.",
    ),
  narration: prose(NARRATION).describe("2 or 3 sentences, at most 45 words: what this photo changes in the story."),
  card: CardSchema.nullable().describe(
    "With follows_quest or moves_story: the story card that marks this step, painted onto this photo. Null with side_note.",
  ),
  observations: list(text(SENTENCE)).describe("Concrete things you see in the photo."),
  canonAdd: list(text(SENTENCE)).describe(
    'Every new fact this turn\'s narration tells the player, including what they found, at most 12 words each, e.g. "The foundation plaque is missing from beside the door." Nothing from the hidden plan.',
  ),
  bindingsAdd: list(BindingSchema),
  inventoryAdd: list(text(SENTENCE)).describe(
    'Things the player now carries, 2 to 6 words each, such as "a brass key" or "a torn note". Never places or fixed objects.',
  ),
  inventoryRemove: list(text(SENTENCE)).describe("Items the player uses up or loses."),
  ...planFields,
  beatComplete: z
    .boolean()
    .describe("True when this photo finishes the current beat. Only with follows_quest or moves_story."),
  chapterComplete: z.boolean().describe("True when this walk's chapter should end now."),
  storyComplete: z.boolean().describe("True when every beat is done and the story is over."),
  recap: recapText()
    .nullable()
    .describe(`Only when the chapter or story ends; otherwise null. ${RECAP_RULES}`),
  quest: QuestOutSchema.nullable().describe(
    "The next quest. Null keeps the current quest, which only fits after a side_note when the player can still reach it from here. Also null when the chapter or story ends.",
  ),
});
export type PhotoTurnOut = z.infer<typeof PhotoTurnSchema>;

export const ResumeSchema = z.object({
  narration: prose(NARRATION).describe(
    "2 or 3 sentences, at most 45 words: start the next chapter here and set the hook.",
  ),
  observations: list(text(SENTENCE)).describe("Concrete things you see in the photo."),
  canonAdd: list(text(SENTENCE)).describe(
    "Every new fact this turn's narration tells the player, at most 12 words each. Nothing from the hidden plan.",
  ),
  bindingsAdd: list(BindingSchema),
  ...planFields,
  quest: QuestOutSchema,
});
export type ResumeOut = z.infer<typeof ResumeSchema>;

export const EpilogueSchema = z.object({
  narration: prose(NARRATION).describe("2 or 3 sentences, at most 45 words, closing this walk on a hook."),
  recap: recapText().describe(RECAP_RULES),
});
export type EpilogueOut = z.infer<typeof EpilogueSchema>;
