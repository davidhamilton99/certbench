import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.gen";
import { publicEnv, serverEnv } from "@/env";
import type { Db } from "./server";
import { fetchWithTimeLimit } from "./time-limit";

/**
 * The service-role client. It BYPASSES row-level security, so every use is a
 * place where the code, and not the database, decides who may do what.
 *
 * The call sites, each with the check that stands in for the database's:
 *   - Billing: the Stripe webhook (app/api/stripe/webhook: a verified
 *     signature) and the two checkout routes (app/api/stripe/checkout and
 *     cert-checkout: the signed-in account's own row only). Subscription rows
 *     are written here and nowhere else.
 *   - Enrollment writes (server/services/enrollment-writes.ts): an account can
 *     only read its enrollments, because they decide which exams Pro opens.
 *   - Account deletion (server/services/delete-account.ts): the signed-in
 *     account's own data only.
 *   - The rate limiter (server/rate-limit.ts).
 *   - Email: the daily lifecycle run and the tool study-plan email
 *     (server/services/lifecycle-email.ts, tool-leads.ts), and the unsubscribe
 *     route (app/api/email/unsubscribe: a signed token).
 *   - Testimonials and the story form (server/data/testimonials.ts,
 *     app/api/story, app/story: a signed token; app/api/admin/testimonials and
 *     app/(workspace)/admin/testimonials: after the administrator check).
 *
 * A guard test (src/lib/billing/__tests__/self-service-writes.test.ts) fails
 * if subscription rows are written with any other client. Never pass this
 * client into a function that serves an ordinary request for a user's data.
 */
export function createAdminClient(): Db {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // Every request has a time limit: see ./time-limit.
      global: { fetch: fetchWithTimeLimit() },
    }
  );
}
