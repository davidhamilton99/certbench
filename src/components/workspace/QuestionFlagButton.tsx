"use client";

import { useState } from "react";

interface QuestionFlagButtonProps {
  questionId: string;
}

export function QuestionFlagButton({ questionId }: QuestionFlagButtonProps) {
  const [flagged, setFlagged] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFlag() {
    if (flagged) {
      // Unflag
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/questions/flag", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to unflag");
          return;
        }
        setFlagged(false);
        setReason("");
      } catch {
        setError("Network error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Show input if not already showing
    if (!showInput) {
      setShowInput(true);
      return;
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/questions/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to flag");
        return;
      }
      setFlagged(true);
      setShowInput(false);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
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
