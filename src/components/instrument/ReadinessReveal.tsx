"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ExamResult } from "@/contracts/quiz";
import { api } from "@/lib/api-client";
import { updateExamDate } from "@/contracts/user";
import { userMessage } from "@/lib/errors/user-message";
import { bandFor, READINESS_TARGET } from "@/lib/readiness/band";
import { ScoreReport } from "@/components/instrument/ScoreReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ReadinessRevealProps {
  result: ExamResult;
  certId: string;
  certName: string;
  examCode: string;
  dashboardHref: string;
  /** domainId → exam weight (%). Decides which domain is named as the one to study first. */
  domainWeights?: Record<string, number>;
}

/**
 * The result of the diagnostic, as a score report: what was completed in one
 * sentence, the score against the readiness target, each domain on the same
 * scale, the domain to study first, and a place to enter the exam date.
 *
 * It states only what was measured. It used to draw a curve from today's score
 * to a fixed height and print an estimate of the weeks to the target; neither
 * was data, so both are gone.
 */
export function ReadinessReveal({
  result,
  certId,
  certName,
  examCode,
  dashboardHref,
  domainWeights,
}: ReadinessRevealProps) {
  // The result follows a press on "Finish diagnostic": the focus goes to its
  // heading, so the page that replaced the questions is read from its top.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
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

  // The domain to study first is the one with the most of the exam still to
  // gain: (1 − accuracy) × weight where the weights are known, and the lowest
  // score where they are not.
  const weakest = domains.length
    ? domains.reduce((best, d) => {
        const gain = (1 - d.acc / 100) * (d.weight ?? 1);
        const bestGain = (1 - best.acc / 100) * (best.weight ?? 1);
        return gain > bestGain ? d : best;
      })
    : null;
  const allStrong = domains.length > 0 && domains.every((d) => bandFor(d.acc).key === "ready");

  // The diagnostic is a small set of questions: a first result and not a
  // measure of readiness. So the report draws no mark at the readiness target,
  // and a high score is called a strong first result, not "Target met". The
  // study path reports its checkpoint the same way.
  const verdict =
    band.key === "ready"
      ? "This is a strong first result. The next step is a full-length practice exam under exam conditions."
      : band.key === "close"
        ? `This is a first result and not a final one. The readiness target is ${READINESS_TARGET}%. The domain results below show where to study next.`
        : "This is a starting point and not a final result. The domain results below show where to begin.";
  // What one answer is worth, so that the size of the sample is plain.
  const each = result.totalQuestions > 0 ? Math.round(100 / result.totalQuestions) : 0;

  return (
    <div className="grid gap-6">
      <ScoreReport
        heading={`You have completed the ${certName} ${examCode} diagnostic.`}
        headingRef={headingRef}
        caption="Diagnostic result"
        score={score}
        readyMark={false}
        verdict={band.key === "ready" ? "Strong first result" : undefined}
        summary={
          <>
            {verdict}
            {each > 0 && (
              <>
                {" "}
                This result is based on {result.totalQuestions} questions, so each answer changes it by about {each}{" "}
                {each === 1 ? "point" : "points"}.
              </>
            )}
          </>
        }
        domains={domains.map((d) => ({
          id: d.domainId,
          number: d.domainNumber,
          title: d.title,
          correct: d.correct,
          total: d.total,
          weight: d.weight,
        }))}
      />

      {weakest && !allStrong && (
        <div className="glass grid gap-1 rounded-lg p-4 sm:p-5">
          <h3 className="text-small font-semibold">The domain to study first</h3>
          <p className="cb-measure text-small text-muted-foreground">
            You answered {weakest.correct} of {weakest.total} questions correctly in {weakest.title}
            {weakest.weight != null && <>, which is {weakest.weight}% of the exam</>}.
          </p>
        </div>
      )}

      <ExamDateCapture certId={certId} />

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={dashboardHref}>See your study plan</Link>
        </Button>
        {allStrong && (
          <Button asChild variant="outline">
            <Link href="/pbq">Open the hands-on labs</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Where a learner enters the date of the exam, once the diagnostic is done. */
function ExamDateCapture({ certId }: { certId: string }) {
  const [examDate, setExamDate] = useState("");
  // Once saved: the number of days to the exam, counted when it was saved.
  const [savedDays, setSavedDays] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();
  // "Today" for the earliest date the field accepts, fixed for the life of the screen.
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  async function commit(e: FormEvent) {
    e.preventDefault();
    if (!examDate || saving) return;
    setSaving(true);
    setError("");
    try {
      await api(updateExamDate, { certId, examDate });
      setSavedDays(Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)));
    } catch (err) {
      setError(userMessage(err, "The date could not be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  // The form is replaced by the sentence that confirms it. The focus goes to
  // that sentence, so that it is read and the keyboard keeps its place.
  const savedRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (savedDays !== null) savedRef.current?.focus();
  }, [savedDays]);

  if (savedDays !== null) {
    return (
      <p ref={savedRef} tabIndex={-1} className="glass rounded-lg p-4 text-small sm:p-5">
        Your exam date is saved.{" "}
        {savedDays === 0 ? "Your exam is today." : `Your exam is in ${savedDays} ${savedDays === 1 ? "day" : "days"}.`}{" "}
        Your study plan takes the date into account.
      </p>
    );
  }

  return (
    <form onSubmit={commit} className="glass grid gap-3 rounded-lg p-4 sm:p-5">
      <div className="grid gap-1.5">
        <Label htmlFor={fieldId}>Exam date</Label>
        <p id={hintId} className="cb-measure text-note text-muted-foreground">
          If you have booked your exam, enter the date and your study plan will take it into account. You can change
          the date on your{" "}
          <Link href="/profile" className="cb-link">
            profile page
          </Link>
          .
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          id={fieldId}
          type="date"
          min={today}
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          aria-invalid={error ? true : undefined}
          className="w-auto"
        />
        <Button type="submit" variant="outline" loading={saving} disabled={!examDate}>
          Save the exam date
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-note text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
