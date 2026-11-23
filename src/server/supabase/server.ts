import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.gen";
import { publicEnv } from "@/env";
import { fetchWithTimeLimit } from "./time-limit";

export type Db = SupabaseClient<Database>;

/**
 * Cookie-bound, RLS-scoped Supabase client for Server Components and
 * route handlers. This is the default client — all user-facing reads
 * and writes go through it so RLS policies always apply.
 */
export async function createClient(): Promise<Db> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      // Every request has a time limit: see ./time-limit.
      global: { fetch: fetchWithTimeLimit() },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, which cannot write cookies.
            // Safe to ignore: the proxy refreshes the session ahead of every
            // page a signed-in visitor opens, and a route handler (which
            // can write cookies) does not land here.
          }
        },
      },
    }
  );
}
