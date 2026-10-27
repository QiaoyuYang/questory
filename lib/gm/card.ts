import "server-only";
import type { TurnRecord } from "./state";

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

/**
 * The instruction Muse Image gets for a story card: the photo that moved the story,
 * painted as a keepsake. The player never navigates by it, so a stylized scene is fine.
 */
export function storyCardPrompt(genre: string, card: NonNullable<TurnRecord["card"]>): string {
  const style = GENRE_STYLE[genre] ?? GENRE_STYLE.everyday;
  return [
    "Turn this real street photo into a story card for a walking adventure game. The player just found something here that moved the story forward.",
    "Keep the real scene recognizable: the same place, the same main objects, the same light.",
    `Overlay style: ${style}.`,
    `Across the top, a banner with the title lettered clearly: "${card.title}".`,
    card.caption ? `Along the bottom, in small clean lettering: "${card.caption}".` : "",
    card.flourish ? `One extra detail: ${card.flourish}.` : "",
    "Do not add people. Keep the graphics to the edges so most of the photo stays visible. Spell all text exactly as given.",
  ]
    .filter(Boolean)
    .join("\n");
}
