import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { pbqRegistry } from "@/data/pbq";
import type { PbqExamplePage } from "@/lib/seo/cert-pages";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PbqDemo } from "@/components/marketing/PbqDemo";
import { Button } from "@/components/ui/button";

/** Shared server template for the /​*-pbq-examples pages. */
export function PbqExampleLanding({ page }: { page: PbqExamplePage }) {
  const scenarios = pbqRegistry[page.certSlug] ?? [];
  // Lead with a simulation — it's the most exam-like experience.
  const demo =
    scenarios.find((s) => s.type === "simulation") ??
    scenarios.find((s) => s.type === "topology") ??
    scenarios[0];
  const rest = scenarios.filter((s) => s.id !== demo?.id);

  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.h1}
        </h1>
        <div className="mt-4 grid max-w-2xl gap-3 text-muted-foreground">
          {page.intro.map((p) => (
            <p key={p.slice(0, 32)} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {demo && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">
              Try it: {demo.title}
            </h2>
            <PbqDemo scenario={demo} />
          </section>
        )}

        {rest.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              {rest.length} more interactive scenarios
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every style the real exam uses — free account required.
            </p>
            <div className="mt-4 grid gap-1.5">
              {rest.map((s) => (
                <Link
                  key={s.id}
                  href="/register"
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm transition-colors hover:border-muted-foreground/40"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="size-3.5 text-muted-foreground" />
                    {s.title}
                  </span>
                  <span className="shrink-0 font-mono text-xs capitalize text-muted-foreground">
                    {s.type}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            PBQs are only part of it
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            CertBench pairs hands-on PBQ practice with adaptive exams, spaced
            repetition, and a readiness score that tells you when you&apos;re
            actually ready to book.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/register">
              Start studying free
              <ArrowRight />
            </Link>
          </Button>
        </section>

        <FaqSection faqs={page.faqs} />
      </main>
      <Footer />
    </div>
  );
}
