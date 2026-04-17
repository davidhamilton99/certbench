"use client";

import { Button } from "@/components/ui/Button";

interface Props {
  questionId: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  error: string | null;
  saving: boolean;
  onQuestionTextChange: (text: string) => void;
  onOptionChange: (index: number, text: string) => void;
  onCorrectIndexChange: (index: number) => void;
  onExplanationChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

/**
 * Inline editor for a single MC / T/F study question. Controlled — parent
 * owns all edit state so that AI-improve can pre-populate it via the same
 * state slots.
 */
export function QuestionEditForm({
  questionId,
  questionText,
  options,
  correctIndex,
  explanation,
  error,
  saving,
  onQuestionTextChange,
  onOptionChange,
  onCorrectIndexChange,
  onExplanationChange,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-text-muted">
          Question
        </label>
        <textarea
          value={questionText}
          onChange={(e) => onQuestionTextChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-[14px] text-text-primary bg-bg-surface border border-border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-text-muted">
          Options (select the correct answer)
        </label>
        {options.map((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          return (
            <div key={optIdx} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${questionId}`}
                checked={correctIndex === optIdx}
                onChange={() => onCorrectIndexChange(optIdx)}
                className="accent-primary"
              />
              <span className="text-[13px] font-mono text-text-muted w-4">
                {letter})
              </span>
              <input
                value={opt}
                onChange={(e) => onOptionChange(optIdx, e.target.value)}
                className="flex-1 px-2 py-1.5 text-[13px] text-text-primary bg-bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-text-muted">
          Explanation
        </label>
        <textarea
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-[13px] text-text-primary bg-bg-surface border border-border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} loading={saving}>
          Save
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
