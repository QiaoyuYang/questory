import { paintQuestCard } from "@/lib/gm/engine";
import { turnView } from "@/lib/gm/state";
import { NotFoundError, loadOwnStory, respond } from "@/lib/server";
import { getStore } from "@/lib/store";

// Muse Image reasons before it renders; give it room.
export const maxDuration = 180;

/** Paint the quest card for a turn: the player's photo with the quest drawn onto it. */
export async function POST(_request: Request, ctx: RouteContext<"/api/stories/[id]/turns/[turnId]/card">) {
  return respond(async () => {
    const { id, turnId } = await ctx.params;
    const story = await loadOwnStory(id);
    const turn = await getStore().getTurn(story.id, turnId);
    if (!turn) throw new NotFoundError("That turn doesn't exist.");
    return { turn: turnView(await paintQuestCard(story, turn)) };
  });
}
