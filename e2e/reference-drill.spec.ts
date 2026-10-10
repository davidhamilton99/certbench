import { expect, test } from "@playwright/test";
import { registerOnboardPro } from "./helpers";

/**
 * Reference tables: register -> Reference tab -> the table viewer renders and
 * search narrows it. (The old in-page "Drill mode" moved to the Recall hub via
 * a "Drill this" hand-off link; the drill itself is covered by recall.spec.)
 */
test("reference tables render and search narrows them", async ({ page }) => {
  await registerOnboardPro(page, { tag: "refdrill", cert: /Security\+/ });

  await page.getByRole("link", { name: "Reference" }).first().click();
  await page.waitForURL("**/reference");
  await expect(
    page.getByRole("heading", { name: /Reference tables/i })
  ).toBeVisible();

  // The viewer renders a searchable table.
  const search = page.getByPlaceholder("Search across all columns...");
  await expect(search).toBeVisible();
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  const rowsBefore = await rows.count();
  expect(rowsBefore).toBeGreaterThan(1);

  // A query that can't match anything collapses the table to its empty state.
  await search.fill("zzzz-no-such-entry");
  await expect.poll(() => rows.count()).toBeLessThan(rowsBefore);
});
