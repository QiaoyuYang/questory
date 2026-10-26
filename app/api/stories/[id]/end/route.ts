import { endWalk } from "@/lib/gm/engine";
import { storyView, turnView } from "@/lib/gm/state";
import { loadOwnStory, respond } from "@/lib/server";

export const maxDuration = 120;

/** End the current walk. The game master closes the chapter on a hook. */
export async function POST(_request: Request, ctx: RouteContext<"/api/stories/[id]/end">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const story = await loadOwnStory(id);
    const { state, turn } = await endWalk(story);
    return { story: storyView(state), turn: turnView(turn) };
  });
}
