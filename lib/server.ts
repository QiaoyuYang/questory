import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DailyLimitError, GameRuleError } from "@/lib/gm/engine";
import type { StoryState } from "@/lib/gm/state";
import { GAME_MASTER, isUuid } from "@/lib/types";
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

type Loaded = { story: StoryState; playerId: string };

/** Load a story the current player started, or joined as a partner. */
export async function loadStory(storyId: string): Promise<Loaded> {
  const playerId = await getPlayerId();
  const story = await getStore().getStory(storyId);
  if (!story || (story.playerId !== playerId && !story.partners.includes(playerId))) {
    throw new NotFoundError("That story doesn't exist.");
  }
  return { story, playerId };
}

/** Load a story the current player started. Only its owner can invite a friend or delete it. */
export async function loadOwnStory(storyId: string): Promise<Loaded> {
  const loaded = await loadStory(storyId);
  if (loaded.story.playerId !== loaded.playerId) throw new NotFoundError("That story doesn't exist.");
  return loaded;
}

function sameCode(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const BAD_INVITE = "This invite link doesn't work. Ask your friend for a new one.";

/**
 * Find a story through its invite link, for a friend who may not have joined yet. Null
 * when there's no story yet: a two-player case's link can go out before its first photo.
 */
export async function findInvitedStory(storyId: string, code: string): Promise<Loaded | null> {
  if (!isUuid(storyId)) throw new NotFoundError(BAD_INVITE);
  const playerId = await getPlayerId();
  const story = await getStore().getStory(storyId);
  if (!story) return null;
  if (!story.invite || !sameCode(story.invite.code, code)) throw new NotFoundError(BAD_INVITE);
  return { story, playerId };
}

/** Load a story through its invite link, for a friend who may not have joined yet. */
export async function loadInvitedStory(storyId: string, code: string): Promise<Loaded> {
  const found = await findInvitedStory(storyId, code);
  if (!found) throw new NotFoundError(BAD_INVITE);
  return found;
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
            ? `${GAME_MASTER} is busy. Try again in a few seconds.`
            : `${GAME_MASTER} couldn't answer (${error.message}).`,
        },
        { status: busy ? 503 : 502 },
      );
    }
    console.error("[questory] Unexpected error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Something went wrong: ${detail}` }, { status: 500 });
  }
}
