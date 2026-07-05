import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.gen";
import { publicEnv } from "@/env";
import type { Db } from "./server";

/**
 * Cookie-free anonymous client for PUBLIC marketing/SEO pages. Unlike the
 * default server client it never touches cookies(), so pages using it stay
 * statically renderable (ISR). Only publicly-readable rows (RLS anon
 * policies) are visible through it — never use it where a user session
 * matters.
 */
export function createAnonClient(): Db {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
