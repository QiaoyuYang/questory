/**
 * Creates the Appwrite database, tables and storage bucket Questory needs.
 * Safe to run more than once: anything that already exists is left alone.
 *
 *   npm run setup:appwrite
 *
 * Reads APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY (and optionally
 * APPWRITE_DATABASE_ID, APPWRITE_BUCKET_ID) from .env.local. The API key needs the
 * databases.write, tables.write, buckets.write (and matching read) scopes.
 */
import { AppwriteException, Client, Storage, TablesDB, TablesDBIndexType } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || "questory";
const bucketId = process.env.APPWRITE_BUCKET_ID || "media";

if (!endpoint || !projectId || !apiKey) {
  console.error("Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env.local first.");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new TablesDB(client);
const storage = new Storage(client);

async function ensure(label: string, create: () => Promise<unknown>) {
  try {
    await create();
    console.log(`created  ${label}`);
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) {
      console.log(`exists   ${label}`);
      return;
    }
    throw error;
  }
}

type Column =
  | { key: string; kind: "short"; size: number; required: boolean }
  | { key: string; kind: "long"; required: boolean }
  | { key: string; kind: "integer"; required: boolean };

/** Newer Appwrite servers have varchar/longtext columns; older ones only have string. */
async function createColumn(tableId: string, column: Column) {
  const base = { databaseId, tableId, key: column.key, required: column.required };
  if (column.kind === "integer") {
    return ensure(`${tableId}.${column.key}`, () => db.createIntegerColumn(base));
  }
  const size = column.kind === "short" ? column.size : 4_000_000;
  return ensure(`${tableId}.${column.key}`, async () => {
    try {
      if (column.kind === "short") await db.createVarcharColumn({ ...base, size });
      else await db.createLongtextColumn(base);
    } catch (error) {
      const unsupported =
        error instanceof AppwriteException && (error.code === 404 || error.code === 400) && !/already exists/i.test(error.message);
      if (!unsupported) throw error;
      await db.createStringColumn({ ...base, size });
    }
  });
}

async function waitForColumns(tableId: string) {
  for (let i = 0; i < 60; i++) {
    const { columns } = await db.listColumns({ databaseId, tableId });
    const pending = columns.filter((c) => (c as { status?: string }).status !== "available");
    if (pending.length === 0) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Columns in ${tableId} are still processing after a minute.`);
}

async function main() {
  await ensure(`database ${databaseId}`, () => db.create({ databaseId, name: "Questory" }));

  // Stories: one row per story, the full state as JSON.
  await ensure("table stories", () =>
    db.createTable({ databaseId, tableId: "stories", name: "Stories", permissions: [], rowSecurity: false }),
  );
  await createColumn("stories", { key: "playerId", kind: "short", size: 64, required: true });
  await createColumn("stories", { key: "title", kind: "short", size: 255, required: false });
  await createColumn("stories", { key: "status", kind: "short", size: 16, required: false });
  await createColumn("stories", { key: "state", kind: "long", required: true });
  await waitForColumns("stories");
  await ensure("index stories.by_player", () =>
    db.createIndex({ databaseId, tableId: "stories", key: "by_player", type: TablesDBIndexType.Key, columns: ["playerId"] }),
  );

  // Turns: one row per turn, keyed by story.
  await ensure("table turns", () =>
    db.createTable({ databaseId, tableId: "turns", name: "Turns", permissions: [], rowSecurity: false }),
  );
  await createColumn("turns", { key: "storyId", kind: "short", size: 64, required: true });
  await createColumn("turns", { key: "number", kind: "integer", required: true });
  await createColumn("turns", { key: "kind", kind: "short", size: 16, required: false });
  await createColumn("turns", { key: "data", kind: "long", required: true });
  await waitForColumns("turns");
  await ensure("index turns.by_story", () =>
    db.createIndex({
      databaseId,
      tableId: "turns",
      key: "by_story",
      type: TablesDBIndexType.Key,
      columns: ["storyId", "number"],
    }),
  );

  // Photos and quest cards. Private: the server reads them with its API key.
  await ensure(`bucket ${bucketId}`, () =>
    storage.createBucket({
      bucketId,
      name: "Questory media",
      permissions: [],
      fileSecurity: false,
      maximumFileSize: 10 * 1024 * 1024,
      allowedFileExtensions: ["jpg", "jpeg", "png", "webp"],
    }),
  );

  console.log("\nAppwrite is ready. Set STORAGE=appwrite (or leave it unset) and restart the dev server.");
}

main().catch((error) => {
  console.error(error instanceof AppwriteException ? `Appwrite error ${error.code}: ${error.message}` : error);
  process.exit(1);
});
