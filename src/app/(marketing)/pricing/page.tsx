import { headers } from "next/headers";
import Link from "next/link";
import { Check } from "lucide-react";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { longDate } from "@/core/path/versions";
import { regionPricing } from "@/lib/pricing/ppp";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { PRO_PRICES, PRO_PRICE_REGION_NOTE, PRO_SCOPE_TERMS, proAddonTerms } from "@/lib/pricing/terms";
import { Button } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-arrow";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PlanPicker } from "@/components/billing/PlanPicker";
import { isBillingPeriod } from "@/components/billing/plans";
import { EXAMS_WITH_FREE_LABS } from "@/lib/seo/cert-pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { PRICING_PAGE_UPDATED_ISO } from "@/lib/seo/page-dates";
import { PRICING_PLANS } from "./intro";

export const metadata = pageMetadata({
  title: "Pricing",
  // The free labs are named with their exams: Security+ SY0-801 has no free lab (see EXAMS_WITH_FREE_LABS).
  description: `CertBench is free to start. A free account includes a full-length ${REHEARSAL_FORMATS.full.questions}-question practice exam for each exam, and ${FREE_LAB_COUNT} hands-on labs (PBQs) for each of ${EXAMS_WITH_FREE_LABS}. CertBench Pro opens the whole study path, every lab and new timed practice exams for ${PRO_PRICES.monthly} a month, ${PRO_PRICES.quarterly} every three months, or ${PRO_PRICES.annual} a year. ${PRO_PRICE_REGION_NOTE}`,
  path: "/pricing",
});

// The free plan: the start of the study path plus the public pages. Each line
// is something a visitor can use now, and says what it needs.
const FREE_TOOLS = [
  "The introductory questions for each exam, with no account",
  `One full-length practice exam of ${REHEARSAL_FORMATS.full.questions} questions, scored with a free account`,
  `${FREE_LAB_COUNT} hands-on labs (PBQs) for each of ${EXAMS_WITH_FREE_LABS}, the first three with no account`,
  "Your first study step and the readiness checkpoint, with a free account",
  "Practice drills for subnetting, port numbers and acronyms",
  "Pages of practice questions for the exam objectives and the Network+ topics",
];

// Pro in the same terms as the path's own offer (PathOffer). The first line is
// worded to be true of every exam: the Network+ steps follow CertBench's own
// topics and not CompTIA's objectives (usesOfficialObjectiveNumbers).
const PRO_FEATURES = [
  "The whole study path, which works through your exam topic by topic",
  "Every hands-on lab (PBQ)",
  `New timed practice exams of ${REHEARSAL_FORMATS.full.questions} questions, scored by domain`,
  "Every question for your exam, with review of the questions you answered incorrectly",
];

/** What a plan includes: a plain list, each line marked. */
function Included({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="grid content-start gap-3">
      <p className="text-small font-medium">{label}</p>
      <ul className="grid content-start gap-3 text-small">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <Check className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  // The regional price is worked out here, from the country the request came
  // from, so the visitor's own price is in the first paint.
  const [{ plan }, requestHeaders] = await Promise.all([searchParams, headers()]);
  const pricing = regionPricing(requestHeaders.get("x-vercel-ip-country"));
  // A visitor who chose a billing period and was sent to create an account
  // comes back with it in the address: it is chosen again.
  const chosen = isBillingPeriod(plan) ? plan : undefined;

  // The ground, the column and the title are the layout's (layout.tsx).
  return (
    <>
    <div className={PRICING_PLANS}>
      {/* Two more pixels above the title, to match the rule along the top of the Pro plan. */}
      <Card className="rounded-lg pb-8 pt-[calc(2rem+2px)]">
        <CardHeader className="px-7">
          <h2 className="cb-subsection">Free</h2>
          <CardDescription className="text-small">Start studying and see where you stand.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6 px-7">
          <p>
            <span className="cb-display text-5xl">$0</span>{" "}
            <span className="ml-1 text-small text-muted-foreground">No payment card is required.</span>
          </p>
          <Included label="The free plan includes:" items={FREE_TOOLS} />
          {/* /start has no loading screen: the button answers the press while it is on the way. */}
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/start">
              <LinkPending>Start for free</LinkPending>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* The rule along the top is straight, so the corners it meets are square. */}
      <Card className="rounded-lg rounded-t-none border-t-[3px] border-t-primary py-8">
        <CardHeader className="px-7">
          <h2 className="cb-subsection">Pro</h2>
          <CardDescription className="text-small">The complete study path for one exam.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6 px-7">
          <p>
            <span className="cb-display text-5xl">{pricing.prices.monthly.discounted}</span>{" "}
            <span className="ml-1 text-small text-muted-foreground">
              a month, or {pricing.prices.quarterly.discounted} every three months, or{" "}
              {pricing.prices.annual.discounted} a year.
            </span>
          </p>
          <PlanPicker initialPricing={pricing} initialPlan={chosen} surface="pricing" />
          <Included label="Pro includes:" items={PRO_FEATURES} />
          <p className="text-small text-muted-foreground">
            <span className="font-medium text-foreground">Pass guarantee.</span> {PASS_GUARANTEE_TERMS}{" "}
            <Link href={PASS_GUARANTEE_HREF} className="cb-link">
              Read the guarantee terms
            </Link>
            .
          </p>
          {/* The added exam's price is the visitor's own, as the add-on checkout charges it. */}
          <p className="text-small text-muted-foreground">
            {PRO_SCOPE_TERMS} {proAddonTerms(pricing.prices.quarterly.discounted)}
          </p>
        </CardContent>
      </Card>
    </div>

    <div className="mt-10 grid max-w-5xl gap-2 border-t border-border pt-6 text-small text-muted-foreground">
      <p>
        If you teach a CompTIA course, see the{" "}
        <Link href="/educators" className="cb-link">
          information for educators
        </Link>
        .
      </p>
      <p>
        If you have a question about pricing, please{" "}
        <Link href="/contact" className="cb-link">
          contact CertBench
        </Link>
        .
      </p>
      {/* The day these words last changed, kept beside the sitemap's date for this page. */}
      <p className="text-note">This page was last updated on {longDate(PRICING_PAGE_UPDATED_ISO)}.</p>
    </div>
    </>
  );
}
