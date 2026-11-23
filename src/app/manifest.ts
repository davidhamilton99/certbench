import type { MetadataRoute } from "next";

/**
 * What a phone or a desktop uses when someone keeps CertBench on a home screen
 * or a taskbar: its name, its icons (the plain tile, and the full-bleed
 * "maskable" tile a launcher may crop to its own shape) and the navy of the
 * band at the top of every page. The page still opens in the browser.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CertBench",
    short_name: "CertBench",
    description: "A study program for the CompTIA Security+, Network+ and A+ exams.",
    // Opens the study path of the exam already begun, or the list of exams.
    start_url: "/start",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#0c2a55",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
