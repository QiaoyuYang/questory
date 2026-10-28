/**
 * Types shared by the API routes and the browser. Nothing here may reveal the
 * game master's hidden plan: the story skeleton stays on the server.
 */

/** What players call the game master. */
export const GAME_MASTER = "Wren";

/** The picker shows each name; the blurb tells the game master what the genre is about. */
export const GENRES = [
  {
    id: "mystery",
    name: "Mystery",
    blurb: "Clues, suspects, and a secret someone wants kept.",
  },
  {
    id: "fantasy",
    name: "Fantasy",
    blurb: "Old magic hiding in plain sight.",
  },
  {
    id: "scifi",
    name: "Sci-fi",
    blurb: "Signals, glitches, and something that doesn't belong here.",
  },
  {
    id: "everyday",
    name: "Cozy",
    blurb: "Small wonders and kind strangers. Low stakes, warm heart.",
  },
  {
    id: "comedy",
    name: "Comedy",
    blurb:
      "A silly case treated like the crime of the century: a kidnapped garden gnome, a pigeon on the suspect list, a prize pumpkin gone missing. Everyone takes it far too seriously. Give every reply one funny line, from a character or a deadpan aside. Warm, never mean.",
  },
] as const;

export type GenreId = (typeof GENRES)[number]["id"];

export function isGenre(value: unknown): value is GenreId {
  return GENRES.some((genre) => genre.id === value);
}

export type TargetOverlay = {
  /** The noun phrase SAM searched for. */
  phrase: string;
  /** Pixel size of the photo the outline is drawn on. */
  width: number;
  height: number;
  box: { left: number; top: number; right: number; bottom: number };
  confidence: number | null;
  /** SVG path of the object's outline, plus the transform that places it on the photo. */
  outline: { path: string; transform: string } | null;
};

/** in_view: look closer at something in the photo. seek: find or do something nearby. */
export type TargetMode = "in_view" | "seek";

/** The game master's suggestion for the next photo. Always optional. */
export type QuestView = {
  id: string;
  title: string;
  objective: string;
  hint: string;
  targetMode: TargetMode;
};

export type TurnKind = "genesis" | "photo" | "resume" | "end";

/**
 * What a photo did for the story:
 * - follows_quest: it did what the quest asked
 * - moves_story: it didn't, but the game master moved the story forward with it anyway
 * - side_note: a clue or some atmosphere; the story waits for more
 */
export type Outcome = "follows_quest" | "moves_story" | "side_note";
export type CardStatus = "none" | "pending" | "ready" | "failed";

export type TurnView = {
  id: string;
  number: number;
  kind: TurnKind;
  createdAt: string;
  photoUrl: string | null;
  photoSize: { width: number; height: number } | null;
  /** Set when the photo moved the story: the evidence it turned up, painted as a card. */
  card: { title: string; caption: string } | null;
  cardUrl: string | null;
  cardStatus: CardStatus;
  /** Set on photo turns. */
  outcome: Outcome | null;
  narration: string;
  /** The quest this turn issued, if any. */
  quest: QuestView | null;
  overlay: TargetOverlay | null;
  canonAdded: string[];
};

export type StoryView = {
  id: string;
  title: string;
  /** The case: the question the story answers. */
  logline: string;
  genre: GenreId;
  chapter: number;
  status: "active" | "complete";
  walkActive: boolean;
  quest: QuestView | null;
  /** Steps forward so far. Each one turned up a piece of evidence. */
  questsCompleted: number;
  /** Pieces of evidence that solve the case. */
  evidenceTotal: number;
  /** The answer to the case, once the story is over. */
  secret: string | null;
  inventory: string[];
  /** Facts established so far, in the order they happened. */
  canon: string[];
  recap: string;
  updatedAt: string;
};

export type StorySummary = Pick<
  StoryView,
  "id" | "title" | "genre" | "chapter" | "status" | "walkActive" | "questsCompleted" | "evidenceTotal" | "updatedAt"
>;

export type PhotoUpload = {
  /** A JPEG, PNG or WebP data URL. The browser downscales photos before upload. */
  photo: string;
  width: number;
  height: number;
};

export type ApiError = { error: string };
