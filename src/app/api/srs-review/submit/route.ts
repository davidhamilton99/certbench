import { defineEndpoint } from "@/server/api/define-endpoint";
import { submitSrsAnswer } from "@/contracts/srs";
import { ApiError } from "@/contracts/common";
import { getQuestionsByIds } from "@/server/data/questions";
import { getCardSchedule } from "@/server/data/srs";
import { updateQuestionPerformanceForAnswers } from "@/server/services/submit-exam";

export const POST = defineEndpoint(submitSrsAnswer, {
  auth: "user",
  rateLimit: { limit: 60, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");

    const [question] = await getQuestionsByIds(db, [input.questionId]);
    if (!question) throw new ApiError("not_found", "Question not found");

    // upsertNew: false — an SRS card without a performance row would be a
    // bug (it was selected FROM the user's performance).
    await updateQuestionPerformanceForAnswers(db, {
      userId: user.id,
      certificationId: input.certId,
      answers: [
        { questionId: input.questionId, selectedIndex: input.selectedIndex },
      ],
      questions: [{ id: question.id, correct_index: question.correct_index }],
      upsertNew: false,
    });

    const schedule = await getCardSchedule(db, user.id, input.questionId);
    if (!schedule)
      throw new ApiError("not_found", "No SRS record for this question");

    return {
      isCorrect: input.selectedIndex === question.correct_index,
      correctIndex: question.correct_index,
      explanation: question.explanation,
      nextReviewAt: schedule.nextReviewAt,
      intervalDays: schedule.intervalDays,
      streak: schedule.streak,
    };
  },
});
