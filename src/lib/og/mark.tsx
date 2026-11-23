import type { BandKey } from "@/lib/readiness/band";

/**
 * The CertBench mark for generated images (next/og): the same bench mark as the
 * site's Logo (a level bar, and a broad arrow pointing up to it), drawn with
 * inline SVG because image rendering has no stylesheet. `color` is the ink.
 */
export function OgMark({ size = 56, color = "#ffffff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M3.5 6.6h21" stroke={color} strokeWidth="2.8" />
      <path
        d="M14 8.6v14.2M14 8.6 7.55 21.25M14 8.6l6.45 12.65"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The site's colours as plain hex: the one table for everything that cannot
 * read the stylesheet (generated images, the shared score card, emails). Each
 * value is a light-theme token of src/app/globals.css converted to sRGB. The
 * test beside this file converts the tokens again and compares, so the table
 * cannot drift from the site. Type a colour here and nowhere else.
 */
export const OG = {
  /** The navy band (`--sheet`), and white type on it. */
  sheet: "#0c2a55",
  sheetText: "#ffffff",
  sheetMuted: "rgba(255,255,255,0.78)",
  sheetLine: "rgba(255,255,255,0.55)",
  /** Paper (`--background`) and ink (`--foreground`). */
  paper: "#ffffff",
  ink: "#111826",
  /** Captions and notes (`--muted-foreground`). */
  muted: "#4f5766",
  /** A hairline (`--border`). */
  rule: "#d6d9df",
  /** The edge of a control: a field, an outlined button (`--input`). */
  control: "#838996",
  /** Anything that can be pressed (`--primary`). */
  primary: "#13509e",
  /** The desk a sheet of paper lies on (`--surface`). */
  desk: "#f5f7f9",
  /** A tinted panel on paper (`--muted`). */
  tint: "#f1f4f8",
  /** The unfilled part of a bar: the ink at 9% on paper, as the site's bars draw it. */
  track: "#eaeaeb",
  /**
   * The three marks on a score (`--success`, `--warning`, `--danger`). Amber
   * is too pale to read as text, so text takes `warningInk` (`--warning-ink`).
   */
  success: "#0c693f",
  warning: "#ae7b28",
  warningInk: "#754f19",
  danger: "#a52a26",
} as const;

/**
 * A score's band in plain hex: `fill` for its bar and `ink` for its words.
 * The two differ only for amber. The band itself, its thresholds and its
 * words come from `bandFor` (src/lib/readiness/band.ts); this is only its
 * colour where the stylesheet cannot be read.
 */
export const BAND_HEX: Record<BandKey, { fill: string; ink: string }> = {
  ready: { fill: OG.success, ink: OG.success },
  close: { fill: OG.warning, ink: OG.warningInk },
  work: { fill: OG.danger, ink: OG.danger },
  building: { fill: OG.primary, ink: OG.primary },
};
