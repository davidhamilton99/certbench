"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import type { SampleQuestionData } from "@/components/marketing/SampleQuestion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void };
  }
}

/**
 * A live, gradeable exam question in the landing hero. Session replays show
 * visitors who get something to DO stay for minutes while readers bounce in
 * ~30s — so the first interaction on the site is the product itself, and the
 * signup ask lands after the answer, when it means something.
 */
export function HeroQuestion({ question }: { question: SampleQuestionData }) {
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked !== null;
  const wasCorrect = picked === question.correctIndex;

  function choose(i: number) {
    if (revealed) return;
    setPicked(i);
    window.posthog?.capture("hero_question_answered", {
      correct: i === question.correctIndex,
    });
  }

  return (
    <div className="w-full max-w-xl rounded-xl border bg-card p-6 text-left shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Try a real exam question</span>
        <span className="font-mono text-xs text-muted-foreground">
          Security+ · SY0-701
        </span>
      </div>
      <p className="text-sm leading-relaxed">{question.questionText}</p>
      <div role="radiogroup" className="mt-4 grid gap-2">
        {question.options.map((option, i) => {
          const isCorrect = revealed && i === question.correctIndex;
          const isWrongPick = revealed && i === picked && !isCorrect;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={revealed}
              onClick={() => choose(i)}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
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
        <div className="mt-4 grid gap-4">
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm leading-relaxed",
              wasCorrect
                ? "border-success/40 bg-success/5"
                : "border-danger/40 bg-danger/5"
            )}
          >
            <span className="font-medium">
              {wasCorrect ? "Correct. " : "Not quite. "}
            </span>
            {question.explanation}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              That&apos;s 1 of 2,600+ — find out if you&apos;d pass today.
            </p>
            <Button asChild size="sm">
              <Link href="/register">
                Take the free diagnostic
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
