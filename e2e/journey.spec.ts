import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, confirmE2eEmail, e2eEmail } from "./helpers";

/**
 * The critical path: register -> onboarding -> diagnostic (with a mid-exam
 * reload to prove resume) -> results -> dashboard readiness.
 */
test("signup through diagnostic to dashboard readiness", async ({ page }) => {
  const email = e2eEmail("journey");

  // ---- Register ----
  await page.goto("/register");
  await page.fill("#displayName", "E2E Journey");
  await page.fill("#email", email);
  await page.fill("#password", E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/verify");

  // Confirm the account via the admin API (no mailbox round-trip in tests).
  await confirmE2eEmail(email);
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", E2E_PASSWORD);
  await page.click('button[type="submit"]');

  // ---- Onboarding ----
  await page.waitForURL("**/onboarding");
  await page.getByRole("radio", { name: /Security\+/ }).click();
  await page.getByRole("button", { name: "Start studying" }).click();

  // ---- Dashboard shows the diagnostic gate ----
  await page.waitForURL("**/dashboard");
  const diagnosticBlock = page.getByRole("link", {
    name: /Take Your Diagnostic/i,
  });
  await expect(diagnosticBlock).toBeVisible();
  await diagnosticBlock.click();

  // ---- Diagnostic: answer 5, reload, verify resume ----
  await page.waitForURL("**/diagnostic");
  const answerCurrent = async () => {
    await page.locator('[role="radio"]').first().click();
  };
  const next = page.getByRole("button", { name: "Next", exact: true });

  for (let i = 0; i < 5; i++) {
    await expect(page.locator('[role="radio"]').first()).toBeVisible();
    await answerCurrent();
    await next.click();
  }
  await expect(page.getByText("6 / 25")).toBeVisible();

  // Let the debounced autosave fire, then reload.
  await page.waitForTimeout(2600);
  await page.reload();
  await expect(page.getByText("6 / 25")).toBeVisible({ timeout: 20_000 });

  // ---- Answer the remaining 20 and submit ----
  for (let i = 0; i < 20; i++) {
    await expect(page.locator('[role="radio"]').first()).toBeVisible();
    await answerCurrent();
    if (i < 19) await next.click();
  }
  await page.getByRole("button", { name: "Finish diagnostic" }).click();

  // ---- Results ----
  await expect(page.getByText("Diagnostic complete")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/of 25 correct/)).toBeVisible();
  await expect(page.getByText(/readiness now \d+%/)).toBeVisible();

  // ---- Dashboard now shows a real plan ----
  await page.getByRole("link", { name: "See your study plan" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Readiness")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Take Your Diagnostic/i })
  ).toHaveCount(0);
});
