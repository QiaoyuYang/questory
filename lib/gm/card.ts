import "server-only";
import type { TurnRecord } from "./state";

const CAPTION_WORDS = 8;

const GENRE_STYLE: Record<string, string> = {
  mystery:
    "a noir case file: inky shadows, warm streetlamp glow, a few red-string accents",
  fantasy:
    "an illuminated storybook: fine gilded ink linework, a soft magical glow, a ribbon banner",
  scifi:
    "a holographic heads-up display: thin cyan wireframe brackets, faint scan lines",
  everyday:
    "a cozy sketchbook: loose ink lines, light watercolor washes, small friendly doodles",
};

/**
 * The instruction Muse Image gets for a story card: the photo that moved the story,
 * painted as a keepsake. The player never navigates by it, so a stylized scene is fine.
 */
export function storyCardPrompt(genre: string, card: NonNullable<TurnRecord["card"]>): string {
  const style = GENRE_STYLE[genre] ?? GENRE_STYLE.everyday;
  // A long caption can only be lettered small. The card reads better without it.
  const caption = card.caption.split(/\s+/).length <= CAPTION_WORDS ? card.caption : "";
  return [
    "Turn this real street photo into a story card for a walking adventure game. The player just found something here that moved the story forward.",
    "Keep the real scene recognizable: the same place, the same main objects, the same light.",
    `Overlay style: ${style}.`,
    // People read the card on a phone, so the words are few and big.
    `Across the top, a banner with the title in large, bold, high-contrast letters, about a sixth of the card's height: "${card.title}".`,
    caption ? `Along the bottom, the caption in clear letters at least half the title's size: "${caption}".` : "",
    card.flourish ? `One extra detail: ${card.flourish}.` : "",
    `${caption ? "The title and caption are" : "The title is"} the only words on the card. No other text anywhere: no labels, notes, tags, stamps, numbers or dates.`,
    `Do not add people. Keep the graphics to the edges so most of the photo stays visible. Spell ${caption ? "the title and caption" : "the title"} exactly as given.`,
  ]
    .filter(Boolean)
    .join("\n");
}
