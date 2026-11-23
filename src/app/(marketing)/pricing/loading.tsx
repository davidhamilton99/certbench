import { PRICING_PLANS } from "./intro";

/**
 * What a press on "Pricing" shows at once, under the title and the opening
 * paragraphs that the layout has already drawn (layout.tsx). The page itself
 * waits for the visitor's country, so the plans cannot be prepared ahead of
 * the press: their outlines stand in their final place, with the wait said to
 * a screen reader, and the page takes their place when it arrives. Nothing
 * here moves or fades.
 */
export default function PricingLoading() {
  return (
    <div role="status" className={PRICING_PLANS}>
      <span className="sr-only">The plans are loading.</span>
      <div className="glass min-h-[32rem] rounded-lg" />
      <div className="glass min-h-[32rem] rounded-lg rounded-t-none border-t-[3px] border-t-primary" />
    </div>
  );
}
