import type { NextConfig } from "next";

// Hosts that may load the dev server besides localhost: private network addresses, so a
// phone on the same Wi-Fi can play. Next.js blocks other hosts from its dev resources, and
// without them the page never finishes loading. This has no effect on production builds.
const PRIVATE_NETWORK_HOSTS = [
  "192.168.*.*",
  "10.*.*.*",
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  "*.local",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: PRIVATE_NETWORK_HOSTS,
  // Every corner of the phone layout holds a control. Errors still show without the badge.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
