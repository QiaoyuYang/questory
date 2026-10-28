import "server-only";
import { AppwriteException, Client, Query, Storage, TablesDB } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import type { Config } from "@/lib/config";
import { StoryStateSchema, TurnRecordSchema } from "@/lib/gm/state";
import { imagesOf, type Store } from "./types";

/** Table and column names. scripts/setup-appwrite.ts creates them. */
export const APPWRITE_SCHEMA = {
  stories: "stories",
  turns: "turns",
  usage: "usage",
} as const;

function isNotFound(error: unknown) {
  return error instanceof AppwriteException && error.code === 404;
}

function hasType(error: unknown, type: string) {
  return error instanceof AppwriteException && error.type === type;
}

/** Deleting something already gone counts as done, so a half-finished delete can run again. */
async function ignoreMissing(request: Promise<unknown>) {
  try {
    await request;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** How long a request waits for a story's lock, and how long before a held lock counts as left behind. */
const LOCK_WAIT_MS = 15_000;
const LOCK_STALE_MS = 8_000;

/**
 * Appwrite storage: each story is a row holding its state as JSON; each turn is a
 * row keyed by story; each day's model calls are counted in a usage row; photos and
 * story cards live in a private bucket and are served through /api/media.
 */
export function appwriteStore(config: Config["appwrite"]): Store {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);
  const db = new TablesDB(client);
  const storage = new Storage(client);
  const databaseId = config.databaseId;

  const store: Store = {
    async getStory(id) {
      try {
        const row = await db.getRow({ databaseId, tableId: APPWRITE_SCHEMA.stories, rowId: id });
        return StoryStateSchema.parse(JSON.parse(row.state as string));
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async saveStory(state) {
      await db.upsertRow({
        databaseId,
        tableId: APPWRITE_SCHEMA.stories,
        rowId: state.id,
        data: {
          playerId: state.playerId,
          title: state.title.slice(0, 255),
          status: state.status,
          state: JSON.stringify(state),
        },
      });
    },

    async listStories(playerId) {
      const result = await db.listRows({
        databaseId,
        tableId: APPWRITE_SCHEMA.stories,
        queries: [Query.equal("playerId", playerId), Query.orderDesc("$updatedAt"), Query.limit(25)],
      });
      return result.rows.map((row) => StoryStateSchema.parse(JSON.parse(row.state as string)));
    },

    async getTurn(storyId, turnId) {
      try {
        const row = await db.getRow({ databaseId, tableId: APPWRITE_SCHEMA.turns, rowId: turnId });
        const turn = TurnRecordSchema.parse(JSON.parse(row.data as string));
        return turn.storyId === storyId ? turn : null;
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async saveTurn(turn) {
      await db.upsertRow({
        databaseId,
        tableId: APPWRITE_SCHEMA.turns,
        rowId: turn.id,
        data: {
          storyId: turn.storyId,
          number: turn.number,
          kind: turn.kind,
          data: JSON.stringify(turn),
        },
      });
    },

    async listTurns(storyId) {
      const result = await db.listRows({
        databaseId,
        tableId: APPWRITE_SCHEMA.turns,
        queries: [Query.equal("storyId", storyId), Query.orderAsc("number"), Query.limit(200)],
      });
      return result.rows.map((row) => TurnRecordSchema.parse(JSON.parse(row.data as string)));
    },

    async putImage(image) {
      // Knowing a media id is the only access check on /api/media, so ids must be
      // unguessable. Appwrite's ID.unique() is a timestamp plus seven Math.random()
      // digits; a UUID fits Appwrite's 36-character id limit.
      const id = crypto.randomUUID();
      const name = `${id}.${EXT[image.mime] ?? "bin"}`;
      await storage.createFile({
        bucketId: config.bucketId,
        fileId: id,
        file: InputFile.fromBuffer(image.bytes, name),
      });
      return id;
    },

    async getImage(id) {
      try {
        const [meta, bytes] = await Promise.all([
          storage.getFile({ bucketId: config.bucketId, fileId: id }),
          storage.getFileView({ bucketId: config.bucketId, fileId: id }),
        ]);
        return { bytes: new Uint8Array(bytes), mime: meta.mimeType };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async deleteStory(id) {
      const turns = await store.listTurns(id);
      const { bucketId } = config;
      await Promise.all(imagesOf(turns).map((fileId) => ignoreMissing(storage.deleteFile({ bucketId, fileId }))));
      await Promise.all(
        turns.map((turn) => ignoreMissing(db.deleteRow({ databaseId, tableId: APPWRITE_SCHEMA.turns, rowId: turn.id }))),
      );
      await ignoreMissing(db.deleteRow({ databaseId, tableId: APPWRITE_SCHEMA.stories, rowId: id }));
    },

    async countCall(key, limit) {
      // One row per key. Appwrite increments atomically and won't go past `max`, so
      // requests on different servers can't overshoot the limit.
      const row = { databaseId, tableId: APPWRITE_SCHEMA.usage, rowId: key };
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await db.incrementRowColumn({ ...row, column: "calls", value: 1, max: limit });
          return true;
        } catch (error) {
          if (hasType(error, "column_limit_exceeded")) return false;
          if (!hasType(error, "row_not_found")) throw error;
        }
        // The key's first call creates its row. If another request got there first, increment instead.
        try {
          await db.createRow({ ...row, data: { calls: 1 } });
          return true;
        } catch (error) {
          if (!hasType(error, "row_already_exists")) throw error;
        }
      }
      throw new Error("Couldn't count today's calls.");
    },

    async withLock(key, task) {
      // A lock is a usage row counting who holds it. Row ids are at most 36 characters,
      // so a UUID key loses its dashes.
      const row = { databaseId, tableId: APPWRITE_SCHEMA.usage, rowId: `lock_${key.replace(/-/g, "").slice(0, 31)}` };
      const started = Date.now();
      let reset = false;
      while (!(await takeLock(row))) {
        const waited = Date.now() - started;
        // Saving a turn holds the lock for well under a second, so a lock held this long
        // was left behind by a request that stopped partway.
        if (waited > LOCK_STALE_MS && !reset) {
          console.warn("[questory] Resetting a lock left behind by a request that stopped.");
          await db.updateRow({ ...row, data: { calls: 0 } });
          reset = true;
          continue;
        }
        if (waited > LOCK_WAIT_MS) throw new Error("This story is busy. Try again in a moment.");
        await sleep(150 + Math.random() * 150);
      }
      try {
        return await task();
      } finally {
        await db.decrementRowColumn({ ...row, column: "calls", value: 1, min: 0 }).catch((error) => {
          console.warn("[questory] Couldn't let go of a lock:", error);
        });
      }
    },
  };

  type RowRef = { databaseId: string; tableId: string; rowId: string };

  /**
   * Increments are atomic, so of everyone adding 1 to a free lock, exactly one sees 1 and
   * holds it. The rest take their 1 back off and try again.
   */
  async function takeLock(row: RowRef): Promise<boolean> {
    let holders: number;
    try {
      holders = Number((await db.incrementRowColumn({ ...row, column: "calls", value: 1 })).calls);
    } catch (error) {
      if (!hasType(error, "row_not_found")) throw error;
      try {
        await db.createRow({ ...row, data: { calls: 1 } });
        return true;
      } catch (error) {
        if (hasType(error, "row_already_exists")) return false;
        throw error;
      }
    }
    if (holders === 1) return true;
    await db.decrementRowColumn({ ...row, column: "calls", value: 1 }).catch(() => {});
    return false;
  }

  return store;
}
