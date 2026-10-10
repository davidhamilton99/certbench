import { expect, test } from "@playwright/test";
import { registerOnboardPro } from "./helpers";
import {
  broadcastOf,
  intToIp,
  ipToInt,
  maskFromPrefix,
  networkOf,
  prefixForHosts,
  prefixFromMask,
  usableHosts,
} from "../src/lib/tools/subnetting";

/**
 * Recall is the unified drill hub — the old Drills tab (subnetting) folded in
 * alongside the verified recall decks. register -> onboard -> Recall via the
 * sidebar; a recall deck renders, the subnetting drill is beatable with the
 * real math, and the register upsell never shows for a signed-in user.
 */
test("logged-in recall: nav entry, deck renders, subnetting solve streak", async ({
  page,
}) => {
  await registerOnboardPro(page, { tag: "recall", cert: /Network\+/ });

  // Sidebar entry reaches Recall.
  await page.getByRole("link", { name: "Recall" }).first().click();
  await page.waitForURL("**/recall");
  await expect(
    page.getByRole("heading", { name: "Recall", exact: true })
  ).toBeVisible();

  // A recall deck renders by default with multiple-choice options.
  const options = page.locator('[role="radio"]');
  await expect(options.first()).toBeVisible({ timeout: 15_000 });
  expect(await options.count()).toBeGreaterThanOrEqual(2);

  // ---- Subnetting pill: answer 11 questions correctly via the real math ----
  await page.getByRole("tab", { name: "Subnetting", exact: true }).click();
  const input = page.getByLabel("Your answer");
  await expect(input).toBeVisible({ timeout: 15_000 });

  const solve = (prompt: string, value: string): string => {
    if (prompt.includes("8-bit binary")) {
      return Number(value).toString(2).padStart(8, "0");
    }
    if (prompt.includes("Convert to decimal")) {
      return String(parseInt(value, 2));
    }
    if (prompt.includes("dotted subnet mask")) {
      return maskFromPrefix(Number(value.replace("/", "")));
    }
    if (prompt.includes("CIDR prefix")) {
      return String(prefixFromMask(value));
    }
    const ipSlash = value.match(/^([\d.]+) \/(\d+)$/);
    if (prompt.includes("network address")) {
      const [, ip, p] = ipSlash!;
      return intToIp(networkOf(ipToInt(ip), Number(p)));
    }
    if (prompt.includes("broadcast address")) {
      const [, ip, p] = ipSlash!;
      return intToIp(broadcastOf(ipToInt(ip), Number(p)));
    }
    if (prompt.includes("first usable")) {
      const [, ip, p] = ipSlash!;
      return intToIp(networkOf(ipToInt(ip), Number(p)) + 1);
    }
    if (prompt.includes("last usable")) {
      const [, ip, p] = ipSlash!;
      return intToIp(broadcastOf(ipToInt(ip), Number(p)) - 1);
    }
    if (prompt.includes("usable hosts")) {
      return String(usableHosts(Number(value.replace("/", ""))));
    }
    if (prompt.includes("Smallest prefix")) {
      return `/${prefixForHosts(Number(value.match(/^(\d+) hosts/)![1]))}`;
    }
    throw new Error(`unhandled prompt: ${prompt}`);
  };

  // Stay on modes with a text input (default mode is Network ID).
  for (let i = 0; i < 11; i++) {
    const prompt = await page
      .locator(".bg-card p.text-sm.text-muted-foreground")
      .first()
      .innerText();
    const value = (
      await page.locator(".bg-card p.font-mono.text-2xl").first().innerText()
    ).trim();
    await input.fill(solve(prompt, value));
    await page.getByRole("button", { name: "Check" }).click();
  }
  await expect(page.getByText("11 / 11 correct")).toBeVisible();

  // Signed-in users never see the register upsell.
  await expect(page.getByText(/free account/i)).toHaveCount(0);
});
