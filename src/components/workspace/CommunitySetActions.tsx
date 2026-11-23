"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  recordCommunityAttempt,
  reportCommunitySet,
  toggleBookmark,
} from "@/contracts/community";
import { userMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Records that the set was opened, once for each page view. A failure is ignored. */
export function AttemptPing({ setId }: { setId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void api(recordCommunityAttempt, { setId }).catch(() => {});
  }, [setId]);
  return null;
}

/**
 * What a member can do with another member's study set: bookmark it, and
 * report a problem with it. The bookmark is a button that is pressed or not;
 * its name stays the same and its state says which. The report is a short
 * form that opens in place, with a label, and its result is said in a sentence.
 */
export function CommunitySetActions({
  setId,
  initialBookmarked,
}: {
  setId: string;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();
  const errorId = useId();
  const reportRef = useRef<HTMLButtonElement>(null);
  // "Cancel" removes the form: the focus goes back to the button that opened it.
  const returnFocus = useRef(false);
  useEffect(() => {
    if (!reporting && returnFocus.current) {
      returnFocus.current = false;
      reportRef.current?.focus();
    }
  }, [reporting]);

  async function toggle() {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await api(toggleBookmark, { setId, bookmarked: next });
    } catch (err) {
      setBookmarked(!next);
      toast.error(userMessage(err, "The bookmark could not be saved. Please try again."));
    }
  }

  async function sendReport(e: FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3 || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(reportCommunitySet, { setId, reason: reason.trim() });
      setReported(true);
      setReporting(false);
    } catch (err) {
      setError(userMessage(err, "Your report could not be sent. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggle} aria-pressed={bookmarked}>
          <Bookmark aria-hidden className={cn("size-3.5", bookmarked && "fill-current")} />
          Bookmark
        </Button>
        {!reported && !reporting && (
          <Button
            ref={reportRef}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setReporting(true)}
          >
            Report a problem with this set
          </Button>
        )}
      </div>

      {/* Always present, so that what is written into it is announced. */}
      <p role="status" className={reported ? "text-note text-muted-foreground" : "sr-only"}>
        {reported && "Your report has been received. Thank you."}
      </p>

      {reporting && (
        <form onSubmit={sendReport} className="grid gap-2">
          <Label htmlFor={fieldId}>What is wrong with this study set?</Label>
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
                setReporting(false);
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
      )}
    </div>
  );
}
