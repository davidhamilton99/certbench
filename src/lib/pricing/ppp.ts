/**
 * Purchasing-power-parity pricing. A visitor's country (from the Vercel
 * edge geo header) maps to a discount tier so the Pro price is reachable
 * in lower-income markets — the biggest lever for global conversion.
 *
 * IMPORTANT: this table only decides what to DISPLAY and which Stripe
 * coupon to apply. The actual coupon at checkout is re-derived server-side
 * from the request's real IP country (see the checkout route), so a client
 * can never grant itself a discount by spoofing.
 */

/** Base Pro prices in USD cents (must match scripts/setup-stripe-prices.mjs). */
export const BASE_PRICES_CENTS = {
  monthly: 1900,
  quarterly: 3900,
  annual: 9900,
} as const;

export type BillingIntervalKey = keyof typeof BASE_PRICES_CENTS;

export interface PppTier {
  /** Percent off, applied via a Stripe `percent_off` coupon (forever). */
  discountPercent: 25 | 40 | 60;
  /** Stripe coupon id, created by scripts/setup-stripe-coupons.mjs. */
  couponId: "ppp60" | "ppp40" | "ppp25";
}

const TIER_60: PppTier = { discountPercent: 60, couponId: "ppp60" };
const TIER_40: PppTier = { discountPercent: 40, couponId: "ppp40" };
const TIER_25: PppTier = { discountPercent: 25, couponId: "ppp25" };

/**
 * ISO 3166-1 alpha-2 country → tier. Grouped roughly by World Bank income
 * level. Countries not listed pay full price (US, Canada, Western Europe,
 * Australia, Gulf states, etc.). Sanctioned countries are omitted — they
 * can't check out through Stripe anyway.
 */
const COUNTRY_TIER: Record<string, PppTier> = {
  // ---- 60% off: low income / largest cert-aspirant populations ----
  IN: TIER_60, // India
  NG: TIER_60, // Nigeria
  PK: TIER_60, // Pakistan
  BD: TIER_60, // Bangladesh
  EG: TIER_60, // Egypt
  PH: TIER_60, // Philippines
  ID: TIER_60, // Indonesia
  KE: TIER_60, // Kenya
  VN: TIER_60, // Vietnam
  NP: TIER_60, // Nepal
  LK: TIER_60, // Sri Lanka
  GH: TIER_60, // Ghana
  ET: TIER_60, // Ethiopia
  TZ: TIER_60, // Tanzania
  UG: TIER_60, // Uganda
  KH: TIER_60, // Cambodia
  MM: TIER_60, // Myanmar
  RW: TIER_60, // Rwanda
  ZM: TIER_60, // Zambia
  BO: TIER_60, // Bolivia
  HN: TIER_60, // Honduras
  NI: TIER_60, // Nicaragua

  // ---- 40% off: lower-middle income ----
  BR: TIER_40, // Brazil
  MX: TIER_40, // Mexico
  ZA: TIER_40, // South Africa
  TR: TIER_40, // Turkey
  TH: TIER_40, // Thailand
  CO: TIER_40, // Colombia
  AR: TIER_40, // Argentina
  UA: TIER_40, // Ukraine
  PE: TIER_40, // Peru
  MA: TIER_40, // Morocco
  TN: TIER_40, // Tunisia
  JO: TIER_40, // Jordan
  DZ: TIER_40, // Algeria
  EC: TIER_40, // Ecuador
  GT: TIER_40, // Guatemala
  DO: TIER_40, // Dominican Republic
  PY: TIER_40, // Paraguay
  VE: TIER_40, // Venezuela
  AZ: TIER_40, // Azerbaijan
  GE: TIER_40, // Georgia
  AM: TIER_40, // Armenia

  // ---- 25% off: upper-middle income ----
  PL: TIER_25, // Poland
  RO: TIER_25, // Romania
  MY: TIER_25, // Malaysia
  CL: TIER_25, // Chile
  GR: TIER_25, // Greece
  HU: TIER_25, // Hungary
  BG: TIER_25, // Bulgaria
  HR: TIER_25, // Croatia
  RS: TIER_25, // Serbia
  LV: TIER_25, // Latvia
  LT: TIER_25, // Lithuania
  SK: TIER_25, // Slovakia
  CR: TIER_25, // Costa Rica
  UY: TIER_25, // Uruguay
  MU: TIER_25, // Mauritius
};

/** Tier for a country code (case-insensitive), or null for full price. */
export function pppForCountry(country: string | null | undefined): PppTier | null {
  if (!country) return null;
  return COUNTRY_TIER[country.toUpperCase()] ?? null;
}

/** Discounted cents for a base price at a percent off, rounded to a clean value. */
export function discountedCents(baseCents: number, percentOff: number): number {
  return Math.round((baseCents * (100 - percentOff)) / 100);
}

/** "$19" or "$7.60" — drops the decimals when the price is whole dollars. */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export interface RegionPricing {
  /** null when no discount applies for this region. */
  discountPercent: number | null;
  prices: Record<
    BillingIntervalKey,
    { original: string; discounted: string }
  >;
}

/** Full display-pricing payload for a country — feeds the pricing UI. */
export function regionPricing(country: string | null | undefined): RegionPricing {
  const tier = pppForCountry(country);
  const intervals = Object.keys(BASE_PRICES_CENTS) as BillingIntervalKey[];
  const prices = {} as RegionPricing["prices"];
  for (const key of intervals) {
    const base = BASE_PRICES_CENTS[key];
    prices[key] = {
      original: formatUsd(base),
      discounted: formatUsd(
        tier ? discountedCents(base, tier.discountPercent) : base
      ),
    };
  }
  return { discountPercent: tier?.discountPercent ?? null, prices };
}
