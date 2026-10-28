import { resumeStory, takePhoto } from "@/lib/gm/engine";
import { storyView, turnView } from "@/lib/gm/state";
import { BadRequestError, readPhoto } from "@/lib/photo";
import { loadInvitedStory, loadStory, readJsonBody, respond } from "@/lib/server";
import type { PhotoUpload } from "@/lib/types";

export const maxDuration = 120;

/**
 * Play a turn with a photo:
 * - photo: any photo during a walk; the game master decides what it means for the story
 * - resume: the first photo of a walk, which starts the next chapter or picks the current
 *   one back up. With the invite `code`, a friend joins the case this way. `takeOver`
 *   walks the other lead too, while no friend has taken it.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/stories/[id]/turns">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = await readJsonBody<PhotoUpload & { kind: string; code: string; takeOver: boolean }>(request);
    if (body.kind !== "photo" && body.kind !== "resume") throw new BadRequestError('kind must be "photo" or "resume".');
    const photo = readPhoto(body);
    const joining = body.kind === "resume" && typeof body.code === "string";
    const { story, playerId } = joining ? await loadInvitedStory(id, body.code!) : await loadStory(id);
    const { state, turn } =
      body.kind === "photo"
        ? await takePhoto(story, photo, playerId)
        : await resumeStory(story, photo, playerId, { takeOver: body.takeOver === true });
    return { story: storyView(state, playerId), turn: turnView(turn, playerId, state.playerId) };
  });
}
