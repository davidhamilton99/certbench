"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowRight,
  Brain,
  Briefcase,
  CalendarCheck,
  Check,
  FileCheck,
  Gauge,
  GraduationCap,
  Hand,
  Loader2,
  RefreshCw,
  RotateCcw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { createClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_SHORT } from "@/lib/pricing/guarantee";
import { completeOnboarding } from "@/contracts/user";
import { createCheckout } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CertOption {
  id: string;
  name: string;
  examCode: string;
}

type IconType = ComponentType<{ className?: string }>;
type Why = "career" | "promotion" | "required" | "school" | "skills";
type Level = "new" | "some" | "refresh" | "retake";
type Hours = "casual" | "steady" | "allin";

const WHY_OPTIONS: { value: Why; label: string; icon: IconType }[] = [
  { value: "career", label: "Break into IT", icon: Rocket },
  { value: "promotion", label: "Promotion or raise", icon: TrendingUp },
  { value: "required", label: "My job requires it", icon: Briefcase },
  { value: "school", label: "School or program", icon: GraduationCap },
  { value: "skills", label: "Level up my skills", icon: Sparkles },
];

const LEVEL_OPTIONS: { value: Level; label: string; icon: IconType }[] = [
  { value: "new", label: "Total beginner", icon: Hand },
  { value: "some", label: "Some experience", icon: Briefcase },
  { value: "refresh", label: "Just refreshing", icon: RefreshCw },
  { value: "retake", label: "Retaking it", icon: RotateCcw },
];

const HOURS_OPTIONS: { value: Hours; label: string; sub: string }[] = [
  { value: "casual", label: "A few hrs / week", sub: "Casual" },
  { value: "steady", label: "3–7 hrs / week", sub: "Steady" },
  { value: "allin", label: "8+ hrs / week", sub: "All in" },
];

const WHY_HEADLINE: Record<Why, string> = {
  career: "This cert is your way in.",
  promotion: "This cert earns the raise.",
  required: "Let's knock it out.",
  school: "Pass it first try.",
  skills: "Let's make it count.",
};

const HOURS_LABEL: Record<Hours, string> = {
  casual: "a few hrs/week",
  steady: "3–7 hrs/week",
  allin: "8+ hrs/week",
};

/** The weekly hours they picked, spread over 7 days — so the plan's daily ask matches their answer. */
const DAILY_LABEL: Record<Hours, string> = {
  casual: "~20 min a day",
  steady: "30–60 min a day",
  allin: "70+ min a day",
};

const PLAN_ITEMS: { icon: IconType; label: string; sub: string }[] = [
  { icon: CalendarCheck, label: "Full practice exams", sub: "Timed, exam-weighted" },
  { icon: Terminal, label: "Hands-on PBQs", sub: "The part that decides it" },
  { icon: Gauge, label: "Readiness score", sub: "Know when to book" },
  { icon: ShieldCheck, label: "Pass guarantee", sub: PASS_GUARANTEE_SHORT },
];

const DAY_ITEMS: { icon: IconType; label: string; sub: string }[] = [
  { icon: RefreshCw, label: "Review", sub: "Spaced repetition locks it in" },
  { icon: Target, label: "Drill your weakest domain", sub: "Where you'll gain the most" },
  { icon: FileCheck, label: "New questions", sub: "Exam-weighted, fully explained" },
];

function weeksUntil(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const exam = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.ceil((exam - today) / (7 * 86_400_000)));
}

/** A bare ApiError carries its code as the message — never show that raw. */
function checkoutErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === "rate_limited") {
    return "Too many checkout attempts — give it a few minutes and try again.";
  }
  if (err instanceof ApiError && err.message !== err.code) return err.message;
  return "Couldn't open checkout — try again.";
}

function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* Steps */
const CERT = 0;
const WHY = 1;
const STAT = 2;
const LEVEL = 3;
const DATE = 4;
const HOURS = 5;
const COMMIT = 6;
const BUILDING = 7;
const PLAN = 8;
const PAYWALL = 9;
const LAST_INPUT = COMMIT;

/** Big, tappable single-select; selecting it advances the flow. */
function OptionButton({
  label,
  sub,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  sub?: string;
  icon?: IconType;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group flex items-center gap-3.5 rounded-2xl border bg-card px-4 py-4 text-left transition-all duration-150",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary group-hover:bg-primary/20"
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
      <ArrowRight
        className={cn(
          "size-4 shrink-0 transition-all",
          selected
            ? "text-primary"
            : "-translate-x-1 text-muted-foreground opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
        )}
      />
    </button>
  );
}

/**
 * The signup goal-setting funnel — a short, punchy, visual sequence that ends
 * on a personalized plan and the Pro unlock. We sell at the peak of motivation,
 * before the user can wander the app and cool off.
 *
 * `preview` skips the real onboarding write so the flow can be shown off-auth.
 * `resume` reopens the flow at the offer for someone who already set their
 * goal but hasn't paid (e.g. backed out of Stripe Checkout).
 */
export function OnboardingFlow({
  certifications,
  preview = false,
  resume,
}: {
  certifications: CertOption[];
  preview?: boolean;
  resume?: { certId: string | null; why: string | null; examDate: string | null };
}) {
  const resumeWhy = WHY_OPTIONS.find((o) => o.value === resume?.why)?.value ?? null;
  const [step, setStep] = useState(resume ? PAYWALL : CERT);
  const [certId, setCertId] = useState<string | null>(resume?.certId ?? null);
  const [why, setWhy] = useState<Why | null>(resumeWhy);
  const [level, setLevel] = useState<Level | null>(null);
  const [examDate, setExamDate] = useState(resume?.examDate ?? "");
  const [hours, setHours] = useState<Hours | null>(null);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const cert = certifications.find((c) => c.id === certId);
  const certShort = cert?.name.replace("CompTIA ", "") ?? "your exam";

  /** Funnel telemetry — see each step's drop-off in PostHog. No-op in preview. */
  const logStep = (name: string, value?: string) => {
    if (!preview) track("onboarding_step", { step: name, value });
  };

  // Flow entered — top of the goal-setting funnel. A resume isn't a new entry.
  useEffect(() => {
    if (!preview && !resume) track("onboarding_started", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser Back from Stripe can restore this page from the back/forward
  // cache with the button still spinning; re-arm it.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setCheckingOut(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  /** The offer is the quarterly plan ($39 / exam cycle): go straight to Stripe. */
  const checkout = async () => {
    if (preview) return;
    track("onboarding_unlock_clicked", {});
    track("checkout_started", { interval: "quarterly" });
    setCheckingOut(true);
    setError("");
    try {
      const { url } = await api(createCheckout, {
        interval: "quarterly",
        returnTo: "onboarding",
      });
      window.location.href = url;
    } catch (err) {
      // Session expired mid-flow: sign back in, then land on this offer again.
      if (err instanceof ApiError && err.code === "unauthorized") {
        window.location.href = "/login?next=/onboarding";
        return;
      }
      setError(checkoutErrorMessage(err));
      setCheckingOut(false);
    }
  };

  useEffect(() => {
    if (step !== BUILDING) return;
    let active = true;
    const started = Date.now();
    (async () => {
      try {
        if (!preview) {
          await api(completeOnboarding, {
            certId: certId!,
            examDate: examDate || null,
          });
          // Persist the goal answers on the auth user for later personalization
          // (the plan email, in-app tone). Best-effort: a metadata hiccup must
          // never block the plan reveal, so fire-and-forget with a swallowed
          // rejection. Cert + exam date are already persisted above.
          createClient()
            .auth.updateUser({
              data: {
                cert_reason: why,
                experience_level: level,
                weekly_hours: hours,
              },
            })
            .catch(() => {});
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Something went wrong");
        setStep(HOURS);
        return;
      }
      const wait = Math.max(0, 1700 - (Date.now() - started));
      setTimeout(() => {
        if (!active) return;
        if (!preview) {
          track("onboarding_plan_revealed", {
            cert: certShort,
            weeks: examDate ? weeksUntil(examDate) : null,
          });
        }
        setStep(PLAN);
      }, wait);
    })();
    return () => {
      active = false;
    };
  }, [step, certId, certShort, examDate, why, level, hours, preview]);

  /* ---- Building beat ---- */
  if (step === BUILDING) {
    return (
      <div className="mx-auto grid w-full max-w-md justify-items-center gap-5 py-20 text-center">
        <span className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <Brain className="size-8" />
          </span>
        </span>
        <p className="font-display text-xl font-bold tracking-tight">
          Building your plan…
        </p>
        <p className="text-sm text-muted-foreground">Weighting your exam. Pacing your days.</p>
      </div>
    );
  }

  /* ---- Plan reveal (the destination) ---- */
  if (step === PLAN) {
    const weeks = examDate ? weeksUntil(examDate) : null;
    const dateLabel = examDate ? formatDate(examDate) : null;

    return (
      <div className="mx-auto grid w-full max-w-md gap-5">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" />
            Your plan is ready
          </span>
          <h1 className="mt-3 text-balance font-display text-3xl font-bold leading-[1.1] tracking-tight">
            Pass {certShort}
            {dateLabel ? (
              <>
                {" "}
                by <span className="text-primary">{dateLabel}</span>
              </>
            ) : null}
            .
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {weeks ? `${weeks} weeks · ` : ""}
            {HOURS_LABEL[hours ?? "steady"]}
          </p>
        </div>

        {/* What a day actually looks like — concrete and honest, no made-up
            percentages that invite "you don't know how fast I learn". */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Your daily plan
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {DAILY_LABEL[hours ?? "steady"]}
            </span>
          </div>
          <div className="grid gap-3.5">
            {DAY_ITEMS.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{sub}</span>
                </span>
                <Check className="size-4 shrink-0 text-muted-foreground/40" />
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-border pt-3.5 text-center text-xs text-muted-foreground">
            Rebuilt every day from how you&apos;re doing. You just show up.
          </p>
        </div>

        {/* Plan — visual chips, not prose. */}
        <div className="grid grid-cols-2 gap-3">
          {PLAN_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="grid content-start gap-2 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-bold leading-tight">{label}</span>
              <span className="text-xs text-muted-foreground">{sub}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-sm font-semibold">
          One system. Not five tabs.
        </p>

        <Button
          size="lg"
          className="h-12 w-full text-base"
          onClick={() => {
            if (!preview) {
              track("onboarding_paywall_viewed", {
                cert: certShort,
                weeks: examDate ? weeksUntil(examDate) : null,
              });
            }
            setStep(PAYWALL);
          }}
        >
          Start my plan
          <ArrowRight />
        </Button>
      </div>
    );
  }

  /* ---- Paywall (the ask) ---- */
  if (step === PAYWALL) {
    const weeks = examDate ? weeksUntil(examDate) : null;
    const headline = why ? WHY_HEADLINE[why] : "Let's get you certified.";

    return (
      <div className="mx-auto grid w-full max-w-md gap-5">
        <div className="text-center">
          <h1 className="text-balance font-display text-3xl font-bold leading-[1.1] tracking-tight">
            {headline}
          </h1>
          {weeks && (
            <p className="mt-2 text-sm font-bold text-primary">
              {weeks} weeks out. Start today.
            </p>
          )}
        </div>

        {/* Positioning — reframes the category, no brand names / no implied ties. */}
        <div className="grid gap-1.5 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Other tools get you studying.
          </p>
          <p className="font-display text-xl font-bold tracking-tight">
            CertBench gets you <span className="text-primary">certified.</span>
          </p>
        </div>

        {/* The offer — big, premium. */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/50 bg-gradient-to-b from-primary/10 to-card p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative grid gap-4">
            <div className="flex items-end justify-center gap-1.5">
              <span className="font-display text-4xl font-bold tracking-tight">$39</span>
              <span className="pb-1 text-sm text-muted-foreground">/ exam cycle</span>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              About $3 a week. Renews every 3 months — cancel anytime.
            </p>
            <Button
              size="lg"
              className="h-12 w-full text-base"
              disabled={checkingOut}
              onClick={checkout}
            >
              {checkingOut ? (
                <>
                  <Loader2 className="animate-spin" />
                  Opening secure checkout…
                </>
              ) : (
                <>
                  Unlock my plan
                  <ArrowRight />
                </>
              )}
            </Button>
            {error && (
              <p role="alert" className="text-center text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-success">
              <ShieldCheck className="size-4" />
              Pass guarantee
              <span className="text-muted-foreground">·</span>
              {/* New tab: leaving would drop the flow's in-memory answers. */}
              <a
                href={PASS_GUARANTEE_HREF}
                target="_blank"
                rel="noopener"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Input steps ---- */
  const progress = (Math.min(step, LAST_INPUT) / LAST_INPUT) * 100;

  return (
    <div className="mx-auto grid w-full max-w-md gap-7">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {step === CERT && (
        <div className="grid gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight">Which exam?</h1>
          <div className="grid gap-2.5">
            {certifications.map((c) => (
              <OptionButton
                key={c.id}
                label={c.name}
                sub={c.examCode}
                selected={certId === c.id}
                onClick={() => {
                  logStep("cert", c.examCode);
                  setCertId(c.id);
                  setStep(WHY);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {step === WHY && (
        <div className="grid gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight">What&apos;s the goal?</h1>
          <div className="grid gap-2.5">
            {WHY_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                label={o.label}
                icon={o.icon}
                selected={why === o.value}
                onClick={() => {
                  logStep("why", o.value);
                  setWhy(o.value);
                  setStep(STAT);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Credibility beat */}
      {step === STAT && (
        <div className="grid gap-5 rounded-3xl border border-border bg-gradient-to-b from-primary/10 to-card p-7 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <Terminal className="size-7" />
          </span>
          <p className="font-display text-2xl font-bold leading-tight tracking-tight">
            PBQs come first. And hit hardest.
          </p>
          <p className="text-sm text-muted-foreground">
            Most people underestimate them. Your plan won&apos;t.
          </p>
          <Button
            size="lg"
            className="h-12 w-full"
            onClick={() => {
              logStep("stat");
              setStep(LEVEL);
            }}
          >
            Let&apos;s go
            <ArrowRight />
          </Button>
        </div>
      )}

      {step === LEVEL && (
        <div className="grid gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight">Starting point?</h1>
          <div className="grid gap-2.5">
            {LEVEL_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                label={o.label}
                icon={o.icon}
                selected={level === o.value}
                onClick={() => {
                  logStep("level", o.value);
                  setLevel(o.value);
                  setStep(DATE);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {step === DATE && (
        <div className="grid gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight">Target exam date?</h1>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-[15px] dark:[color-scheme:dark]"
          />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                logStep("date", "skipped");
                setExamDate("");
                setStep(HOURS);
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Not sure yet
            </button>
            <Button
              size="lg"
              onClick={() => {
                logStep("date", "set");
                setStep(HOURS);
              }}
              disabled={!examDate}
            >
              Continue
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {step === HOURS && (
        <div className="grid gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight">Weekly study time?</h1>
          <div className="grid gap-2.5">
            {HOURS_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                label={o.label}
                sub={o.sub}
                selected={hours === o.value}
                onClick={() => {
                  logStep("hours", o.value);
                  setHours(o.value);
                  setStep(COMMIT);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Micro-commitment */}
      {step === COMMIT && (
        <div className="grid gap-5 rounded-3xl border border-border bg-gradient-to-b from-primary/10 to-card p-7 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-success text-primary-foreground">
            <Check className="size-7" strokeWidth={3} />
          </span>
          <h1 className="text-balance font-display text-2xl font-bold leading-tight tracking-tight">
            {examDate
              ? `Pass ${certShort} by ${formatDate(examDate)}?`
              : `Ready to pass ${certShort}?`}
          </h1>
          <p className="text-sm text-muted-foreground">We build it. You show up.</p>
          <Button
            size="lg"
            className="h-12 w-full text-base"
            onClick={() => {
              logStep("commit");
              setStep(BUILDING);
            }}
          >
            I&apos;m in
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}
