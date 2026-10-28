import { TEAM_SIZE } from "@/lib/gm/rules";
import { storyView } from "@/lib/gm/state";
import { findInvitedStory, respond } from "@/lib/server";
import type { InviteView } from "@/lib/types";

/**
 * What the invite link shows before a friend joins: the case and where it stands, no
 * photos. Null until the owner's first photo starts the case.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/stories/[id]/invite">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const code = new URL(request.url).searchParams.get("code") ?? "";
    const found = await findInvitedStory(id, code);
    if (!found) return { invite: null };
    const { story, playerId } = found;
    const role = story.playerId === playerId ? "owner" : story.partners.includes(playerId) ? "partner" : "guest";
    const invite: InviteView = {
      title: story.title,
      logline: story.logline,
      genre: story.genre as InviteView["genre"],
      chapter: story.chapter,
      status: story.status,
      walkActive: story.seats.some((seat) => seat.walking),
      questsCompleted: story.questsCompleted,
      evidenceTotal: storyView(story, playerId).evidenceTotal,
      role,
      full: role === "guest" && story.partners.length >= (story.invite?.size ?? TEAM_SIZE) - 1,
    };
    return { invite };
  });
}

