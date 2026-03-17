"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface DomainScore {
  domain_id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
  raw_score: number;
  confidence_factor: number;
  attempted: number;
  correct: number;
}

interface ResultsData {
  correctCount: number;
  totalQuestions: number;
  readiness: {
    overall_score: number;
    domain_scores: DomainScore[];
    is_preliminary: boolean;
  };
  questions: {
    id: string;
    question_text: string;
    options: { text: string; is_correct: boolean }[];
    correct_index: number;
    explanation: string;
    domain_id: string;
  }[];
  responses: {
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
  }[];
}

export function DiagnosticResults({
  results,
  certName,
  certSlug,
}: {
  results: ResultsData;
  certName: string;
  certSlug: string;
}) {
  const [showReview, setShowReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "incorrect">("all");

  const { readiness } = results;
  const percentage = Math.round(
    (results.correctCount / results.totalQuestions) * 100
  );

  const responseMap = new Map(
    results.responses.map((r) => [r.questionId, r])
  );

  const filteredQuestions =
    reviewFilter === "incorrect"
      ? results.questions.filter(
          (q) => !responseMap.get(q.id)?.isCorrect
        )
      : results.questions;

  if (showReview) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Question Review
          </h1>
          <Button variant="ghost" onClick={() => setShowReview(false)}>
            Back to results
          </Button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setReviewFilter("all")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
              reviewFilter === "all"
                ? "bg-bg-surface border border-border text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            All ({results.questions.length})
          </button>
          <button
            onClick={() => setReviewFilter("incorrect")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
              reviewFilter === "incorrect"
                ? "bg-bg-surface border border-border text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Incorrect ({results.totalQuestions - results.correctCount})
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {filteredQuestions.map((q, i) => {
            const response = responseMap.get(q.id);
            if (!response) return null;

            return (
              <Card key={q.id} padding="lg">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[15px] leading-relaxed text-text-primary">
                      {q.question_text}
                    </p>
                    <span className="text-[12px] font-mono font-medium text-text-secondary whitespace-nowrap">
                      {response.isCorrect ? "CORRECT" : "INCORRECT"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrectAnswer = optIdx === q.correct_index;
                      const wasSelected = optIdx === response.selectedIndex;

                      let optionStyle = "text-text-muted";
                      if (isCorrectAnswer) optionStyle = "text-text-primary font-medium";
                      else if (wasSelected && !response.isCorrect)
                        optionStyle = "text-text-muted line-through";

                      return (
                        <div key={optIdx} className="flex gap-2">
                          <span
                            className={`text-[14px] font-mono ${optionStyle}`}
                          >
                            {letter})
                          </span>
                          <span className={`text-[14px] ${optionStyle}`}>
                            {opt.text}
                            {isCorrectAnswer && " ✓"}
                            {wasSelected && !isCorrectAnswer && " ✗"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-border pt-3 mt-1">
                    <p className="text-[13px] text-text-secondary leading-relaxed">
                      {q.explanation.length > 500
                        ? q.explanation.substring(0, 500) + "..."
                        : q.explanation}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Button variant="ghost" onClick={() => setShowReview(false)}>
          Back to results
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Diagnostic Complete
        </h1>
        <p className="text-[15px] text-text-secondary mt-1">{certName}</p>
      </div>

      {/* Score overview */}
      <Card padding="lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-[48px] font-mono font-semibold text-text-primary tabular-nums leading-none">
              {Math.round(readiness.overall_score)}
            </span>
            <span className="text-[15px] text-text-muted">/ 100</span>
            {readiness.is_preliminary && (
              <span className="text-[12px] font-mono text-text-muted">PRELIMINARY</span>
            )}
          </div>
          <ProgressBar
            value={readiness.overall_score}
            size="md"
            showLabel
          />
          <p className="text-[14px] text-text-secondary">
            You answered {results.correctCount} of {results.totalQuestions}{" "}
            questions correctly ({percentage}%). This is your starting
            readiness score — it will become more accurate as you practise.
          </p>
        </div>
      </Card>

      {/* Domain breakdown */}
      <div>
        <h2 className="text-[18px] font-semibold text-text-primary mb-4">
          Domain Breakdown
        </h2>
        <div className="flex flex-col gap-3">
          {readiness.domain_scores
            .sort(
              (a, b) =>
                parseFloat(a.domain_number) - parseFloat(b.domain_number)
            )
            .map((ds) => {
              const domainPct =
                ds.attempted > 0
                  ? Math.round((ds.correct / ds.attempted) * 100)
                  : 0;

              return (
                <div
                  key={ds.domain_id}
                  className="flex items-center gap-4 py-3 border-b border-border last:border-0"
                >
                  <p className="text-[14px] text-text-primary flex-1 min-w-0">
                    {ds.domain_number} {ds.title}
                  </p>
                  <span className="text-[12px] font-mono text-text-muted whitespace-nowrap">
                    {ds.correct}/{ds.attempted}
                  </span>
                  <div className="w-24">
                    <ProgressBar value={domainPct} size="sm" />
                  </div>
                  <span className="text-[13px] font-mono text-text-primary tabular-nums w-10 text-right">
                    {domainPct}%
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => setShowReview(true)} variant="secondary" size="lg">
          Review Answers
        </Button>
        <Link href={`/dashboard?cert=${certSlug}`}>
          <Button size="lg">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
