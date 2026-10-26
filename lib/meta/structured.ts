import "server-only";
import { z } from "zod";
import type { ReasoningEffort } from "@/lib/config";
import { ModelApiError, postJson } from "./http";

export type ContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

// Keywords that strict structured-output modes commonly reject. The model still
// sees each field's description, and zod enforces the real limits on the way back.
const UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "minItems",
  "maxItems",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "pattern",
  "format",
  "default",
]);

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (node === null || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    out[key] = key === "properties" ? mapValues(value as Record<string, unknown>) : clean(value);
  }
  if (out.type === "object" && out.properties) {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties as object);
  }
  return out;
}

function mapValues(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, clean(v)]));
}

/** A strict-mode JSON Schema for a zod object schema. */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return clean(z.toJSONSchema(schema, { target: "draft-7" })) as Record<string, unknown>;
}

export type Usage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
};

type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    type: string;
    content?: Array<{ type: string; text?: string; refusal?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
  status?: string;
  incomplete_details?: { reason?: string } | null;
};

/** The text of a Responses API result, from `output_text` or the message items. */
export function responseText(result: ResponsesApiResult): string {
  if (typeof result.output_text === "string" && result.output_text.length > 0) {
    return result.output_text;
  }
  const parts: string[] = [];
  for (const item of result.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text) parts.push(part.text);
      if (part.type === "refusal" && part.refusal) {
        throw new Error(`The model declined: ${part.refusal}`);
      }
    }
  }
  return parts.join("");
}

function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some providers wrap JSON in a code fence or add a sentence; take the outer object.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error(`Model output was not JSON: ${text.slice(0, 200)}`);
  }
}

function validate<T>(schema: z.ZodType<T>, raw: unknown, name: string): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Model output for ${name} did not match the schema: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

type JsonCall<T> = {
  baseURL: string;
  apiKey: string;
  model: string;
  instructions: string;
  content: ContentPart[];
  schema: z.ZodType<T>;
  schemaName: string;
  effort?: ReasoningEffort;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

/**
 * How strictly to ask for JSON. Strict JSON Schema is the goal; if an endpoint
 * rejects it, fall back to a non-strict schema, then to asking in the prompt.
 * The mode that works is remembered per endpoint and model.
 */
type FormatMode = "strict" | "loose" | "prompt";
const MODES: FormatMode[] = ["strict", "loose", "prompt"];
const workingMode = new Map<string, FormatMode>();

function rejectsFormat(error: unknown): boolean {
  return (
    error instanceof ModelApiError &&
    error.status === 400 &&
    /schema|response_format|text\.format|strict|structured/i.test(error.message)
  );
}

function schemaInPrompt(call: JsonCall<unknown>): string {
  return `${call.instructions}\n\nReply with only a JSON object that matches this JSON Schema, with no other text:\n${JSON.stringify(toStrictJsonSchema(call.schema))}`;
}

async function withFallbacks<T>(
  call: JsonCall<T>,
  send: (mode: FormatMode) => Promise<{ text: string; usage: Usage }>,
): Promise<{ data: T; usage: Usage }> {
  const key = `${call.baseURL}|${call.model}`;
  const modes = MODES.slice(MODES.indexOf(workingMode.get(key) ?? "strict"));

  for (const mode of modes) {
    let reply: { text: string; usage: Usage };
    try {
      reply = await send(mode);
    } catch (error) {
      if (rejectsFormat(error) && mode !== "prompt") {
        console.warn(`[questory] ${call.model} rejected ${mode} JSON output; trying a looser format.`);
        continue;
      }
      throw error;
    }
    workingMode.set(key, mode);
    try {
      return { data: validate(call.schema, parseJsonLoose(reply.text), call.schemaName), usage: reply.usage };
    } catch (error) {
      // A malformed reply is usually a one-off: ask once more before giving up.
      console.warn(`[questory] ${call.schemaName}: ${error instanceof Error ? error.message : error}. Retrying once.`);
      const retry = await send(mode);
      return { data: validate(call.schema, parseJsonLoose(retry.text), call.schemaName), usage: retry.usage };
    }
  }
  throw new Error(`${call.model} would not return JSON for ${call.schemaName}.`);
}

/** One structured call through the Responses API (Muse Wonder, Muse Spark). */
export async function respondJson<T>(call: JsonCall<T>): Promise<{ data: T; usage: Usage }> {
  return withFallbacks(call, async (mode) => {
    const result = await postJson<ResponsesApiResult>("/responses", {
      baseURL: call.baseURL,
      apiKey: call.apiKey,
      timeoutMs: call.timeoutMs ?? 120_000,
      json: {
        model: call.model,
        instructions: mode === "prompt" ? schemaInPrompt(call) : call.instructions,
        input: [{ type: "message", role: "user", content: call.content }],
        reasoning: call.effort ? { effort: call.effort } : undefined,
        max_output_tokens: call.maxOutputTokens ?? 6000,
        store: false,
        text:
          mode === "prompt"
            ? undefined
            : {
                format: {
                  type: "json_schema",
                  name: call.schemaName,
                  schema: toStrictJsonSchema(call.schema),
                  strict: mode === "strict",
                },
              },
      },
    });

    if (result.status === "incomplete") {
      const reason = result.incomplete_details?.reason ?? "unknown";
      throw new Error(
        `The ${call.schemaName} response was cut off (${reason}). Raise max_output_tokens or lower the reasoning effort.`,
      );
    }
    return {
      text: responseText(result),
      usage: {
        model: call.model,
        inputTokens: result.usage?.input_tokens ?? 0,
        outputTokens: result.usage?.output_tokens ?? 0,
        reasoningTokens: result.usage?.output_tokens_details?.reasoning_tokens ?? 0,
        cachedTokens: result.usage?.input_tokens_details?.cached_tokens ?? 0,
      },
    };
  });
}

type ChatResult = {
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

/**
 * The same structured call over Chat Completions, for OpenAI-compatible servers
 * such as vLLM serving Muse Glimmer.
 */
export async function chatJson<T>(call: JsonCall<T>): Promise<{ data: T; usage: Usage }> {
  const content = call.content.map((part) =>
    part.type === "input_text"
      ? { type: "text", text: part.text }
      : { type: "image_url", image_url: { url: part.image_url } },
  );
  return withFallbacks(call, async (mode) => {
    const result = await postJson<ChatResult>("/chat/completions", {
      baseURL: call.baseURL,
      apiKey: call.apiKey,
      timeoutMs: call.timeoutMs ?? 60_000,
      json: {
        model: call.model,
        messages: [
          { role: "system", content: mode === "prompt" ? schemaInPrompt(call) : call.instructions },
          { role: "user", content },
        ],
        max_tokens: call.maxOutputTokens ?? 1500,
        response_format:
          mode === "prompt"
            ? undefined
            : {
                type: "json_schema",
                json_schema: {
                  name: call.schemaName,
                  schema: toStrictJsonSchema(call.schema),
                  strict: mode === "strict",
                },
              },
      },
    });
    const message = result.choices?.[0]?.message;
    if (message?.refusal) throw new Error(`The model declined: ${message.refusal}`);
    return {
      text: message?.content ?? "",
      usage: {
        model: call.model,
        inputTokens: result.usage?.prompt_tokens ?? 0,
        outputTokens: result.usage?.completion_tokens ?? 0,
        reasoningTokens: 0,
        cachedTokens: 0,
      },
    };
  });
}
