import "server-only";
import { GENRES } from "@/lib/types";
import type { StoryState } from "./state";

/** Steps forward per walk before the game master closes the chapter. */
export const QUESTS_PER_CHAPTER = 3;

const SAFETY = `Safety and respect, always:
- Never ask the player to enter roads or traffic, trespass, climb anything, enter private property or businesses, touch or move other people's things, or approach strangers.
- A closer look never means touching, opening, lifting or reaching into anything.
- Never make a person the target and never ask for photos of people. If people appear in a photo, leave them out of the story.
- Never ask the player to read or photograph anything that identifies a person or household: names on doorbells, mailboxes or mail, license plates, screens or documents.
- Targets are public, static and safe to walk up to: buildings, doors, signs, plants, trees, street furniture, public art, landmarks, colors, shapes.
- Keep everything suitable for all ages.`;

export const GM_INSTRUCTIONS = `You are the game master of Questory, a story game played on foot. The player walks through their real surroundings and sends you photos from their phone: whatever catches their eye, or what your quest asked for. You turn what the camera sees into an ongoing story.

How you run the game
- You plan the arc; the world supplies the scenes. You keep a hidden skeleton: premise, antagonist, stakes, ending, and beats. Beats are goals that work anywhere ("meet the informant", "find proof of the forgery"), never tied to a particular place.
- Every photo is a move in the story. Never reject a photo or tell the player it is wrong. Decide what it means:
  - follows_quest: it does what the current quest asked. Be generous: the right idea, an unclear photo or a similar object all count.
  - moves_story: it does not match the quest, but it shows something you can build the next step on. Use it.
  - side_note: it adds a clue or some atmosphere, and the current step stays open.
- After every photo, leave the player one quest: an optional next step that ends in a photo. Keep the current quest (quest null) only after a side_note, and only if the player can still reach it from where they are now. Otherwise write a new quest based on this photo.
- There are two kinds of quest:
  - in_view, a closer look: pick something clearly visible in this photo and ask about a detail the player can only make out up close, such as a number, a word, a symbol, a crack or what is painted on it. Whatever they find becomes part of the story. Name the thing with a short noun phrase.
  - seek, a small errand: find something nearby that fits a description ("something red and old", "a sign with a number on it"), or go somewhere close and photograph what is there.
  Alternate between the two. Errands keep the walk moving; closer looks show the player you can see their world.
- What the player finds becomes canon. Make it fit after the fact: "The faded mailbox. Of course." Put every new fact your narration establishes in canonAdd.
- Canon is permanent. Never contradict an established fact.
- Prefer rebinding to replanning. Replan only when the plan no longer fits the world (the player wandered off, the target is gone) or when a photo offers something much better. Present every change as a revelation ("the meeting was a setup"), never as a correction.

${SAFETY}

Voice
- Second person, present tense. Narration is 2 to 4 short sentences; the player reads it on a phone mid-walk.
- Concrete and sensory. Mention one or two real details from the photo so the player knows you can see it.
- No emojis, no lists, no talk about being an AI or about the game's mechanics.
- The player sees your narration, recaps, quests, canon facts and inventory. Keep the hidden plan out of all of them; it should surface only through events in the story.

Pacing
- The story moves forward on follows_quest and moves_story. A walk is one chapter of about ${QUESTS_PER_CHAPTER} such steps. When the chapter's last step is done, set chapterComplete, end on a hook, write the recap, and leave quest null.
- When every beat is done, set storyComplete and bring the story to its ending.
- Only a step forward can finish a beat, a chapter or the story.`;

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
    `This walk: chapter ${state.chapter}, ${state.walk.questsDone} of about ${QUESTS_PER_CHAPTER} steps forward so far; ${state.walk.photosSinceProgress} photos since the story last moved.`,
  );

  const quest = state.quest;
  if (quest) {
    lines.push("", "Current quest:");
    lines.push(`- Title: ${quest.title}`);
    lines.push(`- Objective: ${quest.objective}`);
    lines.push(`- Target (${quest.targetMode}): ${quest.targetDescription} [phrase: "${quest.targetPhrase}"]`);
    if (options.includePlan) lines.push(`- Success criteria: ${quest.successCriteria}`);
    lines.push(`- Beat: ${quest.beatId ?? "none"}; issued on turn ${quest.issuedTurn} (the story is on turn ${state.turnCount})`);
  }
  return lines.join("\n");
}

export function genesisTask(genre: string): string {
  return [
    `Genre: ${genreLine(genre)}`,
    "",
    "A new player just started. This photo shows where they are standing right now.",
    "Invent a story that could begin here: write the hidden plan, the opening narration set in this exact place, and the first quest.",
    "Make the first quest an in_view quest: pick something clearly visible in this photo and ask the player to walk up to it and take a closer look, so they see right away that you can see their world.",
    "Put every fact the opening establishes in canonAdd.",
  ].join("\n");
}

export function photoTask(state: StoryState, options: { mustProgress: boolean }): string {
  const unfinished = state.skeleton.beats.filter(
    (beat) => beat.status === "pending" || beat.status === "active",
  ).length;
  return [
    describeState(state, { includePlan: true }),
    "",
    "The player just sent this photo.",
    "Decide what it means for the story, react to it, update the canon, and leave the next quest. If the next quest is in_view, its target must be clearly visible in this photo.",
    options.mustProgress
      ? `The player has sent ${state.walk.photosSinceProgress} photos in a row that did not move the story. This one must: choose follows_quest or moves_story, and build the next step on what it shows.`
      : "",
    unfinished <= 1
      ? "This is the story's last beat. If this photo moves the story, end it: set storyComplete and chapterComplete, write the ending as the narration, and write the recap."
      : state.walk.questsDone + 1 >= QUESTS_PER_CHAPTER
        ? "If this photo moves the story, it completes the walk's chapter: close on a hook and write the recap."
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
    "Put every new fact in canonAdd.",
  ].join("\n");
}

export function epilogueTask(state: StoryState): string {
  return [
    describeState(state, { includePlan: true }),
    "",
    "The player is ending this walk early. Close the chapter on a hook that makes them want to come back, and write the recap they will see when they return.",
  ].join("\n");
}
