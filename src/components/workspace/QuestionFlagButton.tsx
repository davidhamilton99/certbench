"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

interface QuestionFlagButtonProps {
  questionId: string;
}

export function QuestionFlagButton({ questionId }: QuestionFlagButtonProps) {
  const [flagged, setFlagged] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const flagMutation = useMutation({
    mutationFn: (body: { questionId: string; reason?: string }) =>
      api.post("/api/questions/flag", { body }),
    onSuccess: () => {
      setFlagged(true);
      setShowInput(false);
      setReason("");
      setError(null);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : "Network error"
      );
    },
  });

  const unflagMutation = useMutation({
    mutationFn: () =>
      api.delete("/api/questions/flag", { body: { questionId } }),
    onSuccess: () => {
      setFlagged(false);
      setReason("");
      setError(null);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : "Network error"
      );
    },
  });

  const submitting = flagMutation.isPending || unflagMutation.isPending;

  function handleFlag() {
    if (flagged) {
      unflagMutation.mutate();
      return;
    }
    if (!showInput) {
      setShowInput(true);
    }
  }

  function handleSubmit() {
    flagMutation.mutate({
      questionId,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={handleFlag}
          disabled={submitting}
          className="text-[11px] font-mono text-text-muted uppercase hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {flagged ? "FLAGGED" : "FLAG"}
        </button>
        {error && (
          <span className="text-[11px] font-mono text-text-muted">{error}</span>
        )}
      </div>

      {showInput && !flagged && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Optional: describe the issue"
            className="flex-1 text-[13px] bg-bg-surface border border-border rounded-md px-2 py-1 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 shrink-0"
          >
            {submitting ? "..." : "Submit"}
          </button>
          <button
            onClick={() => {
              setShowInput(false);
              setReason("");
              setError(null);
            }}
            className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors shrink-0"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
