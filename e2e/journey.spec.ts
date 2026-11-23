import { expect, test } from "@playwright/test";
import { registerOnboardPro } from "./helpers";

/**
 * The critical path: register, choose the exam, take the diagnostic (with a
 * reload part-way to prove that it resumes), read the result, and find the
 * readiness score on the study plan. The signed-in workspace is for Pro
 * accounts, so the setup grants Pro before it drives the app.
 *
 * The words the spec looks for are the components' own. Where one changes,
 * copy it from the component named beside it.
 */
test("signup through diagnostic to dashboard readiness", async ({ page }) => {
  await registerOnboardPro(page, { tag: "journey", cert: /Security\+/ });

  // ---- The study plan begins with the diagnostic (DiagnosticGate.tsx) ----
  const diagnosticBlock = page.getByRole("link", {
    name: /Start the diagnostic/i,
  });
  await expect(diagnosticBlock).toBeVisible();
  await diagnosticBlock.click();

  // ---- Diagnostic: answer 5, reload, verify resume (QuizShell.tsx) ----
  // The answers are a radio group here, because a choice can still be changed.
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
  await expect(page.getByText("Question 6 of 25", { exact: true })).toBeVisible();

  // Let the debounced autosave fire, then reload.
  await page.waitForTimeout(2600);
  await page.reload();
  await expect(page.getByText("Question 6 of 25", { exact: true })).toBeVisible({ timeout: 20_000 });

  // ---- Answer the remaining 20 and submit ----
  for (let i = 0; i < 20; i++) {
    await expect(page.locator('[role="radio"]').first()).toBeVisible();
    await answerCurrent();
    if (i < 19) await next.click();
  }
  // The button's words are DiagnosticClient.tsx's submitLabel.
  await page.getByRole("button", { name: "Finish the diagnostic", exact: true }).click();

  // ---- The result (ReadinessReveal.tsx, drawn by ScoreReport.tsx) ----
  // Its heading is a sentence that names the exam: "You have completed the
  // CompTIA Security+ SY0-701 diagnostic."
  await expect(page.getByRole("heading", { name: /^You have completed the .+ diagnostic\.$/ })).toBeVisible({
    timeout: 30_000,
  });
  // The report gives the score under its caption, and each domain's result under that.
  await expect(page.getByText("Diagnostic result", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Results by domain", exact: true })).toBeVisible();

  // ---- The study plan now shows a readiness score (ReadinessPanel.tsx) ----
  // What the result offers next depends on the score, so the spec opens the
  // study plan directly and does not follow one of those links.
  await page.goto("/dashboard");
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Readiness", exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Start the diagnostic/i })
  ).toHaveCount(0);
});
