"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { StudyQuestion } from "@/contracts/study-sets";
import { Button } from "@/components/ui/button";

/** Saves the study set as a PDF file. The code that makes the file is loaded when the button is pressed. */
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
    if (busy) return;
    setBusy(true);
    try {
      const { exportPdf } = await import("@/lib/export/study-set-pdf");
      await exportPdf({ title, category }, questions);
    } catch {
      toast.error("The PDF file could not be made. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={download} loading={busy}>
      Download as a PDF
    </Button>
  );
}
