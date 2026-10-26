import type { PhotoUpload } from "@/lib/types";

const MAX_SIDE = 1280;
const QUALITY = 0.85;

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall through to <img>, which some browsers decode more formats with.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    throw new Error("That photo couldn't be opened. Try taking it again.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Shrink a camera photo to at most 1280px on the long side and re-encode it as JPEG.
 * Smaller photos upload faster on mobile data and cost fewer tokens to read.
 */
export async function preparePhoto(file: File): Promise<PhotoUpload> {
  const image = await decode(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't process photos.");
  context.drawImage(image.source, 0, 0, width, height);
  image.close?.();

  return { photo: canvas.toDataURL("image/jpeg", QUALITY), width, height };
}
