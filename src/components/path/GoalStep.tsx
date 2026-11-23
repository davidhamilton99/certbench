"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXAM_DATE_HORIZON_DAYS, isPlannableExamDate, isoInDays } from "@/core/path/checkpoint";

/** An answer to choose: pressed, so it has the edge and the tints that every pressed thing has. */
const chip =
  "rounded-md border border-input bg-card px-4 py-3.5 text-left text-small font-medium transition-[border-color,background-color] duration-150 hover:border-primary hover:bg-tint-hover active:bg-tint-press";

/** A quiet way out under the answers: back a step, or out of the question. */
const quiet = "cb-link cb-tap justify-self-start text-small";

/**
 * One planning question between steps, answered in one press: when the exam
 * is, then how much time a day there is for study. The answers set the pace
 * that the study path projects. The exam date can be changed later from the
 * home screen of the study path, which opens this question again (`onCancel`
 * then leads back without an answer).
 *
 * Each question is the title of its screen. When the question changes in
 * answer to a press, the new one takes the keyboard's focus so that it is
 * read; the date field takes it instead where a date is typed.
 */
export function GoalStep({
  step,
  examName,
  retiring,
  onExam,
  onMinutes,
  onCancel,
}: {
  step: "exam" | "minutes";
  examName: string;
  /**
   * This exam version's last day in English and the version after it (SY0-701
   * and SY0-801): a later date gets a pointer there. Not a block, since other
   * languages run longer.
   */
  retiring?: { lastDay: string; code: string; newer: { code: string; href: string } };
  onExam: (examDate: string | null, target: string | null) => void;
  onMinutes: (minutes: number) => void;
  /** Leave the question unanswered, where it was opened to change an answer already given. */
  onCancel?: () => void;
}) {
  const [mode, setMode] = useState<"ask" | "date" | "target">("ask");
  const [date, setDate] = useState("");
  const [now] = useState(() => Date.now());
  const today = isoInDays(0, now);
  const titleId = useId();
  const title = useRef<HTMLHeadingElement>(null);
  // True once the person has moved between the parts of the exam question.
  const moved = useRef(false);

  useEffect(() => {
    // The date field takes the focus itself; its question is tied to it and read with it.
    if (moved.current && mode !== "date") title.current?.focus({ preventScroll: true });
  }, [mode]);

  function show(next: "ask" | "date" | "target") {
    moved.current = true;
    setMode(next);
  }

  if (step === "minutes") {
    return (
      <div className="path-rise grid gap-6">
        <Header
          id={titleId}
          titleRef={title}
          eyebrow="Your study plan"
          title="How much time can you study on most days?"
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            [10, "About 10 minutes"],
            [20, "About 20 minutes"],
            [45, "About 45 minutes"],
            [60, "An hour or more"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={chip} onClick={() => onMinutes(value as number)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onMinutes(0)} className={quiet}>
          I am not sure yet
        </button>
      </div>
    );
  }

  if (mode === "date") {
    const latest = isoInDays(EXAM_DATE_HORIZON_DAYS, now);
    const plannable = isPlannableExamDate(date, now);
    // The input reports nothing until a whole date is typed: only a whole one gets the hint.
    const wrong = date !== "" && !plannable;
    return (
      <div className="path-rise grid gap-6">
        <Header id={titleId} titleRef={title} eyebrow="Your exam" title={`When is your ${examName} exam?`} />
        <form
          className="grid gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (plannable) onExam(date, null);
          }}
        >
          <div className="flex flex-wrap gap-2.5">
            <label htmlFor="exam-date" className="sr-only">
              Exam date
            </label>
            <Input
              id="exam-date"
              type="date"
              min={today}
              max={latest}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={wrong}
              // The question above is read with the field, and the hint once there is one.
              aria-describedby={wrong ? `${titleId} exam-date-hint` : titleId}
              className="h-12 w-auto min-w-48 text-base dark:[color-scheme:dark]"
              // It opens in answer to a press ("Yes, I have booked a date"), so typing can begin at once.
              autoFocus
            />
            <Button type="submit" size="lg" disabled={!plannable}>
              Save the date
            </Button>
          </div>
          {wrong && (
            <p id="exam-date-hint" role="alert" className="text-small text-destructive">
              That date is not valid. Please choose a date between today and {longDate(latest)}.
            </p>
          )}
          {retiring && plannable && date > retiring.lastDay && (
            <p role="status" className="text-small text-muted-foreground">
              {retiring.code} can be taken in English until {longDate(retiring.lastDay)}. If you will take the exam
              in English after that date, you will need {retiring.newer.code}. You can{" "}
              <a href={retiring.newer.href} className="cb-link">
                study {retiring.newer.code} instead
              </a>
              .
            </p>
          )}
        </form>
        <button type="button" onClick={() => show("ask")} className={quiet}>
          Back
        </button>
      </div>
    );
  }

  if (mode === "target") {
    return (
      <div className="path-rise grid gap-6">
        <Header id={titleId} titleRef={title} eyebrow="Your exam" title="When do you expect to take the exam?" />
        <div className="grid gap-2.5 sm:grid-cols-3">
          {[
            [30, "Within one month"],
            [60, "In one to two months"],
            [90, "In three months or more"],
          ].map(([days, label]) => (
            <button
              key={days}
              type="button"
              className={chip}
              onClick={() => onExam(null, isoInDays(days as number, Date.now()))}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => show("ask")} className={quiet}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="path-rise grid gap-6">
      <Header
        id={titleId}
        titleRef={title}
        eyebrow="Your study plan"
        title={`Have you booked your ${examName} exam?`}
        sub="Your answer sets the pace of your study path. You can change it at any time."
      />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <button type="button" className={chip} onClick={() => show("date")}>
          Yes, I have booked a date
        </button>
        <button type="button" className={chip} onClick={() => show("target")}>
          No, I have not booked it yet
        </button>
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} className={quiet}>
          Return to the study path
        </button>
      )}
    </div>
  );
}

/** "November 13, 2028" for an ISO date, the same in every time zone. */
function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The question: the title of its screen, which can take the focus so that it is read. */
function Header({
  id,
  titleRef,
  eyebrow,
  title,
  sub,
}: {
  id: string;
  titleRef: RefObject<HTMLHeadingElement | null>;
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="grid gap-2">
      <p className="cb-label text-muted-foreground">{eyebrow}</p>
      <h1 id={id} ref={titleRef} tabIndex={-1} className="cb-subsection">
        {title}
      </h1>
      {sub && <p className="text-small text-muted-foreground">{sub}</p>}
    </div>
  );
}
