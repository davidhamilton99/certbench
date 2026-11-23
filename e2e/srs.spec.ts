import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv, registerOnboardPro } from "./helpers";

/**
 * Spaced review: complete a short history, backdate the questions through the
 * service role, then review one question and confirm that it is scheduled
 * again. The spec is skipped when no service key is available (for example,
 * when it runs against a deployment without the local environment file).
 *
 * The words the spec looks for are the components' own. Where one changes,
 * copy it from the component named beside it.
 */
test("srs review reschedules an overdue card", async ({ page }) => {
  const env = loadLocalEnv();
  test.skip(
    !env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY,
    "needs service role for card backdating"
  );

  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ---- Register + onboard (Pro — the app is Pro-only) ----
  const email = await registerOnboardPro(page, { tag: "srs", cert: /Security\+/ });

  // ---- Build history: run the diagnostic quickly ----
  await page.getByRole("link", { name: /Start the diagnostic/i }).click();
  await page.waitForURL("**/diagnostic");
  const next = page.getByRole("button", { name: "Next", exact: true });
  for (let i = 0; i < 25; i++) {
    await expect(page.locator('[role="radio"]').first()).toBeVisible();
    await page.locator('[role="radio"]').first().click();
    if (i < 24) await next.click();
  }
  // The button's words are DiagnosticClient.tsx's, and the result's heading is
  // ReadinessReveal.tsx's: "You have completed the CompTIA Security+ SY0-701 diagnostic."
  await page.getByRole("button", { name: "Finish the diagnostic", exact: true }).click();
  await expect(page.getByRole("heading", { name: /^You have completed the .+ diagnostic\.$/ })).toBeVisible({
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

  // ---- Review one question (SrsReviewClient.tsx) ----
  // In the review, choosing an answer submits it, so the answers are plain
  // buttons in a group that the question names (MultipleChoice.tsx, `commit`),
  // and not radio buttons as they are in the diagnostic.
  await page.goto("/certifications/security-plus-sy0-701/srs");
  const answers = page.getByRole("group").getByRole("button");
  await expect(answers.first()).toBeVisible({
    timeout: 20_000,
  });
  await answers.first().click();
  await expect(page.getByText(/This question will be shown again in \d+ days?\./)).toBeVisible({
    timeout: 15_000,
  });
  // Nothing moves on by itself: the card waits for "Continue".
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
});
