"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SampleQuestionData {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * Interactive sample question for the public practice-test pages: pick an
 * answer, get instant grading + the explanation. Pure client state — no
 * account, no persistence.
 */
export function SampleQuestion({
  number,
  question,
}: {
  number: number;
  question: SampleQuestionData;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked !== null;

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-6">
      <p className="leading-relaxed">
        <span className="mr-2 font-mono text-sm text-muted-foreground">
          {number}.
        </span>
        {question.questionText}
      </p>
      <div role="radiogroup" className="grid gap-2">
        {question.options.map((option, i) => {
          const isCorrect = revealed && i === question.correctIndex;
          const isWrongPick =
            revealed && i === picked && i !== question.correctIndex;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                !revealed && "hover:border-muted-foreground/40 hover:bg-accent",
                isCorrect && "border-success bg-success/10",
                isWrongPick && "border-danger bg-danger/10",
                revealed && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                  isCorrect && "border-success bg-success text-success-foreground",
                  isWrongPick && "border-danger bg-danger text-danger-foreground"
                )}
              >
                {isCorrect ? (
                  <Check className="size-3" />
                ) : isWrongPick ? (
                  <X className="size-3" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span className="leading-relaxed">{option}</span>
            </button>
          );
        })}
      </div>
      {revealed && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm leading-relaxed",
            picked === question.correctIndex
              ? "border-success/40 bg-success/5"
              : "border-danger/40 bg-danger/5"
          )}
        >
          <span className="font-medium">
            {picked === question.correctIndex ? "Correct. " : "Not quite. "}
          </span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}
