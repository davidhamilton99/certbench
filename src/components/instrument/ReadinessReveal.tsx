"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check } from "lucide-react";
import type { ExamResult } from "@/contracts/quiz";
import { api } from "@/lib/api-client";
import { updateExamDate } from "@/contracts/user";
import { ApiError } from "@/contracts/common";
import { bandFor, bandVars } from "@/lib/readiness/band";
import { ReadinessDial } from "@/components/instrument/ReadinessDial";
import { cn } from "@/lib/utils";

/** Honest ballpark of weeks-to-ready from the raw diagnostic score. */
function estimateWeeks(score: number): string {
  if (score >= 80) return "2–3 weeks";
  if (score >= 60) return "3–5 weeks";
  if (score >= 40) return "5–7 weeks";
  return "6–8 weeks";
}

/* Climbing trajectory: today's score → the exam-ready line. */
function Trajectory({ start }: { start: number }) {
  const yFor = (r: number) => 82 - (Math.max(0, Math.min(100, r)) / 100) * 70;
  const y0 = yFor(start);
  const yEnd = yFor(84);
  const yReady = yFor(75);
  const path = `M 16 ${y0} C 120 ${yEnd + 4}, 210 ${yEnd}, 286 ${yEnd}`;
  return (
    <svg viewBox="0 0 300 96" className="w-full" aria-hidden>
      <defs>
        <linearGradient id="rv-climb" x1="0" x2="1">
          <stop offset="0" stopColor="var(--rv-accent)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--rv-accent)" />
        </linearGradient>
      </defs>
      <line
        x1="12"
        y1={yReady}
        x2="290"
        y2={yReady}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text
        x="290"
        y={yReady - 5}
        textAnchor="end"
        className="fill-[var(--rv-muted)] font-mono text-[9px]"
      >
        exam-ready · 75
      </text>
      <path
        d={path}
        fill="none"
        stroke="url(#rv-climb)"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <circle cx="16" cy={y0} r={4.5} fill="var(--rv-accent)" />
      <text
        x="24"
        y={y0 + 3}
        className="fill-[var(--rv-ink)] font-mono text-[10px] font-semibold"
      >
        Today {Math.round(start)}%
      </text>
    </svg>
  );
}

export interface ReadinessRevealProps {
  result: ExamResult;
  certId: string;
  certName: string;
  examCode: string;
  dashboardHref: string;
  /** domainId → exam weight (%). Enables weighted "biggest opportunity". */
  domainWeights?: Record<string, number>;
}

/**
 * The post-diagnostic readiness reveal — CertBench 2.0's flagship moment. A
 * cinematic instrument stage: the score counts up on a glowing dial, the band
 * recolours everything, domains cascade in weighted by exam importance, and a
 * climb-to-exam-ready projection turns the number into a path. Replaces the
 * plain results card for the diagnostic.
 */
export function ReadinessReveal({
  result,
  certId,
  certName,
  examCode,
  dashboardHref,
  domainWeights,
}: ReadinessRevealProps) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const score = result.scorePercent;
  const band = bandFor(score);

  const domains = result.domainBreakdown
    .filter((d) => d.total > 0)
    .map((d) => ({
      ...d,
      acc: Math.round((d.correct / d.total) * 100),
      weight: domainWeights?.[d.domainId] ?? null,
    }));

  // Biggest opportunity = the most readiness points left on the table. With
  // weights that's (1 − accuracy) × weight; without, simply the weakest domain.
  let weakestId: string | null = null;
  if (domains.length) {
    weakestId = domains.reduce((best, d) => {
      const gain = (1 - d.acc / 100) * (d.weight ?? 1);
      const bestGain = (1 - best.acc / 100) * (best.weight ?? 1);
      return gain > bestGain ? d : best;
    }).domainId;
  }
  const weakest = domains.find((d) => d.domainId === weakestId) ?? null;
  const allStrong = domains.length > 0 && domains.every((d) => d.acc >= 75);

  const verdict =
    band.key === "ready"
      ? "You're testing like someone who's ready. Time to prove it under real exam conditions."
      : band.key === "close"
        ? "You're closer than most people start — within striking distance of exam-ready. Here's the climb."
        : "A low floor — not a verdict. The diagnostic is where everyone starts; from here it only climbs.";

  return (
    <div
      className={cn("dark rv-stage rounded-3xl border border-white/10 p-6 sm:p-9", revealed && "rv-revealed")}
      style={bandVars(band)}
    >
      {/* Eyebrow */}
      <div
        className="rv-rise flex items-center justify-center gap-3 text-center font-mono text-[12px] uppercase tracking-[0.28em] text-[var(--rv-muted)]"
        data-d="1"
      >
        <span
          className="grid size-[22px] place-items-center rounded-full border"
          style={{ background: "var(--rv-accent-dim)", borderColor: "var(--rv-accent-soft)" }}
        >
          <Check className="size-3" style={{ color: "var(--rv-accent)" }} strokeWidth={3} />
        </span>
        <span>
          Diagnostic complete&nbsp;·&nbsp;
          <span className="tracking-[0.12em] text-[var(--rv-ink)]">
            {certName} {examCode}
          </span>
        </span>
      </div>

      {/* Instrument */}
      <div className="rv-rise mt-6" data-d="2">
        <ReadinessDial score={score} band={band} caption="Diagnostic score" />
      </div>

      {/* Verdict */}
      <p
        className="rv-rise mx-auto mt-4 max-w-xl text-balance text-center font-display text-[19px] font-medium leading-snug sm:text-[23px]"
        data-d="3"
      >
        {verdict}
      </p>

      {/* Domain cascade */}
      <section
        className="rv-rise mt-8 rounded-2xl border p-5 sm:p-6"
        data-d="4"
        style={{
          borderColor: "var(--rv-line)",
          background: "linear-gradient(180deg, var(--rv-surface), var(--rv-surface-2))",
        }}
      >
        <h2 className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--rv-muted)]">
          Domain breakdown
        </h2>
        <p className="mt-1 text-[13px] text-[var(--rv-muted-2)]">
          {domains.some((d) => d.weight != null)
            ? "Weighted by how much each area counts on the real exam."
            : "How you scored across every domain."}
        </p>
        <div className="mt-5 grid gap-4">
          {domains.map((d, i) => {
            const dc = bandFor(d.acc);
            const isWeak = d.domainId === weakestId;
            return (
              <div key={d.domainId}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-mono text-[12px] text-[var(--rv-muted-2)]">
                      {d.domainNumber}
                    </span>
                    <span className="text-[14.5px] text-[var(--rv-ink)]">{d.title}</span>
                    {isWeak && (
                      <span className="rv-chip shrink-0 rounded-full px-2 py-px font-mono text-[10px] tracking-wide">
                        biggest opportunity
                      </span>
                    )}
                  </span>
                  <span
                    className="shrink-0 font-mono text-[14px] tabular-nums"
                    style={{ color: dc.accent }}
                  >
                    {d.acc}%
                  </span>
                </div>
                <div className="relative mt-2 h-[7px] overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="rv-fill absolute inset-y-0 left-0"
                    style={
                      {
                        "--w": `${Math.max(3, d.acc)}%`,
                        "--dc": dc.accent,
                        "--dc-dim": dc.soft,
                        transitionDelay: `${1.5 + i * 0.09}s`,
                      } as React.CSSProperties
                    }
                  />
                </div>
                {d.weight != null && (
                  <div className="mt-1 text-right font-mono text-[11px] text-[var(--rv-muted-2)]">
                    {d.weight}% of exam
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Climb + exam-date + CTA */}
      <section
        className="rv-rise mt-4 grid gap-4 rounded-2xl border p-5 sm:grid-cols-2 sm:p-6"
        data-d="5"
        style={{
          borderColor: "var(--rv-line)",
          background: "linear-gradient(180deg, var(--rv-surface), var(--rv-surface-2))",
        }}
      >
        <div>
          <Trajectory start={score} />
        </div>
        <div className="grid content-center gap-2 text-[14px] leading-relaxed text-[var(--rv-muted)]">
          <p>
            Most people at your level reach{" "}
            <b className="text-[var(--rv-ink)]">exam-ready</b> in{" "}
            <b className="text-[var(--rv-ink)]">{estimateWeeks(score)}</b> at ~15
            minutes a day.
          </p>
          {weakest && !allStrong && (
            <p>
              Start with <b className="text-[var(--rv-ink)]">{weakest.title}</b> —
              you scored {weakest.correct}/{weakest.total} there, the fastest way
              to move your readiness up.
            </p>
          )}
        </div>
      </section>

      <ExamDateCapture certId={certId} />

      <div className="rv-rise mt-6 flex flex-wrap justify-center gap-3" data-d="6">
        <Link
          href={allStrong ? "/pbq" : dashboardHref}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold text-[#0b0c10] transition-transform hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(180deg, var(--rv-accent-2), var(--rv-accent))",
            boxShadow: "0 12px 30px -12px var(--rv-accent-soft)",
          }}
        >
          {allStrong ? "Try a hands-on PBQ" : "Start closing your gap"}
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href={dashboardHref}
          className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-[15px] font-semibold text-[var(--rv-ink)] transition-colors hover:bg-white/10"
        >
          See your study plan
        </Link>
      </div>
    </div>
  );
}

/** Lock-in-your-exam-date control, styled for the instrument stage. */
function ExamDateCapture({ certId }: { certId: string }) {
  const [examDate, setExamDate] = useState("");
  const [savedDate, setSavedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function commit() {
    if (!examDate) return;
    setSaving(true);
    setError("");
    try {
      await api(updateExamDate, { certId, examDate });
      setSavedDate(examDate);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that date");
    } finally {
      setSaving(false);
    }
  }

  const daysToExam = savedDate
    ? Math.max(0, Math.ceil((new Date(savedDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div
      className="rv-rise mt-4 rounded-2xl border p-5"
      data-d="5"
      style={{ borderColor: "var(--rv-line)", background: "var(--rv-surface-2)" }}
    >
      {savedDate ? (
        <p className="flex items-center gap-2 text-[14px] text-[var(--rv-ink)]">
          <Check className="size-4 shrink-0" style={{ color: "var(--rv-accent)" }} />
          Locked in — <b>{daysToExam} day{daysToExam === 1 ? "" : "s"} to go</b>. Your
          plan will pace you toward it.
        </p>
      ) : (
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-[14px] font-medium text-[var(--rv-ink)]">
            <CalendarClock className="size-4" style={{ color: "var(--rv-accent)" }} />
            Lock in your exam date
          </label>
          <p className="text-[12px] text-[var(--rv-muted-2)]">
            A date turns this into a countdown and paces your daily plan. Change it
            anytime.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              min={today}
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="h-9 rounded-lg border border-white/15 bg-white/5 px-3 text-[14px] text-[var(--rv-ink)] outline-none [color-scheme:dark] focus-visible:border-[var(--rv-accent)]"
            />
            <button
              onClick={commit}
              disabled={!examDate || saving}
              className="h-9 rounded-lg px-4 text-[14px] font-semibold text-[#0b0c10] disabled:opacity-50"
              style={{ background: "var(--rv-accent)" }}
            >
              {saving ? "Saving…" : "Set date"}
            </button>
          </div>
          {error && <p className="text-[12px] text-[#fb7185]">{error}</p>}
        </div>
      )}
    </div>
  );
}
