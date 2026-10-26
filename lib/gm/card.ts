import "server-only";
import type { QuestState } from "./state";

const GENRE_STYLE: Record<string, string> = {
  mystery:
    "a noir case file: inky shadows, warm streetlamp glow, typewriter-style labels, a few red-string accents",
  fantasy:
    "an illuminated storybook: fine gilded ink linework, a soft magical glow, a ribbon banner",
  scifi:
    "a holographic heads-up display: thin cyan wireframe brackets, faint scan lines, small data callouts",
  everyday:
    "a cozy sketchbook: loose ink lines, light watercolor washes, small friendly doodles",
};

/** The instruction Muse Image gets for painting a quest card onto the player's photo. */
export function questCardPrompt(genre: string, quest: QuestState): string {
  const style = GENRE_STYLE[genre] ?? GENRE_STYLE.everyday;
  const marker =
    quest.targetMode === "in_view"
      ? `Mark the ${quest.targetPhrase} where it actually appears in the photo with a glowing outline and a small pointer, so it is easy to spot.`
      : "The target is not in this photo, so add a small compass rose in one corner instead of marking anything.";

  return [
    "Turn this real street photo into a quest card for a walking adventure game.",
    "Keep the real scene recognizable: same layout, same objects, same lighting and perspective. Do not move, add or remove buildings or objects.",
    `Overlay style: ${style}.`,
    `Across the top, a banner with the title lettered clearly: "${quest.title}".`,
    marker,
    `Along the bottom, in small clean lettering: "${quest.cardCaption}".`,
    quest.cardFlourish ? `One extra detail: ${quest.cardFlourish}.` : "",
    "Do not add people. Keep the graphics to the edges so most of the photo stays visible. Spell all text exactly as given.",
  ]
    .filter(Boolean)
    .join("\n");
}
