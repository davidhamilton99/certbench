/**
 * Simple in-memory sliding-window rate limiter.
 * Works per-process — fine for single-instance deployments.
 * For multi-instance, swap to Redis/Upstash.
 */

interface RateLimitEntry {
  timestamps: number[];
  windowMs: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter(
      (t) => now - t < entry.windowMs
    );
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 300_000);

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (e.g. `${userId}:${action}`)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { limited: boolean, remaining: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [], windowMs };
    store.set(key, entry);
  } else {
    entry.windowMs = windowMs;
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    return { limited: true, remaining: 0 };
  }

  entry.timestamps.push(now);
  return { limited: false, remaining: limit - entry.timestamps.length };
}
