"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check, FlaskConical, Target } from "lucide-react";
import type { ExamResult } from "@/contracts/quiz";
import { api } from "@/lib/api-client";
import { updateExamDate } from "@/contracts/user";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";

/** Honest ballpark of weeks-to-ready from the raw diagnostic score. */
function estimateWeeks(scorePercent: number): string {
  if (scorePercent >= 80) return "2–3 weeks";
  if (scorePercent >= 60) return "3–5 weeks";
  if (scorePercent >= 40) return "5–7 weeks";
  return "6–8 weeks";
}

/* --- Climbing trajectory: today's readiness → the exam-ready line --- */

const VW = 300;
const VH = 92;
const READY = 75;
const yFor = (r: number) => 84 - (Math.max(0, Math.min(100, r)) / 100) * 76;

function TrajectorySvg({ start }: { start: number }) {
  const y0 = yFor(start);
  const yEnd = yFor(82);
  const yReady = yFor(READY);
  // Concave (fast-start) rise: control points pull the curve up early.
  const path = `M 14 ${y0} C 96 ${yEnd + 3}, 210 ${yEnd}, 286 ${yEnd}`;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" aria-hidden>
      {/* exam-ready line */}
      <line
        x1={10}
        y1={yReady}
        x2={290}
        y2={yReady}
        className="stroke-muted-foreground/40"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text x={290} y={yReady - 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
        exam-ready
      </text>
      {/* the climb */}
      <path d={path} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
      {/* today marker */}
      <circle cx={14} cy={y0} r={4} className="fill-primary" />
      <text x={20} y={y0 + 3} className="fill-foreground text-[10px] font-medium">
        Today {Math.round(start)}%
      </text>
    </svg>
  );
}

export function DiagnosticPathForward({
  result,
  certId,
  dashboardHref,
}: {
  result: ExamResult;
  certId: string;
  dashboardHref: string;
}) {
  const [examDate, setExamDate] = useState("");
  const [savedDate, setSavedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState("");

  const readiness = result.readiness?.overallScore ?? 0;
  const preliminary = result.readiness?.isPreliminary ?? true;

  // Domain accuracies (skip domains with no questions).
  const domains = result.domainBreakdown
    .filter((d) => d.total > 0)
    .map((d) => ({ ...d, acc: d.correct / d.total }));
  const weakest = domains.length
    ? domains.reduce((a, b) => (b.acc < a.acc ? b : a))
    : null;
  const allStrong =
    domains.length > 0 && domains.every((d) => d.acc >= 0.75);

  const today = new Date().toISOString().slice(0, 10);

  async function commitDate() {
    if (!examDate) return;
    setSaving(true);
    setDateError("");
    try {
      await api(updateExamDate, { certId, examDate });
      setSavedDate(examDate);
    } catch (err) {
      setDateError(err instanceof ApiError ? err.message : "Couldn't save that date");
    } finally {
      setSaving(false);
    }
  }

  const daysToExam = savedDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(savedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div className="grid gap-4 rounded-2xl border border-primary/30 bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Your path forward</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {allStrong
            ? "You're answering the multiple-choice like someone who's ready. Here's how to prove it and lock it in."
            : `Strongest so far: ${
                domains.reduce((a, b) => (b.acc > a.acc ? b : a)).title
              }. Biggest opportunity: ${weakest?.title}. Here's the climb.`}
        </p>
      </div>

      {/* Trajectory */}
      <div className="grid gap-2 rounded-xl border bg-background/40 p-4">
        <TrajectorySvg start={readiness} />
        <p className="text-sm text-muted-foreground">
          Most people at your level reach exam-ready in{" "}
          <span className="font-medium text-foreground">
            {estimateWeeks(result.scorePercent)}
          </span>{" "}
          at ~15 minutes a day.
          {preliminary && (
            <>
              {" "}
              Your readiness climbs{" "}
              <span className="font-medium text-foreground">fastest right now</span>{" "}
              — the next questions count the most.
            </>
          )}
        </p>
      </div>

      {/* Exam-date commitment */}
      <div className="rounded-xl border bg-background/40 p-4">
        {savedDate ? (
          <p className="flex items-center gap-2 text-sm">
            <Check className="size-4 shrink-0 text-success" />
            <span>
              Locked in —{" "}
              <span className="font-medium">
                {daysToExam} day{daysToExam === 1 ? "" : "s"} to go
              </span>
              . Your plan will pace you toward it.
            </span>
          </p>
        ) : (
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="size-4 text-primary" />
              Lock in your exam date
            </label>
            <p className="text-xs text-muted-foreground">
              A date turns this into a countdown and paces your daily plan. You
              can change it anytime.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                min={today}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button size="sm" onClick={commitDate} disabled={!examDate || saving}>
                {saving ? "Saving…" : "Set date"}
              </Button>
            </div>
            {dateError && <p className="text-xs text-danger">{dateError}</p>}
          </div>
        )}
      </div>

      {/* Adaptive next step */}
      {allStrong ? (
        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-xl border bg-background/40 p-4">
            <FlaskConical className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              The real exam opens with{" "}
              <span className="font-medium text-foreground">
                performance-based questions
              </span>{" "}
              — hands-on tasks where strong candidates lose points. That&apos;s
              your edge to sharpen next.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href="/pbq">
                Try a hands-on PBQ
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={dashboardHref}>See your study plan</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-xl border bg-background/40 p-4">
            <Target className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Start with{" "}
              <span className="font-medium text-foreground">{weakest?.title}</span>{" "}
              — you scored {weakest?.correct}/{weakest?.total} there, and it&apos;s
              the fastest way to move your readiness up.
            </p>
          </div>
          <Button asChild size="lg" className="justify-self-start">
            <Link href={dashboardHref}>
              Start closing your gap
              <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
