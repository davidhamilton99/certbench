import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  E2E_PASSWORD,
  confirmE2eEmail,
  e2eEmail,
  loadLocalEnv,
} from "./helpers";

/**
 * SRS: complete a short history, backdate the cards via the service role,
 * then review one card and confirm rescheduling. Skips when no service key
 * is available (e.g. running against a deployment without local env).
 */
test("srs review reschedules an overdue card", async ({ page }) => {
  const env = loadLocalEnv();
  test.skip(
    !env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY,
    "needs service role for card backdating"
  );

  const email = e2eEmail("srs");
  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ---- Register + onboard ----
  await page.goto("/register");
  await page.fill("#displayName", "E2E SRS");
  await page.fill("#email", email);
  await page.fill("#password", E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/verify");
  await confirmE2eEmail(email);
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/onboarding");
  await page.getByRole("radio", { name: /Security\+/ }).click();
  await page.getByRole("button", { name: "Start studying" }).click();
  await page.waitForURL("**/dashboard");

  // ---- Build history: run the diagnostic quickly ----
  await page.getByRole("link", { name: /Take Your Diagnostic/i }).click();
  await page.waitForURL("**/diagnostic");
  const next = page.getByRole("button", { name: "Next", exact: true });
  for (let i = 0; i < 25; i++) {
    await expect(page.locator('[role="radio"]').first()).toBeVisible();
    await page.locator('[role="radio"]').first().click();
    if (i < 24) await next.click();
  }
  await page.getByRole("button", { name: "Finish diagnostic" }).click();
  await expect(page.getByText("Diagnostic complete")).toBeVisible({
    timeout: 30_000,
  });

  // ---- Backdate this user's cards so they're due now ----
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = users?.users.find((u) => u.email === email);
  expect(user).toBeTruthy();
  const { error } = await admin
    .from("question_performance")
    .update({ srs_next_review_at: new Date(Date.now() - 3600_000).toISOString() })
    .eq("user_id", user!.id);
  expect(error).toBeNull();

  // ---- Review one card ----
  await page.goto("/certifications/security-plus-sy0-701/srs");
  await expect(page.locator('[role="radio"]').first()).toBeVisible({
    timeout: 20_000,
  });
  await page.locator('[role="radio"]').first().click();
  await expect(page.getByText(/Next review in \d+ day/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("button", { name: /Next card|Finish session/ })
  ).toBeVisible();
});
