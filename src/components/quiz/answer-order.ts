import { seededPermutation } from "@/core/quiz-engine/shuffle";

/**
 * The order in which a question's answers are shown: `order[place]` is the
 * stored index of the answer at that place.
 *
 * Answers are shown in a seeded shuffle, the same on every visit to an attempt,
 * because the stored order puts the correct answer second far more often than
 * chance. A question whose explanation names an answer by its letter ("option
 * A is the only one that ...") keeps its stored order instead: the server says
 * so with the question (`keepOrder`), and the letter in the text then names
 * the answer that is shown under that letter. The study path does the same.
 *
 * The answers on screen, the keys that choose them and the review of a
 * finished attempt all take the order from here, so they cannot disagree.
 */
export function answerOrder(seed: string, questionId: string, count: number, keepOrder = false): number[] {
  return keepOrder ? Array.from({ length: count }, (_, i) => i) : seededPermutation(seed, questionId, count);
}
