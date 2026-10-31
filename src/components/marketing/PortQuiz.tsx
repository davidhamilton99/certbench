"use client";

import { useMemo, useState } from "react";
import { Check, Flame, X } from "lucide-react";
import type { PortEntry } from "@/lib/tools/port-quiz-data";
import { makeQuestion, type QuizQuestion } from "@/lib/tools/port-quiz";
import { itemStatus } from "@/core/drill-rounds/drill-rounds";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDrillRounds, type DrillRounds } from "./useDrillRounds";
import { EXAMS, ExamBridge, RoundBar, RoundComplete, RoundStatus } from "./DrillRound";

/**
 * Port-numbers drill, played in rounds on the public tool page: round 1 is
 * free, a free account keeps going with rounds built from the visitor's
 * misses. `showRegisterCta` is off in the logged-in workspace, which runs the
 * plain endless drill (no rounds, no signup).
 */
export function PortQuiz({
  entries,
  showRegisterCta = true,
}: {
  entries: PortEntry[];
  showRegisterCta?: boolean;
}) {
  const ids = useMemo(() => entries.map((e) => e.port), [entries]);
  const rounds = useDrillRounds({ tool: "ports", ids, enabled: showRegisterCta });
  const [streak, setStreak] = useState({ now: 0, best: 0 });

  // Questions are random, so nothing renders until after hydration.
  if (!rounds.ready) {
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading the drill…
      </div>
    );
  }

  if (rounds.complete) {
    const tiles = entries.map((e) => ({
      id: e.port,
      label: e.port,
      name: e.protocol,
      status: itemStatus(rounds.progress.items[e.port]),
    }));
    return (
      <RoundComplete
        rounds={rounds}
        noun={["port", "ports"]}
        tiles={tiles}
        variant="labels"
        extra={
          <ExamBridge
            tool="ports"
            title="Ports are a small slice of the exam."
            exams={[EXAMS.securityPlus, EXAMS.networkPlus, EXAMS.aPlusCore1]}
          >
            The rest decides whether you pass. Your path walks every exam
            objective in short rounds like this one.
          </ExamBridge>
        }
      />
    );
  }

  // Remounts with a fresh first question each time play (re)starts.
  return (
    <PortRound
      entries={entries}
      rounds={rounds}
      streak={streak}
      onAnswer={(correct) =>
        setStreak((s) => {
          const now = correct ? s.now + 1 : 0;
          return { now, best: Math.max(s.best, now) };
        })
      }
    />
  );
}

function PortRound({
  entries,
  rounds,
  streak,
  onAnswer,
}: {
  entries: PortEntry[];
  rounds: DrillRounds;
  streak: { now: number; best: number };
  onAnswer: (correct: boolean) => void;
}) {
  const byPort = useMemo(() => new Map(entries.map((e) => [e.port, e])), [entries]);
  /** The planned port for the next question (random when there's no plan). */
  const ask = () => {
    const id = rounds.nextItem();
    return makeQuestion(entries, id ? byPort.get(id) : undefined);
  };
  const [question, setQuestion] = useState<QuizQuestion>(ask);
  const [picked, setPicked] = useState<PortEntry | null>(null);
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  const revealed = picked !== null;
  const wasCorrect = picked === question.answer;
  const lastOfRound = rounds.enabled && rounds.answered >= rounds.size;

  function choose(option: PortEntry) {
    if (revealed) return;
    setPicked(option);
    const correct = option === question.answer;
    rounds.record(question.answer.port, correct);
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      answered: s.answered + 1,
    }));
    onAnswer(correct);
  }

  function next() {
    // The last answer of a round hands over to the round reveal.
    if (rounds.advance()) return;
    setPicked(null);
    setQuestion(ask());
  }

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-6">
      {rounds.enabled && <RoundBar rounds={rounds} />}

      {/* Scoreboard */}
      <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
        {rounds.enabled ? (
          <RoundStatus rounds={rounds} />
        ) : (
          <span>
            {score.correct} / {score.answered} correct
          </span>
        )}
        <span className="flex items-center gap-1">
          <Flame
            className={cn("size-3.5", streak.now >= 3 ? "text-warning" : "text-muted-foreground/50")}
          />
          streak {streak.now} · best {streak.best}
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
        {lastOfRound ? "See your round" : "Next"}
      </Button>
    </div>
  );
}
