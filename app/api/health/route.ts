import { connection } from "next/server";
import { getConfig } from "@/lib/config";

/** Which models and storage the server is using. Never includes keys. */
export async function GET() {
  await connection();
  const config = getConfig();
  return Response.json({
    mode: config.mock ? "mock" : "live",
    models: config.mock
      ? null
      : {
          gameMaster: `${config.meta.gmModel} (reasoning: ${config.meta.gmEffort})`,
          questCards: config.features.questCards ? config.meta.imageModel : "off",
          grounding: config.features.sam ? config.meta.samModel : "off",
        },
    storage: config.storage,
  });
}
