import { joinStory } from "@/lib/gm/engine";
import { storyView } from "@/lib/gm/state";
import { loadInvitedStory, readJsonBody, respond } from "@/lib/server";
import { isScenery } from "@/lib/walk";

/**
 * A friend joins a shared case from its link and takes its other lead, which their first photo
 * starts. `scenery` is where they'll walk.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/stories/[id]/join">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = await readJsonBody<{ code: string; scenery: unknown }>(request);
    const { story, playerId } = await loadInvitedStory(id, typeof body.code === "string" ? body.code : "");
    const scenery = isScenery(body.scenery) ? body.scenery : null;
    return { story: storyView(await joinStory(story, playerId, scenery), playerId) };
  });
}
