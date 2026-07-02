"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  recordCommunityAttempt,
  reportCommunitySet,
  toggleBookmark,
} from "@/contracts/community";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Records one play per page view (fire-and-forget). */
export function AttemptPing({ setId }: { setId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void api(recordCommunityAttempt, { setId }).catch(() => {});
  }, [setId]);
  return null;
}

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

  async function toggle() {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await api(toggleBookmark, { setId, bookmarked: next });
    } catch (err) {
      setBookmarked(!next);
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function sendReport() {
    if (reason.trim().length < 3) return;
    setBusy(true);
    try {
      await api(reportCommunitySet, { setId, reason: reason.trim() });
      setReported(true);
      setReporting(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={toggle} aria-pressed={bookmarked}>
        <Bookmark className={cn("size-3.5", bookmarked && "fill-current")} />
        {bookmarked ? "Saved" : "Save"}
      </Button>
      {reported ? (
        <span className="text-xs text-muted-foreground">Reported — thank you</span>
      ) : reporting ? (
        <span className="flex items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What's wrong with this set?"
            maxLength={500}
            className="h-8 w-64 text-xs"
          />
          <Button size="sm" onClick={sendReport} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Send
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setReporting(false)}>
            Cancel
          </Button>
        </span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setReporting(true)}
        >
          <Flag className="size-3.5" />
          Report
        </Button>
      )}
    </div>
  );
}
