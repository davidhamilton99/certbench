import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { ROUNDUP } from "@/lib/seo/comparison-pages";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: ROUNDUP.metaTitle,
  description: ROUNDUP.metaDescription,
};

export default function RoundupPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {ROUNDUP.h1}
        </h1>
        <div className="mt-4 grid gap-3 text-muted-foreground">
          {ROUNDUP.intro.map((p) => (
            <p key={p.slice(0, 32)} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <section className="mt-10 grid gap-5">
          {ROUNDUP.tools.map((tool) => (
            <div
              key={tool.name}
              className={
                tool.isSelf
                  ? "rounded-xl border border-primary/40 bg-card p-6"
                  : "rounded-xl border bg-card p-6"
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {tool.name}
                  {tool.isSelf && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 align-middle text-[11px] font-medium text-primary">
                      our product — bias disclosed
                    </span>
                  )}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {tool.price}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Best for: {tool.bestFor}
              </p>
              <ul className="mt-4 grid gap-2 text-sm leading-relaxed">
                {tool.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <Check className="mt-1 size-3.5 shrink-0 text-success" />
                    {s}
                  </li>
                ))}
                {tool.weaknesses.map((w) => (
                  <li
                    key={w}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <Minus className="mt-1 size-3.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
              {tool.compareSlug && (
                <p className="mt-4 text-sm">
                  <Link
                    href={`/compare/${tool.compareSlug}`}
                    className="text-primary underline underline-offset-4"
                  >
                    Full CertBench comparison
                  </Link>
                </p>
              )}
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Start with a measurement, not a purchase
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Whatever stack you choose, choose it from data: the free
            25-question diagnostic gives you a readiness score and your weak
            domains in about twenty minutes.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/register">
              Take the free diagnostic
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Want questions first?{" "}
            <Link
              href="/security-plus-practice-test"
              className="text-primary underline underline-offset-4"
            >
              Try the free Security+ practice test
            </Link>{" "}
            — no account needed.
          </p>
        </section>

        <FaqSection faqs={ROUNDUP.faqs} />
      </main>
      <Footer />
    </div>
  );
}
