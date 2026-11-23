import { expect, test } from "@playwright/test";
import { registerOnboardPro } from "./helpers";

/**
 * Reference tables: register, open Reference from the side bar, and check that
 * the table is shown and that a search narrows it. (A table is practiced in
 * Recall, through the link "Practice this table in Recall"; recall.spec covers
 * the drill itself.)
 *
 * The words the spec looks for are the components' own. Where one changes,
 * copy it from the component named beside it.
 */
test("reference tables render and search narrows them", async ({ page }) => {
  await registerOnboardPro(page, { tag: "refdrill", cert: /Security\+/ });

  await page.getByRole("link", { name: "Reference" }).first().click();
  await page.waitForURL("**/reference");
  await expect(
    page.getByRole("heading", { name: /Reference tables/i })
  ).toBeVisible();

  // The table can be searched: the field has a label and no placeholder (ReferenceTableViewer.tsx).
  const search = page.getByRole("searchbox", { name: "Search this table", exact: true });
  await expect(search).toBeVisible();
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  const rowsBefore = await rows.count();
  expect(rowsBefore).toBeGreaterThan(1);

  // A search that matches nothing leaves one row, which says that no entry matches.
  await search.fill("zzzz-no-such-entry");
  await expect.poll(() => rows.count()).toBeLessThan(rowsBefore);
});
