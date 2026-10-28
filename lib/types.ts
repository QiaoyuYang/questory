/**
 * Types shared by the API routes and the browser. Nothing here may reveal the
 * game master's hidden plan: the story skeleton stays on the server.
 */

/** What players call the game master. */
export const GAME_MASTER = "Wren";

/**
 * The picker shows each name; the blurb tells the game master what the genre is about.
 * "custom" is the player's own idea, in their words. A retired genre still plays for
 * stories started in it, but isn't offered for new ones.
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
    id: "comedy",
    name: "Comedy",
    blurb:
      "A silly case treated like the crime of the century: a kidnapped garden gnome, a pigeon on the suspect list, a prize pumpkin gone missing. Everyone takes it far too seriously. Give every reply one funny line, from a character or a deadpan aside. Warm, never mean.",
  },
  {
    id: "custom",
    name: "Your own",
    blurb: "",
  },
  {
    id: "everyday",
    name: "Cozy",
    blurb: "Small wonders and kind strangers. Low stakes, warm heart.",
    retired: true,
  },
] as const;

export type GenreId = (typeof GENRES)[number]["id"];

/** The genres a new story can start in. */
export const NEW_GENRES = GENRES.filter((genre) => !("retired" in genre));

export function isGenre(value: unknown): value is GenreId {
  return NEW_GENRES.some((genre) => genre.id === value);
}

/** The longest custom theme, in characters. */
export const THEME_LENGTH = 60;

/** A custom theme as the game master gets it: one short line with no quotes or breaks to escape from. */
export function cleanTheme(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/["“”`\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, THEME_LENGTH)
    .trim();
}

/** How a story's kind reads in a list: the genre's name, or the player's own theme. */
export function genreLabel(genre: string, theme: string | null): string {
  if (genre === "custom" && theme) return theme.charAt(0).toUpperCase() + theme.slice(1);
  return GENRES.find((g) => g.id === genre)?.name ?? genre;
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
  targetMode: TargetMode;
};

/** "end" is from when ending a walk closed its chapter; "close" tells a two-player chapter's ending. */
export type TurnKind = "genesis" | "photo" | "resume" | "end" | "close";

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
  /** In a shared story, whether the viewer or their partner played this turn. A chapter's ending counts as the viewer's. */
  playedBy: "you" | "partner";
  kind: TurnKind;
  createdAt: string;
  /** Null on turns from before chapters were kept on them. */
  chapter: number | null;
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
  /** The player's own idea, for a custom story. */
  theme: string | null;
  /** Chosen when the story starts: one player, or two following a lead each. */
  mode: "solo" | "team";
  chapter: number;
  status: "active" | "complete";
  /** Someone is out on a walk on this case. */
  walkActive: boolean;
  /**
   * Where the viewer stands:
   * - walking: out on a walk, with a next step
   * - ready: their part of the chapter is waiting for them, from a break or not yet begun
   * - waiting: their part is done, and the chapter waits for their partner's
   * - closing: both parts are done, and the chapter's ending is being told
   * - between: the chapter is over, and the next one starts with a photo
   * - watching: a case from before leads, which the partner is walking
   * - solved: the case is over
   */
  stage: "walking" | "ready" | "waiting" | "closing" | "between" | "watching" | "solved";
  /** The owner started the story; a partner joined it through the invite link. */
  role: "owner" | "partner";
  /** True once a partner has joined. */
  shared: boolean;
  /** In a two-player case: whether the friend has joined, is walking, and how many steps their lead has left this chapter. */
  partner: { joined: boolean; walking: boolean; left: number } | null;
  /** The viewer's part is done and no friend has taken the other lead, so they can walk it too. */
  canTakeOver: boolean;
  /** A two-player case whose friend hasn't joined yet, seen by its owner. */
  invitable: boolean;
  /** The invite link's code, for the owner of a two-player case only. */
  inviteCode: string | null;
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
  | "id"
  | "title"
  | "genre"
  | "theme"
  | "mode"
  | "chapter"
  | "status"
  | "walkActive"
  | "role"
  | "questsCompleted"
  | "evidenceTotal"
  | "updatedAt"
>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * A two-player case's story id and invite code, made on the phone so its link can go out
 * before the first photo starts the case (see lib/client/share.ts).
 */
export type NewInvite = { storyId: string; code: string };

/** The id and code a phone sent with a new case, if they're well formed. */
export function readNewInvite(value: unknown): NewInvite | null {
  if (!value || typeof value !== "object") return null;
  const { storyId, code } = value as Partial<Record<keyof NewInvite, unknown>>;
  return isUuid(storyId) && isUuid(code) ? { storyId, code } : null;
}

/** What an invite link shows before the friend joins: enough to decide, no photos. */
export type InviteView = {
  title: string;
  /** The case: the question the story answers. */
  logline: string;
  genre: GenreId;
  chapter: number;
  status: "active" | "complete";
  walkActive: boolean;
  questsCompleted: number;
  evidenceTotal: number;
  /** Who is opening the link: its owner, a partner who already joined, or a friend who hasn't yet. */
  role: "owner" | "partner" | "guest";
  /** No seat left for a new player. */
  full: boolean;
};

export type PhotoUpload = {
  /** A JPEG, PNG or WebP data URL. The browser downscales photos before upload. */
  photo: string;
  width: number;
  height: number;
};

export type ApiError = { error: string };
