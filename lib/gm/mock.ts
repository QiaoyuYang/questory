import "server-only";
import type { Usage } from "@/lib/meta/structured";
import { unfinishedBeats, type Lead } from "./beats";
import type { Brain } from "./brain";
import type { CardOut, QuestOut } from "./outputs";
import { CHAPTERS, STEPS_PER_CHAPTER, seatOf, singleLead, stepsLeft } from "./rules";
import type { StoryState } from "./state";

/**
 * A scripted game master for working on the app without an API key.
 * It cannot see photos; it alternates side notes and steps forward and plays one case
 * from start to finish, on one lead or two, so every screen can be exercised.
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
    targetMode: "in_view",
    targetPhrase: "door",
    targetDescription: "the nearest door in your photo",
    successCriteria: "A door, close up.",
  },
  {
    title: "Something red",
    objective: "Find something red that has been here a long time.",
    targetMode: "seek",
    targetPhrase: "red object",
    targetDescription: "anything red and old",
    successCriteria: "Something red.",
  },
  {
    title: "Where the light falls",
    objective: "Find a window that catches the light and photograph what it reflects.",
    targetMode: "seek",
    targetPhrase: "window",
    targetDescription: "a window with a reflection",
    successCriteria: "A window.",
  },
  {
    title: "The green sentinel",
    objective: "Find the tallest tree or plant you can see and stand where its shadow ends.",
    targetMode: "seek",
    targetPhrase: "tree",
    targetDescription: "a tall tree or plant",
    successCriteria: "A tree or plant.",
  },
];

/** One step forward of the case: the evidence it turns up and what the player learns. */
type Step = { card: CardOut; narration: string; fact: string };

const step = (title: string, proves: string, narration: string): Step => ({
  card: { title, proves },
  narration,
  fact: `${title}: ${proves.toLowerCase()}.`,
});

// The first lead follows the bell; the second, in a two-player case, follows who could have taken it.
const STEPS: Record<Lead, Step[]> = {
  a: [
    step("A chalk arrow", "The thief marked the way", "Up close it's a chalk arrow, small and fresh, pointing away from the bakery. Whoever took the bell marked the way so they could find it again."),
    step("Brass dust", "The bell was dragged here", "Gold flecks sit in the cracks here: brass dust, rubbed off as the bell was dragged along. The thief came this way with it, and not long ago."),
    step("A bent hook", "Lifted off with care", "The hook it hung from is bent upward. Someone lifted the bell off gently, like they meant to put it back one day."),
    step("A floury handprint", "The thief came from inside", "There's a floury handprint on the corner, the same white as Rosa's bread flour. The thief came out of the bakery itself."),
    step("An empty hiding spot", "Moved again this morning", "Below another chalk arrow is a bell-shaped ring in the dust, and nothing else. Someone moved the bell again this morning."),
    step("A rope burn", "Hauled up high", "A rope has rubbed this ledge raw. The bell went up from here, and whoever hauled it knew where to find a rope."),
    step("A sock with flour", "Muffled on purpose", "A flour-dusted sock lies by the drain. \"That's how you wrap a clapper,\" Rosa says. The thief wanted the bell quiet."),
    step("A ladder mark", "Climbed after dark", "Two neat dents sit in the soft ground: a ladder stood here. Rosa's ladder went missing the same night as the bell."),
    step("A chalked window", "The last arrow points up", "The last chalk arrow points straight up at a window above the bakery. The trail ends where someone sleeps."),
    step("A window box", "Something heavy inside", "The window box above the shop sags in the middle, heavier than soil. Something round and brass is tucked under the geraniums."),
    step("A note in the box", "Sorry, I needed sleep", "Folded under the pot is a note in Teo's handwriting: \"Sorry, Aunt Rosa. I just needed one morning's sleep.\""),
    step("The brass bell", "Hidden under Teo's window box", "Under the window box sits the bell, a sock round its clapper. Teo hid it because it woke him at dawn. Rosa laughs, and from now on it rings only after eight."),
  ],
  b: [
    step("A night apron", "Someone baked past midnight", "An apron hangs on the railing, still warm with flour. Someone was working in Rosa's bakery long after closing."),
    step("A spare key hook", "One key is missing", "Of the three key hooks by the back door, one is empty. Only family keeps a key, Rosa says."),
    step("A yawn on the bench", "Someone sleeps badly here", "Somebody carved \"5 a.m. again\" into the bench. Whoever sits here is tired of waking early."),
    step("A shift rota", "Teo starts at dawn", "The rota on the wall has Teo, Rosa's nephew, on every dawn shift. He sleeps right above the shop."),
    step("An alarm clock", "Set for after eight", "A cheap alarm clock sits in the bin, set for 8:15. Someone wanted to sleep later than the bell allowed."),
    step("Muddy boots", "Out in the night", "A pair of boots dries by the step, muddy to the ankle. Their owner was out somewhere soft and wet last night."),
    step("A borrowed ladder", "Teo asked for it", "Rosa remembers: Teo asked to borrow her ladder that same night, \"to fix a shutter\". No shutter was fixed."),
    step("Earplugs", "The bell kept him up", "A pair of foam earplugs lies on the sill above the shop. The bell rings at six, and someone up there hates it."),
    step("A crumpled list", "Hide it where?", "A shopping list has a second list on the back: \"shed? cellar? window box?\" in Teo's hand."),
    step("Teo's window", "Open all night", "Teo's window was left open all night, right above the bakery door and the empty hook."),
    step("A flour footprint", "From the bakery to the stairs", "Floury footprints run from the bakery to the stairs up to Teo's room, and not one comes back down."),
    step("Teo's confession", "He hid it to sleep", "Teo turns pink when you find him. He hid the bell to get one quiet morning. Rosa forgives him, and the bell rings only after eight now."),
  ],
};

const SIDE_NOTE = "You file it away. It isn't a chalk arrow, but now you're looking twice at every wall.";

function questAfter(found: number): QuestOut {
  return QUESTS[found % QUESTS.length];
}

/** Steps forward made so far on a lead. */
function stepsOn(state: StoryState, lead: Lead): number {
  return state.skeleton.beats.filter((beat) => beat.lead === lead && beat.status === "done").length;
}

export const mockBrain: Brain = {
  async genesis(_genre, _theme, mode) {
    await pause();
    const findsOut = ["How the bell left the door", "Who could reach it", "Where it is now and why"];
    const steps = (lead: Lead, chapter: number) =>
      Object.fromEntries(
        STEPS[lead]
          .slice(chapter * STEPS_PER_CHAPTER, (chapter + 1) * STEPS_PER_CHAPTER)
          .map((s, i) => [`step${i + 1}`, `Find ${s.card.title.toLowerCase()}`]),
      );
    const chapters = Object.fromEntries(
      Array.from({ length: CHAPTERS }, (_, i) => [
        `chapter${i + 1}`,
        { findsOut: findsOut[i] ?? "", steps: steps("a", i), ...(mode === "team" ? { partnerSteps: steps("b", i) } : {}) },
      ]),
    );
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
        ...(mode === "team" ? { focus: "how the bell left", partnerFocus: "who was up that night" } : {}),
        chapters,
        characters: [
          { name: "Rosa", role: "baker who lost her bell", notes: "Proud, loud, blames the café." },
          { name: "Teo", role: "Rosa's nephew, secretly the thief", notes: "Sleeps above the shop." },
        ],
        narration:
          mode === "team"
            ? "Rosa, the baker on the corner, is furious: someone took the brass bell from her shop door last night. You follow the chalk arrows they left. Your partner can find out who in the house was awake."
            : "Rosa, the baker on the corner, is furious: someone took the brass bell from her shop door last night. They left a trail of small chalk arrows. Find out who took the bell. The first arrow should be close.",
        observations: ["(mock mode: the scripted game master can't see photos)"],
        canonAdd: ["Someone took the brass bell from Rosa's bakery door last night."],
        bindingsAdd: [{ abstract: "the first chalk arrow", concrete: "the place in your first photo" }],
        quest: questAfter(0),
      },
    };
  },

  async photo(state, _photo, { playerId, mustProgress }) {
    await pause();
    const lead = seatOf(state, playerId)?.lead ?? "a";
    // Odd turns are side notes, even turns follow the quest; a forced turn bends the story.
    const outcome = mustProgress ? "moves_story" : state.turnCount % 2 === 0 ? "follows_quest" : "side_note";
    const moved = outcome !== "side_note";
    const done = stepsOn(state, lead);
    const { card, narration, fact } = STEPS[lead][Math.min(done, STEPS[lead].length - 1)];
    const partEnds = moved && stepsLeft(state, lead) <= 1;
    // With one lead, the step that ends the chapter or the story tells it; with two, closeChapter does.
    const one = singleLead(state);
    const storyEnds = one && moved && unfinishedBeats(state.skeleton.beats) <= 1;
    return {
      usage,
      data: {
        outcome,
        narration: moved ? narration : SIDE_NOTE,
        card,
        observations: ["(mock mode)"],
        canonAdd: moved ? [fact] : [],
        bindingsAdd: [],
        inventoryAdd: [],
        inventoryRemove: [],
        planChange: "none",
        planReason: "",
        revisedBeats: null,
        revisedSecret: null,
        recap: storyEnds
          ? "You followed chalk arrows, brass dust and a floury handprint to Teo, who hid Rosa's bell to sleep in. The bell is back on the door."
          : one && partEnds
            ? `You followed the bell thief's trail for another chapter. The latest find: ${card.title.toLowerCase()}.`
            : null,
        // A side note keeps the open quest; a step forward brings the next one.
        quest: partEnds || !moved ? null : questAfter(done + 1),
      },
    };
  },

  async resume(state, _photo, { playerId, newPlayer, newChapter, takeOver }) {
    await pause();
    const lead = seatOf(state, playerId)?.lead ?? "a";
    return {
      usage,
      data: {
        narration: takeOver
          ? "Your partner hasn't turned up, so the other side of the case is yours too: who in the house was up in the night? Start close by."
          : newPlayer
            ? "Someone took Rosa's brass bell from her bakery door, and your partner is following the thief's chalk arrows. Your side is the people: who in the house was up in the night? Start close by."
            : newChapter
              ? `Chapter ${state.chapter} of Rosa's missing bell. The thief knows the bakery from the inside, and there's more to find. The next clue should be close.`
              : "Back on the trail of Rosa's missing bell, right where you left it. The next clue should be close.",
        observations: ["(mock mode)"],
        canonAdd: [],
        bindingsAdd: [],
        planChange: "none",
        planReason: "",
        revisedBeats: null,
        revisedSecret: null,
        quest: questAfter(stepsOn(state, lead)),
      },
    };
  },

  async close(state) {
    await pause();
    const solved = unfinishedBeats(state.skeleton.beats) === 0;
    return {
      usage,
      data: {
        narration: solved
          ? "Between you, it's plain: the chalk arrows lead to Teo's window box, and his rota says he hates the six o'clock bell. Teo hid it to sleep in. Rosa laughs, and the bell rings only after eight now."
          : `Put together, your finds point the same way: the bell left by the back, and someone in the house was up all night. Chapter ${state.chapter + 1} starts where the trail goes up.`,
        recap: solved
          ? "You two tracked Rosa's bell to Teo's window box. He hid it to sleep past dawn."
          : `You two found how Rosa's bell left the door and who was awake that night. The trail now leads upward.`,
        revisedSecret: null,
      },
    };
  },
};
