import "server-only";
import { z } from "zod";
import { clipText } from "@/lib/meta/structured";
import { CHAPTERS, LEAD_STEPS, STEPS_PER_CHAPTER } from "./rules";

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
const LIST = Math.max(12, LEAD_STEPS);

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
  "Shown to the player when they come back: 2 sentences, at most 40 words, second person, past tense, covering only what they have seen and done. Never mention chapters, the hidden plan, beats or these instructions.";

export const QuestOutSchema = z.object({
  title: text(LABEL).describe(
    'What the player is looking for, as the story calls it, 2 to 4 words, sentence case: "The bus stop bench" or "Where the bag went". Never an instruction like "Find the mark".',
  ),
  targetMode: z
    .enum(["in_view", "seek"])
    .describe(
      "in_view: a closer look at something clearly visible in this photo. seek: a small errand nearby that ends in a photo.",
    ),
  objective: text(SENTENCE).describe(
    'One sentence of at most 16 words naming the real thing to find, e.g. "Find a bench or a bus stop nearby and photograph it." For in_view, ask about a detail they can only make out up close.',
  ),

  targetPhrase: text(LABEL).describe(
    'A 1 to 4 word concrete noun phrase naming the target by how it looks, e.g. "red door", "stone bench", "street sign". No verbs, no articles, no numbers.',
  ),
  targetLandmark: text(LABEL).describe(
    'For in_view, the thing in this photo that stands out with the target on it or next to it, named by how it looks, e.g. "red post box", "arched doorway". It gets outlined when the target is too small or faint to find. The target phrase again if the target is that thing; empty for seek.',
  ),
  targetDescription: text(SENTENCE).describe(
    "At most 8 words describing what counts, e.g. \"the green door with brass numbers\".",
  ),
  successCriteria: text(SENTENCE * 2).describe("Private to you: what a photo must show to count as doing this quest."),
});
export type QuestOut = z.infer<typeof QuestOutSchema>;

/** A piece of evidence. Muse Image paints it as a card onto the photo that turned it up. */
const CardSchema = z.object({
  title: text(LABEL).describe(
    'The evidence, 2 to 4 words, sentence case: the thing in this photo as the story sees it, e.g. "The forced lock". Lettered large across the top of the card.',
  ),
  proves: text(LABEL).describe(
    'What the evidence tells the player, 3 to 6 words, e.g. "Someone forced it, then fixed it" or "Stamped after hours". Never where it is, never what they knew already, and never "this, not that". Lettered along the bottom.',
  ),
});
export type CardOut = z.infer<typeof CardSchema>;

const BindingSchema = z.object({
  abstract: text(SENTENCE).describe("The story element, e.g. \"the informant's dead drop\"."),
  concrete: text(SENTENCE).describe("The real thing it is bound to, e.g. \"the faded red mailbox on the corner\"."),
});

// The plan comes before the opening, so the opening can be written to it.
const genesisPlan = {
  title: text(LABEL).describe("The story's title, 2 to 5 words."),
  question: text(SENTENCE).describe(
    'The case: the one question the whole story answers, at most 12 words, e.g. "Who forged the eviction notice under your door?". The player sees it all story long.',
  ),
  secret: text(SENTENCE).describe(
    'Private until the last step: the answer to the case in one sentence, e.g. "Mara, the landlord\'s niece, forged it to buy the flat cheap."',
  ),
  premise: text(PLAN).describe("Private: the hidden truth behind the story."),
  antagonist: text(PLAN).describe("Private: who or what opposes the player, and why."),
  stakes: text(PLAN).describe("Private: what happens if the player fails."),
  ending: text(PLAN).describe("Private: how the story resolves when every beat is done."),
};

/** A chapter's beats on one lead, one field each, so the plan always has every step. */
function chapterSteps(whose: string) {
  const shape: Record<string, z.ZodString> = {};
  for (let i = 1; i <= STEPS_PER_CHAPTER; i++) shape[`step${i}`] = text(SENTENCE);
  return z
    .object(shape)
    .describe(
      `Private: ${whose} ${STEPS_PER_CHAPTER} beats in this chapter, in order, one per step forward. Each is the next find on the trail and what it tells the player: a place or object in the story's world that ordinary real things can stand in for, e.g. "The office stamp, so the notice came from inside". How it looks comes from the player's photo. Never something the player already knows.`,
    );
}

/** The plan, chapter by chapter, one field each for the same reason. */
function chapterPlan(team: boolean) {
  const own = z.object({
    findsOut: text(SENTENCE).describe(
      'What this chapter finds out on the way to the answer, never something the opening tells, e.g. "How the notice got onto the door". The last chapter finds out the answer.',
    ),
    steps: chapterSteps(team ? "this player's lead:" : "the"),
  });
  const chapter = team ? own.extend({ partnerSteps: chapterSteps("the partner's lead:") }) : own;
  const shape: Record<string, typeof chapter> = {};
  for (let i = 1; i <= CHAPTERS; i++) shape[`chapter${i}`] = chapter;
  return z.object(shape).describe(`Private: the case's ${CHAPTERS} chapters, in order.`);
}

const genesisOpening = {
  characters: list(z.object({ name: text(LABEL), role: text(LABEL), notes: text(SENTENCE) })).describe(
    "Private: the whole cast, at most 2, including whoever is behind the secret. Nobody else appears in the story.",
  ),
  narration: prose(NARRATION).describe(
    "The opening: 2 to 4 short sentences, at most 50 words, set in the place in the photo. It says what happened, whose problem it is, and what the player is trying to find out.",
  ),
  observations: list(text(SENTENCE)).describe("Concrete things you see in the photo."),
  canonAdd: list(text(SENTENCE)).describe(
    "Every fact about the case that the opening narration tells the player, such as who is missing or what was seen, at most 12 words each. The player reads these as clues, so nothing from the hidden plan, nothing the narration doesn't say, and nothing about who follows which lead.",
  ),
  bindingsAdd: list(BindingSchema),
  quest: QuestOutSchema,
};

export const GenesisSchema = z.object({ ...genesisPlan, chapters: chapterPlan(false), ...genesisOpening });

/** A case for two players, who each follow a lead of their own. */
export const GenesisTeamSchema = z.object({
  ...genesisPlan,
  focus: text(LABEL).describe(
    'Private: the side of the case this player\'s lead finds out, 3 to 8 words, e.g. "how the deed was swapped".',
  ),
  partnerFocus: text(LABEL).describe(
    'Private: the side the partner\'s lead finds out, 3 to 8 words, e.g. "who could have done it". No beat on either lead needs anything found on the other.',
  ),
  chapters: chapterPlan(true),
  ...genesisOpening,
});

type ChapterOut = { findsOut: string; steps: Record<string, string>; partnerSteps?: Record<string, string> };
export type GenesisOut = Omit<z.infer<typeof GenesisSchema>, "chapters"> & {
  focus?: string;
  partnerFocus?: string;
  chapters: Record<string, ChapterOut>;
};

const planFields = {
  planChange: z
    .enum(["none", "rebind", "replan"])
    .describe("none: plan unchanged. rebind: same beats, new real-world bindings. replan: the remaining beats change."),
  planReason: text(SENTENCE).describe("Private: why, in one sentence. Empty when planChange is none."),
  revisedBeats: list(text(SENTENCE))
    .nullable()
    .describe("Only when planChange is replan: the new unfinished beats on the player's lead, as many as before. Otherwise null."),
  revisedSecret: text(SENTENCE)
    .nullable()
    .describe(
      "Only when the evidence found so far no longer fits the secret: a new answer that explains every piece, using only people the player has met. Otherwise null.",
    ),
};

/** Any photo the player sends during a walk. */
export const PhotoTurnSchema = z.object({
  outcome: z
    .enum(["follows_quest", "moves_story", "side_note"])
    .describe(
      "follows_quest: the photo does what the current quest asked; be generous. moves_story: it does not, but you use what it shows to move the story forward anyway. side_note: it adds atmosphere or a small detail but nothing new about the case, and the story waits for more.",
    ),
  narration: prose(NARRATION).describe(
    "2 or 3 short sentences, at most 40 words: what this place or thing is in the story, and the one new thing it tells the player. For a side_note, 1 or 2 sentences: a moment at this place, and nothing about what is still to find.",
  ),
  // Always required: when it was optional, the game master often left it out of real steps.
  card: CardSchema.describe(
    'The piece of evidence this photo turns up, painted onto it as a card, even when the find rules something out ("The empty room": "Nothing was sold here"). After a side_note it is set aside, so it only counts on a step forward.',
  ),
  observations: list(text(SENTENCE)).describe("Concrete things you see in the photo."),
  canonAdd: list(text(SENTENCE)).describe(
    'Every new fact this turn\'s narration tells the player, including what they found, at most 12 words each, e.g. "The foundation plaque is missing from beside the door." Nothing from the hidden plan, and nothing the narration doesn\'t say.',
  ),
  bindingsAdd: list(BindingSchema),
  inventoryAdd: list(text(SENTENCE)).describe(
    'Things the player now carries, 2 to 6 words each, such as "a brass key" or "a torn note". Never places or fixed objects.',
  ),
  inventoryRemove: list(text(SENTENCE)).describe("Items the player uses up or loses."),
  ...planFields,
  recap: recapText()
    .nullable()
    .describe(`Only when the task says this step ends the chapter or the story; otherwise null. ${RECAP_RULES}`),
  quest: QuestOutSchema.nullable().describe(
    "The next quest. Null keeps the current quest, which only fits after a side_note when the player can still reach it from here. Also null when this step ends the chapter, the player's part of it, or the story.",
  ),
});
export type PhotoTurnOut = z.infer<typeof PhotoTurnSchema>;

export const ResumeSchema = z.object({
  narration: prose(NARRATION).describe(
    "2 to 4 short sentences, at most 50 words: pick the case up here, remind the player what it is, and set up their next step.",
  ),
  observations: list(text(SENTENCE)).describe("Concrete things you see in the photo."),
  canonAdd: list(text(SENTENCE)).describe(
    "Every new fact this turn's narration tells the player, at most 12 words each. Nothing from the hidden plan, and nothing the narration doesn't say.",
  ),
  bindingsAdd: list(BindingSchema),
  ...planFields,
  quest: QuestOutSchema,
});
export type ResumeOut = z.infer<typeof ResumeSchema>;

/** The ending of a two-player chapter, told once both leads are done. Both players read it. */
export const CloseSchema = z.object({
  narration: prose(NARRATION).describe(
    "2 to 4 short sentences, at most 50 words, read by both players together: what this chapter's finds from both leads add up to, bringing in one or two of them by name, ending on a hook, or on the answer when this solves the case.",
  ),
  recap: recapText().describe(RECAP_RULES),
  revisedSecret: planFields.revisedSecret,
});
export type CloseOut = z.infer<typeof CloseSchema>;
