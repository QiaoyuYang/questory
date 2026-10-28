import { getConfig } from "@/lib/config";
import { startStory } from "@/lib/gm/engine";
import { storySummary, storyView, turnView, type StoryState } from "@/lib/gm/state";
import { BadRequestError, readPhoto } from "@/lib/photo";
import { getPlayerId, readJsonBody, respond } from "@/lib/server";
import { getStore } from "@/lib/store";
import { isGenre, type PhotoUpload } from "@/lib/types";

export const maxDuration = 120;

const STORY_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * The current player's stories, newest first. Stories they joined as a partner belong to
 * their friend, so the browser remembers those and asks for them by id in `shared`.
 */
export async function GET(request: Request) {
  return respond(async () => {
    const playerId = await getPlayerId();
    const store = getStore();
    const shared = (new URL(request.url).searchParams.get("shared") ?? "").split(",").filter((id) => STORY_ID.test(id));
    const [own, joined] = await Promise.all([
      store.listStories(playerId),
      Promise.all(shared.slice(0, 20).map((id) => store.getStory(id).catch(() => null))),
    ]);
    const stories = [
      ...own,
      ...joined.filter((story): story is StoryState => story !== null && story.partners.includes(playerId)),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      stories: stories.map((story) => storySummary(story, playerId)),
      mode: getConfig().mock ? "mock" : "live",
    };
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
    return { story: storyView(state, playerId), turn: turnView(turn, playerId, playerId) };
  });
}
