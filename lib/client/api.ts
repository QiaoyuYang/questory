import type {
  GenreId,
  InviteView,
  NewInvite,
  PhotoUpload,
  StorySummary,
  StoryView,
  TurnView,
} from "@/lib/types";
import { BUILD_HEADER, requestSettled, requestStarted } from "./deploys";

/** A request the server turned down, with its status. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Today's model calls are used up, so trying again won't help until tomorrow. */
export function isDailyLimit(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

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
      throw new ApiError(data?.error ?? `The server returned ${response.status}. Try again.`, response.status);
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
  /** A two-player case brings the `invite` its link was made with (see lib/client/share.ts). */
  startStory: (
    story: { genre: GenreId; theme: string; mode: "solo" | "team"; invite: NewInvite | null },
    photo: PhotoUpload,
  ) =>
    call<TurnResult>("/api/stories", { method: "POST", body: JSON.stringify({ ...story, ...photo }) }),

  /** `takeOver` walks the other lead too, while no friend has taken it. */
  takeTurn: (id: string, kind: "photo" | "resume", photo: PhotoUpload, options: { takeOver?: boolean } = {}) =>
    call<TurnResult>(`/api/stories/${id}/turns`, {
      method: "POST",
      body: JSON.stringify({ kind, ...photo, takeOver: options.takeOver === true }),
    }),

  /** A two-player chapter's ending, once both leads are done. Safe to ask more than once. */
  closeChapter: (id: string) => call<TurnResult>(`/api/stories/${id}/close`, { method: "POST" }),

  /** A friend joins a shared case from its link, and takes the other lead. */
  joinStory: (id: string, code: string) =>
    call<{ story: StoryView }>(`/api/stories/${id}/join`, { method: "POST", body: JSON.stringify({ code }) }),

  inviteInfo: (id: string, code: string) =>
    call<{ invite: InviteView | null }>(`/api/stories/${id}/invite?code=${encodeURIComponent(code)}`),

  /** The chapter waits for the player's next walk. */
  endWalk: (id: string) => call<{ story: StoryView }>(`/api/stories/${id}/end`, { method: "POST" }),

  paintCard: (id: string, turnId: string) =>
    call<{ turn: TurnView }>(`/api/stories/${id}/turns/${turnId}/card`, { method: "POST" }),

  deleteStory: (id: string) => call<{ deleted: boolean }>(`/api/stories/${id}`, { method: "DELETE" }),
};
