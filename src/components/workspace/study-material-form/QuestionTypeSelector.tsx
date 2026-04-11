"use client";

import { Card } from "@/components/ui/Card";
import type { QuestionType } from "./types";
import { QUESTION_TYPE_OPTIONS } from "./types";

interface QuestionTypeSelectorProps {
  selectedTypes: Set<QuestionType>;
  onSelectedTypesChange: (types: Set<QuestionType>) => void;
}

export function QuestionTypeSelector({
  selectedTypes,
  onSelectedTypesChange,
}: QuestionTypeSelectorProps) {
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-text-muted">
            {selectedTypes.size === QUESTION_TYPE_OPTIONS.length
              ? "All types selected"
              : `${selectedTypes.size} of ${QUESTION_TYPE_OPTIONS.length} selected`}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUESTION_TYPE_OPTIONS.map((type) => {
            const isSelected = selectedTypes.has(type.value);
            return (
              <button
                key={type.value}
                onClick={() => {
                  const next = new Set(selectedTypes);
                  if (isSelected && next.size > 1) {
                    next.delete(type.value);
                  } else {
                    next.add(type.value);
                  }
                  onSelectedTypesChange(next);
                }}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-blue-50 ring-1 ring-primary/20"
                    : "border-border bg-bg-surface hover:border-primary/30 hover:bg-blue-50/30"
                }`}
              >
                <span className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[13px] font-mono font-semibold ${
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-bg-page text-text-muted border border-border"
                }`}>
                  {type.icon}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className={`text-[13px] font-medium ${isSelected ? "text-primary" : "text-text-primary"}`}>
                    {type.label}
                  </span>
                  <span className="text-[11px] text-text-muted">{type.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
