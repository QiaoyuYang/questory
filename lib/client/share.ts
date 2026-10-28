/**
 * Share a link through the phone's share sheet, or copy it where there's none (most
 * desktop browsers). Says which happened, so the page can confirm a copy.
 */
export async function shareLink(link: { title: string; text: string; url: string }): Promise<"shared" | "copied" | "cancelled"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(link);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // Some browsers refuse a share they consider unprompted: fall back to copying.
    }
  }
  await navigator.clipboard.writeText(link.url);
  return "copied";
}

const SHARED_KEY = "questory:shared";

/** Stories this browser joined as a partner. They belong to the friend, so the server can't list them by owner. */
export function sharedStories(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(SHARED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberShared(storyId: string) {
  try {
    const ids = sharedStories().filter((id) => id !== storyId);
    localStorage.setItem(SHARED_KEY, JSON.stringify([storyId, ...ids].slice(0, 20)));
  } catch {
    // Private mode or storage disabled: the invite link still opens the story.
  }
}
