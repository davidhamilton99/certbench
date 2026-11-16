/**
 * Seeded shuffles for PBQ players. Deterministic on purpose: the same seed
 * gives the same order on the server and the client, so a shuffled list
 * hydrates without a mismatch. (A Math.random() shuffle differs between SSR
 * and hydration, which makes React throw away the server markup and
 * re-render, a visible flash.)
 */

/** Deterministic string → 32-bit seed (FNV-1a), so a scenario shuffles the same every time. */
export function seedFromString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates over 0..length-1, seeded, and never the identity order: a list
 * written in its answer order is always shown in some other order.
 */
export function shuffleSeeded(length: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // If the shuffle happened to produce the identity (correct) order, swap the first two.
  const isIdentity = indices.every((v, i) => v === i);
  if (isIdentity && indices.length > 1) {
    [indices[0], indices[1]] = [indices[1], indices[0]];
  }
  return indices;
}
