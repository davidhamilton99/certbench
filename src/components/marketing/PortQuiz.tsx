"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Flame, X } from "lucide-react";
import type { PortEntry } from "@/lib/tools/port-quiz-data";
import { makeQuestion, type QuizQuestion } from "@/lib/tools/port-quiz";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Endless port-numbers drill. Question generation is random, so the first
 * question is created after mount — SSR renders a stable placeholder and
 * hydration never mismatches. `showRegisterCta` is off in the logged-in
 * workspace, where the signup upsell would be noise.
 */
export function PortQuiz({
  entries,
  showRegisterCta = true,
}: {
  entries: PortEntry[];
  showRegisterCta?: boolean;
}) {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<PortEntry | null>(null);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [ctaDismissed, setCtaDismissed] = useState(false);

  useEffect(() => {
    setQuestion(makeQuestion(entries));
  }, [entries]);

  if (!question) {
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading the drill…
      </div>
    );
  }

  const revealed = picked !== null;
  const wasCorrect = picked === question.answer;

  function choose(option: PortEntry) {
    if (revealed) return;
    setPicked(option);
    const correct = option === question!.answer;
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      answered: s.answered + 1,
    }));
    const nextStreak = correct ? streak + 1 : 0;
    setStreak(nextStreak);
    if (nextStreak > bestStreak) setBestStreak(nextStreak);
  }

  function next() {
    setPicked(null);
    setQuestion(makeQuestion(entries));
  }

  const accuracy =
    score.answered > 0 ? Math.round((score.correct / score.answered) * 100) : 0;
  // Surface the reframe only after a real session (not a drive-by), and only
  // on the public tool — never in the logged-in workspace.
  const showReframe =
    showRegisterCta && !ctaDismissed && score.answered >= 15;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 rounded-xl border bg-card p-6">
      {/* Scoreboard */}
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>
          {score.correct} / {score.answered} correct
        </span>
        <span className="flex items-center gap-1">
          <Flame
            className={cn("size-3.5", streak >= 3 ? "text-warning" : "text-muted-foreground/50")}
          />
          streak {streak} · best {bestStreak}
        </span>
      </div>

      {/* Question */}
      <p className="text-lg font-medium tracking-tight">
        {question.direction === "port" ? (
          <>
            Which port does <span className="text-primary">{question.answer.protocol}</span> use?
          </>
        ) : (
          <>
            What runs on port{" "}
            <span className="font-mono text-primary">{question.answer.port}</span>?
          </>
        )}
      </p>

      <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const isAnswer = revealed && option === question.answer;
          const isWrongPick = revealed && option === picked && !isAnswer;
          const label =
            question.direction === "port" ? option.port : option.protocol;
          return (
            <button
              key={option.port}
              type="button"
              role="radio"
              aria-checked={picked === option}
              disabled={revealed}
              onClick={() => choose(option)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left font-mono text-sm transition-colors",
                !revealed && "hover:border-muted-foreground/40 hover:bg-accent",
                isAnswer && "border-success bg-success/10",
                isWrongPick && "border-danger bg-danger/10",
                revealed && "cursor-default"
              )}
            >
              {label}
              {isAnswer && <Check className="size-4 shrink-0 text-success" />}
              {isWrongPick && <X className="size-4 shrink-0 text-danger" />}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm leading-relaxed",
            wasCorrect
              ? "border-success/40 bg-success/5"
              : "border-danger/40 bg-danger/5"
          )}
        >
          <span className="font-mono font-semibold">
            {question.answer.port} — {question.answer.protocol}
          </span>{" "}
          ({question.answer.transport}): {question.answer.service}
        </div>
      )}

        <Button onClick={next} disabled={!revealed} className="min-w-28">
          Next
        </Button>
      </div>

      {/* Reframe: a ports grinder is over-indexing on ~5% of the exam. Meeting
          them with genuinely useful perspective converts better than a
          "sign up for more" nudge — and routes to the no-account readiness
          check, the funnel that actually converts the hesitant. */}
      {showReframe && (
        <div className="relative grid gap-3 rounded-xl border border-primary/30 bg-card p-6">
          <button
            type="button"
            onClick={() => setCtaDismissed(true)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <div>
            <h3 className="pr-6 font-semibold tracking-tight">
              You&apos;ve got ports handled — {score.answered} drilled at {accuracy}%.
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Here&apos;s the thing: ports are only about{" "}
              <span className="font-medium text-foreground">5% of the exam</span>.
              You&apos;ve nailed the easy part — the other 95% (scenarios, PBQs,
              the domains that actually decide pass/fail) is where most people
              fall short. See exactly where you stand:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/readiness-check/security-plus-sy0-701">
                Take the free readiness check
                <ArrowRight />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              3 minutes, no account · or{" "}
              <Link
                href="/register"
                className="text-primary underline underline-offset-4"
              >
                start free
              </Link>{" "}
              for the full drill + 2,600 questions with spaced repetition.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
