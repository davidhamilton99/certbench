"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock, Target } from "lucide-react";
import { ReadinessDial } from "@/components/instrument/ReadinessDial";
import { bandFor, bandVars } from "@/lib/readiness/band";
import { biggestOpportunity, daysUntil, projectFinish } from "@/core/path/checkpoint";
import type { CheckpointResult, PathGoal, PathStructure } from "@/core/path/types";
import { cn } from "@/lib/utils";

const HEADLINE = {
  work: "Here's your starting point.",
  close: "You're on your way.",
  ready: "You're in good shape.",
} as const;

const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * The checkpoint result: score on the readiness dial, how each domain went,
 * where the biggest gain is, and when the rest of the path gets done at the
 * pace they set. Ends with what to do next (`children`): the offer, or
 * "Continue" for Pro.
 */
export function PathReveal({
  result,
  structure,
  goal,
  remainingStops,
  children,
}: {
  result: CheckpointResult;
  structure: PathStructure;
  goal: PathGoal | null;
  remainingStops: number;
  children: ReactNode;
}) {
  const band = bandFor(result.score);
  const opportunity = biggestOpportunity(result, structure.domains);
  // "Today" for the projection, fixed for the life of the screen.
  const [now] = useState(() => Date.now());
  const minutes = goal?.minutes || 20;
  const finish = projectFinish(remainingStops, minutes, now);
  // A booked date wins; otherwise the date they're aiming for.
  const examDay = goal?.examDate ?? goal?.target ?? null;
  const what = goal?.examDate ? "your exam" : "your target date";
  const daysToExam = examDay ? daysUntil(examDay, now) : null;
  const daysToFinish = Math.max(1, Math.round((finish.getTime() - now) / 86_400_000) + 1);

  let pace: string;
  if (daysToExam !== null && daysToExam >= 0) {
    const spare = daysToExam - daysToFinish;
    pace =
      spare >= 3
        ? `That leaves ${spare} days before ${what} to review and take full practice exams.`
        : spare >= 0
          ? `That's right up against ${what}. More time a day buys you review days.`
          : `${what === "your exam" ? "Your exam" : "Your target date"} is ${daysToExam} days away. Plan on more time a day, or start with your weakest domains.`;
  } else {
    pace = "Set your exam date when you book it, and the path keeps you on schedule.";
  }

  return (
    <div className="path-rise grid gap-6">
      <div
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
        style={bandVars(band)}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "var(--rv-accent-dim)" }}
        />
        <div className="relative grid justify-items-center gap-2 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Readiness checkpoint · {structure.examName}
          </span>
          <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {HEADLINE[band.key as keyof typeof HEADLINE] ?? HEADLINE.work}
          </h2>
          <ReadinessDial score={result.score} band={band} caption="Checkpoint" size={250} />
          <p className="max-w-sm text-balance text-sm text-muted-foreground">
            {result.score}% across {result.domains.reduce((s, d) => s + d.total, 0)} exam-style
            questions, weighted the way the real exam weights its domains. 75% is where we call it
            exam-ready.
          </p>
        </div>

        <ul className="relative mt-6 grid gap-3">
          {structure.domains.map((d, i) => {
            const r = result.domains.find((x) => x.number === d.number);
            const pct = r && r.total > 0 ? Math.round((r.correct / r.total) * 100) : null;
            const tone = pct === null ? null : bandFor(pct);
            return (
              <li key={d.number} className="grid gap-1.5" style={{ animationDelay: `${300 + i * 90}ms` }}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {d.number.replace(/\.0$/, "")}
                    </span>
                    {d.title}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {r ? `${r.correct}/${r.total}` : "not asked"}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${pct ?? 0}%`, background: tone?.accent }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {opportunity && (
          <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <Target className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="grid gap-0.5 text-sm">
              <span className="font-medium">Biggest opportunity</span>
              <span className="text-muted-foreground">
                {opportunity.title}, {opportunity.weight}% of the exam.
              </span>
            </div>
          </div>
        )}
        <div className={cn("flex gap-3 rounded-2xl border border-border bg-card p-4", !opportunity && "sm:col-span-2")}>
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="grid gap-0.5 text-sm">
            <span className="font-medium">
              {remainingStops > 0
                ? `At ${minutes} minutes a day, you finish the path by ${fmt(finish)}`
                : "You've finished every stop on the path"}
            </span>
            <span className="text-muted-foreground">{remainingStops > 0 ? pace : "Keep practicing to hold your score."}</span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
