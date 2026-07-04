import "server-only";

import { createAdminClient } from "@/server/supabase/admin";

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimiter {
  /** Returns true if the request is allowed, false if over the limit. */
  check(key: string, options: RateLimitOptions): Promise<boolean>;
}

/**
 * Postgres-backed fixed-window limiter using the check_rate_limit() function
 * from migration 020. Atomic across all serverless instances; the table is
 * RLS-locked so only the service role can touch it.
 *
 * Swappable: replace this object (e.g. with @upstash/ratelimit) without
 * touching call sites.
 */
export const rateLimiter: RateLimiter = {
  async check(key, { limit, windowSeconds }) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // Fail open: a broken limiter must not take the product down.
      console.error("rate limiter error:", error.message);
      return true;
    }
    return data === true;
  },
};
