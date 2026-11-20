import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.gen";

// NEXT_PUBLIC_* values are inlined at build time. They're read here directly,
// not through `publicEnv` in src/env.ts: that runs a zod schema, and importing
// it put zod (~250 KB of script) on every public page just to check two strings.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client — auth UI only (sign in/up/out, OAuth, password
 * reset). All data reads/writes happen server-side; client components never
 * query tables directly.
 */
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
