import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The site's two voices for generated images: STIX Two for headings, IBM Plex
 * Sans for everything else (SIL Open Font License, the same faces as
 * src/app/fonts, as static .woff files because image rendering can't read
 * variable .woff2). Read once per process.
 */
type OgFont = { name: string; data: Buffer; weight: 500 | 600; style: "normal" };

let cached: Promise<OgFont[]> | null = null;

export const OG_SERIF = "STIX Two Text";
export const OG_SANS = "IBM Plex Sans";

export function ogFonts(): Promise<OgFont[]> {
  cached ??= Promise.all([
    readFile(join(process.cwd(), "src/lib/og/fonts/stix-two-text-latin-600.woff")),
    readFile(join(process.cwd(), "src/lib/og/fonts/ibm-plex-sans-latin-500.woff")),
  ]).then(([serif, sans]) => [
    { name: OG_SERIF, data: serif, weight: 600, style: "normal" },
    { name: OG_SANS, data: sans, weight: 500, style: "normal" },
  ]);
  return cached;
}
