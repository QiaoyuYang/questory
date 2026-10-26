import "server-only";

export class ModelApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "ModelApiError";
  }
}

type RequestOptions = {
  baseURL: string;
  apiKey: string;
  /** JSON body. Mutually exclusive with `form`. */
  json?: unknown;
  /** Multipart body, for image uploads. */
  form?: FormData;
  timeoutMs?: number;
  retries?: number;
};

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

function backoffMs(attempt: number, retryAfter: string | null): number {
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 20_000);
  const base = 500 * 2 ** attempt;
  return base + Math.random() * base;
}

/**
 * POST to an OpenAI-compatible endpoint (the Meta Model API, or a self-hosted
 * vLLM server). Retries rate limits and transient failures with jittered backoff,
 * honoring Retry-After.
 */
export async function postJson<T>(path: string, options: RequestOptions): Promise<T> {
  const { baseURL, apiKey, json, form, timeoutMs = 90_000, retries = 2 } = options;
  const url = `${baseURL}${path}`;

  for (let attempt = 0; ; attempt++) {
    const headers: Record<string, string> = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    if (json !== undefined) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: form ?? JSON.stringify(json),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs(attempt, null)));
        continue;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new ModelApiError(`Request to ${path} failed: ${reason}`, 0, "");
    }

    if (response.ok) return (await response.json()) as T;

    const body = await response.text();
    if (RETRYABLE.has(response.status) && attempt < retries) {
      await new Promise((r) =>
        setTimeout(r, backoffMs(attempt, response.headers.get("retry-after"))),
      );
      continue;
    }
    let message = body.slice(0, 500);
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // body was not JSON; keep the raw text
    }
    throw new ModelApiError(`${path} returned ${response.status}: ${message}`, response.status, body);
  }
}
