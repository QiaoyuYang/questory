import "server-only";
import { AppwriteException, Client, Query, Storage, TablesDB } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import type { Config } from "@/lib/config";
import { StoryStateSchema, TurnRecordSchema } from "@/lib/gm/state";
import type { Store } from "./types";

/** Table and column names. scripts/setup-appwrite.ts creates them. */
export const APPWRITE_SCHEMA = {
  stories: "stories",
  turns: "turns",
} as const;

function isNotFound(error: unknown) {
  return error instanceof AppwriteException && error.code === 404;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Appwrite storage: each story is a row holding its state as JSON; each turn is a
 * row keyed by story; photos and story cards live in a private bucket and are
 * served through /api/media.
 */
export function appwriteStore(config: Config["appwrite"]): Store {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);
  const db = new TablesDB(client);
  const storage = new Storage(client);
  const databaseId = config.databaseId;

  return {
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
  };
}
