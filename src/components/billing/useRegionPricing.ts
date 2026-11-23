"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { getRegionPricing } from "@/contracts/client";
import type { RegionPricing } from "@/lib/pricing/ppp";
import { PRO_PRICES } from "@/lib/pricing/terms";

/**
 * The list prices in the shape of a visitor's own prices. They are shown only
 * when the visitor's regional prices could not be fetched: the payment page
 * always charges the regional price, which is the same or lower.
 */
export const LIST_PRICING: RegionPricing = {
  discountPercent: null,
  prices: {
    monthly: { original: PRO_PRICES.monthly, discounted: PRO_PRICES.monthly },
    quarterly: { original: PRO_PRICES.quarterly, discounted: PRO_PRICES.quarterly },
    annual: { original: PRO_PRICES.annual, discounted: PRO_PRICES.annual },
  },
};

/**
 * The prices to show this visitor, or null while they are not known.
 *
 * A page that has worked them out on the server passes them as `initial`, and
 * nothing is fetched. Otherwise they are asked for once the component is on
 * the page. Until the answer arrives the caller prints no figure: a list price
 * that is replaced by a lower regional price a moment later is a price that
 * changes while it is being read.
 */
export function useRegionPricing(initial?: RegionPricing): RegionPricing | null {
  const [fetched, setFetched] = useState<RegionPricing | null>(null);

  useEffect(() => {
    if (initial) return;
    let live = true;
    api(getRegionPricing, {}).then(
      (pricing) => {
        if (live) setFetched(pricing);
      },
      () => {
        if (live) setFetched(LIST_PRICING);
      }
    );
    return () => {
      live = false;
    };
  }, [initial]);

  return initial ?? fetched;
}
