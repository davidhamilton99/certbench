import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.gen";
import { publicEnv, serverEnv } from "@/env";
import type { Db } from "./server";

/**
 * Service-role client — BYPASSES Row-Level Security.
 *
 * Permitted call sites only:
 *   - Stripe webhook sync (server/services/stripe-webhook.ts)
 *   - Rate limiter RPC (server/rate-limit.ts)
 *   - Admin flag actions
 *   - Account deletion / e2e teardown
 *
 * Never pass this client into repository functions that serve user requests.
 */
export function createAdminClient(): Db {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
