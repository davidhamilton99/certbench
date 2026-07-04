/**
 * Fisher-Yates shuffle an array, returning the shuffled result
 * and a mapping from new indices back to original indices.
 *
 * toOriginal[shuffledIndex] = originalIndex
 *
 * NOTE: non-deterministic (Math.random). For resumable quiz contexts use
 * seededPermutation() from ./shuffle instead; this stays for one-shot
 * displays that don't need to survive a refresh.
 */
export function shuffleArray<T>(arr: T[]): {
  shuffled: T[];
  toOriginal: number[];
} {
  const indices = arr.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    shuffled: indices.map((i) => arr[i]),
    toOriginal: indices,
  };
}
