import { completeQuest, resumeStory, showGameMaster } from "@/lib/gm/engine";
import { storyView, turnView } from "@/lib/gm/state";
import { BadRequestError, readPhoto } from "@/lib/photo";
import { loadOwnStory, readJsonBody, respond } from "@/lib/server";
import type { PhotoUpload } from "@/lib/types";

export const maxDuration = 120;

const ACTIONS = {
  complete: completeQuest,
  show: showGameMaster,
  resume: resumeStory,
} as const;

/**
 * Play a turn with a photo:
 * - complete: proof that the current quest is done
 * - show: show the game master something, without advancing the story
 * - resume: the first photo of a new walk
 */
export async function POST(request: Request, ctx: RouteContext<"/api/stories/[id]/turns">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const body = await readJsonBody<PhotoUpload & { kind: string }>(request);
    const action = ACTIONS[body.kind as keyof typeof ACTIONS];
    if (!action) throw new BadRequestError('kind must be "complete", "show" or "resume".');
    const photo = readPhoto(body);
    const story = await loadOwnStory(id);
    const { state, turn } = await action(story, photo);
    return { story: storyView(state), turn: turnView(turn) };
  });
}
