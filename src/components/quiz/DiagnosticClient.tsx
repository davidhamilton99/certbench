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

export function DiagnosticClient({
  certId,
  certName,
  examCode,
  domainWeights,
}: {
  certId: string;
  certName: string;
  examCode: string;
  domainWeights: Record<string, number>;
}) {
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
      diagnosticCertId={certId}
      certName={certName}
      examCode={examCode}
      domainWeights={domainWeights}
    />
  );
}
