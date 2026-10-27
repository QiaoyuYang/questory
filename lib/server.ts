import "server-only";
import { cookies } from "next/headers";
import { DailyLimitError, GameRuleError } from "@/lib/gm/engine";
import type { StoryState } from "@/lib/gm/state";
import { ModelApiError } from "@/lib/meta/http";
import { BadRequestError } from "@/lib/photo";
import { getStore } from "@/lib/store";

export class NotFoundError extends Error {}

const PLAYER_COOKIE = "qs_player";
const PLAYER_ID = /^[A-Za-z0-9-]{16,64}$/;

/**
 * The anonymous player id, kept in an httpOnly cookie. Created on first use.
 * Good enough for a game demo; swap in real auth before storing anything sensitive.
 */
export async function getPlayerId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(PLAYER_COOKIE)?.value;
  if (existing && PLAYER_ID.test(existing)) return existing;
  const id = crypto.randomUUID();
  jar.set(PLAYER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}

/** Load a story that belongs to the current player. */
export async function loadOwnStory(storyId: string): Promise<StoryState> {
  const playerId = await getPlayerId();
  const story = await getStore().getStory(storyId);
  if (!story || story.playerId !== playerId) throw new NotFoundError("That story doesn't exist.");
  return story;
}

export async function readJsonBody<T>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    throw new BadRequestError("Send a JSON body.");
  }
}

/** Run a route handler and turn known errors into JSON responses. */
export async function respond(handler: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await handler());
  } catch (error) {
    if (error instanceof BadRequestError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof NotFoundError) return Response.json({ error: error.message }, { status: 404 });
    if (error instanceof GameRuleError) return Response.json({ error: error.message }, { status: 409 });
    if (error instanceof DailyLimitError) return Response.json({ error: error.message }, { status: 429 });
    if (error instanceof ModelApiError) {
      console.error("[questory] Model API error:", error.status, error.body.slice(0, 1000));
      const busy = error.status === 429;
      return Response.json(
        {
          error: busy
            ? "The game master is busy. Try again in a few seconds."
            : `The game master couldn't answer (${error.message}).`,
        },
        { status: busy ? 503 : 502 },
      );
    }
    console.error("[questory] Unexpected error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Something went wrong: ${detail}` }, { status: 500 });
  }
}
