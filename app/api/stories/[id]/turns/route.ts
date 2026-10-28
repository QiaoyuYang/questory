import { resumeStory, takePhoto } from "@/lib/gm/engine";
import { storyView, turnView } from "@/lib/gm/state";
import { BadRequestError, readPhoto } from "@/lib/photo";
import { loadInvitedStory, loadStory, readJsonBody, respond } from "@/lib/server";
import type { PhotoUpload } from "@/lib/types";

export const maxDuration = 120;

const ACTIONS = {
  photo: takePhoto,
  resume: resumeStory,
} as const;

/**
 * Play a turn with a photo:
 * - photo: any photo during a walk; the game master decides what it means for the story
 * - resume: the first photo of a new walk. With the invite `code`, a friend joins the
 *   case by starting its next chapter.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/stories/[id]/turns">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = await readJsonBody<PhotoUpload & { kind: string; code: string }>(request);
    const action = ACTIONS[body.kind as keyof typeof ACTIONS];
    if (!action) throw new BadRequestError('kind must be "photo" or "resume".');
    const photo = readPhoto(body);
    const joining = body.kind === "resume" && typeof body.code === "string";
    const { story, playerId } = joining ? await loadInvitedStory(id, body.code!) : await loadStory(id);
    const { state, turn } = await action(story, photo, playerId);
    return { story: storyView(state, playerId), turn: turnView(turn, playerId, state.playerId) };
  });
}
