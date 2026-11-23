import "server-only";

import { BAND_HEX, OG } from "@/lib/og/mark";
import type { BandKey } from "@/lib/readiness/band";

/**
 * The site's colours for email. A mail client reads no stylesheet, so an email
 * states each colour as plain hex. Every one comes from the one hex table the
 * generated images use (src/lib/og/mark.tsx), which a test compares with the
 * light-theme tokens of src/app/globals.css. No colour is typed here.
 */
export const EMAIL_COLORS = {
  /** The desk behind the sheet of paper. */
  ground: OG.desk,
  /** The sheet the email is written on. */
  paper: OG.paper,
  ink: OG.ink,
  /** Captions and notes: 7.3 to 1 on paper. */
  muted: OG.muted,
  /** Hairlines, and the unfilled part of a bar. */
  rule: OG.rule,
  /** The band colour of the site's header: the rule over the closing offer. */
  navy: OG.sheet,
  /** Anything that can be pressed: a button, a link. */
  primary: OG.primary,
  onPrimary: OG.paper,
} as const;

/**
 * A score's band colour in an email: `fill` for its bar and `ink` for its
 * label. They differ only for amber, which is too pale to read as text. The
 * band itself, and its words, come from `bandFor` (src/lib/readiness/band.ts).
 */
export const EMAIL_BAND_COLORS: Record<BandKey, { fill: string; ink: string }> = BAND_HEX;
