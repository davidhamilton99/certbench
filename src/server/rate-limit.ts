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
 * A deployment without its service role key cannot build the limiter's client
 * at all. That does not mend itself between requests, so it is written to the
 * log once for each server instance, not once for each request.
 */
let saidClientMissing = false;

/**
 * Postgres-backed fixed-window limiter using the check_rate_limit() function
 * from migration 020. Atomic across all serverless instances; the table is
 * RLS-locked so only the service role can touch it.
 *
 * Fails open: a limiter that cannot do its work must not take the product
 * down. That covers a database call that fails or runs out of time, and a
 * deployment whose service role key is missing (the client cannot even be
 * built). Each of those is written to the log.
 *
 * Swappable: replace this object (e.g. with @upstash/ratelimit) without
 * touching call sites.
 */
export const rateLimiter: RateLimiter = {
  async check(key, { limit, windowSeconds }) {
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch (err) {
      if (!saidClientMissing) {
        saidClientMissing = true;
        console.error(
          "rate limiter error: requests are not being limited.",
          err instanceof Error ? err.message : err
        );
      }
      return true;
    }
    try {
      const { data, error } = await admin.rpc("check_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (error) {
        console.error("rate limiter error:", error.message);
        return true;
      }
      return data === true;
    } catch (err) {
      console.error("rate limiter error:", err instanceof Error ? err.message : err);
      return true;
    }
  },
};
