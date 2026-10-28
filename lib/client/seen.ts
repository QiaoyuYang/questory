/**
 * What this browser has already seen of each story, so the story list can flag what a
 * partner did since: new evidence, or the case solved.
 */
const SEEN_KEY = "questory:seen";

function read(): Record<string, string> {
  try {
    const value = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function markSeen(storyId: string, updatedAt: string) {
  try {
    const seen = read();
    if (seen[storyId] === updatedAt) return;
    seen[storyId] = updatedAt;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Private mode or storage disabled: stories just won't be flagged.
  }
}

/** True when the story changed after this browser last showed it. Never true for a story it hasn't shown. */
export function changedSinceSeen(storyId: string, updatedAt: string): boolean {
  const seen = read()[storyId];
  return seen !== undefined && seen < updatedAt;
}
