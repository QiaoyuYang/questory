import { closeChapter } from "@/lib/gm/engine";
import { storyView, turnView } from "@/lib/gm/state";
import { loadStory, respond } from "@/lib/server";

export const maxDuration = 120;

/** Tell a two-player chapter's ending once both leads are done. Safe to ask more than once. */
export async function POST(_request: Request, ctx: RouteContext<"/api/stories/[id]/close">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const { story, playerId } = await loadStory(id);
    const { state, turn } = await closeChapter(story, playerId);
    return { story: storyView(state, playerId), turn: turnView(turn, playerId, state.playerId) };
  });
}
