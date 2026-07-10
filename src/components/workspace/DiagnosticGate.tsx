import Link from "next/link";
import { Activity, ArrowRight, Gauge, ListChecks, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

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
 * First-run dashboard state (no diagnostic yet). Replaces the plan/readiness
 * split with a single unmistakable call to take the diagnostic — the app's
 * "aha" moment — so a new user (especially on mobile) can't miss it behind an
 * empty readiness gauge.
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
        <h1 className="text-2xl font-semibold tracking-tight">{certName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs">
            {examCode}
          </span>{" "}
          · let&apos;s build your study plan
        </p>
      </div>

      <div className="grid justify-items-center gap-5 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Activity className="size-6 text-primary" />
        </span>
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Start with a quick diagnostic
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            25 questions across every {certName} domain — about 20 minutes.
            You&apos;ll get your readiness score and a plan built around your
            weakest spots, so you never wonder what to study next.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href={href}>
            Start the diagnostic
            <ArrowRight />
          </Link>
        </Button>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>~20 minutes</span>
          <span aria-hidden>·</span>
          <span>Resume anytime</span>
          <span aria-hidden>·</span>
          <span>Nothing to lose</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PERKS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="grid content-start gap-1.5 rounded-xl border bg-card p-4">
            <Icon className="size-4 text-primary" />
            <span className="text-sm font-medium">{title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {body}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
