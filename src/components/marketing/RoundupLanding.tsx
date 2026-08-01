import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { ROUNDUPS, type RoundupData } from "@/lib/seo/comparison-pages";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { Button } from "@/components/ui/button";

/** "CompTIA A+" from "best-a-plus-practice-tests". */
function certLabel(path: string): string {
  if (path.includes("a-plus")) return "CompTIA A+";
  if (path.includes("network-plus")) return "CompTIA Network+";
  if (path.includes("security-plus")) return "CompTIA Security+";
  return "CompTIA";
}

/** Presentational template for the "best {cert} practice tests" roundups. */
export function RoundupLanding({ data }: { data: RoundupData }) {
  const others = ROUNDUPS.filter((r) => r.path !== data.path);
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {data.h1}
        </h1>
        <div className="mt-4 grid gap-3 text-muted-foreground">
          {data.intro.map((p) => (
            <p key={p.slice(0, 32)} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <section className="mt-10 grid gap-5">
          {data.tools.map((tool) => (
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
              href={`/${data.practiceTestPath}`}
              className="text-primary underline underline-offset-4"
            >
              Try the free practice test
            </Link>{" "}
            — no account needed.
          </p>
        </section>

        {/* Cross-links to the other cert guides */}
        {others.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              Studying for a different exam?
            </h2>
            <div className="mt-4 grid gap-1.5">
              {others.map((r) => (
                <Link
                  key={r.path}
                  href={`/${r.path}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm transition-colors hover:border-muted-foreground/40"
                >
                  <span>Best {certLabel(r.path)} practice tests</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <FaqSection faqs={data.faqs} />
      </main>
      <Footer />
    </div>
  );
}
