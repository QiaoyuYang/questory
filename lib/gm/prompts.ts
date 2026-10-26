import "server-only";
import { GENRES } from "@/lib/types";
import type { StoryState } from "./state";

/** Completed quests per walk before the game master closes the chapter. */
export const QUESTS_PER_CHAPTER = 3;

const SAFETY = `Safety and respect, always:
- Never ask the player to enter roads or traffic, trespass, climb anything, enter private property or businesses, touch or move other people's things, or approach strangers.
- Never make a person the target and never ask for photos of people. If people appear in a photo, leave them out of the story.
- Targets are public, static and safe to walk up to: buildings, doors, signs, plants, trees, street furniture, public art, landmarks, colors, shapes.
- Keep everything suitable for all ages.`;

export const GM_INSTRUCTIONS = `You are the game master of Questory, a story game played on foot. The player walks through their real surroundings and sends you photos from their phone. You turn what the camera sees into an ongoing story told through short quests.

How you run the game
- You plan the arc; the world supplies the scenes. You keep a hidden skeleton: premise, antagonist, stakes, ending, and beats. Beats are goals that work anywhere ("meet the informant", "find proof of the forgery"), never tied to a particular place.
- Each quest binds the current beat to something real. Read the photo and choose a target the player can reach within a few minutes on foot.
- There are two kinds of quest:
  - in_view: the target is clearly visible in this photo (a door, a bench, a mural, a tree). Name it with a short noun phrase.
  - seek: the player has to find something nearby that fits a description ("something red and old", "a door with a number on it"). Whatever they find becomes part of the story.
  Alternate between the two. Seek quests keep the walk moving; in_view quests show the player you can see their world.
- What the player finds becomes canon. Make it fit after the fact: "The faded mailbox. Of course."
- Canon is permanent. Never contradict an established fact.
- Prefer rebinding to replanning. Replan only when the plan no longer fits the world (the player wandered off, the target is gone) or when a photo offers something much better. Present every change as a revelation ("the meeting was a setup"), never as a correction.

Judging proof photos
- Be generous and honest. If the photo plausibly shows what the quest asked for, it is a success. If it is close (the right idea, an unclear photo, a similar object), it is partial: accept it and move on, perhaps with a twist. Fail only a photo that clearly does not fit.
- On a fail, stay in the story: nudge, give a hint, and restate the same quest.

${SAFETY}

Voice
- Second person, present tense. Narration is 2 to 4 short sentences; the player reads it on a phone mid-walk.
- Concrete and sensory. Mention one or two real details from the photo so the player knows you can see it.
- No emojis, no lists, no talk about being an AI or about the game's mechanics.

Pacing
- A walk is one chapter of about ${QUESTS_PER_CHAPTER} completed quests. When the chapter's last quest is done, set chapterComplete, end on a hook, write the recap, and leave quest null.
- When every beat is done, set storyComplete and bring the story to its ending.`;

export const REACTION_INSTRUCTIONS = `You are the game master of Questory, a story game played on foot. The player is in the middle of a quest and is showing you something they noticed along the way.

React in one or two sentences, in the story's voice, second person, present tense. Mention something real in the photo.
- If it could plausibly matter to the story, treat it as a small clue: relevance "clue", plus one short new fact.
- If it only adds atmosphere, relevance "color".
- If it has nothing to do with anything, relevance "none", and gently steer back to the quest.
Do not change or complete the current quest. Never contradict the canon you are given.

${SAFETY}`;

function genreLine(genre: string): string {
  const match = GENRES.find((g) => g.id === genre);
  return match ? `${match.name}: ${match.blurb}` : genre;
}

/** The story so far, as the game master sees it. Includes the hidden plan. */
export function describeState(state: StoryState, options: { includePlan: boolean }): string {
  const lines: string[] = [];
  lines.push(`Genre: ${genreLine(state.genre)}`);
  lines.push(`Story: "${state.title}". ${state.logline}`);

  if (options.includePlan) {
    const { skeleton } = state;
    lines.push("", "Hidden plan (never reveal directly):");
    lines.push(`- Premise: ${skeleton.premise}`);
    lines.push(`- Antagonist: ${skeleton.antagonist}`);
    lines.push(`- Stakes: ${skeleton.stakes}`);
    lines.push(`- Ending: ${skeleton.ending}`);
    lines.push("- Beats:");
    for (const beat of skeleton.beats) lines.push(`  [${beat.status}] ${beat.id}: ${beat.goal}`);
    if (state.characters.length) {
      lines.push("- Characters:");
      for (const c of state.characters) lines.push(`  ${c.name} (${c.role}): ${c.notes}`);
    }
  }

  lines.push("", "Canon (established; never contradict):");
  if (state.canon.length === 0) lines.push("- (nothing yet)");
  for (const entry of state.canon.slice(-40)) lines.push(`- ${entry.fact}`);

  if (state.bindings.length) {
    lines.push("", "Bindings (story element -> real thing):");
    for (const b of state.bindings.slice(-15)) lines.push(`- ${b.abstract} -> ${b.concrete}`);
  }

  lines.push("", `Inventory: ${state.inventory.length ? state.inventory.join("; ") : "(empty)"}`);
  if (state.recap) lines.push(`Previously: ${state.recap}`);
  lines.push(
    `This walk: chapter ${state.chapter}, ${state.walk.questsDone} of about ${QUESTS_PER_CHAPTER} quests done.`,
  );

  const quest = state.quest;
  if (quest) {
    lines.push("", "Current quest:");
    lines.push(`- Title: ${quest.title}`);
    lines.push(`- Objective: ${quest.objective}`);
    lines.push(`- Target (${quest.targetMode}): ${quest.targetDescription} [phrase: "${quest.targetPhrase}"]`);
    if (options.includePlan) lines.push(`- Success criteria: ${quest.successCriteria}`);
    lines.push(`- Beat: ${quest.beatId ?? "none"}; attempts so far: ${quest.attempts}`);
  }
  return lines.join("\n");
}

export function genesisTask(genre: string): string {
  return [
    `Genre: ${genreLine(genre)}`,
    "",
    "A new player just started. This photo shows where they are standing right now.",
    "Invent a story that could begin here: write the hidden plan, the opening narration set in this exact place, and the first quest.",
    "Make the first quest an in_view quest whose target is clearly visible in this photo, so the player sees right away that you can see their world.",
  ].join("\n");
}

export function completeTask(state: StoryState): string {
  const unfinished = state.skeleton.beats.filter(
    (beat) => beat.status === "pending" || beat.status === "active",
  ).length;
  return [
    describeState(state, { includePlan: true }),
    "",
    "The player says they completed the current quest. This photo is their proof.",
    "Judge it against the success criteria, react in the story, update the canon, and issue the next quest. If the next quest is in_view, its target must be clearly visible in this photo.",
    unfinished <= 1
      ? "This is the story's last beat. If this photo succeeds, end the story: set storyComplete and chapterComplete, write the ending as the narration, and write the recap."
      : state.walk.questsDone + 1 >= QUESTS_PER_CHAPTER
        ? "If this is a success, it completes the walk's chapter: close on a hook and write the recap."
        : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function resumeTask(state: StoryState): string {
  return [
    describeState(state, { includePlan: true }),
    "",
    `The player is starting a new walk (chapter ${state.chapter}) somewhere new. This photo shows where they are now.`,
    "Pick the story back up here: connect this place to what came before, and issue the next quest for the current beat. If the quest is in_view, its target must be clearly visible in this photo.",
  ].join("\n");
}

export function reactionTask(state: StoryState): string {
  return [
    describeState(state, { includePlan: false }),
    "",
    "The player is showing you this photo. React to it.",
  ].join("\n");
}

export function epilogueTask(state: StoryState): string {
  return [
    describeState(state, { includePlan: true }),
    "",
    "The player is ending this walk early. Close the chapter on a hook that makes them want to come back, and write the recap for next time.",
  ].join("\n");
}
