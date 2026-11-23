import { defineEndpoint } from "@/server/api/define-endpoint";
import { recordPathAnswers } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { certIdFor } from "@/server/path/cert-id";
import { listAnswerKeys } from "@/server/data/questions";
import {
  recomputeAndSnapshotReadiness,
  updateQuestionPerformanceForAnswers,
} from "@/server/services/submit-exam";

/**
 * Answers to bank questions from a finished stop. They feed the same
 * performance rows as any practice session, so the readiness score and spaced
 * repetition count path work too. Graded here from the database's own answer
 * key, never trusted from the client; questions from another exam, and
 * questions that have been retired, are ignored. Only the questions that were
 * answered are read, not the exam's whole bank.
 */
export const POST = defineEndpoint(recordPathAnswers, {
  auth: "user",
  rateLimit: { limit: 240, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const certId = await certIdFor(input.cert);
    if (!certId) throw new ApiError("not_found", "That exam is not available.");

    // One answer per question: the last one given.
    const latest = new Map<string, number>();
    for (const a of input.answers) latest.set(a.questionId, a.selectedIndex);

    const keys = await listAnswerKeys(db, certId, [...latest.keys()]);
    const known = new Set(keys.map((k) => k.id));
    const answers = [...latest]
      .filter(([questionId]) => known.has(questionId))
      .map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }));
    if (answers.length === 0) return { ok: true as const };

    const recorded = await updateQuestionPerformanceForAnswers(db, {
      userId: user.id,
      certificationId: certId,
      answers,
      questions: keys,
      upsertNew: true,
    });
    // The history could not be read, so nothing was written: say so honestly.
    // The study path sends these in the background and keeps its own record.
    if (!recorded) throw new ApiError("internal", "Your answers could not be recorded. Please try again.");
    await recomputeAndSnapshotReadiness(db, { userId: user.id, certificationId: certId });
    return { ok: true as const };
  },
});
