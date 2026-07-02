import { defineEndpoint } from "@/server/api/define-endpoint";
import { submitPracticeExam } from "@/contracts/practice-exam";
import { ApiError } from "@/contracts/common";
import type { DomainBreakdown, GradedResponse } from "@/contracts/quiz";
import { getQuestionsByIds } from "@/server/data/questions";
import { listDomains } from "@/server/data/certifications";
import { completeAttempt, getAttempt } from "@/server/data/practice-exams";
import {
  recomputeAndSnapshotReadiness,
  updateQuestionPerformanceForAnswers,
} from "@/server/services/submit-exam";

export const POST = defineEndpoint(submitPracticeExam, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");

    const attempt = await getAttempt(db, user.id, input.attemptId);
    if (!attempt) throw new ApiError("not_found", "Attempt not found");
    if (attempt.isComplete)
      throw new ApiError("conflict", "Attempt already submitted");

    const allowedIds = new Set(attempt.progressState?.questionIds ?? []);
    const answers = input.answers.filter((a) => allowedIds.has(a.questionId));
    if (answers.length === 0)
      throw new ApiError("validation_failed", "No valid answers for this attempt");

    const questions = await getQuestionsByIds(
      db,
      answers.map((a) => a.questionId)
    );
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const flaggedSet = new Set(input.flaggedQuestionIds);

    const graded: GradedResponse[] = answers.flatMap((a) => {
      const q = questionById.get(a.questionId);
      if (!q) return [];
      return [
        {
          questionId: q.id,
          selectedIndex: a.selectedIndex,
          correctIndex: q.correct_index,
          isCorrect: a.selectedIndex === q.correct_index,
          explanation: q.explanation,
          questionText: q.question_text,
          options: q.options.map((o) => o.text),
          domainId: q.domain_id,
        },
      ];
    });

    await completeAttempt(
      db,
      user.id,
      input.attemptId,
      graded.map((g) => {
        const answer = answers.find((a) => a.questionId === g.questionId);
        return {
          questionId: g.questionId,
          selectedIndex: g.selectedIndex,
          isCorrect: g.isCorrect,
          isFlagged: flaggedSet.has(g.questionId),
          timeSpentSeconds: answer?.timeSpentSeconds ?? null,
        };
      })
    );

    await updateQuestionPerformanceForAnswers(db, {
      userId: user.id,
      certificationId: attempt.certificationId,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex,
      })),
      questions: questions.map((q) => ({
        id: q.id,
        correct_index: q.correct_index,
      })),
      upsertNew: true,
    });
    const readiness = await recomputeAndSnapshotReadiness(db, {
      userId: user.id,
      certificationId: attempt.certificationId,
    });

    const domains = await listDomains(db, attempt.certificationId);
    const domainBreakdown: DomainBreakdown[] = domains.flatMap((d) => {
      const inDomain = graded.filter((g) => g.domainId === d.id);
      if (inDomain.length === 0) return [];
      return [
        {
          domainId: d.id,
          domainNumber: d.domainNumber,
          title: d.title,
          total: inDomain.length,
          correct: inDomain.filter((g) => g.isCorrect).length,
        },
      ];
    });

    const correctCount = graded.filter((g) => g.isCorrect).length;
    return {
      attemptId: input.attemptId,
      totalQuestions: graded.length,
      correctCount,
      scorePercent: Math.round((correctCount / graded.length) * 100),
      domainBreakdown,
      responses: graded,
      readiness: readiness
        ? {
            overallScore: readiness.overall_score,
            isPreliminary: readiness.is_preliminary,
          }
        : null,
    };
  },
});
