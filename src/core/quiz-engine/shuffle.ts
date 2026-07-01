/**
 * Deterministic, seeded shuffling for quiz option order.
 *
 * Seed = attemptId (or study-set progress key), so a resumed session —
 * same device or another one — reproduces exactly the same option order.
 */

/** FNV-1a 32-bit hash of a string — cheap, stable seed derivation. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 PRNG — small, fast, good enough distribution for shuffling. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a permutation of [0..length) — `permutation[displayPos] = originalIndex`.
 * Deterministic for a given (seed, scope) pair; scope is typically the
 * question id so each question gets an independent order.
 */
export function seededPermutation(
  seed: string,
  scope: string,
  length: number
): number[] {
  const rng = mulberry32(fnv1a(`${seed}:${scope}`));
  const permutation = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  return permutation;
}
