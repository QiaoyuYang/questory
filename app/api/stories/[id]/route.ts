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

/** Delete a story for good, with its photos and cards. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/stories/[id]">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const story = await loadOwnStory(id);
    await getStore().deleteStory(story.id);
    return { deleted: true };
  });
}
