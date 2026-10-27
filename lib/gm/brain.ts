import "server-only";
import type { Config } from "@/lib/config";
import { respondJson, type ContentPart, type Usage } from "@/lib/meta/structured";
import { mockBrain } from "./mock";
import {
  EpilogueSchema,
  GenesisSchema,
  PhotoTurnSchema,
  ResumeSchema,
  type EpilogueOut,
  type GenesisOut,
  type PhotoTurnOut,
  type ResumeOut,
} from "./outputs";
import { GM_INSTRUCTIONS, epilogueTask, genesisTask, photoTask, resumeTask } from "./prompts";
import type { StoryState } from "./state";

export type Result<T> = { data: T; usage: Usage };

/** The game master's decisions. One implementation calls the Meta Model API; the other is scripted. */
export type Brain = {
  genesis(genre: string, photo: string): Promise<Result<GenesisOut>>;
  /** Any photo during a walk. `mustProgress` is set when this photo has to move the story. */
  photo(state: StoryState, photo: string, options: { mustProgress: boolean }): Promise<Result<PhotoTurnOut>>;
  resume(state: StoryState, photo: string): Promise<Result<ResumeOut>>;
  epilogue(state: StoryState): Promise<Result<EpilogueOut>>;
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
    genesis: (genre, photo) =>
      respondJson({
        ...gm,
        content: withPhoto(genesisTask(genre), photo),
        schema: GenesisSchema,
        schemaName: "questory_genesis",
      }),

    photo: (state, photo, options) =>
      respondJson({
        ...gm,
        content: withPhoto(photoTask(state, options), photo),
        schema: PhotoTurnSchema,
        schemaName: "questory_photo",
      }),

    resume: (state, photo) =>
      respondJson({
        ...gm,
        content: withPhoto(resumeTask(state), photo),
        schema: ResumeSchema,
        schemaName: "questory_resume",
      }),

    epilogue: (state) =>
      respondJson({
        ...gm,
        content: [{ type: "input_text", text: epilogueTask(state) }],
        schema: EpilogueSchema,
        schemaName: "questory_epilogue",
      }),
  };
}

export function getBrain(config: Config): Brain {
  return config.mock ? mockBrain : liveBrain(config);
}
