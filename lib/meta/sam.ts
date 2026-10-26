import "server-only";
import {
  decodeMaskToSVGPath,
  parseImageStream,
  recordsOfKind,
  type ResponsesEvent,
} from "@meta-sam/parser";
import type { TargetOverlay } from "@/lib/types";
import { postJson } from "./http";
import { outlineInPhotoSpace } from "./outline";
import { responseText } from "./structured";

type SamOptions = {
  baseURL: string;
  apiKey: string;
  model: string;
};

async function* asEvents(text: string): AsyncIterable<ResponsesEvent> {
  const lane = { item_id: "sam", output_index: 0, content_index: 0 };
  yield { type: "response.output_text.delta", delta: text, ...lane };
  yield { type: "response.output_text.done", text, ...lane };
  yield { type: "response.completed" };
}

/**
 * Find `phrase` in the photo with SAM 3.1 and return the best match as a box
 * plus an SVG outline in the photo's pixel space. Returns null when nothing matches.
 *
 * `phrase` must be a short noun phrase ("red door"), not an instruction.
 */
export async function locateTarget(
  photoDataUrl: string,
  size: { width: number; height: number },
  phrase: string,
  options: SamOptions,
): Promise<TargetOverlay | null> {
  const result = await postJson<Parameters<typeof responseText>[0]>("/responses", {
    baseURL: options.baseURL,
    apiKey: options.apiKey,
    timeoutMs: 30_000,
    retries: 1,
    json: {
      model: options.model,
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: phrase },
            { type: "input_image", image_url: photoDataUrl },
          ],
        },
      ],
      metadata: { include_confidence: "true" },
    },
  });

  const parsed = await parseImageStream(asEvents(responseText(result))).finalResult;
  const masks = recordsOfKind(parsed.records, "mask");
  if (masks.length === 0) return null;

  const best = [...masks].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
  const { bounds, mask } = best;
  const rawPath = decodeMaskToSVGPath(mask);
  let outline: TargetOverlay["outline"] = null;
  if (rawPath) {
    const inPhoto = outlineInPhotoSpace(rawPath, bounds, mask);
    const scaleX = (bounds.right - bounds.left) / mask.width;
    const scaleY = (bounds.bottom - bounds.top) / mask.height;
    outline = inPhoto
      ? { path: inPhoto, transform: "" }
      : {
          path: rawPath,
          transform: `translate(${bounds.left} ${bounds.top}) scale(${scaleX.toFixed(5)} ${scaleY.toFixed(5)})`,
        };
  }

  return {
    phrase,
    width: size.width,
    height: size.height,
    box: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
    confidence: best.confidence ?? null,
    outline,
  };
}
