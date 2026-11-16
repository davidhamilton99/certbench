"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock, Target } from "lucide-react";
import { ReadinessDial } from "@/components/instrument/ReadinessDial";
import { bandFor, bandVars } from "@/lib/readiness/band";
import { biggestOpportunity, daysUntil, projectFinish } from "@/core/path/checkpoint";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { CheckpointResult, PathDomain, PathGoal, PathStructure } from "@/core/path/types";
import { cn } from "@/lib/utils";

/**
 * A checkpoint is a dozen questions, so its top band is a strong first read,
 * never "exam ready": that's a call for a full rehearsal to make. From Nov 1
 * to 15, 2026, 11 of the 13 people who finished one scored 75% or more, were
 * told they were exam-ready, and left without opening the offer under it.
 */
const HEADLINE = {
  work: "Here's your starting point.",
  close: "You're on your way.",
  ready: "A strong first read.",
} as const;

/** Under the score, in place of the band's own label where that would overclaim. */
const VERDICT: Partial<Record<string, string>> = { ready: "Strong start" };

const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * The checkpoint result: score on the readiness dial as a first read, how each
 * domain went, how much of the exam the path has taught so far, where the
 * biggest gain is, and when the rest of the path gets done at the pace they
 * set. Ends with what to do next (`children`): the offer, or "Continue" for Pro.
 */
export function PathReveal({
  result,
  structure,
  goal,
  remainingStops,
  studied,
  children,
}: {
  result: CheckpointResult;
  structure: PathStructure;
  goal: PathGoal | null;
  remainingStops: number;
  /** Objectives whose learn stop is done. */
  studied: number;
  children: ReactNode;
}) {
  const band = bandFor(result.score);
  const opportunity = biggestOpportunity(result, structure.domains);
  const asked = result.domains.reduce((s, d) => s + d.total, 0);
  // What one answer is worth, so the size of the sample is plain.
  const each = asked > 0 ? Math.round(100 / asked) : 0;
  const objectives = structure.domains.reduce((n, d) => n + d.objectives.length, 0);
  const learned = Math.max(0, Math.min(studied, objectives));
  const ahead = objectives - learned;
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
      <ReadingCard
        result={result}
        structure={structure}
        kicker={`Readiness checkpoint · ${structure.examName}`}
        headline={HEADLINE[band.key as keyof typeof HEADLINE] ?? HEADLINE.work}
        caption="Checkpoint"
        verdict={VERDICT[band.key]}
        readyMark={false}
        summary={
          <>
            {result.score}% on {asked} exam-style questions, weighted the way the real exam weights its domains.
            <span className="mt-1.5 block">
              A first read, not a verdict: each answer moves it about {each} points, and the real exam asks up to{" "}
              {REHEARSAL_FORMATS.full.questions}.
            </span>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {ahead > 0 && (
          <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:col-span-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">
                {learned} of {objectives} objectives studied so far
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{ahead} ahead</span>
            </div>
            <div className="flex gap-0.5" aria-hidden>
              {Array.from({ length: objectives }, (_, i) => (
                <span key={i} className={cn("h-1.5 min-w-0 flex-1 rounded-full", i < learned ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              The checkpoint sampled all {structure.domains.length} domains, including ground your path hasn&apos;t
              reached. The stops ahead teach the other {ahead}, one objective at a time.
            </p>
          </div>
        )}
        {opportunity && <OpportunityNote domain={opportunity} />}
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

/**
 * A score on the readiness dial, banded, with how each domain went: the card a
 * checkpoint and a rehearsal both report on. Given `from`, the dial sweeps up
 * (or down) from the reading before.
 */
export function ReadingCard({
  result,
  structure,
  kicker,
  headline,
  caption,
  summary,
  from,
  verdict,
  readyMark = true,
}: {
  result: CheckpointResult;
  structure: PathStructure;
  kicker: string;
  headline: string;
  caption: string;
  summary: ReactNode;
  from?: number;
  /** Under the score, in place of the band's label ("Exam ready" and so on). */
  verdict?: string;
  /** The dial's "75 · READY" mark; off for a reading too small to call it. */
  readyMark?: boolean;
}) {
  const band = bandFor(result.score);
  return (
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
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{kicker}</span>
        <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">{headline}</h2>
        <ReadinessDial
          score={result.score}
          band={verdict ? { ...band, label: verdict } : band}
          caption={caption}
          size={250}
          from={from}
          readyMark={readyMark}
        />
        <p className="max-w-sm text-balance text-sm text-muted-foreground">{summary}</p>
      </div>

      <ul className="relative mt-6 grid gap-3">
        {structure.domains.map((d, i) => {
          const r = result.domains.find((x) => x.number === d.number);
          const pct = r && r.total > 0 ? Math.round((r.correct / r.total) * 100) : null;
          const tone = pct === null ? null : bandFor(pct);
          // min-w-0: a long domain title truncates instead of pushing the row past the card on a phone.
          return (
            <li key={d.number} className="grid min-w-0 gap-1.5" style={{ animationDelay: `${300 + i * 90}ms` }}>
              <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{d.number.replace(/\.0$/, "")}</span>
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
  );
}

/** The domain with the most to gain, as a note beside a result. */
export function OpportunityNote({ domain }: { domain: PathDomain }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      <Target className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="grid gap-0.5 text-sm">
        <span className="font-medium">Biggest opportunity</span>
        <span className="text-muted-foreground">
          {domain.title}, {domain.weight}% of the exam.
        </span>
      </div>
    </div>
  );
}
