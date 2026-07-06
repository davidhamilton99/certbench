"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { moderateTestimonial } from "@/contracts/testimonials";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Item {
  id: string;
  quote: string;
  displayName: string;
  certName: string | null;
}

export function AdminTestimonialsList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function moderate(id: string, status: "approved" | "hidden") {
    setBusy(id);
    try {
      await api(moderateTestimonial, { id, status });
      toast.success(status === "approved" ? "Approved — now live" : "Hidden");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No testimonials waiting for review.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((t) => (
        <Card key={t.id}>
          <CardContent className="grid gap-3">
            <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            <p className="text-xs text-muted-foreground">
              — {t.displayName}
              {t.certName && <> · {t.certName}</>}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy === t.id}
                onClick={() => moderate(t.id, "approved")}
              >
                {busy === t.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === t.id}
                onClick={() => moderate(t.id, "hidden")}
              >
                <X />
                Hide
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
