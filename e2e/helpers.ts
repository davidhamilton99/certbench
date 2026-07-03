import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

export const E2E_EMAIL_PREFIX = "david.nash.hamilton+e2e-";
export const E2E_PASSWORD = "e2e-Certbench!2026";

export function e2eEmail(tag: string): string {
  return `${E2E_EMAIL_PREFIX}${tag}-${Date.now()}@gmail.com`;
}

/**
 * Marks a just-created e2e account as email-confirmed so password sign-in
 * works without a mailbox round-trip. Only touches accounts the suite
 * created (prefix-guarded).
 */
export async function confirmE2eEmail(email: string): Promise<void> {
  if (!email.startsWith(E2E_EMAIL_PREFIX)) {
    throw new Error(`refusing to confirm non-e2e account: ${email}`);
  }
  const env = loadLocalEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("confirmE2eEmail needs SUPABASE_SERVICE_ROLE_KEY");
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = data?.users.find((u) => u.email === email);
  if (!user) throw new Error(`e2e user not found: ${email}`);
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  if (error) throw error;
}

/** Reads .env.local so specs/teardown can use the service role locally. */
export function loadLocalEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  try {
    const raw = readFileSync(resolve(".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  } catch {
    // no .env.local (CI against a deployment) — fine
  }
  return env;
}
