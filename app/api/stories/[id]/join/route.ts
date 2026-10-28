import { joinStory } from "@/lib/gm/engine";
import { storyView } from "@/lib/gm/state";
import { loadInvitedStory, readJsonBody, respond } from "@/lib/server";

/** A friend joins a shared case from its link and takes its other lead, which their first photo starts. */
export async function POST(request: Request, ctx: RouteContext<"/api/stories/[id]/join">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = await readJsonBody<{ code: string }>(request);
    const { story, playerId } = await loadInvitedStory(id, typeof body.code === "string" ? body.code : "");
    return { story: storyView(await joinStory(story, playerId), playerId) };
  });
}
