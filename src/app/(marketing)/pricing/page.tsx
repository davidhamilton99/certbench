import { headers } from "next/headers";
import Link from "next/link";
import { Check } from "lucide-react";
import { regionPricing } from "@/lib/pricing/ppp";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanPicker } from "@/components/billing/PlanPicker";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "Pricing",
};

// The free offering is the public, no-account tools — the in-app study
// experience is Pro. These are the real pages a visitor can use right now.
const FREE_TOOLS = [
  "3-minute readiness check — no account",
  "Full-length practice-test previews",
  "PBQ examples for every cert",
  "Subnetting, ports & acronym trainers",
  "Exam-objective study guides",
];

const PRO_FEATURES = [
  "A personalised daily plan, ordered by impact",
  "Unlimited practice questions + full-length exams",
  "Every PBQ simulation and concept drill",
  "Spaced repetition + a readiness score you can trust",
  "Unlimited AI question generation from your notes",
  `Pass guarantee: ${PASS_GUARANTEE_TERMS}`,
];

export default async function PricingPage() {
  // Region price resolved server-side (from the request country header) so
  // the correct price paints immediately — no flash of the full list price.
  const country = (await headers()).get("x-vercel-ip-country");
  const pricing = regionPricing(country);

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <h1 className="text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Priced for one exam cycle
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
            Try the tools free — no account. Go Pro to get the plan that gets
            you certified.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free tools</CardTitle>
              <CardDescription>
                Try CertBench before you commit — no account
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5">
              <div>
                <span className="font-mono text-4xl font-semibold">$0</span>
                <span className="text-sm text-muted-foreground">
                  {" "}
                  no sign-up
                </span>
              </div>
              <ul className="grid flex-1 content-start gap-3 text-sm leading-relaxed">
                {FREE_TOOLS.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-1 size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/readiness-check/security-plus-sy0-701">
                  Take the readiness check
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/40 ring-1 ring-primary/20">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription>
                Everything for your exam, until you pass
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5">
              <ul className="grid content-start gap-3 text-sm leading-relaxed">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-1 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Pro covers one certification — add another anytime for a
                one-time {pricing.prices.quarterly.discounted}.{" "}
                <Link href={PASS_GUARANTEE_HREF} className="underline underline-offset-4">
                  Guarantee terms
                </Link>
              </p>
              <PlanPicker ctaLabel="Get Pro" initialPricing={pricing} surface="pricing" />
            </CardContent>
          </Card>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Not sure where you stand?{" "}
          <Link
            href="/readiness-check/security-plus-sy0-701"
            className="underline underline-offset-4"
          >
            Take the free 3-minute readiness check
          </Link>{" "}
          — no account needed.
        </p>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Questions?{" "}
          <Link href="/contact" className="underline underline-offset-4">
            Get in touch
          </Link>{" "}
          — we answer fast.
        </p>
      </main>

      <Footer />
    </div>
  );
}
