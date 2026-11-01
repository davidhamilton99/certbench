import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { pbqRegistry } from "@/data/pbq";
import type { PbqScenario } from "@/data/pbq/types";
import type { PbqExamplePage } from "@/lib/seo/cert-pages";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PbqTryChooser } from "@/components/marketing/PbqTryChooser";
import type { PbqUpsell } from "@/components/workspace/PbqPlayer";
import { Button } from "@/components/ui/button";

/** Difficulty rank per PBQ type — the on-ramp leads with the lowest. */
function rank(type: PbqScenario["type"]): number {
  return {
    ordering: 1,
    "threat-hunt": 2,
    matching: 2,
    categorization: 3,
    terminal: 3,
    topology: 4,
    simulation: 5,
  }[type];
}

/** Pick up to 3 free scenarios that span easy → exam-level for the chooser. */
function pickFree(scenarios: PbqScenario[]): PbqScenario[] {
  const pool = [...scenarios].sort((a, b) => rank(a.type) - rank(b.type));
  const seen = new Set<string>();
  const chosen: PbqScenario[] = [];
  const add = (s?: PbqScenario) => {
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      chosen.push(s);
    }
  };
  add(pool.find((s) => s.type === "terminal")); // flagship hands-on, featured first
  add(pool[0]); // easiest (warm-up)
  add([...pool].reverse().find((s) => rank(s.type) >= 4)); // an exam-level one
  for (const s of pool) {
    if (chosen.length >= 3) break;
    add(s);
  }
  return chosen.slice(0, 3);
}

/** Shared server template for the /​*-pbq-examples pages. */
export function PbqExampleLanding({ page }: { page: PbqExamplePage }) {
  const scenarios = pbqRegistry[page.certSlug] ?? [];
  const free = pickFree(scenarios);
  const freeIds = new Set(free.map((s) => s.id));
  const rest = scenarios.filter((s) => !freeIds.has(s.id));

  const path = `/path/${page.certSlug}`;
  const upsell: PbqUpsell = {
    heading: "That's a real exam-style PBQ — and you handled it.",
    note: "Performance-based questions are the part most people underestimate. Your guided path walks every objective in short stops; Pro adds every hands-on lab.",
    href: path,
    label: "Start my path →",
    context: "public_pbq",
  };

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.h1}
        </h1>
        <div className="mt-4 grid max-w-2xl gap-3 text-muted-foreground">
          {page.intro.map((p) => (
            <p key={p.slice(0, 32)} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {free.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">
              Try one — no account needed
            </h2>
            <PbqTryChooser scenarios={free} upsell={upsell} />
          </section>
        )}

        {rest.length > 0 && (
          <section className="mt-12 rounded-2xl border bg-muted/40 p-6">
            <h2 className="text-xl font-semibold tracking-tight">
              {rest.length} more hands-on labs in your plan
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Every style the real exam uses — firewall configs, log analysis,
              topology, ordering, and matching — graded with partial credit,
              across every domain. This is the practice that actually moves your
              readiness.
            </p>
            <div className="mt-4 grid gap-1.5">
              {rest.map((s) => (
                <Link
                  key={s.id}
                  href={path}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="size-3.5 text-muted-foreground" />
                    {s.title}
                  </span>
                  <span className="shrink-0 font-mono text-xs capitalize text-muted-foreground">
                    {s.type.replace("-", " ")}
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              All {scenarios.length} labs come with Pro, offered after your
              path&apos;s readiness checkpoint.
            </p>
          </section>
        )}

        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            PBQs are only part of it
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Your guided path walks every exam objective in short stops, and a
            readiness checkpoint shows where you stand.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={path}>
              Start my path
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">No account needed to start.</p>
        </section>

        <FaqSection faqs={page.faqs} />
      </main>
      <Footer />
    </div>
  );
}
