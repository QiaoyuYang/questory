import type {
  GenreId,
  InviteView,
  PhotoUpload,
  StorySummary,
  StoryView,
  TurnView,
} from "@/lib/types";
import { BUILD_HEADER, requestSettled, requestStarted } from "./deploys";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  requestStarted();
  let build: string | null = null;
  try {
    let response: Response;
    try {
      response = await fetch(path, {
        ...init,
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
        cache: "no-store",
      });
    } catch {
      throw new Error("You seem to be offline. Check your connection and try again.");
    }
    build = response.headers.get(BUILD_HEADER);
    const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!response.ok || !data) {
      throw new Error(data?.error ?? `The server returned ${response.status}. Try again.`);
    }
    return data;
  } finally {
    requestSettled(build);
  }
}

export type TurnResult = { story: StoryView; turn: TurnView };

export const api = {
  /** A cheap reply, for its deploy header (see lib/client/deploys.ts). */
  health: () => call<{ mode: "mock" | "live" }>("/api/health"),

  /** `shared` lists stories this browser joined as a partner. */
  listStories: (shared: string[]) =>
    call<{ stories: StorySummary[]; mode: "mock" | "live" }>(
      shared.length ? `/api/stories?shared=${shared.map(encodeURIComponent).join(",")}` : "/api/stories",
    ),

  getStory: (id: string) => call<{ story: StoryView; turns: TurnView[] }>(`/api/stories/${id}`),

  /** `theme` is the player's own idea for a custom story; mode "team" makes a two-player case. */
  startStory: (story: { genre: GenreId; theme: string; mode: "solo" | "team" }, photo: PhotoUpload) =>
    call<TurnResult>("/api/stories", { method: "POST", body: JSON.stringify({ ...story, ...photo }) }),

  takeTurn: (id: string, kind: "photo" | "resume", photo: PhotoUpload) =>
    call<TurnResult>(`/api/stories/${id}/turns`, {
      method: "POST",
      body: JSON.stringify({ kind, ...photo }),
    }),

  /** A friend joins a shared case by starting its next chapter. */
  joinStory: (id: string, code: string, photo: PhotoUpload) =>
    call<TurnResult>(`/api/stories/${id}/turns`, {
      method: "POST",
      body: JSON.stringify({ kind: "resume", code, ...photo }),
    }),

  inviteInfo: (id: string, code: string) =>
    call<{ invite: InviteView }>(`/api/stories/${id}/invite?code=${encodeURIComponent(code)}`),


  endWalk: (id: string) => call<TurnResult>(`/api/stories/${id}/end`, { method: "POST" }),

  paintCard: (id: string, turnId: string) =>
    call<{ turn: TurnView }>(`/api/stories/${id}/turns/${turnId}/card`, { method: "POST" }),

  deleteStory: (id: string) => call<{ deleted: boolean }>(`/api/stories/${id}`, { method: "DELETE" }),
};
