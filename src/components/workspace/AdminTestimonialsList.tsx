"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { moderateTestimonial } from "@/contracts/testimonials";
import { userMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  quote: string;
  displayName: string;
  certName: string | null;
}

/** The owner's queue of stories that members have sent after their exam. */
export function AdminTestimonialsList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<{ id: string; status: "approved" | "hidden" } | null>(null);

  async function moderate(id: string, status: "approved" | "hidden") {
    if (busy) return;
    setBusy({ id, status });
    try {
      await api(moderateTestimonial, { id, status });
      toast.success(status === "approved" ? "The testimonial has been approved." : "The testimonial has been hidden.");
      router.refresh();
    } catch (err) {
      toast.error(userMessage(err, "The testimonial could not be updated. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-input p-8 text-small text-muted-foreground">
        No testimonials are waiting for review.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((t) => (
        <li key={t.id} className="glass grid gap-3 rounded-lg p-5 text-small">
          <blockquote className="cb-measure">{t.quote}</blockquote>
          <p className="text-note text-muted-foreground">
            {t.displayName}
            {t.certName && <>, {t.certName}</>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={busy?.id === t.id && busy.status === "approved"}
              onClick={() => moderate(t.id, "approved")}
            >
              Approve<span className="sr-only">: the testimonial from {t.displayName}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={busy?.id === t.id && busy.status === "hidden"}
              onClick={() => moderate(t.id, "hidden")}
            >
              Hide<span className="sr-only">: the testimonial from {t.displayName}</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
