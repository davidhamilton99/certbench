import "server-only";

import { afterResponse } from "@/server/api/after-response";
import { reportServerError, type ErrorPlace } from "@/server/api/report-error";
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
 * log, and reported, once for each server instance, not once for each request.
 */
let saidClientMissing = false;

/**
 * The limiter, as an error report names it. The key it was asked about is
 * never part of a report: it holds an account's id or a visitor's address.
 */
const LIMITER: ErrorPlace = { route: "service:rate-limit", kind: "service" };

/**
 * A limiter that cannot do its work fails in the same way for every request
 * it is asked about. One report a minute for each server instance tells the
 * owner that requests are not being limited; one event for every request
 * would say nothing more. The log still has a line for each failure.
 */
const REPORT_INTERVAL_MS = 60_000;
let lastReportAt = Number.NEGATIVE_INFINITY;

/**
 * Reports that a request was let through unlimited, as a `server_error`, once
 * the response has gone: nobody waits for the report. It says only why, in
 * words of its own. The database's words stay in the log, because they can
 * hold the key.
 */
function reportOpen(why: string): void {
  const now = Date.now();
  if (now - lastReportAt < REPORT_INTERVAL_MS) return;
  lastReportAt = now;
  afterResponse(() => reportServerError(new Error(`The rate limiter let a request through: ${why}.`), LIMITER));
}

/**
 * Postgres-backed fixed-window limiter using the check_rate_limit() function
 * from migration 020. Atomic across all serverless instances; the table is
 * RLS-locked so only the service role can touch it.
 *
 * Fails open: a limiter that cannot do its work must not take the product
 * down. That covers a database call that fails or runs out of time, and a
 * deployment whose service role key is missing (the client cannot even be
 * built). Each of those is written to the log and reported to the owner as a
 * `server_error`, because an endpoint without its limit looks the same from
 * outside as one with it.
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
        reportOpen("its database client could not be built");
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
        reportOpen("its database call answered with an error");
        return true;
      }
      return data === true;
    } catch (err) {
      console.error("rate limiter error:", err instanceof Error ? err.message : err);
      reportOpen("its database call failed");
      return true;
    }
  },
};
