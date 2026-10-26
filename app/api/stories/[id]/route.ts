import { storyView, turnView } from "@/lib/gm/state";
import { loadOwnStory, respond } from "@/lib/server";
import { getStore } from "@/lib/store";

/** A story and every turn so far. */
export async function GET(_request: Request, ctx: RouteContext<"/api/stories/[id]">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const story = await loadOwnStory(id);
    const turns = await getStore().listTurns(story.id);
    return { story: storyView(story), turns: turns.map(turnView) };
  });
}
