/** Shared visual tokens for the readiness share card (OG image + HTML page). */

export interface Band {
  label: string;
  color: string;
}

/** Dignified band labels + refined (not neon) status colors. */
export function readinessBand(score: number): Band {
  if (score >= 75) return { label: "Exam ready", color: "#2FBF71" };
  if (score >= 40) return { label: "On track", color: "#E0A32E" };
  return { label: "Getting started", color: "#E5484D" };
}

/** Deep, cool, professional palette — matches the app's dark theme. */
export const CARD = {
  bg: "#0B0D12",
  panel: "#12151C",
  track: "#1B1F2A",
  border: "#22262F",
  text: "#F4F4F5",
  sub: "#9CA3AF",
  muted: "#6B7280",
  brand: "#2563EB",
} as const;

export function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max - 1).trimEnd() + "…" : value;
}
