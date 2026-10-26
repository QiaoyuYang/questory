import "server-only";
import { z } from "zod";
import type { ReasoningEffort } from "@/lib/config";
import { ModelApiError, postJson } from "./http";

/** A reply that stopped early, usually at max_output_tokens. */
class CutOffError extends Error {}

export type ContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

// Keywords that strict structured-output modes commonly reject. The model still
// sees each field's description, and zod enforces the real limits on the way back.
// maxLength is kept: the Meta API enforces it while generating, which stops a
// runaway string at its cap instead of at max_output_tokens.
const UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "minItems",
  "maxItems",
  "minLength",
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

type Checked<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; raw: unknown; issues: z.core.$ZodIssue[] };

/** Parse and validate a reply, keeping what's needed to retry or repair it. */
function check<T>(schema: z.ZodType<T>, text: string, name: string): Checked<T> {
  let raw: unknown;
  try {
    raw = parseJsonLoose(text);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error), raw: undefined, issues: [] };
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    message: `Model output for ${name} did not match the schema: ${z.prettifyError(parsed.error)}`,
    raw,
    issues: parsed.error.issues,
  };
}

/** Cut text to at most `max` characters, ending on a full sentence when one fits. */
export function clipText(text: string, max: number): string {
  if (text.length <= max) return text;
  for (let i = max - 1; i >= max / 2; i--) {
    if (".!?".includes(text[i]) && /\s/.test(text[i + 1] ?? " ")) return text.slice(0, i + 1);
  }
  const space = text.lastIndexOf(" ", max - 1);
  return `${text.slice(0, space > max / 2 ? space : max - 1).trimEnd()}…`;
}

/**
 * Last resort for a reply that is still too long after a retry: clip long text at a
 * sentence boundary and long lists to their cap, then validate again. Gives up (null)
 * if anything other than length is wrong.
 */
function salvage<T>(schema: z.ZodType<T>, failed: Checked<T>): T | null {
  if (failed.ok || failed.issues.length === 0) return null;
  const copy = structuredClone(failed.raw);
  for (const issue of failed.issues) {
    if (issue.code !== "too_big") return null;
    let parent: unknown = copy;
    for (const key of issue.path.slice(0, -1)) {
      parent = parent !== null && typeof parent === "object" ? (parent as Record<PropertyKey, unknown>)[key] : undefined;
    }
    const key = issue.path.at(-1);
    if (parent === null || typeof parent !== "object" || key === undefined) return null;
    const record = parent as Record<PropertyKey, unknown>;
    const value = record[key];
    const max = Number(issue.maximum);
    if (typeof value === "string") record[key] = clipText(value, max);
    else if (Array.isArray(value)) record[key] = value.slice(0, max);
    else return null;
  }
  const parsed = schema.safeParse(copy);
  return parsed.success ? parsed.data : null;
}

function addUsage(a: Usage, b: Usage): Usage {
  return {
    model: a.model,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
  };
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
      reply = await retryIfCutOff(() => send(mode));
    } catch (error) {
      if (rejectsFormat(error) && mode !== "prompt") {
        console.warn(`[questory] ${call.model} rejected ${mode} JSON output; trying a looser format.`);
        continue;
      }
      throw error;
    }
    workingMode.set(key, mode);

    const first = check(call.schema, reply.text, call.schemaName);
    if (first.ok) return { data: first.data, usage: reply.usage };
    // A malformed or runaway reply is usually a one-off: ask once more before giving up.
    console.warn(`[questory] ${first.message} Retrying once.`);
    const retry = await send(mode);
    const usage = addUsage(reply.usage, retry.usage);
    const second = check(call.schema, retry.text, call.schemaName);
    if (second.ok) return { data: second.data, usage };
    // Still too long: clip the long fields rather than fail the player's turn.
    const clipped = salvage(call.schema, second) ?? salvage(call.schema, first);
    if (clipped) {
      console.warn(`[questory] ${call.schemaName}: clipped over-long fields after a second long reply.`);
      return { data: clipped, usage };
    }
    throw new Error(second.message);
  }
  throw new Error(`${call.model} would not return JSON for ${call.schemaName}.`);
}

/** A reply cut off at the token cap is usually a one-off, so it gets one more try. */
async function retryIfCutOff<R>(send: () => Promise<R>): Promise<R> {
  try {
    return await send();
  } catch (error) {
    if (!(error instanceof CutOffError)) throw error;
    console.warn(`[questory] ${error.message} Retrying once.`);
    return send();
  }
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
      throw new CutOffError(
        `The ${call.schemaName} reply was cut off (${reason}). If this keeps happening, raise max_output_tokens or lower the reasoning effort.`,
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
