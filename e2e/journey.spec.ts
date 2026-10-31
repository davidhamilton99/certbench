import { expect, test } from "@playwright/test";
import { registerOnboardPro } from "./helpers";

/**
 * The critical path: register -> pick the exam -> (Pro) diagnostic
 * with a mid-exam reload to prove resume -> results -> dashboard readiness.
 * The signed-in app is Pro-only, so setup grants Pro before driving the app.
 */
test("signup through diagnostic to dashboard readiness", async ({ page }) => {
  await registerOnboardPro(page, { tag: "journey", cert: /Security\+/ });

  // ---- Dashboard shows the diagnostic gate ----
  const diagnosticBlock = page.getByRole("link", {
    name: /Start the diagnostic/i,
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

  // ---- Results: the ReadinessReveal instrument ----
  await expect(page.getByText("Diagnostic complete")).toBeVisible({
    timeout: 30_000,
  });
  // The dial reports the score; the domain cascade breaks it down by exam area.
  await expect(page.getByText("Diagnostic score")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Domain breakdown" })
  ).toBeVisible();

  // ---- Dashboard now shows a real plan ----
  // The path-forward's next-step CTA is adaptive (gap-drill vs PBQ challenge),
  // so navigate to the dashboard directly rather than couple to one branch.
  await page.goto("/dashboard");
  await page.waitForURL("**/dashboard");
  await expect(
    page.getByRole("heading", { name: "Readiness" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Start the diagnostic/i })
  ).toHaveCount(0);
});
