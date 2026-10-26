import "server-only";
import type { Usage } from "@/lib/meta/structured";
import type { Brain } from "./brain";
import type { QuestOut } from "./outputs";
import { QUESTS_PER_CHAPTER } from "./prompts";
import type { StoryState } from "./state";

/**
 * A scripted game master for working on the app without an API key.
 * It cannot see photos; it cycles through stock quests so every screen can be exercised.
 */

const usage: Usage = {
  model: "mock",
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  cachedTokens: 0,
};

const pause = () => new Promise((resolve) => setTimeout(resolve, 700));

const QUESTS: QuestOut[] = [
  {
    title: "The first mark",
    objective: "Walk up to the nearest door in your photo and look for anything carved, painted or numbered.",
    hint: "Doors keep secrets in their numbers.",
    targetMode: "in_view",
    targetPhrase: "door",
    targetDescription: "the nearest door in your photo",
    successCriteria: "A door, close up.",
    cardCaption: "Find the marked door",
    cardFlourish: "a chalk arrow on the pavement",
  },
  {
    title: "Something red",
    objective: "Find something red that has been here a long time.",
    hint: "Paint fades, but brick and rust remember.",
    targetMode: "seek",
    targetPhrase: "red object",
    targetDescription: "anything red and old",
    successCriteria: "Something red.",
    cardCaption: "Find something old and red",
    cardFlourish: "a red thread trailing off the edge",
  },
  {
    title: "Where the light falls",
    objective: "Find a window that catches the light and photograph what it reflects.",
    hint: "Look for glass facing the brightest part of the sky.",
    targetMode: "seek",
    targetPhrase: "window",
    targetDescription: "a window with a reflection",
    successCriteria: "A window.",
    cardCaption: "Catch the reflection",
    cardFlourish: "a faint lens flare",
  },
  {
    title: "The green sentinel",
    objective: "Find the tallest tree or plant you can see and stand where its shadow ends.",
    hint: "Shadows point away from the sun.",
    targetMode: "seek",
    targetPhrase: "tree",
    targetDescription: "a tall tree or plant",
    successCriteria: "A tree or plant.",
    cardCaption: "Follow the long shadow",
    cardFlourish: "a few leaves drifting across the card",
  },
];

function questAfter(state: StoryState | null): QuestOut {
  const index = state ? state.questsCompleted % QUESTS.length : 0;
  return QUESTS[index];
}

export const mockBrain: Brain = {
  async genesis(genre) {
    await pause();
    return {
      usage,
      data: {
        title: genre === "mystery" ? "The courier's letter" : "The quiet signal",
        logline: "Someone left a trail through this neighborhood, and it starts right where you are standing.",
        premise: "A courier hid a sealed letter in pieces across the neighborhood before vanishing.",
        antagonist: "The person the letter would expose, who is quietly collecting the pieces first.",
        stakes: "If they find the last piece first, the truth stays buried.",
        ending: "You assemble the letter and learn the courier hid it to protect you.",
        beats: [
          "Find the courier's first mark",
          "Learn who else is looking",
          "Recover the second piece",
          "Outwit the collector",
          "Read the letter",
        ],
        characters: [
          { name: "The courier", role: "missing ally", notes: "Leaves marks in chalk." },
          { name: "The collector", role: "antagonist", notes: "Always one step behind, or ahead." },
        ],
        narration:
          "You notice it the moment you stop: a scuff of chalk, half washed away, pointing somewhere close. Someone wanted this spot remembered. The trail starts here, and it starts with you.",
        observations: ["(mock mode: the scripted game master can't see photos)"],
        canonAdd: ["The courier marks hiding places with chalk."],
        bindingsAdd: [{ abstract: "the courier's first mark", concrete: "the place in your first photo" }],
        quest: questAfter(null),
      },
    };
  },

  async judge(state) {
    await pause();
    const done = state.walk.questsDone + 1;
    const chapterComplete = done >= QUESTS_PER_CHAPTER;
    const unfinished = state.skeleton.beats.filter(
      (beat) => beat.status === "pending" || beat.status === "active",
    ).length;
    const storyComplete = unfinished <= 1;
    return {
      usage,
      data: {
        verdict: "success",
        narration: storyComplete
          ? "The last piece slides into place. The letter was never a threat; it was a map home, and the courier drew it for you."
          : chapterComplete
            ? "That's the one. As you lower your phone you catch a fresh chalk mark that wasn't there a minute ago. Someone is ahead of you. That's enough for today."
            : "That's the one. Up close you find a second mark, smaller and newer than the first. The trail keeps going.",
        observations: ["(mock mode)"],
        canonAdd: [`Quest ${state.questsCompleted + 1} led to a fresh chalk mark.`],
        bindingsAdd: [],
        inventoryAdd: state.questsCompleted === 0 ? ["A torn corner of the letter"] : [],
        inventoryRemove: [],
        planChange: "none",
        planReason: "",
        revisedBeats: null,
        beatComplete: true,
        chapterComplete: chapterComplete || storyComplete,
        storyComplete,
        recap:
          chapterComplete || storyComplete
            ? "You followed the courier's chalk marks and found a torn corner of a sealed letter. Someone else is following the same trail."
            : null,
        quest: chapterComplete || storyComplete ? null : questAfter({ ...state, questsCompleted: state.questsCompleted + 1 }),
      },
    };
  },

  async resume(state) {
    await pause();
    return {
      usage,
      data: {
        narration:
          "New streets, same trail. Before you've taken ten steps you spot it: a chalk mark, fresher than the last. Whoever is collecting the pieces passed this way too.",
        observations: ["(mock mode)"],
        canonAdd: ["The trail continues beyond the first neighborhood."],
        bindingsAdd: [],
        planChange: "none",
        planReason: "",
        revisedBeats: null,
        quest: questAfter(state),
      },
    };
  },

  async react() {
    await pause();
    return {
      usage,
      data: {
        reaction: "You file it away. It doesn't look like the courier's work, but you're starting to see marks everywhere.",
        relevance: "color",
        canonAdd: null,
      },
    };
  },

  async epilogue() {
    await pause();
    return {
      usage,
      data: {
        narration:
          "You pocket your phone. Somewhere behind you, chalk scrapes on stone. The trail will still be here tomorrow, but will the next piece?",
        recap: "You followed the courier's chalk marks through your neighborhood. Someone else is following the same trail.",
      },
    };
  },
};
