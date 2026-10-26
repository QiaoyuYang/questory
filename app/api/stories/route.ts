import { getConfig } from "@/lib/config";
import { startStory } from "@/lib/gm/engine";
import { storySummary, storyView, turnView } from "@/lib/gm/state";
import { BadRequestError, readPhoto } from "@/lib/photo";
import { getPlayerId, readJsonBody, respond } from "@/lib/server";
import { getStore } from "@/lib/store";
import { isGenre, type PhotoUpload } from "@/lib/types";

export const maxDuration = 120;

/** The current player's stories, newest first. */
export async function GET() {
  return respond(async () => {
    const playerId = await getPlayerId();
    const stories = await getStore().listStories(playerId);
    return { stories: stories.map(storySummary), mode: getConfig().mock ? "mock" : "live" };
  });
}

/** Start a new story from the player's first photo. */
export async function POST(request: Request) {
  return respond(async () => {
    const body = await readJsonBody<PhotoUpload & { genre: string }>(request);
    if (!isGenre(body.genre)) throw new BadRequestError("Pick a genre.");
    const photo = readPhoto(body);
    const playerId = await getPlayerId();
    const { state, turn } = await startStory(playerId, body.genre, photo);
    return { story: storyView(state), turn: turnView(turn) };
  });
}
