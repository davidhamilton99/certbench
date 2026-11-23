import { PRICING_COLUMN, PricingTitle } from "./intro";

/**
 * The pricing page's ground, its column and its title, drawn once. They are
 * the same for every visitor, so they stand here while the plans, which wait
 * for the visitor's country, are on their way (loading.tsx draws only the
 * outlines of the two plans). Drawn in the page and in its loading frame as
 * well, the title was sent twice in one document, for anything that reads the
 * page without running its scripts.
 */
export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 aurora-bg">
      <div className={PRICING_COLUMN}>
        <PricingTitle />
        {children}
      </div>
    </div>
  );
}
