/**
 * Types shared by the API routes and the browser. Nothing here may reveal the
 * game master's hidden plan: the story skeleton stays on the server.
 */

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
    name: "Everyday magic",
    blurb: "Small wonders and kind strangers. Low stakes, warm heart.",
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

export type TargetMode = "in_view" | "seek";

export type QuestView = {
  id: string;
  title: string;
  objective: string;
  hint: string;
  targetMode: TargetMode;
  targetDescription: string;
  attempts: number;
};

export type TurnKind = "genesis" | "complete" | "show" | "resume" | "end";
export type Verdict = "success" | "partial" | "fail";
export type CardStatus = "none" | "pending" | "ready" | "failed";

export type TurnView = {
  id: string;
  number: number;
  kind: TurnKind;
  createdAt: string;
  photoUrl: string | null;
  photoSize: { width: number; height: number } | null;
  cardUrl: string | null;
  cardStatus: CardStatus;
  verdict: Verdict | null;
  narration: string;
  /** The quest this turn issued or restated, if any. */
  quest: QuestView | null;
  overlay: TargetOverlay | null;
  canonAdded: string[];
};

export type StoryView = {
  id: string;
  title: string;
  logline: string;
  genre: GenreId;
  chapter: number;
  status: "active" | "complete";
  walkActive: boolean;
  quest: QuestView | null;
  questsCompleted: number;
  inventory: string[];
  /** Facts established so far, in the order they happened. */
  canon: string[];
  recap: string;
  updatedAt: string;
};

export type StorySummary = Pick<
  StoryView,
  "id" | "title" | "genre" | "chapter" | "status" | "walkActive" | "questsCompleted" | "updatedAt"
>;

export type PhotoUpload = {
  /** A JPEG, PNG or WebP data URL. The browser downscales photos before upload. */
  photo: string;
  width: number;
  height: number;
};

export type ApiError = { error: string };
