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

/** The result's heading, as a sentence. */
const RESULT_TITLES: Record<ExamType, string> = {
  full: "You have completed the practice exam.",
  domain_drill: "You have completed the domain drill.",
  weak_points: "You have completed the weak points review.",
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
      submitLabel="Submit your answers"
      resultsTitle={RESULT_TITLES[examType]}
      backHref="/dashboard"
      backLabel="Return to your study plan"
      fullExam={examType === "full"}
    />
  );
}
