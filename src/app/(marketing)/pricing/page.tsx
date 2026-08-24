import { headers } from "next/headers";
import Link from "next/link";
import { Check } from "lucide-react";
import { regionPricing } from "@/lib/pricing/ppp";
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

const FREE_FEATURES = [
  "25-question diagnostic + readiness score",
  "20 practice questions every day",
  "Spaced repetition on everything you miss",
  "Sample PBQ simulation and drill per cert",
  "Community study sets",
  "3 AI quiz generations per month",
];

const PRO_FEATURES = [
  "Unlimited practice questions",
  "Unlimited full-length practice exams",
  "Every PBQ simulation and concept drill",
  "Unlimited AI generation + file upload",
  "Pass guarantee — 30+ days of Pro study and you don't pass? Last payment refunded",
];

export default async function PricingPage() {
  // Region price resolved server-side (from the request country header) so
  // the correct price paints immediately — no flash of the full list price.
  const country = (await headers()).get("x-vercel-ip-country");
  const pricing = regionPricing(country);

  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Priced for one exam cycle
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
            Study free every day. Go Pro when you&apos;re serious about your
            exam date — most people need one quarter.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>
                Enough to study every single day
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5">
              <div>
                <span className="font-mono text-4xl font-semibold">$0</span>
                <span className="text-sm text-muted-foreground"> forever</span>
              </div>
              <ul className="grid flex-1 content-start gap-3 text-sm leading-relaxed">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-1 size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/register">Start free</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/40 ring-1 ring-primary/20">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription>
                Everything, without limits, until you pass
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
              <PlanPicker ctaLabel="Get Pro" initialPricing={pricing} />
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
