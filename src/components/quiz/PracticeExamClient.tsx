"use client";

import { api } from "@/lib/api-client";
import {
  savePracticeExamProgress,
  startPracticeExam,
  submitPracticeExam,
  type ExamType,
} from "@/contracts/practice-exam";
import type { QuizConfig } from "@/core/quiz-engine/types";
import { ExamClient } from "./ExamClient";

const PRACTICE_CONFIG: QuizConfig = {
  mode: "practice_exam",
  grading: "server_at_end",
  allowFlagging: true,
  allowReview: true,
};

const RESULT_TITLES: Record<ExamType, string> = {
  full: "Practice exam complete",
  domain_drill: "Domain drill complete",
  weak_points: "Weak points review complete",
};

export function PracticeExamClient({
  certId,
  examType,
  domainId,
  questionCount,
}: {
  certId: string;
  examType: ExamType;
  domainId?: string;
  questionCount?: number;
}) {
  return (
    <ExamClient
      config={PRACTICE_CONFIG}
      start={() =>
        api(startPracticeExam, {
          certId,
          examType,
          domainId: domainId ?? null,
          questionCount: questionCount ?? null,
        })
      }
      saveProgress={(attemptId, snapshot) =>
        api(savePracticeExamProgress, { attemptId, snapshot })
      }
      submit={(attemptId, answers, flaggedQuestionIds) =>
        api(submitPracticeExam, { attemptId, answers, flaggedQuestionIds })
      }
      submitLabel="Submit exam"
      resultsTitle={RESULT_TITLES[examType]}
      backHref="/dashboard"
      backLabel="Back to your study plan"
    />
  );
}
