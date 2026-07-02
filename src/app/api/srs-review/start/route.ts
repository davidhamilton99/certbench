import { defineEndpoint } from "@/server/api/define-endpoint";
import { startSrsReview } from "@/contracts/srs";
import { ApiError } from "@/contracts/common";
import { listDueCards } from "@/server/data/srs";
import { getQuestionsByIds } from "@/server/data/questions";
import { SRS_MAX_CARDS_PER_SESSION } from "@/core/constants";

const DAY_MS = 86_400_000;

export const POST = defineEndpoint(startSrsReview, {
  auth: "user",
  rateLimit: { limit: 20, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");

    const { cards, totalDue } = await listDueCards(
      db,
      user.id,
      input.certId,
      input.limit ?? SRS_MAX_CARDS_PER_SESSION
    );
    const questions = await getQuestionsByIds(
      db,
      cards.map((c) => c.question_id)
    );
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const now = Date.now();

    return {
      cards: cards.flatMap((c) => {
        const q = questionById.get(c.question_id);
        if (!q) return [];
        return [
          {
            questionId: q.id,
            questionText: q.question_text,
            options: q.options.map((o) => o.text),
            domainId: q.domain_id,
            overdueDays: Math.max(
              0,
              Math.floor((now - new Date(c.srs_next_review_at).getTime()) / DAY_MS)
            ),
          },
        ];
      }),
      totalDue,
    };
  },
});
