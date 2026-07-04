import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.gen";
import { publicEnv } from "@/env";

/**
 * Browser Supabase client — auth UI only (sign in/up/out, OAuth, password
 * reset). All data reads/writes happen server-side; client components never
 * query tables directly.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
