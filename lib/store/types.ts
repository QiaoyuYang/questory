import "server-only";
import type { StoryState, TurnRecord } from "@/lib/gm/state";

export type StoredImage = { bytes: Uint8Array; mime: string };

export interface Store {
  getStory(id: string): Promise<StoryState | null>;
  /** Insert or replace. */
  saveStory(state: StoryState): Promise<void>;
  listStories(playerId: string): Promise<StoryState[]>;
  getTurn(storyId: string, turnId: string): Promise<TurnRecord | null>;
  /** Insert or replace. */
  saveTurn(turn: TurnRecord): Promise<void>;
  listTurns(storyId: string): Promise<TurnRecord[]>;
  putImage(image: StoredImage): Promise<string>;
  getImage(id: string): Promise<StoredImage | null>;
  /** Delete a story with its turns, photos and cards. The story goes last, so a failed delete can be retried. */
  deleteStory(id: string): Promise<void>;
  /**
   * Count one call against a usage key: a UTC day, or a day and a player. Returns false,
   * counting nothing, once it has reached `limit`.
   */
  countCall(key: string, limit: number): Promise<boolean>;
}

/** Every photo and card a story's turns point to. A card drawn without Muse Image is the photo itself. */
export function imagesOf(turns: TurnRecord[]): string[] {
  return [...new Set(turns.flatMap((turn) => [turn.photoId, turn.cardId]).filter((id): id is string => id !== null))];
}
