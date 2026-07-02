"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { flagQuestion } from "@/contracts/flags";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** "Report a problem" affordance shown next to reviewed questions. */
export function QuestionFlagButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <span className="text-xs text-muted-foreground">
        Reported — thank you
      </span>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Flag className="size-3.5" />
        Report a problem
      </Button>
    );
  }

  async function submit() {
    if (reason.trim().length < 3) return;
    setBusy(true);
    try {
      await api(flagQuestion, { questionId, reason: reason.trim() });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What's wrong with this question?"
        maxLength={500}
        className="h-8 max-w-72 text-xs"
      />
      <Button type="button" size="sm" onClick={submit} disabled={busy}>
        {busy && <Loader2 className="animate-spin" />}
        Send
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
