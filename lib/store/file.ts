import "server-only";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { StoryStateSchema, TurnRecordSchema, type StoryState, type TurnRecord } from "@/lib/gm/state";
import type { Store, StoredImage } from "./types";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MIME: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * Local JSON files under DATA_DIR. For development only: serverless hosts
 * don't keep files between requests, so deploy with Appwrite.
 */
export function fileStore(root: string): Store {
  const dir = (...parts: string[]) => path.join(root, ...parts);

  async function writeJson(file: string, value: unknown) {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2));
    await rename(tmp, file);
  }

  async function readJson(file: string): Promise<unknown | null> {
    try {
      return JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  function check(id: string) {
    if (!SAFE_ID.test(id)) throw new Error(`Invalid id: ${id}`);
    return id;
  }

  return {
    async getStory(id) {
      const raw = await readJson(dir("stories", `${check(id)}.json`));
      return raw ? StoryStateSchema.parse(raw) : null;
    },

    async saveStory(state) {
      await writeJson(dir("stories", `${check(state.id)}.json`), state);
    },

    async listStories(playerId) {
      let names: string[] = [];
      try {
        names = await readdir(dir("stories"));
      } catch {
        return [];
      }
      const stories: StoryState[] = [];
      for (const name of names) {
        if (!name.endsWith(".json")) continue;
        const raw = await readJson(dir("stories", name));
        const parsed = StoryStateSchema.safeParse(raw);
        if (parsed.success && parsed.data.playerId === playerId) stories.push(parsed.data);
      }
      return stories.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getTurn(storyId, turnId) {
      const raw = await readJson(dir("turns", check(storyId), `${check(turnId)}.json`));
      return raw ? TurnRecordSchema.parse(raw) : null;
    },

    async saveTurn(turn) {
      await writeJson(dir("turns", check(turn.storyId), `${check(turn.id)}.json`), turn);
    },

    async listTurns(storyId) {
      let names: string[] = [];
      try {
        names = await readdir(dir("turns", check(storyId)));
      } catch {
        return [];
      }
      const turns: TurnRecord[] = [];
      for (const name of names) {
        if (!name.endsWith(".json")) continue;
        const parsed = TurnRecordSchema.safeParse(await readJson(dir("turns", storyId, name)));
        if (parsed.success) turns.push(parsed.data);
      }
      return turns.sort((a, b) => a.number - b.number);
    },

    async putImage(image: StoredImage) {
      const ext = EXT[image.mime] ?? "bin";
      const id = `${crypto.randomUUID()}.${ext}`;
      await mkdir(dir("images"), { recursive: true });
      await writeFile(dir("images", id), image.bytes);
      return id;
    },

    async getImage(id) {
      check(id);
      try {
        const bytes = new Uint8Array(await readFile(dir("images", id)));
        const ext = id.split(".").pop() ?? "";
        return { bytes, mime: MIME[ext] ?? "application/octet-stream" };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
  };
}
