import { endWalk } from "@/lib/gm/engine";
import { storyView } from "@/lib/gm/state";
import { loadStory, respond } from "@/lib/server";

/** End the current walk. The chapter waits, and the player's next walk picks it up. */
export async function POST(_request: Request, ctx: RouteContext<"/api/stories/[id]/end">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const { story, playerId } = await loadStory(id);
    return { story: storyView(await endWalk(story, playerId), playerId) };
  });
}
