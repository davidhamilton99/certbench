// Creates the CertBench Pro product and its three prices (monthly/quarterly/
// annual) with the lookup keys the checkout endpoint resolves at runtime.
// Idempotent: existing lookup keys are left untouched.
//
//   node scripts/setup-stripe-prices.mjs            # uses STRIPE_SECRET_KEY from .env.local (test mode)
//   STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe-prices.mjs   # live mode, run once at launch
import { config } from "dotenv";
import Stripe from "stripe";

config({ path: ".env.local" });

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set");
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.startsWith("sk_live") ? "LIVE" : "test";

const PRICES = [
  {
    lookup_key: "certbench_pro_monthly",
    unit_amount: 1900,
    interval: "month",
    interval_count: 1,
    nickname: "Pro monthly",
  },
  {
    lookup_key: "certbench_pro_quarterly",
    unit_amount: 3900,
    interval: "month",
    interval_count: 3,
    nickname: "Pro quarterly",
  },
  {
    lookup_key: "certbench_pro_annual",
    unit_amount: 9900,
    interval: "year",
    interval_count: 1,
    nickname: "Pro annual",
  },
];

async function main() {
  console.log(`Stripe mode: ${mode}`);

  // Find or create the product.
  const products = await stripe.products.search({
    query: "name:'CertBench Pro' AND active:'true'",
  });
  let product = products.data[0];
  if (product) {
    console.log(`product exists: ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: "CertBench Pro",
      description:
        "Unlimited practice questions, exams, PBQs, and AI generation",
    });
    console.log(`product created: ${product.id}`);
  }

  for (const p of PRICES) {
    const existing = await stripe.prices.list({
      lookup_keys: [p.lookup_key],
      active: true,
      limit: 1,
    });
    if (existing.data[0]) {
      console.log(
        `price exists: ${p.lookup_key} -> ${existing.data[0].id} ($${existing.data[0].unit_amount / 100})`
      );
      continue;
    }
    const price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: p.unit_amount,
      nickname: p.nickname,
      lookup_key: p.lookup_key,
      recurring: { interval: p.interval, interval_count: p.interval_count },
    });
    console.log(`price created: ${p.lookup_key} -> ${price.id} ($${p.unit_amount / 100})`);
  }

  console.log("done");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
