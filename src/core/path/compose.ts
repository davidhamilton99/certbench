import type { ChoiceRep, Rep } from "./types";

export type Rng = () => number;

/** Small seeded PRNG (mulberry32): the same seed always builds the same stop. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable numeric seed from any strings (user, stop, run). */
export function seedFrom(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const ch of parts.join("·")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle a choice rep's options, keeping its answer pointing at the right one. */
export function shuffleOptions(rep: ChoiceRep, rng: Rng): ChoiceRep {
  const order = shuffle(
    rep.options.map((_, i) => i),
    rng
  );
  return {
    ...rep,
    options: order.map((i) => rep.options[i]),
    answer: order.indexOf(rep.answer),
  };
}

export interface StopPools {
  /** Earlier misses, already resolved to reps, oldest first. */
  misses: Rep[];
  /** New reps for this stop, in the order they should be asked. */
  fresh: Rep[];
  /** Candidates for the exam-style rep that closes a learn stop, best first. */
  closers?: Rep[];
}

/**
 * Assemble a stop: up to `maxMisses` earlier misses first (they come back so
 * they stick), then `size` reps from the stop's own pool — ones never seen
 * before first, keeping the pool's order — then one closing exam-style rep.
 * No rep appears twice.
 */
export function composeStop(
  pools: StopPools,
  opts: { size: number; maxMisses: number; seen: ReadonlySet<string> }
): Rep[] {
  const used = new Set<string>();
  const take = (rep: Rep) => {
    if (used.has(rep.id)) return false;
    used.add(rep.id);
    return true;
  };

  const out: Rep[] = [];
  for (const rep of pools.misses) {
    if (out.length >= opts.maxMisses) break;
    if (take(rep)) out.push(rep);
  }

  const unseen = pools.fresh.filter((r) => !opts.seen.has(r.id));
  const seen = pools.fresh.filter((r) => opts.seen.has(r.id));
  let added = 0;
  for (const rep of [...unseen, ...seen]) {
    if (added >= opts.size) break;
    if (take(rep)) {
      out.push(rep);
      added++;
    }
  }

  const closers = pools.closers ?? [];
  const closer =
    closers.find((r) => !opts.seen.has(r.id) && !used.has(r.id)) ??
    closers.find((r) => !used.has(r.id));
  if (closer && take(closer)) out.push(closer);

  return out;
}

/**
 * Spread `total` slots across groups in proportion to their weights (largest
 * remainder), every group with candidates getting at least one when there's
 * room. Used to weight a checkpoint across the exam's domains.
 */
export function allocate(weights: number[], total: number): number[] {
  const n = weights.length;
  if (n === 0 || total <= 0) return weights.map(() => 0);
  if (total <= n) return weights.map((_, i) => (i < total ? 1 : 0));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const spare = total - n;
  const exact = weights.map((w) => (w / sum) * spare);
  const base = exact.map(Math.floor);
  let used = base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (used >= spare) break;
    base[i]++;
    used++;
  }
  return base.map((b) => b + 1);
}
