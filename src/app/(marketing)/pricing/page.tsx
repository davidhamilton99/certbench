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
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Pricing",
  description:
    "Start your CompTIA exam path free. CertBench Pro opens the whole path, unlimited practice, full-length exams and every PBQ lab: $19 a month or $39 for a three-month exam cycle, adjusted regionally.",
  path: "/pricing",
});

// The free offering: the start of the guided path plus the public tools.
// These are the real things a visitor can use right now.
const FREE_TOOLS = [
  "The guided path's warm-up — no account",
  "The stops through the readiness checkpoint — free account",
  "Practice-test previews and PBQ examples",
  "Subnetting, ports & acronym trainers",
  "Exam-objective study guides",
];

const PRO_FEATURES = [
  "The whole guided path, every objective to exam day",
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

      <main className="relative isolate mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-12 sm:px-6 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[34rem] w-[64rem] max-w-[200vw] -translate-x-1/2 rounded-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_17%,transparent),transparent)]"
        />
        <div className="mb-12 grid justify-items-center gap-4 text-center sm:mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Pricing</p>
          <h1 className="cb-display text-balance text-[2.5rem] sm:text-6xl">Priced for one exam cycle.</h1>
          <p className="max-w-md text-balance text-lg text-muted-foreground">
            Start your path free. Go Pro for the rest of it, through to exam day.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
          <Card className="rounded-[2rem] py-8">
            <CardHeader className="px-7">
              <CardTitle className="text-2xl tracking-[-0.02em]">Free</CardTitle>
              <CardDescription>
                See where you stand before you commit
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6 px-7">
              <div>
                <span className="cb-display text-6xl">$0</span>
                <span className="text-sm text-muted-foreground">
                  {" "}
                  no card
                </span>
              </div>
              <ul className="grid flex-1 content-start gap-3 text-[15px] leading-relaxed">
                {FREE_TOOLS.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-1 size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/start">Start my path free</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="relative isolate overflow-hidden rounded-[2rem] border-primary/40 py-8 shadow-[0_40px_90px_-50px_var(--primary)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[22rem] w-[42rem] max-w-[200%] -translate-x-1/2 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_22%,transparent),transparent)]"
            />
            <CardHeader className="px-7">
              <CardTitle className="text-2xl tracking-[-0.02em]">Pro</CardTitle>
              <CardDescription>
                Everything for your exam, until you pass
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6 px-7">
              <ul className="grid content-start gap-3 text-[15px] leading-relaxed">
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
