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

// The free offering: the start of the guided path plus the public tools.
// These are the real things a visitor can use right now.
const FREE_TOOLS = [
  "The guided path's warm-up — no account",
  "The next four stops and the readiness checkpoint — free account",
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

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <h1 className="text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Priced for one exam cycle
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
            Start your path free. Go Pro for the rest of it, through to exam
            day.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>
                See where you stand before you commit
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5">
              <div>
                <span className="font-mono text-4xl font-semibold">$0</span>
                <span className="text-sm text-muted-foreground">
                  {" "}
                  no card
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
                <Link href="/start">Start my path free</Link>
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
