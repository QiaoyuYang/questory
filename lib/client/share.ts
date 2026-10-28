import { readNewInvite, type NewInvite } from "@/lib/types";

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

export function forgetShared(storyId: string) {
  try {
    localStorage.setItem(SHARED_KEY, JSON.stringify(sharedStories().filter((id) => id !== storyId)));
  } catch {
    // Nothing to forget without storage.
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

/** Where an invite link lands: the app, told which story and code. */
export function inviteLink(storyId: string, code: string): string {
  const link = new URL("/", window.location.origin);
  link.searchParams.set("join", `${storyId}.${code}`);
  return link.toString();
}

const NEXT_INVITE_KEY = "questory:next-invite";

type NextInvite = NewInvite & { sent: boolean };

/** The link waiting for the next two-player case, if there is one. */
export function peekNextInvite(): NextInvite | null {
  try {
    const value = JSON.parse(localStorage.getItem(NEXT_INVITE_KEY) ?? "null");
    const invite = readNewInvite(value);
    return invite ? { ...invite, sent: value.sent === true } : null;
  } catch {
    return null;
  }
}

function saveNextInvite(invite: NextInvite) {
  try {
    localStorage.setItem(NEXT_INVITE_KEY, JSON.stringify(invite));
  } catch {
    // Without storage, a link sent now still works if the case starts from this page.
  }
}

/**
 * The link for the next two-player case, which can go out before the case begins. The
 * phone makes its story id and code, because the share sheet only opens straight from a
 * tap, and the server takes them when the first photo starts the case. It's kept until
 * then, so sending it twice sends the same link.
 */
export function nextInvite(): NextInvite {
  const saved = peekNextInvite();
  if (saved) return saved;
  const invite = { storyId: crypto.randomUUID(), code: crypto.randomUUID(), sent: false };
  saveNextInvite(invite);
  return invite;
}

export function markNextInviteSent() {
  saveNextInvite({ ...nextInvite(), sent: true });
}

/** Its case began, so the next case gets a new link. */
export function forgetNextInvite() {
  try {
    localStorage.removeItem(NEXT_INVITE_KEY);
  } catch {
    // Nothing to forget without storage.
  }
}
