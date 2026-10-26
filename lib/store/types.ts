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
}
