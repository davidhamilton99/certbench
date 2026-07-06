// Creates the purchasing-power-parity coupons the checkout route applies by
// id (ppp60 / ppp40 / ppp25). Idempotent: existing coupons are left as-is.
// percent_off + duration:forever means the discount persists on renewals.
//
//   node scripts/setup-stripe-coupons.mjs          # test key from .env.local
//   STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe-coupons.mjs   # live, once
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

const COUPONS = [
  { id: "ppp60", percent_off: 60, name: "Regional pricing — 60% off" },
  { id: "ppp40", percent_off: 40, name: "Regional pricing — 40% off" },
  { id: "ppp25", percent_off: 25, name: "Regional pricing — 25% off" },
];

async function main() {
  console.log(`Stripe mode: ${mode}`);
  for (const c of COUPONS) {
    try {
      const existing = await stripe.coupons.retrieve(c.id);
      console.log(`coupon exists: ${existing.id} (${existing.percent_off}% off)`);
    } catch (err) {
      if (err?.statusCode !== 404) throw err;
      const coupon = await stripe.coupons.create({
        id: c.id,
        percent_off: c.percent_off,
        duration: "forever",
        name: c.name,
      });
      console.log(`coupon created: ${coupon.id} (${coupon.percent_off}% off)`);
    }
  }
  console.log("done");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
