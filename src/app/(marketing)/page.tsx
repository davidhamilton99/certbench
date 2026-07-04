import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  FlaskConical,
  Gauge,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";

const FEATURES = [
  {
    icon: Gauge,
    title: "A readiness score you can trust",
    body: "Domain-weighted and confidence-penalised — it only climbs when you've genuinely covered the exam objectives, not when you've memorised one topic.",
  },
  {
    icon: ListChecks,
    title: "A daily plan, ordered by impact",
    body: "Every day CertBench looks at your performance and tells you the single most valuable thing to do next: review, drill, or full exam.",
  },
  {
    icon: CalendarClock,
    title: "Spaced repetition built in",
    body: "Questions you miss come back right before you'd forget them. Suspend cards you've truly mastered.",
  },
  {
    icon: FlaskConical,
    title: "Hands-on PBQ practice",
    body: "Interactive simulations, network topologies, and drag-to-order drills that mirror the performance-based questions on the real exam.",
  },
  {
    icon: BrainCircuit,
    title: "Adaptive practice exams",
    body: "Question selection targets what you haven't seen, what you've missed, and your current skill level — proportional to real domain weights.",
  },
  {
    icon: Sparkles,
    title: "Your notes, turned into questions",
    body: "Paste any study material and the AI generates a quality-reviewed question set from it. Import from any chatbot too.",
  },
];

const CERTS = [
  "Security+ SY0-701",
  "Network+ N10-009",
  "A+ Core 1 220-1101",
  "A+ Core 2 220-1102",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 pb-20 pt-16 text-center sm:pt-24">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Know exactly what to study
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground">
            CertBench builds a personalised study plan from your actual
            performance — adaptive practice exams, spaced repetition, and a
            readiness score for CompTIA certifications.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Start studying free
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 font-mono text-xs text-muted-foreground">
            {CERTS.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </p>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="grid content-start gap-2">
                <Icon className="size-5 text-primary" />
                <h2 className="font-medium">{title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-3xl px-6 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="mt-8 grid gap-6">
            {[
              [
                "Take a 25-question diagnostic",
                "Establishes your baseline across every exam domain in about twenty minutes.",
              ],
              [
                "Follow your daily plan",
                "CertBench orders each day's work by impact: overdue reviews first, then your weakest domain, then new ground.",
              ],
              [
                "Walk in when the score says you're ready",
                "The readiness score is deliberately conservative — when it turns green, you've earned it.",
              ],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Stop guessing. Start passing.
            </h2>
            <p className="text-muted-foreground">
              Free to start — 2,300+ exam-style questions across four CompTIA
              certifications.
            </p>
            <Button asChild size="lg">
              <Link href="/register">
                Create your free account
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
