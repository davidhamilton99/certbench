import { defineEndpoint } from "@/server/api/define-endpoint";
import { recordPathAnswers } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { loadPathBank } from "@/server/path/bank";
import {
  recomputeAndSnapshotReadiness,
  updateQuestionPerformanceForAnswers,
} from "@/server/services/submit-exam";

/**
 * Answers to bank questions from a finished stop. They feed the same
 * performance rows as any practice session, so the readiness score and spaced
 * repetition count path work too. Graded here from the bank, never trusted
 * from the client; questions from another exam are ignored.
 */
export const POST = defineEndpoint(recordPathAnswers, {
  auth: "user",
  rateLimit: { limit: 240, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const bank = await loadPathBank(input.cert);
    if (!bank) throw new ApiError("not_found", "That exam isn't available.");

    // One answer per question: the last one given.
    const latest = new Map<string, number>();
    for (const a of input.answers) {
      if (bank.byId.has(a.questionId)) latest.set(a.questionId, a.selectedIndex);
    }
    const answers = [...latest].map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }));
    if (answers.length === 0) return { ok: true as const };

    await updateQuestionPerformanceForAnswers(db, {
      userId: user.id,
      certificationId: bank.certId,
      answers,
      questions: answers.map((a) => ({ id: a.questionId, correct_index: bank.byId.get(a.questionId)!.answer })),
      upsertNew: true,
    });
    await recomputeAndSnapshotReadiness(db, { userId: user.id, certificationId: bank.certId });
    return { ok: true as const };
  },
});
