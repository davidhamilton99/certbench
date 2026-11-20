import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { Testimonials } from "@/components/marketing/Testimonials";
import { ExamPicker } from "@/components/path/ExamPicker";
import { HeroDemo } from "@/components/home/HeroDemo";
import { InView } from "@/components/home/InView";
import { ReadinessShowcase } from "@/components/home/ReadinessShowcase";
import { RouteShowcase } from "@/components/home/RouteShowcase";
import { createAnonClient } from "@/server/supabase/anon";
import { listApprovedTestimonials } from "@/server/data/testimonials";
import { loadPathBank } from "@/server/path/bank";
import { authoredToRep } from "@/server/path/build-stop";
import { buildPlan, LEARN_BEFORE_CHECKPOINT } from "@/core/path/plan";
import { seededRng, seedFrom } from "@/core/path/compose";
import type { PathStructure } from "@/core/path/types";
import { EXAM_CODES } from "@/core/path/versions";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import { warmup } from "@/data/path/security-plus-sy0-701/domains-1-2";

// The root layout's self-referencing canonical ("./") resolves to
// "/index" for the home route — pin the homepage's canonical to the site
// root so Google consolidates on https://certbench.dev/.
export const metadata = {
  alternates: { canonical: "/" },
};

export const revalidate = 3600; // refresh approved testimonials hourly

/** The exam the homepage shows off: the one most people come for. */
const CERT = "security-plus-sy0-701";

/** SY0-701's domains, named short enough for the map beside the demo. */
const DOMAINS = [
  { number: "1.0", title: "General security concepts", word: "Concepts", weight: 12 },
  { number: "2.0", title: "Threats and mitigations", word: "Threats", weight: 22 },
  { number: "3.0", title: "Security architecture", word: "Architecture", weight: 18 },
  { number: "4.0", title: "Security operations", word: "Operations", weight: 28 },
  { number: "5.0", title: "Program oversight", word: "Oversight", weight: 20 },
];

/** The test drive: four warm-up questions, a port, two scenarios and a principle. */
const DEMO_KEYS = ["w1", "w5", "w3", "w7"];

/** A sample rehearsal for the readiness instrument (weighted, it comes to 82). */
const SAMPLE = { score: 82, from: 61, domains: [88, 79, 74, 83, 86] };

/** The exam's real structure (labs included) when the bank answers; its outline otherwise. */
async function examStructure(): Promise<PathStructure> {
  const bank = await loadPathBank(CERT).catch(() => null);
  const titles = OBJECTIVE_TITLES[CERT];
  const base: PathStructure = bank?.structure ?? {
    certSlug: CERT,
    examName: "Security+",
    examCode: EXAM_CODES[CERT],
    domains: DOMAINS.map((d) => ({
      number: d.number,
      title: d.title,
      weight: d.weight,
      objectives: Object.keys(titles)
        .filter((code) => `${code.split(".")[0]}.0` === d.number)
        .map((code) => ({ code, title: titles[code] })),
    })),
  };
  return {
    ...base,
    domains: base.domains.map((d) => ({
      ...d,
      title: DOMAINS.find((x) => x.number === d.number)?.title ?? d.title,
    })),
  };
}

export default async function LandingPage() {
  // Fail-safe: the homepage must render even if the table is pre-migration
  // or the DB hiccups. No testimonials → the section simply doesn't show.
  const [testimonials, structure] = await Promise.all([
    listApprovedTestimonials(createAnonClient(), 6).catch(() => []),
    examStructure(),
  ]);
  const plan = buildPlan(structure);
  const reps = DEMO_KEYS.flatMap((key) => {
    const a = warmup.find((w) => w.key === key);
    return a ? [authoredToRep(a, seededRng(seedFrom("home-demo", key)))] : [];
  });

  return (
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero: the promise, the one choice, then the product itself to play. */}
        <section className="relative isolate overflow-hidden pb-20 sm:pb-28">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-22rem] -z-10 h-[46rem] w-[78rem] -translate-x-1/2 rounded-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_22%,transparent),transparent)]"
          />
          <div className="mx-auto grid max-w-6xl justify-items-center gap-6 px-5 pt-16 text-center sm:px-6 sm:pt-24">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              CompTIA Security+ · Network+ · A+
            </p>
            <h1 className="cb-display text-balance text-[2.75rem] sm:text-7xl lg:text-[5.75rem]">
              Pass your exam.
              <span className="block text-muted-foreground/70">One short stop at a time.</span>
            </h1>
            <div id="exams" className="mt-6 grid w-full max-w-2xl gap-4 text-left sm:mt-8">
              <ExamPicker surface="home" />
              <p className="text-center text-sm text-muted-foreground">Free to start · No account needed</p>
            </div>
          </div>

          {/* The test drive, on a screen tilted back like a display on a stand. */}
          <div className="relative mx-auto mt-16 w-full max-w-6xl px-3 sm:mt-24 sm:px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -bottom-48 top-[8%] -z-10 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_20%,transparent),color-mix(in_oklab,var(--primary)_11%,transparent)_55%,transparent)]"
            />
            <div className="cb-settle">
              <div className="glass overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]">
                <HeroDemo reps={reps} structure={structure} stops={plan.stops.length} />
              </div>
            </div>
          </div>
        </section>

        <RouteShowcase
          structure={structure}
          plan={plan}
          warmupSize={warmup.length}
          titles={Object.fromEntries(DOMAINS.map((d) => [d.number, d.word]))}
        />

        <ReadinessShowcase
          score={SAMPLE.score}
          from={SAMPLE.from}
          domains={DOMAINS.map((d, k) => ({ number: d.number, title: d.title, score: SAMPLE.domains[k] }))}
        />

        {testimonials.length >= 3 && <Testimonials items={testimonials} />}

        {/* Price, plainly, and the way in. */}
        <InView as="section" className="relative isolate overflow-hidden py-28 sm:py-40">
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[-24rem] left-1/2 -z-10 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]"
          />
          <div className="mx-auto grid max-w-3xl justify-items-center gap-8 px-6 text-center">
            <h2 className="cb-rise cb-display text-5xl sm:text-7xl">Start free.</h2>
            <div
              className="cb-rise grid w-full max-w-xl gap-3 text-left sm:grid-cols-2"
              style={{ "--rise-delay": "80ms" } as CSSProperties}
            >
              <div className="glass grid gap-1 rounded-2xl p-5">
                <p className="text-sm text-muted-foreground">Free · no card</p>
                <p className="text-[17px] font-semibold tracking-[-0.01em]">
                  Warm-up, {LEARN_BEFORE_CHECKPOINT} stops and the checkpoint
                </p>
              </div>
              <div className="glass grid gap-1 rounded-2xl p-5">
                <p className="text-sm text-muted-foreground">Pro · from $19 a month</p>
                <p className="text-[17px] font-semibold tracking-[-0.01em]">Every stop, lab and rehearsal</p>
              </div>
            </div>
            <div
              className="cb-rise flex flex-wrap items-center justify-center gap-2"
              style={{ "--rise-delay": "140ms" } as CSSProperties}
            >
              <Button asChild size="lg">
                <Link href="/start">
                  Start my path
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-muted-foreground hover:text-foreground">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </InView>
      </main>

      <Footer />
    </div>
  );
}
