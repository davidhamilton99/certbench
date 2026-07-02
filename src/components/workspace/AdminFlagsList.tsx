"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { resolveQuestionFlag } from "@/contracts/flags";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface FlagRow {
  id: string;
  reason: string | null;
  createdAt: string;
  questionText: string | null;
}

export function AdminFlagsList({ flags }: { flags: FlagRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function resolve(flagId: string, status: "actioned" | "dismissed") {
    setBusy(flagId);
    try {
      await api(resolveQuestionFlag, { flagId, status, adminNotes: null });
      toast.success(status === "actioned" ? "Marked actioned" : "Dismissed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (flags.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No pending flags — the queue is clear.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {flags.map((flag) => (
        <Card key={flag.id} className="py-4">
          <CardContent className="grid gap-2 text-sm">
            <p className="leading-relaxed">
              {flag.questionText ?? "(question no longer exists)"}
            </p>
            {flag.reason && (
              <p className="text-muted-foreground">“{flag.reason}”</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={busy === flag.id}
                onClick={() => resolve(flag.id, "actioned")}
              >
                {busy === flag.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Actioned
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === flag.id}
                onClick={() => resolve(flag.id, "dismissed")}
              >
                <X className="size-3.5" />
                Dismiss
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(flag.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
