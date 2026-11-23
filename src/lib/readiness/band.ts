import type { CSSProperties } from "react";
import { READINESS_THRESHOLDS } from "@/core/constants";
import { getScoreColor } from "@/core/readiness/compute-score";

/** The score, as a percentage, at which CertBench calls a learner ready for the exam. */
export const READINESS_TARGET = READINESS_THRESHOLDS.GREEN;

/**
 * The readiness band system — the single source of truth for turning a score
 * into a label and the colour its bar is drawn in on every score report. Band
 * boundaries defer to the app-wide {@link getScoreColor} thresholds (ready ≥
 * 75, close ≥ 40) so the checkpoint, the practice exam and everything else
 * agree on where the lines are.
 *
 * Colours are the theme's own mark colours (CSS variables), so a band reads on
 * paper and on dark paper alike.
 */
export type BandKey = "work" | "close" | "ready" | "building";

export interface Band {
  key: BandKey;
  /** The band in two or three words, beside a score: "Target met". */
  label: string;
  /** The band as a clause that names the target, for a sentence or a card: "Readiness target met". */
  long: string;
  /** The bar's fill. */
  accent: string;
  /** The same colour as text on the page (the amber fill is too pale to read). */
  ink: string;
  accent2: string;
  soft: string;
  dim: string;
}

const tone = (name: string, ink = name): Pick<Band, "accent" | "ink" | "accent2" | "soft" | "dim"> => ({
  accent: `var(--${name})`,
  ink: `var(--${ink})`,
  accent2: `var(--${name})`,
  soft: `color-mix(in oklab, var(--${name}) 45%, transparent)`,
  dim: `color-mix(in oklab, var(--${name}) 14%, transparent)`,
});

/**
 * Neutral "building" treatment for a confidence-penalised preliminary score —
 * a small sample can read low even for a strong performer, so we show a calm
 * "baseline in progress" in the page's own ink instead of "Below target".
 */
export const BUILDING_BAND: Band = {
  key: "building",
  label: "Baseline in progress",
  long: "Baseline in progress",
  ...tone("primary"),
};

const BANDS: Record<Exclude<BandKey, "building">, Band> = {
  work: { key: "work", label: "Below target", long: "Below the readiness target", ...tone("destructive") },
  close: {
    key: "close",
    label: "Approaching target",
    long: "Approaching the readiness target",
    ...tone("warning", "warning-ink"),
  },
  ready: { key: "ready", label: "Target met", long: "Readiness target met", ...tone("success") },
};

const COLOR_TO_BAND: Record<
  ReturnType<typeof getScoreColor>,
  Exclude<BandKey, "building">
> = {
  danger: "work",
  warning: "close",
  success: "ready",
};

/**
 * The band a score falls into. Every surface that describes a score (a page,
 * an email, a shared card) asks this function and uses its words, so the same
 * score is never described two ways and the thresholds live in one place.
 */
export function bandFor(score: number): Band {
  return BANDS[COLOR_TO_BAND[getScoreColor(score)]];
}

/** CSS custom properties to spread onto a score report's root. */
export function bandVars(band: Band): CSSProperties {
  return {
    "--rv-accent": band.accent,
    "--rv-accent-ink": band.ink,
    "--rv-accent-2": band.accent2,
    "--rv-accent-soft": band.soft,
    "--rv-accent-dim": band.dim,
  } as CSSProperties;
}
