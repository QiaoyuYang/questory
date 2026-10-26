import "server-only";
import { getConfig } from "@/lib/config";
import { appwriteStore } from "./appwrite";
import { fileStore } from "./file";
import type { Store } from "./types";

let cached: { key: string; store: Store } | null = null;

export function getStore(): Store {
  const config = getConfig();
  const key = config.storage === "appwrite" ? `aw:${config.appwrite.endpoint}:${config.appwrite.projectId}` : `file:${config.dataDir}`;
  if (cached?.key === key) return cached.store;
  const store = config.storage === "appwrite" ? appwriteStore(config.appwrite) : fileStore(config.dataDir);
  cached = { key, store };
  return store;
}

export type { Store, StoredImage } from "./types";
