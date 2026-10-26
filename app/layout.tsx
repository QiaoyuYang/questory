import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Barlow takes its shapes from California highway signs: the voice of the game's signage.
const barlow = localFont({
  src: [
    { path: "./fonts/barlow-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/barlow-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/barlow-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/barlow-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = localFont({
  src: [
    { path: "./fonts/barlow-condensed-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/barlow-condensed-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
});

// Literata is a book face: the voice of the game master.
const literata = localFont({
  src: [
    { path: "./fonts/literata-latin-wght-normal.woff2", weight: "200 900", style: "normal" },
    { path: "./fonts/literata-latin-wght-italic.woff2", weight: "200 900", style: "italic" },
  ],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Questory",
  description: "Take a photo of where you are. A game master turns your walk into a story.",
  applicationName: "Questory",
  appleWebApp: { capable: true, title: "Questory", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#1e2227",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
