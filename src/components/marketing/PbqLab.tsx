"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { PbqScenario } from "@/data/pbq/types";
import { PbqPlayer } from "@/components/workspace/PbqPlayer";
import { LAB_TYPES } from "@/components/path/lab-types";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How hard a free lab is, so a cold visitor can start easy. */
export type LabTier = "Warm-up" | "Core" | "Exam-level";

export interface FreeLab {
  scenario: PbqScenario;
  tier: LabTier;
  minutes: number;
}

/** Analytics context for the way onto the path once a lab is graded. */
const CONTEXT = "public_pbq";

/**
 * The public PBQ pages' labs, played the way the path plays one: pick one of
 * three, warm-up to exam-level, and work it on the path's lab stage with the
 * same player. Once one is graded, the way on is the exam's path, where Pro
 * opens every lab.
 */
export function PbqLab({
  labs,
  examName,
  pathHref,
  labCount,
}: {
  labs: FreeLab[];
  /** "Security+". */
  examName: string;
  pathHref: string;
  /** Every lab the exam has on the path. */
  labCount: number;
}) {
  const [selected, setSelected] = useState(0);
  // Bumped to remount the player when its scenario changes.
  const [attempt, setAttempt] = useState(0);
  const [graded, setGraded] = useState<ReadonlySet<string>>(() => new Set());
  const chooser = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const userId = useSessionUserId();

  const active = labs[selected];
  const activeId = active?.scenario.id;
  const activeType = active?.scenario.type;

  useEffect(() => {
    if (!activeId || !activeType) return;
    track("pbq_started", { scenario_id: activeId, scenario_type: activeType, surface: "public" });
  }, [activeId, activeType]);

  if (!active) return null;

  function pick(i: number, focusStage = false) {
    if (i !== selected) {
      setSelected(i);
      setAttempt((n) => n + 1);
    }
    if (focusStage) {
      const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      stage.current?.scrollIntoView?.({ block: "start", behavior: still ? "auto" : "smooth" });
    }
  }

  /** The player's way back: up to the other labs. */
  function toChooser() {
    const el = chooser.current;
    if (!el) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "center", behavior: still ? "auto" : "smooth" });
    el.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus({ preventScroll: true });
  }

  // After a lab, the next one not done yet, so the way on can offer it too.
  const nextIndex = labs.findIndex((l, i) => i !== selected && !graded.has(l.scenario.id));
  const next = nextIndex >= 0 ? labs[nextIndex] : null;

  return (
    <div className="grid min-w-0 gap-4">
      <div ref={chooser} role="group" aria-label="Pick a lab" className="grid scroll-mt-24 grid-cols-3 gap-2">
        {labs.map((lab, i) => {
          const isActive = i === selected;
          const done = graded.has(lab.scenario.id);
          const { Icon } = LAB_TYPES[lab.scenario.type];
          return (
            <button
              key={lab.scenario.id}
              type="button"
              aria-pressed={isActive}
              aria-label={`${lab.tier}: ${lab.scenario.title}, about ${lab.minutes} minutes${done ? ", done" : ""}`}
              onClick={() => pick(i)}
              className={cn(
                "grid min-w-0 content-start gap-2 rounded-2xl border p-3 text-left transition-[border-color,background-color] duration-150 sm:p-3.5",
                isActive
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border bg-card/60 hover:border-primary/50 hover:bg-primary/[0.03]"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl",
                    done ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <Icon className="size-4" aria-hidden />}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{lab.minutes} min</span>
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] font-medium uppercase tracking-wider",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {lab.tier}
              </span>
              <span className="hidden text-sm font-medium leading-snug sm:block">{lab.scenario.title}</span>
            </button>
          );
        })}
      </div>

      {/* min-w-0: a lab's tab row doesn't wrap, and would widen a phone's page. */}
      <div ref={stage} className="glass min-w-0 scroll-mt-24 rounded-3xl p-4 sm:p-6">
        <PbqPlayer
          key={`${active.scenario.id}-${attempt}`}
          scenario={active.scenario}
          backLabel="Pick another lab"
          onBack={toChooser}
          onGraded={() =>
            setGraded((prev) => (prev.has(active.scenario.id) ? prev : new Set([...prev, active.scenario.id])))
          }
        />
      </div>

      {graded.size > 0 && (
        <NextOnPath
          examName={examName}
          pathHref={pathHref}
          labCount={labCount}
          signedIn={Boolean(userId)}
          next={next}
          onNext={() => pick(nextIndex, true)}
        />
      )}
    </div>
  );
}

/**
 * Once a lab is graded: the path is the way on, the way the path itself
 * follows a lab with the next stop. Another free lab stays one tap away.
 */
function NextOnPath({
  examName,
  pathHref,
  labCount,
  signedIn,
  next,
  onNext,
}: {
  examName: string;
  pathHref: string;
  labCount: number;
  signedIn: boolean;
  next: FreeLab | null;
  onNext: () => void;
}) {
  useEffect(() => {
    track("upsell_viewed", { context: CONTEXT });
  }, []);

  return (
    <div className="glass path-rise grid gap-5 rounded-3xl p-5 sm:p-6">
      <div className="grid gap-1.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Next · your {examName} path
        </p>
        <p className="text-balance font-display text-xl font-semibold tracking-tight">
          PBQs are one part of the exam. Your path covers all of it.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          It walks every {examName} objective in short stops, and a readiness checkpoint shows where you stand. Pro
          adds all {labCount} {examName} labs to it, one closing each domain.
        </p>
      </div>
      <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        <Button asChild size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
          <Link href={pathHref} onClick={() => track("upsell_clicked", { context: CONTEXT, href: pathHref })}>
            {signedIn ? "Open my path" : "Start my path"}
            <ArrowRight />
          </Link>
        </Button>
        {next && (
          <Button variant="outline" size="lg" className="h-12 w-full px-6 text-base sm:w-auto" onClick={onNext}>
            Try the {next.tier.toLowerCase()} lab
          </Button>
        )}
      </div>
      {!signedIn && <p className="text-xs text-muted-foreground">Free, no account needed to start.</p>}
    </div>
  );
}
