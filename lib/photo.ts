import "server-only";
import type { PhotoUpload } from "@/lib/types";

export class BadRequestError extends Error {}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 4096;

export type Photo = {
  dataUrl: string;
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
};

/** Validate an uploaded photo (a data URL plus its pixel size). */
export function readPhoto(input: Partial<PhotoUpload> | undefined): Photo {
  if (!input || typeof input.photo !== "string") throw new BadRequestError("Add a photo.");
  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(input.photo);
  if (!match) throw new BadRequestError("The photo must be a base64 data URL.");
  const [, mime, base64] = match;
  if (!ALLOWED.has(mime)) throw new BadRequestError("Use a JPEG, PNG or WebP photo.");

  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  if (bytes.byteLength === 0) throw new BadRequestError("The photo is empty.");
  if (bytes.byteLength > MAX_BYTES) throw new BadRequestError("The photo is larger than 8 MB.");

  const width = Math.round(Number(input.width));
  const height = Math.round(Number(input.height));
  if (!(width > 0 && height > 0 && width <= MAX_SIDE && height <= MAX_SIDE)) {
    throw new BadRequestError("Send the photo's width and height in pixels.");
  }
  return { dataUrl: input.photo, bytes, mime, width, height };
}
