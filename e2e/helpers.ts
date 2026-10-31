import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const E2E_EMAIL_PREFIX = "david.nash.hamilton+e2e-";
export const E2E_PASSWORD = "e2e-Certbench!2026";

export function e2eEmail(tag: string): string {
  return `${E2E_EMAIL_PREFIX}${tag}-${Date.now()}@gmail.com`;
}

/** Service-role admin client for e2e setup. Throws if no service key. */
function e2eAdmin() {
  const env = loadLocalEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("e2e setup needs SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Grants an e2e account an active Pro subscription directly, standing in for
 * Stripe checkout. The signed-in app is Pro-only (the paywall gate in
 * src/server/supabase/middleware.ts bounces non-Pro users to /upgrade), so any
 * spec that exercises the app past onboarding needs this. Prefix-guarded; the
 * row cascades away with the account at teardown.
 */
export async function grantPro(email: string): Promise<void> {
  if (!email.startsWith(E2E_EMAIL_PREFIX)) {
    throw new Error(`refusing to grant Pro to non-e2e account: ${email}`);
  }
  const admin = e2eAdmin();
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = data?.users.find((u) => u.email === email);
  if (!user) throw new Error(`e2e user not found: ${email}`);
  const { error } = await admin
    .from("user_subscriptions")
    .upsert({ user_id: user.id, plan: "pro", status: "active" }, { onConflict: "user_id" });
  if (error) throw error;
}

/**
 * Picks the exam on /start (where a new account lands) and opens its guided
 * path, then makes it the account's exam the way the path does at its first
 * goal question — so the Pro workspace has an enrolled exam to open.
 */
export async function pickExam(page: Page, cert: RegExp): Promise<void> {
  await page.waitForURL("**/start**");
  await page.getByRole("link", { name: cert }).first().click();
  await page.waitForURL("**/path/**");
  const slug = new URL(page.url()).pathname.split("/").pop();
  const res = await page.request.post("/api/path/enroll", { data: { cert: slug, examDate: null } });
  if (!res.ok()) throw new Error(`enroll failed for ${slug}: ${res.status()}`);
}

/**
 * Full setup shared by every app-exercising spec: register, confirm, sign in,
 * pick the exam, grant Pro, and land on the dashboard. Returns the account
 * email. Requires a service role (same as confirmE2eEmail).
 */
export async function registerOnboardPro(
  page: Page,
  opts: { tag: string; cert: RegExp }
): Promise<string> {
  const email = e2eEmail(opts.tag);

  await page.goto("/register");
  await page.fill("#displayName", `E2E ${opts.tag}`);
  await page.fill("#email", email);
  await page.fill("#password", E2E_PASSWORD);
  await page.click('button[type="submit"]');

  // With email confirmation ON, signup lands on /verify (confirm + sign in).
  // With it OFF, signup returns a live session and lands on the exam picker.
  // Handle both so the suite passes regardless of the Supabase setting.
  await page.waitForURL((url) => /\/(verify|start)/.test(url.pathname));
  if (new URL(page.url()).pathname.startsWith("/verify")) {
    await confirmE2eEmail(email);
    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", E2E_PASSWORD);
    await page.click('button[type="submit"]');
    // Without Pro, the proxy sends a signed-in account to the exam picker.
    await page.waitForURL("**/start**");
  }

  await pickExam(page, opts.cert);

  await grantPro(email);

  await page.goto("/dashboard");
  await page.waitForURL("**/dashboard");

  return email;
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
