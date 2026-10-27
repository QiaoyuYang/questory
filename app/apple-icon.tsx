import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/AppIconArt";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The icon an iPhone shows after "Add to Home Screen". */
export default function AppleIcon() {
  return new ImageResponse(<AppIconArt side={size.width} />, size);
}
