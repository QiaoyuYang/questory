import "server-only";

/**
 * Runtime configuration, read from environment variables.
 * See .env.example for what each one does.
 */

function env(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function flag(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return !["0", "false", "off", "no"].includes(value.toLowerCase());
}

export type ReasoningEffort = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export function getConfig() {
  const apiKey = env("MODEL_API_KEY");
  const appwriteReady = Boolean(
    env("APPWRITE_ENDPOINT") && env("APPWRITE_PROJECT_ID") && env("APPWRITE_API_KEY"),
  );

  return {
    /** Without a key the app runs on a scripted game master so the UI can be built offline. */
    mock: !apiKey || flag("MOCK", false),
    meta: {
      apiKey,
      baseURL: env("META_BASE_URL", "https://api.meta.ai/v1").replace(/\/$/, ""),
      gmModel: env("GM_MODEL", "muse-wonder-1.0"),
      gmEffort: env("GM_REASONING_EFFORT", "low") as ReasoningEffort,
      imageModel: env("IMAGE_MODEL", "muse-image-1.0"),
      imageReasoning: env("IMAGE_REASONING_STRENGTH"), // "low" | "high" | "" (API default)
      samModel: env("SAM_MODEL", "sam-3.1"),
    },
    /**
     * The quick model behind "Show the GM". Defaults to Muse Spark on the Model API.
     * Set FAST_PROVIDER=openai-compatible to point it at a self-hosted Muse Glimmer
     * (for example vLLM on Modal) through its OpenAI-compatible endpoint.
     */
    fast: {
      provider: env("FAST_PROVIDER", "meta") as "meta" | "openai-compatible",
      baseURL: env("FAST_BASE_URL").replace(/\/$/, ""),
      apiKey: env("FAST_API_KEY"),
      model: env("FAST_MODEL", "muse-spark-1.3"),
      effort: env("FAST_REASONING_EFFORT", "low") as ReasoningEffort,
    },
    features: {
      questCards: flag("QUEST_CARDS", true),
      sam: flag("SAM_GROUNDING", true),
    },
    storage: env("STORAGE", appwriteReady ? "appwrite" : "file") as "appwrite" | "file",
    dataDir: env("DATA_DIR", ".data"),
    appwrite: {
      endpoint: env("APPWRITE_ENDPOINT"),
      projectId: env("APPWRITE_PROJECT_ID"),
      apiKey: env("APPWRITE_API_KEY"),
      databaseId: env("APPWRITE_DATABASE_ID", "questory"),
      bucketId: env("APPWRITE_BUCKET_ID", "media"),
    },
  };
}

export type Config = ReturnType<typeof getConfig>;
