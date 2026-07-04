"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StudyQuestion } from "@/contracts/study-sets";
import { Button } from "@/components/ui/button";

export function ExportPdfButton({
  title,
  category,
  questions,
}: {
  title: string;
  category: string | null;
  questions: StudyQuestion[];
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { exportPdf } = await import("@/lib/export/study-set-pdf");
      await exportPdf({ title, category }, questions);
    } catch {
      toast.error("Couldn't generate the PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={download} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <FileDown className="size-3.5" />}
      PDF
    </Button>
  );
}
