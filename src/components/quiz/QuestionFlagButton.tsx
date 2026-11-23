"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { flagQuestion } from "@/contracts/flags";
import { userMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** "Report a problem" beside a reviewed question: a short form that opens in place. */
export function QuestionFlagButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();
  const errorId = useId();
  const openRef = useRef<HTMLButtonElement>(null);
  // "Cancel" removes the form: the focus goes back to the button that opened it.
  const returnFocus = useRef(false);
  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current = false;
      openRef.current?.focus();
    }
  }, [open]);

  if (done) {
    return (
      <p role="status" className="text-note text-muted-foreground">
        Your report has been received. Thank you.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        ref={openRef}
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        Report a problem with this question
      </Button>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3 || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(flagQuestion, { questionId, reason: reason.trim() });
      setDone(true);
    } catch (err) {
      setError(userMessage(err, "Your report could not be sent. Please try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <Label htmlFor={fieldId}>What is wrong with this question?</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={fieldId}
          // The field opens in answer to a press, so it takes the keyboard.
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="max-w-80"
        />
        <Button type="submit" size="sm" loading={busy} disabled={reason.trim().length < 3}>
          Send the report
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            returnFocus.current = true;
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-note text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
