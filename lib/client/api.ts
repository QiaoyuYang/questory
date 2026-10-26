import type {
  GenreId,
  PhotoUpload,
  StorySummary,
  StoryView,
  TurnView,
} from "@/lib/types";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
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
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? `The server returned ${response.status}. Try again.`);
  }
  return data;
}

export type TurnResult = { story: StoryView; turn: TurnView };

export const api = {
  listStories: () => call<{ stories: StorySummary[]; mode: "mock" | "live" }>("/api/stories"),

  getStory: (id: string) => call<{ story: StoryView; turns: TurnView[] }>(`/api/stories/${id}`),

  startStory: (genre: GenreId, photo: PhotoUpload) =>
    call<TurnResult>("/api/stories", { method: "POST", body: JSON.stringify({ genre, ...photo }) }),

  takeTurn: (id: string, kind: "complete" | "show" | "resume", photo: PhotoUpload) =>
    call<TurnResult>(`/api/stories/${id}/turns`, {
      method: "POST",
      body: JSON.stringify({ kind, ...photo }),
    }),

  endWalk: (id: string) => call<TurnResult>(`/api/stories/${id}/end`, { method: "POST" }),

  paintCard: (id: string, turnId: string) =>
    call<{ turn: TurnView }>(`/api/stories/${id}/turns/${turnId}/card`, { method: "POST" }),
};
