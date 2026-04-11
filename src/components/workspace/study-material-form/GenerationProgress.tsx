"use client";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DEFAULT_QUESTION_COUNT } from "./types";

interface GenerationProgressProps {
  phase: "generating" | "validating";
  questionCount: number;
}

export function GenerationProgress({ phase, questionCount }: GenerationProgressProps) {
  const targetCount = DEFAULT_QUESTION_COUNT;
  const pct = targetCount > 0 ? Math.min(100, Math.round((questionCount / targetCount) * 100)) : 0;

  return (
    <Card padding="lg">
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        {/* Animated ring */}
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-border)" strokeWidth="4" />
            <circle
              cx="40" cy="40" r="36" fill="none"
              stroke="var(--color-primary)" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - pct / 100)}`}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[18px] font-mono font-semibold text-primary tabular-nums">
            {questionCount}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[16px] font-semibold text-text-primary">
            {phase === "validating"
              ? "Checking question quality"
              : "Generating questions"}
          </p>
          <p className="text-[14px] text-text-secondary">
            {questionCount > 0
              ? `${questionCount} questions created`
              : "Analyzing your content..."}
          </p>
        </div>

        <ProgressBar value={pct} size="md" />

        <p className="text-[12px] text-text-muted">
          {phase === "validating"
            ? "Verifying accuracy and improving weak questions"
            : "This usually takes 15\u201345 seconds"}
        </p>
      </div>
    </Card>
  );
}
