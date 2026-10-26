import "server-only";
import type { Config } from "@/lib/config";
import { chatJson, respondJson, type ContentPart, type Usage } from "@/lib/meta/structured";
import { mockBrain } from "./mock";
import {
  EpilogueSchema,
  GenesisSchema,
  ReactionSchema,
  ResumeSchema,
  TurnSchema,
  type EpilogueOut,
  type GenesisOut,
  type ReactionOut,
  type ResumeOut,
  type TurnOut,
} from "./outputs";
import {
  GM_INSTRUCTIONS,
  REACTION_INSTRUCTIONS,
  completeTask,
  epilogueTask,
  genesisTask,
  reactionTask,
  resumeTask,
} from "./prompts";
import type { StoryState } from "./state";

export type Result<T> = { data: T; usage: Usage };

/** The game master's decisions. One implementation calls the Meta Model API; the other is scripted. */
export type Brain = {
  genesis(genre: string, photo: string): Promise<Result<GenesisOut>>;
  judge(state: StoryState, photo: string): Promise<Result<TurnOut>>;
  resume(state: StoryState, photo: string): Promise<Result<ResumeOut>>;
  react(state: StoryState, photo: string): Promise<Result<ReactionOut>>;
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

    judge: (state, photo) =>
      respondJson({
        ...gm,
        content: withPhoto(completeTask(state), photo),
        schema: TurnSchema,
        schemaName: "questory_turn",
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

    react: (state, photo) => {
      const call = {
        instructions: REACTION_INSTRUCTIONS,
        content: withPhoto(reactionTask(state), photo),
        schema: ReactionSchema,
        schemaName: "questory_reaction",
        maxOutputTokens: 1500,
      };
      if (config.fast.provider === "openai-compatible") {
        return chatJson({
          ...call,
          baseURL: config.fast.baseURL,
          apiKey: config.fast.apiKey,
          model: config.fast.model,
        });
      }
      return respondJson({
        ...call,
        baseURL: config.meta.baseURL,
        apiKey: config.meta.apiKey,
        model: config.fast.model,
        effort: config.fast.effort,
      });
    },
  };
}

export function getBrain(config: Config): Brain {
  return config.mock ? mockBrain : liveBrain(config);
}
