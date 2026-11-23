import { BAND_HEX, OG } from "@/lib/og/mark";
import { bandFor } from "@/lib/readiness/band";

/** Shared visual tokens for the readiness share card (OG image + HTML page). */

export interface Band {
  label: string;
  color: string;
}

/**
 * The band a shared score falls into. The words and the thresholds are
 * `bandFor`'s, so a score is described on the card as it is on the site. The
 * card sets the score and its bar in one colour, so it takes the band's ink,
 * which reads as text on paper (amber's fill is too pale for words).
 */
export function readinessBand(score: number): Band {
  const band = bandFor(score);
  return { label: band.long, color: BAND_HEX[band.key].ink };
}

/** Paper and ink: the card is a score report, the same in a feed as on the site. */
export const CARD = {
  bg: OG.paper,
  panel: OG.tint,
  track: OG.track,
  border: OG.rule,
  text: OG.ink,
  sub: OG.muted,
  muted: OG.muted,
  brand: OG.primary,
} as const;

export function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max - 1).trimEnd() + "…" : value;
}
