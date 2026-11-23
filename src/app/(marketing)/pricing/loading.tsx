import { PRICING_COLUMN, PRICING_PLANS, PricingIntro } from "./intro";

/**
 * What a press on "Pricing" shows at once. The page itself waits for the
 * visitor's country, so it cannot be prepared ahead of the press; its title
 * and opening paragraphs are the same for everyone and can. They are printed
 * here as real words in their final place, with the outlines of the two plans
 * under them, and the page takes their place when it arrives. Nothing here
 * moves or fades.
 */
export default function PricingLoading() {
  return (
    <div className="flex-1 aurora-bg">
      <div className={PRICING_COLUMN}>
        <PricingIntro />
        <div role="status" className={PRICING_PLANS}>
          <span className="sr-only">The plans are loading.</span>
          <div className="glass min-h-[32rem] rounded-lg" />
          <div className="glass min-h-[32rem] rounded-lg rounded-t-none border-t-[3px] border-t-primary" />
        </div>
      </div>
    </div>
  );
}
