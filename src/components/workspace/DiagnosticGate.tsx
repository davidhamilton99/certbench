import Link from "next/link";
import { Activity, ArrowRight, Gauge, ListChecks, Target } from "lucide-react";

const PERKS = [
  {
    icon: Gauge,
    title: "A readiness score",
    body: "See exactly how ready you are — a number you can trust.",
  },
  {
    icon: ListChecks,
    title: "A daily plan",
    body: "The highest-impact work each day, ordered for you.",
  },
  {
    icon: Target,
    title: "Weak-spot focus",
    body: "Drill the domains you actually miss, not the ones you know.",
  },
];

/**
 * First-run dashboard state (no diagnostic yet) — the instrument-styled doorway
 * into the diagnostic. A single unmistakable call to action so a new user can't
 * miss the app's "aha" moment behind an empty readiness gauge.
 */
export function DiagnosticGate({
  certName,
  examCode,
  href,
}: {
  certName: string;
  examCode: string;
  href: string;
}) {
  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {certName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs">
            {examCode}
          </span>{" "}
          · let&apos;s build your study plan
        </p>
      </div>

      <div className="relative grid justify-items-center gap-5 overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {/* Ambient glow — a calm signal that something's about to begin. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        />
        <span className="relative flex size-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
          <Activity className="size-7 text-primary" />
        </span>
        <div className="relative grid gap-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Start with a quick diagnostic
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            25 questions across every {certName} domain — about 20 minutes.
            You&apos;ll get your readiness score and a plan built around your
            weakest spots, so you never wonder what to study next.
          </p>
        </div>
        <Link
          href={href}
          className="relative inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground shadow-[0_14px_34px_-14px_var(--color-primary)] transition-transform hover:-translate-y-0.5"
        >
          Start the diagnostic
          <ArrowRight className="size-4" />
        </Link>
        <p className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
          <span>~20 minutes</span>
          <span aria-hidden>·</span>
          <span>Resume anytime</span>
          <span aria-hidden>·</span>
          <span>Nothing to lose</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PERKS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="grid content-start gap-1.5 rounded-xl border border-border bg-card p-4"
          >
            <Icon className="size-4 text-primary" />
            <span className="font-display text-sm font-medium">{title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {body}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
