"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isoInDays } from "@/core/path/checkpoint";
import { cn } from "@/lib/utils";

const chip =
  "rounded-xl border border-border bg-card px-4 py-3.5 text-left text-[15px] font-medium transition-colors hover:border-primary/60 hover:bg-primary/[0.03] focus-visible:outline-2 focus-visible:outline-primary";

/**
 * One question between stops, answered in a tap: when the exam is, then how
 * much time a day they have. The answers set the pace the path projects.
 */
export function GoalStep({
  step,
  examName,
  onExam,
  onMinutes,
}: {
  step: "exam" | "minutes";
  examName: string;
  onExam: (examDate: string | null, target: string | null) => void;
  onMinutes: (minutes: number) => void;
}) {
  const [mode, setMode] = useState<"ask" | "date" | "target">("ask");
  const [date, setDate] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  if (step === "minutes") {
    return (
      <div className="path-rise grid gap-6">
        <Header eyebrow="One quick question" title="How much time can you give it on most days?" />
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
        <button
          type="button"
          onClick={() => onMinutes(0)}
          className="justify-self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Not sure yet
        </button>
      </div>
    );
  }

  if (mode === "date") {
    return (
      <div className="path-rise grid gap-6">
        <Header eyebrow="Your exam" title={`When is your ${examName} exam?`} />
        <form
          className="flex flex-wrap gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (date) onExam(date, null);
          }}
        >
          <label htmlFor="exam-date" className="sr-only">
            Exam date
          </label>
          <Input
            id="exam-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-auto min-w-48 text-base dark:[color-scheme:dark]"
            autoFocus
          />
          <Button type="submit" size="lg" className="h-12" disabled={!date}>
            Set my date
            <ArrowRight />
          </Button>
        </form>
        <BackLink onClick={() => setMode("ask")} />
      </div>
    );
  }

  if (mode === "target") {
    return (
      <div className="path-rise grid gap-6">
        <Header eyebrow="Your exam" title="Roughly when are you aiming for?" />
        <div className="grid gap-2.5 sm:grid-cols-3">
          {[
            [30, "Within a month"],
            [60, "In 1–2 months"],
            [90, "In 3 months or more"],
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
        <BackLink onClick={() => setMode("ask")} />
      </div>
    );
  }

  return (
    <div className="path-rise grid gap-6">
      <Header
        eyebrow="One quick question"
        title={`Have you booked your ${examName} exam?`}
        sub="It sets the pace of your path. You can change it any time."
      />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <button type="button" className={chip} onClick={() => setMode("date")}>
          Yes, I have a date
        </button>
        <button type="button" className={chip} onClick={() => setMode("target")}>
          Not booked yet
        </button>
      </div>
    </div>
  );
}

function Header({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="grid gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</span>
      <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("justify-self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground")}
    >
      Back
    </button>
  );
}
