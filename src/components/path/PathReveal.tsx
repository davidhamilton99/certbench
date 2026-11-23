"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock, Target } from "lucide-react";
import { ScoreBar, ScoreLevel } from "@/components/instrument/ScoreLevel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { bandFor, bandVars, type BandKey } from "@/lib/readiness/band";
import { biggestOpportunity, daysUntil, projectFinish } from "@/core/path/checkpoint";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { CheckpointResult, PathDomain, PathGoal, PathStructure } from "@/core/path/types";
import { cn } from "@/lib/utils";

/**
 * What the checkpoint's result is called, by the band its score falls in. A
 * checkpoint is a dozen questions, so its top band is a strong first result
 * and never "ready for the exam": that is for a full practice exam to say.
 * From Nov 1 to 15, 2026, 11 of the 13 people who finished one scored 75% or
 * more, were told they were exam-ready, and left without opening the offer
 * under it.
 */
const HEADLINE: Record<BandKey, string> = {
  work: "This is your starting point.",
  close: "You are making good progress.",
  ready: "This is a strong first result.",
  building: "This is your starting point.",
};

/**
 * Under the score, in place of the band's own words where those would say too
 * much. Every other band is described in the words bandFor gives it.
 */
const VERDICT: Partial<Record<BandKey, string>> = { ready: "Strong first result" };

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

/**
 * The checkpoint result: the score against the scale as a first result, how
 * each domain went, how much of the exam the path has taught so far, where the
 * biggest gain is, and when the rest of the path gets done at the pace they
 * set. Ends with what to do next (`children`): the offer, or "Continue" for Pro.
 */
export function PathReveal({
  result,
  structure,
  goal,
  remainingStops,
  studied,
  fromExam = false,
  children,
}: {
  result: CheckpointResult;
  structure: PathStructure;
  goal: PathGoal | null;
  remainingStops: number;
  /** Objectives whose own step is done. */
  studied: number;
  /** The result came from a practice exam taken on a public page, not the checkpoint's dozen questions. */
  fromExam?: boolean;
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
        ? `This leaves ${spare} days before ${what} for review and full-length practice exams.`
        : spare >= 0
          ? `This is very close to ${what}. Studying for longer each day would leave time for review.`
          : `${what === "your exam" ? "Your exam" : "Your target date"} is ${daysToExam} ${daysToExam === 1 ? "day" : "days"} away. Plan to study for longer each day, or begin with your weakest domains.`;
  } else {
    pace = "When you book your exam, enter the date and the study path will keep you on schedule.";
  }

  return (
    <div className="path-rise grid gap-6">
      <ReadingCard
        result={result}
        structure={structure}
        kicker={`${structure.examName} ${fromExam ? "practice exam" : "readiness checkpoint"}`}
        headline={HEADLINE[band.key]}
        // This screen's title: nothing on it stands above the result.
        headlineAs="h1"
        caption={fromExam ? "Practice exam result" : "Checkpoint result"}
        verdict={VERDICT[band.key]}
        readyMark={false}
        summary={
          <>
            This result is based on {asked} {asked === 1 ? "question" : "questions"}, so each answer changes it by about{" "}
            {each} {each === 1 ? "point" : "points"}. The exam itself has up to {REHEARSAL_FORMATS.full.questions}{" "}
            questions.
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {ahead > 0 && (
          <div className="glass grid gap-3 rounded-lg p-4 sm:col-span-2 sm:p-5">
            <p className="text-small">
              <span className="font-medium">
                You have studied {learned} of {objectives} objectives.
              </span>{" "}
              <span className="text-muted-foreground">
                {ahead === 1 ? "There is 1 objective" : `There are ${ahead} objectives`} still to study.
              </span>
            </p>
            {/* The sentence above gives the figure; the bar draws it, at its final length. */}
            <ProgressBar value={(learned / Math.max(1, objectives)) * 100} size="lg" still />
          </div>
        )}
        {opportunity && <OpportunityNote domain={opportunity} />}
        <div className={cn("glass flex gap-3 rounded-lg p-4 sm:p-5", !opportunity && "sm:col-span-2")}>
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="grid content-start gap-0.5 text-small">
            <span className="font-medium">
              {remainingStops > 0
                ? `At ${minutes} minutes a day, you will finish the study path by ${fmt(finish)}.`
                : "You have completed every step of the study path."}
            </span>{" "}
            <span className="text-muted-foreground">
              {remainingStops > 0 ? pace : "Continue to practice so that you maintain your result."}
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

/**
 * A score against the scale, in its band, with how each domain went: the card
 * that a checkpoint and a practice exam both report on. Given `from`, the
 * score counts up (or down) from the result before.
 *
 * The band's words are bandFor's, so a score is described the same way here as
 * everywhere else. `verdict` replaces them only where they would say more than
 * the result can support.
 */
export function ReadingCard({
  result,
  structure,
  kicker,
  headline,
  headlineAs: Headline = "h2",
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
  /** "h1" where the result is the title of the screen it is on. */
  headlineAs?: "h1" | "h2";
  caption: string;
  summary: ReactNode;
  from?: number;
  /** Under the score, in place of the band's own words ("Target met" and so on). */
  verdict?: string;
  /** The mark at the readiness target. It is left out for a result too small to call anyone ready. */
  readyMark?: boolean;
}) {
  const band = bandFor(result.score);
  return (
    // A score report: the result on top, then every domain on the same scale,
    // so each one sits against the same line as the whole.
    <div className="glass overflow-hidden rounded-lg" style={bandVars(band)}>
      <div className="grid gap-5 p-5 sm:p-8">
        <div className="grid gap-2">
          <span className="cb-label text-muted-foreground">{kicker}</span>
          {/* It can take the focus when the screen changes, so that a screen reader starts at the result. */}
          <Headline tabIndex={-1} className="cb-section">
            {headline}
          </Headline>
        </div>
        <ScoreLevel
          score={result.score}
          band={verdict ? { ...band, label: verdict } : band}
          caption={caption}
          from={from}
          readyMark={readyMark}
        />
        <p className="text-small text-muted-foreground">{summary}</p>
      </div>

      <ul className="grid gap-3.5 border-t border-border bg-muted/60 p-5 sm:p-8">
        {structure.domains.map((d) => {
          const r = result.domains.find((x) => x.number === d.number);
          const pct = r && r.total > 0 ? Math.round((r.correct / r.total) * 100) : null;
          const tone = pct === null ? null : bandFor(pct);
          // min-w-0: a long domain title wraps instead of pushing the row past the card on a phone.
          return (
            <li
              key={d.number}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-x-5 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
            >
              <div className="flex min-w-0 items-baseline justify-between gap-3 text-small">
                <span className="min-w-0">
                  <span className="sr-only">Domain </span>
                  <span className="mr-1 text-note tabular-nums text-muted-foreground">{d.number.replace(/\.0$/, "")}</span>{" "}
                  {d.title}
                </span>{" "}
                <span className="shrink-0 text-note tabular-nums text-muted-foreground">
                  {r ? `${r.correct} of ${r.total}` : "Not asked"}
                  {r && <span className="sr-only"> correct</span>}
                </span>
              </div>
              <ScoreBar value={pct} color={tone?.accent} readyLine={readyMark} />
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
    <div className="glass flex gap-3 rounded-lg p-4 sm:p-5">
      <Target className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="grid content-start gap-0.5 text-small">
        <span className="font-medium">The area to focus on next</span>{" "}
        <span className="text-muted-foreground">
          {domain.title} accounts for {domain.weight}% of the exam, and it is where you can gain the most.
        </span>
      </div>
    </div>
  );
}
