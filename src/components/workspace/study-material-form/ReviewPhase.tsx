"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { GeneratedQuestion, MCTFOption, OrderingOption, MatchingOption } from "./types";
import { QUESTION_TYPE_LABELS } from "./types";

interface ReviewPhaseProps {
  questions: GeneratedQuestion[];
  title: string;
  contentTruncated: boolean;
  error: string | null;
  saving: boolean;
  onRemoveQuestion: (index: number) => void;
  onBack: () => void;
  onSave: () => void;
}

export function ReviewPhase({
  questions,
  title,
  contentTruncated,
  error,
  saving,
  onRemoveQuestion,
  onBack,
  onSave,
}: ReviewPhaseProps) {
  return (
    <>
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Review Questions
        </h1>
        <p className="text-[14px] text-text-secondary mt-0.5">
          {questions.length} questions for &ldquo;{title}&rdquo;
        </p>
      </div>

      {contentTruncated && (
        <Card accent="warning" padding="md">
          <p className="text-[13px] text-text-secondary">
            Your content was trimmed to fit the context window. Consider splitting large documents into multiple study sets for better coverage.
          </p>
        </Card>
      )}

      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-page border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-muted">Questions</span>
          <Badge variant="neutral">{questions.length}</Badge>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-muted">Types</span>
          <div className="flex gap-1">
            {[...new Set(questions.map(q => q.question_type))].map(t => (
              <span key={t} className="text-[11px] font-mono bg-bg-surface border border-border rounded px-1.5 py-0.5 text-text-secondary">
                {QUESTION_TYPE_LABELS[t] || t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Question cards */}
      <div className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <Card key={i} padding="md" className="group">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-bg-page border border-border flex items-center justify-center text-[11px] font-mono font-semibold text-text-muted mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-[14px] font-medium text-text-primary leading-snug">
                      {q.question_text}
                    </p>
                    <span className="text-[11px] font-mono text-text-muted">
                      {QUESTION_TYPE_LABELS[q.question_type] || "MC"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveQuestion(i)}
                  className="opacity-0 group-hover:opacity-100 text-[12px] text-text-muted hover:text-danger transition-all shrink-0 px-2 py-1 rounded hover:bg-red-50"
                >
                  Remove
                </button>
              </div>

              <div className="flex flex-col gap-1 ml-9">
                {(!q.question_type ||
                  q.question_type === "multiple_choice" ||
                  q.question_type === "true_false") &&
                  (q.options as MCTFOption[]).map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isCorrect = optIdx === q.correct_index;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-start gap-2 text-[13px] px-2 py-1 rounded ${
                          isCorrect ? "bg-green-50 text-success" : "text-text-secondary"
                        }`}
                      >
                        <span className={`font-mono text-[12px] ${isCorrect ? "font-semibold" : ""}`}>{letter})</span>
                        <span className={isCorrect ? "font-medium" : ""}>{opt.text}</span>
                        {isCorrect && (
                          <svg className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                {q.question_type === "multiple_select" &&
                  (q.options as MCTFOption[]).map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-start gap-2 text-[13px] px-2 py-1 rounded ${
                          opt.is_correct ? "bg-green-50 text-success" : "text-text-secondary"
                        }`}
                      >
                        <span className={`font-mono text-[12px] ${opt.is_correct ? "font-semibold" : ""}`}>{letter})</span>
                        <span className={opt.is_correct ? "font-medium" : ""}>{opt.text}</span>
                        {opt.is_correct && (
                          <svg className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                {q.question_type === "ordering" &&
                  [...(q.options as OrderingOption[])]
                    .sort((a, b) => a.correct_position - b.correct_position)
                    .map((opt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[13px] text-text-secondary px-2 py-1">
                        <span className="font-mono text-[12px]">{idx + 1}.</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                {q.question_type === "matching" &&
                  (q.options as MatchingOption[]).map((opt, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[13px] text-text-secondary px-2 py-1">
                      <span className="font-medium text-text-primary">{opt.left}</span>
                      <span className="text-text-muted">&rarr;</span>
                      <span>{opt.right}</span>
                    </div>
                  ))}
              </div>

              {q.explanation && (
                <p className="text-[12px] text-text-muted ml-9 px-2 py-1.5 bg-bg-page rounded leading-relaxed">
                  {q.explanation}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {error && (
        <Card accent="danger" padding="md">
          <p className="text-[14px] text-danger">{error}</p>
        </Card>
      )}

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 bg-bg-page border-t border-border -mx-6 px-6 py-4 mt-2 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
        >
          Back to Editor
        </Button>
        <Button
          size="lg"
          onClick={onSave}
          loading={saving}
          disabled={questions.length === 0}
        >
          Save to Library
        </Button>
      </div>
    </>
  );
}
