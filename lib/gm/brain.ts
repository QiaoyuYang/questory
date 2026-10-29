import "server-only";
import type { Config } from "@/lib/config";
import { respondJson, type ContentPart, type Usage } from "@/lib/meta/structured";
import { mockBrain } from "./mock";
import {
  CheckSchema,
  CloseSchema,
  GenesisSchema,
  GenesisTeamSchema,
  PhotoTurnSchema,
  ResumeSchema,
  type CheckIn,
  type CheckOut,
  type CloseOut,
  type GenesisOut,
  type PhotoTurnOut,
  type ResumeOut,
} from "./outputs";
import { CHECK_INSTRUCTIONS, GM_INSTRUCTIONS, checkTask, closeTask, genesisTask, photoTask, resumeTask } from "./prompts";
import type { StoryState } from "./state";

export type Result<T> = { data: T; usage: Usage };

/** The game master's decisions. One implementation calls the Meta Model API; the other is scripted. */
export type Brain = {
  /** `theme` is the player's own idea, for a custom story. A "team" case gets a lead for each player. */
  genesis(genre: string, theme: string | null, mode: "solo" | "team", photo: string): Promise<Result<GenesisOut>>;
  /** Any photo during `playerId`'s walk. `mustProgress` is set when this photo has to move the story. */
  photo(
    state: StoryState,
    photo: string,
    options: { playerId: string; mustProgress: boolean },
  ): Promise<Result<PhotoTurnOut>>;
  /**
   * The first photo of a walk. `newPlayer` is a partner's first walk on the case; `newChapter`
   * is set when the walk opens the next chapter rather than picking one back up; `takeOver`
   * when the player starts on the lead their friend hasn't joined to take.
   */
  resume(
    state: StoryState,
    photo: string,
    options: { playerId: string; newPlayer: boolean; newChapter: boolean; takeOver: boolean },
  ): Promise<Result<ResumeOut>>;
  /** A two-player chapter's ending, once both leads are done. */
  close(state: StoryState): Promise<Result<CloseOut>>;
  /** A second look at text written about a photo: anything it claims to see that the photo doesn't show comes out. */
  check(photo: string, text: CheckIn): Promise<Result<CheckOut>>;
};

function withPhoto(text: string, photo: string): ContentPart[] {
  return [
    { type: "input_text", text },
    { type: "input_image", image_url: photo },
  ];
}

export function liveBrain(config: Config): Brain {
  const gm = {
    baseURL: config.meta.baseURL,
    apiKey: config.meta.apiKey,
    model: config.meta.gmModel,
    effort: config.meta.gmEffort,
    instructions: GM_INSTRUCTIONS,
  };

  return {
    genesis: (genre, theme, mode, photo) =>
      respondJson({
        ...gm,
        content: withPhoto(genesisTask(genre, theme, mode), photo),
        schema: mode === "team" ? GenesisTeamSchema : GenesisSchema,
        schemaName: "questory_genesis",
      }),

    photo: (state, photo, options) =>
      respondJson({
        ...gm,
        content: withPhoto(photoTask(state, options), photo),
        schema: PhotoTurnSchema,
        schemaName: "questory_photo",
      }),

    resume: (state, photo, options) =>
      respondJson({
        ...gm,
        content: withPhoto(resumeTask(state, options), photo),
        schema: ResumeSchema,
        schemaName: "questory_resume",
      }),

    close: (state) =>
      respondJson({
        ...gm,
        content: [{ type: "input_text", text: closeTask(state) }],
        schema: CloseSchema,
        schemaName: "questory_close",
      }),

    check: (photo, text) =>
      respondJson({
        baseURL: config.meta.baseURL,
        apiKey: config.meta.apiKey,
        model: config.meta.checkModel,
        effort: "minimal",
        instructions: CHECK_INSTRUCTIONS,
        content: withPhoto(checkTask(text), photo),
        schema: CheckSchema,
        schemaName: "questory_check",
      }),
  };
}

export function getBrain(config: Config): Brain {
  return config.mock ? mockBrain : liveBrain(config);
}
