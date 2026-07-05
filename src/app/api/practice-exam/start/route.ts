import { randomUUID } from "node:crypto";
import { defineEndpoint } from "@/server/api/define-endpoint";
import { startPracticeExam } from "@/contracts/practice-exam";
import { ApiError } from "@/contracts/common";
import type { ProgressSnapshot } from "@/contracts/quiz";
import {
  selectPracticeQuestions,
  selectWeakPointsQuestions,
} from "@/core/question-selection/select-questions";
import type { CertQuestion } from "@/core/question-selection/types";
import {
  DOMAIN_DRILL_QUESTION_COUNT,
  FULL_EXAM_QUESTION_COUNT,
  WEAK_POINTS_QUESTION_COUNT,
} from "@/core/constants";
import {
  getQuestionsByIds,
  listActiveQuestions,
} from "@/server/data/questions";
import { listDomains } from "@/server/data/certifications";
import { listPerformance } from "@/server/data/performance";
import {
  createAttempt,
  getInFlightAttempt,
} from "@/server/data/practice-exams";
import { assertCanStartQuiz } from "@/server/services/subscription";

function toExamQuestion(q: CertQuestion) {
  return {
    id: q.id,
    question_text: q.question_text,
    options: q.options.map((o) => o.text),
    domain_id: q.domain_id,
  };
}

export const POST = defineEndpoint(startPracticeExam, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const domainId = input.domainId ?? null;

    // Resume an in-flight attempt of this type if one exists.
    const inFlight = await getInFlightAttempt(
      db,
      user.id,
      input.certId,
      input.examType,
      domainId
    );
    if (inFlight?.progressState?.questionIds?.length) {
      const byId = new Map(
        (await getQuestionsByIds(db, inFlight.progressState.questionIds)).map(
          (q) => [q.id, q]
        )
      );
      const ordered = inFlight.progressState.questionIds
        .map((id) => byId.get(id))
        .filter((q): q is CertQuestion => !!q);
      return {
        attemptId: inFlight.id,
        examType: inFlight.examType,
        questions: ordered.map(toExamQuestion),
        resume: inFlight.progressState,
      };
    }

    const [pool, domains, performance] = await Promise.all([
      listActiveQuestions(db, input.certId),
      listDomains(db, input.certId),
      listPerformance(db, user.id, input.certId),
    ]);

    let selected: CertQuestion[];
    switch (input.examType) {
      case "full":
        selected = selectPracticeQuestions(
          pool,
          domains.map((d) => ({
            id: d.id,
            domain_number: d.domainNumber,
            title: d.title,
            exam_weight: d.examWeight,
          })),
          performance,
          input.questionCount ?? FULL_EXAM_QUESTION_COUNT
        );
        break;
      case "domain_drill": {
        const domain = domains.find((d) => d.id === domainId);
        if (!domain) throw new ApiError("not_found", "Domain not found");
        selected = selectPracticeQuestions(
          pool.filter((q) => q.domain_id === domain.id),
          [
            {
              id: domain.id,
              domain_number: domain.domainNumber,
              title: domain.title,
              exam_weight: 100,
            },
          ],
          performance,
          input.questionCount ?? DOMAIN_DRILL_QUESTION_COUNT
        );
        break;
      }
      case "weak_points":
        selected = selectWeakPointsQuestions(
          pool,
          performance,
          input.questionCount ?? WEAK_POINTS_QUESTION_COUNT
        );
        break;
    }

    if (selected.length === 0) {
      throw new ApiError(
        "not_found",
        input.examType === "weak_points"
          ? "No weak-point questions yet — answer more questions first"
          : "No questions available"
      );
    }

    // Free-tier daily quota — metered on NEW starts only (the resume path
    // above returns before this point).
    await assertCanStartQuiz(db, user.id, selected.length);

    const snapshot: ProgressSnapshot = {
      index: 0,
      responses: {},
      flagged: [],
      revealed: [],
      startedAt: new Date().toISOString(),
      seed: randomUUID(),
      questionIds: selected.map((q) => q.id),
    };

    const attemptId = await createAttempt(
      db,
      user.id,
      input.certId,
      input.examType,
      domainId,
      selected.length,
      snapshot
    );

    return {
      attemptId,
      examType: input.examType,
      questions: selected.map(toExamQuestion),
      resume: snapshot,
    };
  },
});
