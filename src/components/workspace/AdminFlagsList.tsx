"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { resolveQuestionFlag } from "@/contracts/flags";
import { userMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";

export interface FlagRow {
  id: string;
  reason: string | null;
  createdAt: string;
  questionText: string | null;
}

/** A date as it is written in the rest of the site: "November 22, 2026". Fixed to UTC, so the server and the browser print the same day. */
function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** The owner's queue of questions that members have reported. */
export function AdminFlagsList({ flags }: { flags: FlagRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<{ id: string; status: "actioned" | "dismissed" } | null>(null);

  async function resolve(flagId: string, status: "actioned" | "dismissed") {
    if (busy) return;
    setBusy({ id: flagId, status });
    try {
      await api(resolveQuestionFlag, { flagId, status, adminNotes: null });
      toast.success(status === "actioned" ? "The report has been marked as actioned." : "The report has been dismissed.");
      router.refresh();
    } catch (err) {
      toast.error(userMessage(err, "The report could not be updated. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  if (flags.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-input p-8 text-small text-muted-foreground">
        No reports are waiting for review.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {flags.map((flag, i) => (
        <li key={flag.id} className="glass grid gap-2 rounded-lg p-5 text-small">
          <p>{flag.questionText ?? "This question no longer exists."}</p>
          {flag.reason && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Reported problem: </span>
              {flag.reason}
            </p>
          )}
          <p className="text-note text-muted-foreground">Reported on {longDate(flag.createdAt)}.</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              loading={busy?.id === flag.id && busy.status === "actioned"}
              onClick={() => resolve(flag.id, "actioned")}
            >
              Mark as actioned<span className="sr-only">: report {i + 1}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={busy?.id === flag.id && busy.status === "dismissed"}
              onClick={() => resolve(flag.id, "dismissed")}
            >
              Dismiss<span className="sr-only">: report {i + 1}</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
