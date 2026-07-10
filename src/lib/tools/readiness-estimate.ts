/**
 * Pure scoring for the public no-signup readiness check. Deliberately
 * simple and clearly labelled an ESTIMATE — the real readiness score uses
 * the full diagnostic plus ongoing performance with confidence penalties.
 */

export interface CheckAnswer {
  domainTitle: string;
  examWeight: number;
  correct: boolean;
}

/** One question in the public readiness check (shared client/server shape). */
export interface CheckQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  domainTitle: string;
  examWeight: number;
}

export interface DomainEstimate {
  domainTitle: string;
  correct: number;
  total: number;
  pct: number;
}

export interface ReadinessEstimate {
  /** 0–100, exam-weighted across the domains that were sampled. */
  score: number;
  band: "ready" | "close" | "start";
  domains: DomainEstimate[];
}

/** Weighted estimate across sampled domains (weights renormalized). */
export function estimateReadiness(answers: CheckAnswer[]): ReadinessEstimate {
  const byDomain = new Map<string, { weight: number; correct: number; total: number }>();
  for (const a of answers) {
    const d = byDomain.get(a.domainTitle) ?? {
      weight: a.examWeight,
      correct: 0,
      total: 0,
    };
    d.total += 1;
    if (a.correct) d.correct += 1;
    byDomain.set(a.domainTitle, d);
  }

  let weightSum = 0;
  let weighted = 0;
  const domains: DomainEstimate[] = [];
  for (const [title, d] of byDomain) {
    const pct = d.total > 0 ? (d.correct / d.total) * 100 : 0;
    weightSum += d.weight;
    weighted += pct * d.weight;
    domains.push({
      domainTitle: title,
      correct: d.correct,
      total: d.total,
      pct: Math.round(pct),
    });
  }

  const score = weightSum > 0 ? Math.round(weighted / weightSum) : 0;
  return {
    score,
    band: score >= 75 ? "ready" : score >= 40 ? "close" : "start",
    domains,
  };
}

/**
 * Allocate `total` question slots across domains proportional to exam
 * weight (largest-remainder method), every domain guaranteed ≥1 slot.
 */
export function allocateSlots(
  weights: number[],
  total: number
): number[] {
  const n = weights.length;
  if (n === 0) return [];
  if (total <= n) return weights.map((_, i) => (i < total ? 1 : 0));

  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  // Reserve one slot per domain, distribute the rest by weight.
  const spare = total - n;
  const exact = weights.map((w) => (w / weightSum) * spare);
  const base = exact.map(Math.floor);
  let used = base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (used >= spare) break;
    base[i] += 1;
    used += 1;
  }
  return base.map((b) => b + 1);
}
