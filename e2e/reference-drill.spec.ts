import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, confirmE2eEmail, e2eEmail } from "./helpers";

/**
 * Reference drill: register -> Reference tab -> flip to Drill mode -> the
 * generated rapid-fire loop advances. Covers the Table/Drill toggle and the
 * generated-question player (the generator itself is unit-tested).
 */
test("reference tab drill mode works", async ({ page }) => {
  const email = e2eEmail("refdrill");
  await page.goto("/register");
  await page.fill("#displayName", "Ref Drill");
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

  await page.getByRole("link", { name: "Reference" }).first().click();
  await page.waitForURL("**/reference");
  await page.getByRole("heading", { name: /Reference tables/i }).waitFor();

  // Flip to Drill mode; the generated question renders tappable options.
  await page.getByRole("button", { name: "Drill", exact: true }).click();
  const radios = page.locator('[role="radio"]');
  await expect(radios.first()).toBeVisible({ timeout: 10_000 });

  // Answer a few — the rapid-fire loop must advance and score.
  for (let i = 0; i < 4; i++) {
    await radios.first().waitFor({ state: "visible", timeout: 8_000 });
    await radios.first().click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(page.getByText(/\d+ \/ 4 correct/)).toBeVisible();

  // Flipping back to Table mode restores the lookup + search.
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.getByPlaceholder("Search across all columns...")).toBeVisible();
});
