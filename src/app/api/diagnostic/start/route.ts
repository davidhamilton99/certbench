import { randomUUID } from "node:crypto";
import { defineEndpoint } from "@/server/api/define-endpoint";
import { startDiagnostic } from "@/contracts/diagnostic";
import { ApiError } from "@/contracts/common";
import type { ProgressSnapshot } from "@/contracts/quiz";
import { selectDiagnosticQuestions } from "@/core/question-selection/select-diagnostic";
import type { CertQuestion } from "@/core/question-selection/types";
import {
  getQuestionsByIds,
  listDiagnosticQuestions,
} from "@/server/data/questions";
import { createAttempt, getInFlightAttempt } from "@/server/data/diagnostics";

/** Strip answers before questions leave the server. */
function toExamQuestion(q: CertQuestion) {
  return {
    id: q.id,
    question_text: q.question_text,
    options: q.options.map((o) => o.text),
    domain_id: q.domain_id,
  };
}

export const POST = defineEndpoint(startDiagnostic, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");

    // Resume an in-flight attempt if one exists.
    const inFlight = await getInFlightAttempt(db, user.id, input.certId);
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
        questions: ordered.map(toExamQuestion),
        resume: inFlight.progressState,
      };
    }

    // Fresh attempt: select questions and persist the set immediately so a
    // refresh before the first autosave still resumes identically.
    const pool = await listDiagnosticQuestions(db, input.certId);
    if (pool.length === 0) {
      throw new ApiError("not_found", "No diagnostic questions for this certification");
    }
    const { listDomains } = await import("@/server/data/certifications");
    const domains = await listDomains(db, input.certId);
    const selected = selectDiagnosticQuestions(
      pool,
      domains.map((d) => ({
        id: d.id,
        domain_number: d.domainNumber,
        title: d.title,
        exam_weight: d.examWeight,
      }))
    );

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
      selected.length,
      snapshot
    );

    return {
      attemptId,
      questions: selected.map(toExamQuestion),
      resume: snapshot,
    };
  },
});
