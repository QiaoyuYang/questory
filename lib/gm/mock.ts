import "server-only";
import type { Usage } from "@/lib/meta/structured";
import { unfinishedBeats } from "./beats";
import type { Brain } from "./brain";
import type { CardOut, QuestOut } from "./outputs";
import { QUESTS_PER_CHAPTER } from "./rules";
import type { StoryState } from "./state";

/**
 * A scripted game master for working on the app without an API key.
 * It cannot see photos; it alternates side notes and steps forward and plays one short
 * case from start to finish, so every screen can be exercised.
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
    objective: "Walk up to the nearest door in your photo. Is anything chalked, painted or numbered on it?",
    hint: "Doors keep secrets in their numbers.",
    targetMode: "in_view",
    targetPhrase: "door",
    targetDescription: "the nearest door in your photo",
    successCriteria: "A door, close up.",
  },
  {
    title: "Something red",
    objective: "Find something red that has been here a long time.",
    hint: "Paint fades, but brick and rust remember.",
    targetMode: "seek",
    targetPhrase: "red object",
    targetDescription: "anything red and old",
    successCriteria: "Something red.",
  },
  {
    title: "Where the light falls",
    objective: "Find a window that catches the light and photograph what it reflects.",
    hint: "Look for glass facing the brightest part of the sky.",
    targetMode: "seek",
    targetPhrase: "window",
    targetDescription: "a window with a reflection",
    successCriteria: "A window.",
  },
  {
    title: "The green sentinel",
    objective: "Find the tallest tree or plant you can see and stand where its shadow ends.",
    hint: "Shadows point away from the sun.",
    targetMode: "seek",
    targetPhrase: "tree",
    targetDescription: "a tall tree or plant",
    successCriteria: "A tree or plant.",
  },
];

/** One step forward of the case: the evidence it turns up and what the player learns. */
type Step = { card: CardOut; narration: string; fact: string };

const STEPS: Step[] = [
  {
    card: { title: "A chalk arrow", proves: "The thief marked the way", flourish: "a smear of chalk dust" },
    narration:
      "Up close it's a chalk arrow, small and fresh, pointing away from the bakery. Whoever took the bell marked the way so they could find it again. Follow where it points.",
    fact: "The thief marks the way with small chalk arrows.",
  },
  {
    card: { title: "Brass dust", proves: "The bell was dragged here", flourish: "a few gold flecks" },
    narration:
      "Gold flecks sit in the cracks here: brass dust, rubbed off as the bell was dragged along. The thief came this way with it, and not long ago.",
    fact: "Brass dust shows the bell was dragged this way.",
  },
  {
    card: { title: "A floury handprint", proves: "The thief came from inside", flourish: "a puff of flour" },
    narration:
      "There's a floury handprint on the corner, the same white as Rosa's bread flour. The thief came out of the bakery itself. When you tell Rosa, she goes quiet. \"Only family has a key,\" she says.",
    fact: "A floury handprint shows the thief came from inside the bakery.",
  },
  {
    card: { title: "An empty hiding spot", proves: "Moved again this morning", flourish: "a bell-shaped ring in the dust" },
    narration:
      "Below another chalk arrow is a bell-shaped ring in the dust, and nothing else. The bell was hidden here, and someone moved it again this morning. They know you're looking.",
    fact: "The bell was hidden here and moved again this morning.",
  },
  {
    card: { title: "A borrowed ladder", proves: "The thief hides things up high", flourish: "a small wooden ladder" },
    narration:
      "Every hiding spot so far has been up high. Rosa's ladder went missing the same night, and only her nephew Teo, who sleeps above the shop, asked to borrow it.",
    fact: "Rosa's nephew Teo borrowed her ladder the night the bell vanished.",
  },
  {
    card: { title: "The brass bell", proves: "Hidden under Teo's window box", flourish: "a sock wrapped round the clapper" },
    narration:
      "Under the window box above the bakery sits the bell, a sock wrapped round its clapper. Teo hid it because it woke him at dawn. Rosa laughs, and from now on it rings only after eight.",
    fact: "Teo hid the bell because it woke him at dawn.",
  },
];

function questAfter(state: StoryState | null): QuestOut {
  const index = state ? state.questsCompleted % QUESTS.length : 0;
  return QUESTS[index];
}

export const mockBrain: Brain = {
  async genesis() {
    await pause();
    return {
      usage,
      data: {
        title: "The missing bell",
        question: "Who took the brass bell from Rosa's bakery door?",
        secret: "Teo, Rosa's nephew, hid the bell because it woke him at dawn.",
        premise: "Rosa's shop bell vanished overnight. Her nephew Teo, who sleeps above the shop, hid it to get some sleep and chalked arrows so he could find his hiding spots again.",
        antagonist: "Teo, sleepy and embarrassed, who moves the bell whenever someone gets close.",
        stakes: "Without the bell Rosa misses customers, and she is starting to blame the new café.",
        ending: "You find the bell under Teo's window box, and Rosa agrees it rings only after eight.",
        beats: [
          "Find the first chalk mark the thief left",
          "Find signs of where the bell was carried",
          "Learn the thief knows the bakery from inside",
          "Find a hiding spot the thief has already emptied",
          "Learn who could reach the high hiding spots",
          "Find the bell and the person who hid it",
        ],
        characters: [
          { name: "Rosa", role: "baker who lost her bell", notes: "Proud, loud, blames the café." },
          { name: "Teo", role: "Rosa's nephew, secretly the thief", notes: "Sleeps above the shop." },
        ],
        narration:
          "Rosa, the baker on the corner, is furious: someone took the brass bell from her shop door last night. They left a trail of small chalk arrows. Find out who took the bell. The first arrow should be close.",
        observations: ["(mock mode: the scripted game master can't see photos)"],
        canonAdd: ["Someone took the brass bell from Rosa's bakery door last night."],
        bindingsAdd: [{ abstract: "the first chalk arrow", concrete: "the place in your first photo" }],
        quest: questAfter(null),
      },
    };
  },

  async photo(state, _photo, { mustProgress }) {
    await pause();
    // Odd turns are side notes, even turns follow the quest; a forced turn bends the story.
    const outcome = mustProgress ? "moves_story" : state.turnCount % 2 === 0 ? "follows_quest" : "side_note";
    const moved = outcome !== "side_note";
    const step = STEPS[Math.min(state.questsCompleted, STEPS.length - 1)];
    const storyEnds = moved && unfinishedBeats(state.skeleton.beats) <= 1;
    const chapterEnds = moved && (storyEnds || state.walk.questsDone + 1 >= QUESTS_PER_CHAPTER);
    return {
      usage,
      data: {
        outcome,
        narration: moved
          ? step.narration
          : "You file it away. It isn't a chalk arrow, but now you're looking twice at every wall.",
        card: step.card,
        observations: ["(mock mode)"],
        canonAdd: moved ? [step.fact] : [],
        bindingsAdd: [],
        inventoryAdd: [],
        inventoryRemove: [],
        planChange: "none",
        planReason: "",
        revisedBeats: null,
        recap: storyEnds
          ? "You followed chalk arrows, brass dust and a floury handprint to Teo, who hid Rosa's bell to sleep in. The bell is back on the door."
          : chapterEnds
            ? "You followed the bell thief's chalk arrows away from Rosa's bakery. A floury handprint showed the thief came from inside it."
            : null,
        // A side note keeps the open quest; a step forward brings the next one.
        quest: chapterEnds || !moved ? null : questAfter({ ...state, questsCompleted: state.questsCompleted + 1 }),
      },
    };
  },

  async resume(state, _photo, { newPlayer }) {
    await pause();
    return {
      usage,
      data: {
        narration: newPlayer
          ? "Your partner has been chasing Rosa's missing bell across town. They found chalk arrows, brass dust and a floury handprint: the thief came from inside the bakery. The next arrow is somewhere near you."
          : "Back to the case of Rosa's missing bell. The thief knows the bakery from the inside, and they left more chalk arrows than you have found. The next one should be close.",
        observations: ["(mock mode)"],
        canonAdd: [],
        bindingsAdd: [],
        planChange: "none",
        planReason: "",
        revisedBeats: null,
        quest: questAfter(state),
      },
    };
  },

  async epilogue() {
    await pause();
    return {
      usage,
      data: {
        narration:
          "You pocket your phone for now. Rosa's door is still silent, and somewhere a chalk arrow you haven't found points at the answer.",
        recap: "You started tracking whoever took Rosa's bakery bell by following their chalk arrows.",
      },
    };
  },
};
