import { describe, expect, it } from "vitest";
import {
  BASE_PRICES_CENTS,
  discountedCents,
  formatUsd,
  pppForCountry,
  regionPricing,
} from "../ppp";

describe("pppForCountry", () => {
  it("maps the largest cert markets to the 60% tier", () => {
    for (const c of ["IN", "NG", "PK", "PH", "EG"]) {
      expect(pppForCountry(c)?.discountPercent).toBe(60);
    }
  });

  it("maps middle-income markets to 40% and 25%", () => {
    expect(pppForCountry("BR")?.discountPercent).toBe(40);
    expect(pppForCountry("PL")?.discountPercent).toBe(25);
  });

  it("is case-insensitive", () => {
    expect(pppForCountry("in")?.couponId).toBe("ppp60");
  });

  it("returns null for full-price countries and junk", () => {
    for (const c of ["US", "CA", "GB", "DE", "AU", "", null, undefined, "ZZ"]) {
      expect(pppForCountry(c)).toBeNull();
    }
  });
});

describe("discountedCents", () => {
  it("computes clean discounts on the base monthly price", () => {
    expect(discountedCents(BASE_PRICES_CENTS.monthly, 60)).toBe(760); // $7.60
    expect(discountedCents(BASE_PRICES_CENTS.monthly, 40)).toBe(1140); // $11.40
    expect(discountedCents(BASE_PRICES_CENTS.annual, 60)).toBe(3960); // $39.60
  });
});

describe("formatUsd", () => {
  it("drops decimals for whole dollars, keeps them otherwise", () => {
    expect(formatUsd(1900)).toBe("$19");
    expect(formatUsd(760)).toBe("$7.60");
    expect(formatUsd(3960)).toBe("$39.60");
  });
});

describe("regionPricing", () => {
  it("returns full prices with null discount for full-price countries", () => {
    const r = regionPricing("US");
    expect(r.discountPercent).toBeNull();
    expect(r.prices.monthly.original).toBe("$19");
    expect(r.prices.monthly.discounted).toBe("$19");
  });

  it("applies the tier discount to every interval", () => {
    const r = regionPricing("IN");
    expect(r.discountPercent).toBe(60);
    expect(r.prices.monthly.discounted).toBe("$7.60");
    expect(r.prices.annual.discounted).toBe("$39.60");
    expect(r.prices.annual.original).toBe("$99");
  });
});
