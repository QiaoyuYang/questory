import type { MetadataRoute } from "next";

/** Lets the app be added to a phone's home screen and open full screen, like an installed app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Questory",
    short_name: "Questory",
    description: "Take a photo of where you are. A game master turns your walk into a story.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1e2227",
    theme_color: "#1e2227",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
