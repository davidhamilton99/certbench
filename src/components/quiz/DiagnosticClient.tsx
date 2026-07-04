"use client";

import { api } from "@/lib/api-client";
import {
  saveDiagnosticProgress,
  startDiagnostic,
  submitDiagnostic,
} from "@/contracts/diagnostic";
import type { QuizConfig } from "@/core/quiz-engine/types";
import { ExamClient } from "./ExamClient";

const DIAGNOSTIC_CONFIG: QuizConfig = {
  mode: "diagnostic",
  grading: "server_at_end",
  allowFlagging: false,
  allowReview: true,
};

export function DiagnosticClient({ certId }: { certId: string }) {
  return (
    <ExamClient
      config={DIAGNOSTIC_CONFIG}
      start={() => api(startDiagnostic, { certId })}
      saveProgress={(attemptId, snapshot) =>
        api(saveDiagnosticProgress, { attemptId, snapshot })
      }
      submit={(attemptId, answers) => api(submitDiagnostic, { attemptId, answers })}
      submitLabel="Finish diagnostic"
      resultsTitle="Diagnostic complete"
      backHref="/dashboard"
      backLabel="See your study plan"
    />
  );
}
