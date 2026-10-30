import type { Metadata } from "next";

export const GITHUB_URL = "https://github.com/QiaoyuYang/questory";

export const SITE_DESCRIPTION =
  "Turn photos of your street into a story. An AI agent builds a case from what you photograph, and every case is solved on foot.";

const PREVIEW_IMAGE = {
  url: "/link-preview.png",
  width: 1200,
  height: 630,
  alt: "Questory: turn photos of your street into a story. Two phone screens show a street photo opening a case, and the same photo painted as a piece of evidence.",
};

/**
 * What a shared link to a page shows. A page's own openGraph replaces the layout's whole,
 * so every page gives all of it, picture included.
 */
export function linkPreview(title: string, description: string): Pick<Metadata, "openGraph"> {
  return { openGraph: { type: "website", siteName: "Questory", title, description, images: [PREVIEW_IMAGE] } };
}
