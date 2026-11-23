import { describe, expect, it } from "vitest";
import { BASE_PRICES_CENTS, formatUsd, regionPricing } from "../ppp";
import { PRO_ADDON_TERMS, PRO_PRICES, proAddonTerms } from "../terms";

describe("the terms of an added exam", () => {
  it("say that it is one payment and that the exam stays open only while the Pro plan is active", () => {
    expect(PRO_ADDON_TERMS).toBe(
      "You can add another exam for a single payment of $39. The exam stays open while your Pro plan is active."
    );
  });

  it("state the three-month price, which is what the add-on checkout charges", () => {
    expect(PRO_PRICES.quarterly).toBe(formatUsd(BASE_PRICES_CENTS.quarterly));
    expect(PRO_ADDON_TERMS).toContain(`a single payment of ${PRO_PRICES.quarterly}.`);
  });

  it("state a visitor's regional price where the page knows it, with the same condition", () => {
    const india = regionPricing("IN").prices.quarterly.discounted;
    expect(proAddonTerms(india)).toBe(
      `You can add another exam for a single payment of ${india}. The exam stays open while your Pro plan is active.`
    );
    expect(proAddonTerms(india)).not.toContain(PRO_PRICES.quarterly);
  });

  it("never promise an exam bought outright or at any time", () => {
    expect(PRO_ADDON_TERMS).not.toMatch(/at any time|one-time|forever|for good|lifetime/i);
  });
});
