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
 * Recall holds every drill: the recall decks, and the subnetting drill beside
 * them as one more tab. Register, choose the exam, and open Recall from the
 * side bar. A recall deck is shown, the subnetting drill can be answered with
 * the real arithmetic, and a signed-in member is never offered a free account.
 *
 * The words the spec looks for are the components' own. Where one changes,
 * copy it from the component named beside it.
 */
test("signed-in recall: the nav entry, a deck, and eleven subnetting answers in a row", async ({
  page,
}) => {
  await registerOnboardPro(page, { tag: "recall", cert: /Network\+/ });

  // Sidebar entry reaches Recall.
  await page.getByRole("link", { name: "Recall" }).first().click();
  await page.waitForURL("**/recall");
  await expect(
    page.getByRole("heading", { name: "Recall", exact: true })
  ).toBeVisible();

  // A recall deck is shown first, on the study path's question card (RepCard.tsx):
  // its answers are plain buttons in a group that the question names. The drill
  // is the panel of the tabs (RecallSurface.tsx).
  const drill = page.getByRole("tabpanel");
  const options = drill.getByRole("group").getByRole("button");
  await expect(options.first()).toBeVisible({ timeout: 15_000 });
  expect(await options.count()).toBeGreaterThanOrEqual(2);

  // ---- The Subnetting tab: answer 11 questions correctly with the real arithmetic ----
  // (SubnettingDrill.tsx: the field's label, the two lines of the question, the button.)
  await page.getByRole("tab", { name: "Subnetting", exact: true }).click();
  const input = page.getByLabel("Your answer");
  await expect(input).toBeVisible({ timeout: 15_000 });

  // Each test below is a few words of the question as src/lib/tools/subnetting.ts writes it.
  const solve = (prompt: string, value: string): string => {
    if (prompt.includes("8-bit binary")) {
      return Number(value).toString(2).padStart(8, "0");
    }
    if (prompt.includes("binary number to decimal")) {
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
    if (prompt.includes("smallest subnet")) {
      return `/${prefixForHosts(Number(value.match(/^(\d+) hosts/)![1]))}`;
    }
    throw new Error(`unhandled prompt: ${prompt}`);
  };

  // The drill opens on the mode "Network ID", whose answer is typed. A question
  // is one paragraph of two lines: the task, and under it the value it is about.
  // A correct answer moves straight to the next question.
  const question = drill.locator('p[tabindex="-1"]');
  for (let i = 0; i < 11; i++) {
    const prompt = await question.locator("span").nth(0).innerText();
    const value = (await question.locator("span").nth(1).innerText()).trim();
    await input.fill(solve(prompt, value));
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    // The count is printed as a sentence ("3 of 3 correct."), and is said to a
    // screen reader as well; the printed one comes first.
    await expect(drill.getByText(`${i + 1} of ${i + 1} correct.`).first()).toBeVisible();
  }
  await expect(drill.getByText("11 of 11 correct.").first()).toBeVisible();

  // A signed-in member is never offered a free account.
  await expect(page.getByText(/free account/i)).toHaveCount(0);
});
