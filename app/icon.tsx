import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/AppIconArt";

const SIDES = [192, 512];

export function generateImageMetadata() {
  return SIDES.map((side) => ({ id: String(side), size: { width: side, height: side }, contentType: "image/png" }));
}

/** Icons for installing the app. The manifest points at both sizes. */
export default async function Icon({ id }: { id: Promise<string | number> }) {
  const side = Number(await id);
  return new ImageResponse(<AppIconArt side={side} />, { width: side, height: side });
}
