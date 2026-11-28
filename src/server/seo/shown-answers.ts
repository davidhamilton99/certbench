import "server-only";

import { seededRng, seedFrom, shuffle } from "@/core/path/compose";
import { mentionsOptionLetter, splitExplanation } from "@/core/path/text";

/** What is read of a bank question to put its answers in order. */
export interface StoredAnswers {
  id: string;
  options: readonly { text: string }[];
  correct_index: number;
  explanation: string;
}

/**
 * A bank question's answers in the order a public page shows them, and the
 * place of the correct one in that order.
 *
 * The stored order puts the answer at B far more often than chance, so the
 * answers are shuffled. The shuffle is seeded by the question's id and nothing
 * else: the pages are static, and a question's answers come in the same order
 * on every build and on every page that lists it.
 *
 * A question whose explanation names an answer by its letter keeps its stored
 * order, because the letter must go on naming the answer shown under it. The
 * letter is looked for in everything a page shows of the explanation: its
 * first sentence, printed as the reason, and the rest.
 */
export function shownAnswers(q: StoredAnswers): { options: string[]; correctIndex: number } {
  const stored = q.options.map((o) => o.text);
  const { takeaway, rest } = splitExplanation(q.explanation);
  const order = mentionsOptionLetter(`${takeaway} ${rest}`)
    ? stored.map((_, k) => k)
    : shuffle(stored.map((_, k) => k), seededRng(seedFrom(q.id)));
  return { options: order.map((k) => stored[k]), correctIndex: order.indexOf(q.correct_index) };
}
