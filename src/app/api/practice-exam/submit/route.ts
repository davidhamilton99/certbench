import { defineEndpoint } from "@/server/api/define-endpoint";
import { submitPracticeExam, type ExamType } from "@/contracts/practice-exam";
import { ApiError } from "@/contracts/common";
import type { DomainBreakdown, GradedResponse } from "@/contracts/quiz";
import { getQuestionsByIds } from "@/server/data/questions";
import { listDomains } from "@/server/data/certifications";
import { completeAttempt, getAttempt } from "@/server/data/practice-exams";
import { requireCertAccess } from "@/server/data/enrollments";
import {
  recomputeAndSnapshotReadiness,
  updateQuestionPerformanceForAnswers,
} from "@/server/services/submit-exam";

/** What each kind of practice is called on its own screen, for the sentences a refusal is given in. */
const KIND: Record<ExamType, string> = {
  full: "practice exam",
  domain_drill: "domain drill",
  weak_points: "weak points review",
};

export const POST = defineEndpoint(submitPracticeExam, {
  auth: "pro",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");

    // The member reads these sentences as they are written.
    const attempt = await getAttempt(db, user.id, input.attemptId);
    if (!attempt) throw new ApiError("not_found", "These questions could not be found. Please start them again.");
    // The attempt's exam must be in the member's plan: nothing is graded, and
    // no answer or explanation is returned, for an exam that is not.
    await requireCertAccess(db, user.id, attempt.certificationId);
    if (attempt.isComplete)
      throw new ApiError("conflict", `This ${KIND[attempt.examType]} has already been submitted.`);

    const allowedIds = new Set(attempt.progressState?.questionIds ?? []);
    const offered = input.answers.filter((a) => allowedIds.has(a.questionId));

    // The snapshot's ids were sent by the member's own browser (the progress
    // route stores the snapshot as sent), so they do not prove that a question
    // belongs to this attempt. Only questions of the attempt's own exam are
    // graded: no other exam's answers or explanations are returned, and no
    // answer is filed under the wrong exam.
    const questions = (
      await getQuestionsByIds(
        db,
        offered.map((a) => a.questionId)
      )
    ).filter((q) => q.certification_id === attempt.certificationId);
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const answers = offered.filter((a) => questionById.has(a.questionId));
    if (answers.length === 0)
      throw new ApiError(
        "validation_failed",
        `None of the answers that were sent belong to this ${KIND[attempt.examType]}.`
      );
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
