import "server-only";
import { ModelApiError, postJson } from "./http";

type ImageOptions = {
  baseURL: string;
  apiKey: string;
  model: string;
  /** "low" trades some quality for speed; empty uses the API default. */
  reasoningStrength?: string;
};

type ImagesResult = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

function sniffMime(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return "application/octet-stream";
}

/** Muse Image turned the prompt down on content grounds, rather than failing to draw. */
export function refusedOnContent(error: unknown): boolean {
  return error instanceof ModelApiError && error.status === 400 && error.body.includes("content_policy_violation");
}

/**
 * Paint over a photo with Muse Image (POST /v1/images/edits).
 * Returns the edited image bytes.
 */
export async function editPhoto(
  photo: { bytes: Uint8Array; mime: string },
  prompt: string,
  size: { width: number; height: number },
  options: ImageOptions,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const form = new FormData();
  form.set("model", options.model);
  form.set("prompt", prompt);
  form.set("image", new Blob([photo.bytes as BlobPart], { type: photo.mime }), "photo.jpg");
  // On this endpoint `size` sets the aspect ratio, not exact pixels.
  form.set("size", `${size.width}x${size.height}`);
  form.set("response_format", "b64_json");
  if (options.reasoningStrength) form.set("reasoning_strength", options.reasoningStrength);

  const result = await postJson<ImagesResult>("/images/edits", {
    baseURL: options.baseURL,
    apiKey: options.apiKey,
    form,
    timeoutMs: 150_000,
    retries: 1,
  });

  const first = result.data?.[0];
  if (first?.b64_json) {
    const bytes = Uint8Array.from(Buffer.from(first.b64_json, "base64"));
    return { bytes, mime: sniffMime(bytes) };
  }
  if (first?.url) {
    const response = await fetch(first.url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Could not download the edited image (${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { bytes, mime: response.headers.get("content-type") ?? sniffMime(bytes) };
  }
  throw new Error("Muse Image returned no image.");
}
