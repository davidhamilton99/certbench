"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Flame, X } from "lucide-react";
import type { ReferenceTable } from "@/data/reference/types";
import {
  generateReferenceQuestion,
  type ReferenceQuestion,
} from "@/lib/tools/reference-drill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Rapid-fire drill generated from a reference table — the port-quiz format
 * applied to any lookup table. First question is created after mount so the
 * random generation never causes an SSR/hydration mismatch.
 */
export function ReferenceDrill({ table }: { table: ReferenceTable }) {
  const [question, setQuestion] = useState<ReferenceQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // The parent remounts this per table (key=table.id), so a fresh mount
  // already has clean state — the effect only needs the first question.
  useEffect(() => {
    setQuestion(generateReferenceQuestion(table));
  }, [table]);

  if (!question) {
    return (
      <div className="grid min-h-64 place-items-center rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading the drill…
      </div>
    );
  }

  const revealed = picked !== null;

  function choose(option: string) {
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
    setQuestion(generateReferenceQuestion(table));
  }

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-6">
      {/* Scoreboard */}
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>
          {score.correct} / {score.answered} correct
        </span>
        <span className="flex items-center gap-1">
          <Flame
            className={cn(
              "size-3.5",
              streak >= 3 ? "text-warning" : "text-muted-foreground/50"
            )}
          />
          streak {streak} · best {bestStreak}
        </span>
      </div>

      {/* Prompt */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {question.promptLabel} → {question.answerLabel}?
        </p>
        <p
          className={cn(
            "mt-1 text-xl font-semibold tracking-tight",
            question.promptMono && "font-mono"
          )}
        >
          {question.promptValue}
        </p>
      </div>

      {/* Options */}
      <div role="radiogroup" className="grid gap-2">
        {question.options.map((option) => {
          const isAnswer = revealed && option === question.answer;
          const isWrongPick = revealed && option === picked && !isAnswer;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={picked === option}
              disabled={revealed}
              onClick={() => choose(option)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                question.answerMono && "font-mono",
                !revealed && "hover:border-muted-foreground/40 hover:bg-accent",
                isAnswer && "border-success bg-success/10",
                isWrongPick && "border-danger bg-danger/10",
                revealed && "cursor-default"
              )}
            >
              <span className="leading-relaxed">{option}</span>
              {isAnswer && <Check className="size-4 shrink-0 text-success" />}
              {isWrongPick && <X className="size-4 shrink-0 text-danger" />}
            </button>
          );
        })}
      </div>

      <Button onClick={next} disabled={!revealed} className="min-w-28 justify-self-start">
        Next
        <ArrowRight />
      </Button>
    </div>
  );
}
