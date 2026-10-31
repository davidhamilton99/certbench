import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { Testimonials } from "@/components/marketing/Testimonials";
import { PathShowcase } from "@/components/marketing/PathShowcase";
import { ExamPicker } from "@/components/path/ExamPicker";
import { createAnonClient } from "@/server/supabase/anon";
import { listApprovedTestimonials } from "@/server/data/testimonials";

// The root layout's self-referencing canonical ("./") resolves to
// "/index" for the home route — pin the homepage's canonical to the site
// root so Google consolidates on https://certbench.dev/.
export const metadata = {
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    title: "Pick your exam",
    body: "One tap. It's the only choice you make — from there, every step is laid out for you.",
  },
  {
    title: "Play short stops",
    body: "Each stop teaches one exam objective in about three minutes of quick questions. What you miss comes back until it sticks.",
  },
  {
    title: "See where you stand",
    body: "A readiness checkpoint scores you the way the real exam weights its domains, and your map shows exactly what's left.",
  },
];

export const revalidate = 3600; // refresh approved testimonials hourly

export default async function LandingPage() {
  // Fail-safe: the homepage must render even if the table is pre-migration
  // or the DB hiccups. No testimonials → the section simply doesn't show.
  const testimonials = await listApprovedTestimonials(createAnonClient(), 6).catch(
    () => []
  );

  return (
    <div className="relative flex min-h-svh flex-col aurora-bg text-foreground">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero: the exam picker is the call to action. */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-[-30%] h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_35%,black,transparent)]" />
          </div>

          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-24 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16">
            <div className="grid gap-7">
              <div className="grid gap-5 text-center lg:text-left">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  CompTIA Security+ · Network+ · A+
                </p>
                <h1 className="text-balance font-display text-5xl font-semibold tracking-tight sm:text-6xl">
                  Pass your exam one{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    short step
                  </span>{" "}
                  at a time
                </h1>
                <p className="mx-auto max-w-xl text-balance text-lg text-muted-foreground lg:mx-0">
                  CertBench lays out every exam objective as a path of quick,
                  interactive stops and shows you where you stand as you go. No
                  planning. No wondering what to study next.
                </p>
              </div>

              <div className="mx-auto grid w-full max-w-xl gap-3 lg:mx-0">
                <p className="text-sm font-medium">Which exam are you taking?</p>
                <ExamPicker surface="home" />
                <p className="text-sm text-muted-foreground">
                  Free to start. No account needed for your first stop.
                </p>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <PathShowcase />
            </div>
          </div>
        </section>

        {/* How it works — a real sequence, so it's numbered. */}
        <section className="border-t border-border/50">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight">
              How it works
            </h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map(({ title, body }, i) => (
                <li key={title} className="glass grid content-start gap-3 rounded-2xl p-6">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 font-mono text-sm font-semibold text-primary ring-1 ring-primary/25">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {testimonials.length >= 3 && <Testimonials items={testimonials} />}

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center">
            <h2 className="text-balance font-display text-4xl font-bold tracking-tight">
              Your first stop takes three minutes.
            </h2>
            <p className="max-w-md text-balance text-muted-foreground">
              Start now, no account needed. Save your map when you want to keep
              going.
            </p>
            <Button asChild size="lg" className="mt-1 h-12 px-6 text-base">
              <Link href="/start">
                Start my path
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
