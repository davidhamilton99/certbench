/**
 * What a set of multiple-choice questions gives away to someone who has not
 * read them.
 *
 * Recordings of real visitors in November 2026 showed people choosing the
 * longest or most detailed answer without reading the question, and on the
 * bank as it then stood that habit was right more than half the time. These
 * measures are how the bank is kept from drifting back: its tests hold every
 * exam's questions to them (src/data/bank-rewrite), and a new set of questions
 * should be held to them before it is added.
 *
 * Lengths are counted in characters, which is what the eye compares.
 */

export interface KeyedQuestion {
  options: readonly string[];
  /** Index of the correct option. */
  answer: number;
}

const lengths = (q: KeyedQuestion) => q.options.map((o) => o.trim().length);

/** The share of a question that a rule earns when it points at every option of one extreme length. */
function shareAtExtreme(q: KeyedQuestion, extreme: (...n: number[]) => number): number {
  const lens = lengths(q);
  const target = extreme(...lens);
  return lens[q.answer] === target ? 1 / lens.filter((n) => n === target).length : 0;
}

const mean = (values: readonly number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/**
 * The score that "always choose the longest answer" earns on these questions,
 * from 0 to 1. Where several answers tie for longest, the guess is split
 * evenly between them. With four answers, 0.25 is what chance earns, and a
 * sound set scores close to it.
 */
export function chooseLongestScore(questions: readonly KeyedQuestion[]): number {
  return mean(questions.map((q) => shareAtExtreme(q, Math.max)));
}

/**
 * The score that "always choose the shortest answer" earns. A set that has
 * been corrected too far, so that the right answer is seldom the longest,
 * gives itself away here instead.
 */
export function chooseShortestScore(questions: readonly KeyedQuestion[]): number {
  return mean(questions.map((q) => shareAtExtreme(q, Math.min)));
}

/**
 * The mean length of the correct answers over the mean length of the wrong
 * ones. 1 means that the right answer is, on average, no longer or shorter
 * than the others.
 */
export function answerLengthRatio(questions: readonly KeyedQuestion[]): number {
  const right: number[] = [];
  const wrong: number[] = [];
  for (const q of questions) {
    lengths(q).forEach((n, i) => (i === q.answer ? right : wrong).push(n));
  }
  const w = mean(wrong);
  return w ? mean(right) / w : 1;
}

/** One question's longest answer over its shortest. Answers of nearly one length give the eye nothing to choose by. */
export function lengthSpread(options: readonly string[]): number {
  const lens = options.map((o) => o.trim().length);
  return Math.max(...lens) / Math.max(1, Math.min(...lens));
}
