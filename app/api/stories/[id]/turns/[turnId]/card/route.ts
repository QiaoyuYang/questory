import { paintCard } from "@/lib/gm/engine";
import { turnView } from "@/lib/gm/state";
import { NotFoundError, loadStory, respond } from "@/lib/server";
import { getStore } from "@/lib/store";

// Muse Image reasons before it renders; give it room.
export const maxDuration = 180;

/** Paint the story card for a turn whose photo moved the story. */
export async function POST(_request: Request, ctx: RouteContext<"/api/stories/[id]/turns/[turnId]/card">) {
  return respond(async () => {
    const { id, turnId } = await ctx.params;
    const { story, playerId } = await loadStory(id);
    const turn = await getStore().getTurn(story.id, turnId);
    if (!turn) throw new NotFoundError("That turn doesn't exist.");
    return { turn: turnView(await paintCard(story, turn, playerId), playerId, story.playerId) };
  });
}
