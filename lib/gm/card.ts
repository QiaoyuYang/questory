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
  comedy:
    "a Sunday comic strip: bold ink outlines, flat bright colors, a starburst title banner, a few playful motion lines",
};

/**
 * The instruction Muse Image gets for an evidence card: the photo that moved the story,
 * painted as a keepsake. The player never navigates by it, so a stylized scene is fine.
 */
export function storyCardPrompt(genre: string, card: NonNullable<TurnRecord["card"]>, theme: string | null): string {
  // A custom story's theme is the player's words, cleaned and quoted (see cleanTheme).
  const style =
    genre === "custom"
      ? `an illustrated storybook look${theme ? ` that suits "${theme}"` : ""}`
      : (GENRE_STYLE[genre] ?? GENRE_STYLE.everyday);
  // A long caption can only be lettered small. The card reads better without it.
  const caption = card.caption.split(/\s+/).length <= CAPTION_WORDS ? card.caption : "";
  return [
    "Turn this real photo into a card for a walking story game. The player just found a piece of evidence here that moves the story forward.",
    "Keep the real scene recognizable: the same place, the same main objects, the same light.",
    `Overlay style: ${style}.`,
    // People read the card on a phone, so the words are few and big.
    `Across the top, a banner with the title in large, bold, high-contrast letters, about a sixth of the card's height: "${card.title}".`,
    caption ? `Along the bottom, the caption in clear letters at least half the title's size: "${caption}".` : "",
    card.flourish ? `One extra detail: ${card.flourish.replace(/[\s.!?]+$/, "")}.` : "",
    // "No other text" alone made Muse Image blank out real signs, which can be the evidence.
    `Add no words of your own besides ${caption ? "the title and caption" : "the title"}: no labels, notes, tags, stamps, numbers or dates. Leave any writing that is really in the photo, like the words on a sign, where it is and readable.`,
    `Do not add people. Keep the graphics to the edges so most of the photo stays visible. Spell ${caption ? "the title and caption" : "the title"} exactly as given.`,
  ]
    .filter(Boolean)
    .join("\n");
}
