import type { CSSProperties } from "react";
import { getScoreColor } from "@/core/readiness/compute-score";

/**
 * The readiness band system — the single source of truth for turning a score
 * into a label + the instrument accent that carries the emotion across the
 * CertBench 2.0 surfaces (dials, bars, chips). Band boundaries defer to the
 * app-wide {@link getScoreColor} thresholds (ready ≥ 75, close ≥ 40) so the
 * reveal, the dashboard and everything else agree on where the lines are.
 */
export type BandKey = "work" | "close" | "ready";

export interface Band {
  key: BandKey;
  label: string;
  /** Instrument accent stops, tuned for the dark reveal stage. */
  accent: string;
  accent2: string;
  soft: string;
  dim: string;
}

const BANDS: Record<BandKey, Band> = {
  work: {
    key: "work",
    label: "Needs work",
    accent: "#fb7185",
    accent2: "#fecdd3",
    soft: "rgba(251, 113, 133, 0.45)",
    dim: "rgba(251, 113, 133, 0.14)",
  },
  close: {
    key: "close",
    label: "Getting close",
    accent: "#fbbf24",
    accent2: "#fde68a",
    soft: "rgba(251, 191, 36, 0.45)",
    dim: "rgba(251, 191, 36, 0.14)",
  },
  ready: {
    key: "ready",
    label: "Exam ready",
    accent: "#34d399",
    accent2: "#a7f3d0",
    soft: "rgba(52, 211, 153, 0.45)",
    dim: "rgba(52, 211, 153, 0.14)",
  },
};

const COLOR_TO_BAND: Record<ReturnType<typeof getScoreColor>, BandKey> = {
  danger: "work",
  warning: "close",
  success: "ready",
};

/** The band a score falls into. */
export function bandFor(score: number): Band {
  return BANDS[COLOR_TO_BAND[getScoreColor(score)]];
}

/** CSS custom properties to spread onto an instrument stage root. */
export function bandVars(band: Band): CSSProperties {
  return {
    "--rv-accent": band.accent,
    "--rv-accent-2": band.accent2,
    "--rv-accent-soft": band.soft,
    "--rv-accent-dim": band.dim,
  } as CSSProperties;
}
