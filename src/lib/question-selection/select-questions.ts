import type {
  CertQuestion,
  DomainWeight,
  QuestionPerformanceRecord,
} from "./types";

/**
 * Pick a target difficulty (1–3) for the user's current skill level based on
 * their all-time accuracy across every question they've seen.
 *
 * Thresholds:
 *  - accuracy < 50%       → 1 (easier — build foundation)
 *  - accuracy 50%–75%     → 2 (default stretch zone)
 *  - accuracy > 75%       → 3 (harder — they need challenge)
 *
 * Cold start (no performance data at all) → 2. This is a graceful no-op given
 * that most cert questions ship with `difficulty = 2` as the default, so the
 * adaptive layer doesn't introduce any observable bias until we either (a)
 * backfill real difficulty values or (b) the user builds up history.
 */
export function computeTargetDifficulty(
  performance: QuestionPerformanceRecord[]
): 1 | 2 | 3 {
  let totalSeen = 0;
  let totalCorrect = 0;
  for (const p of performance) {
    totalSeen += p.times_seen;
    totalCorrect += p.times_correct;
  }
  if (totalSeen === 0) return 2;
  const accuracy = totalCorrect / totalSeen;
  if (accuracy < 0.5) return 1;
  if (accuracy > 0.75) return 3;
  return 2;
}

/**
 * Select questions for practice exams using the priority bucket system:
 * 1. Never seen (highest priority)
 * 2. Seen and answered incorrectly (by error rate desc)
 * 3. Seen and answered correctly (oldest first)
 *
 * Questions are distributed proportionally by domain weight.
 *
 * Adaptive difficulty: within each bucket, questions whose `difficulty` sits
 * closest to the user's target level are preferred. This is a **soft** sort —
 * off-target questions are still selected when the target-matched pool is
 * exhausted — so requested counts are always honored. For the unseen bucket
 * difficulty distance is the primary order; for the seen buckets it is a
 * tie-breaker that doesn't disturb the accuracy/staleness priorities those
 * rely on.
 */
export function selectPracticeQuestions(
  allQuestions: CertQuestion[],
  domains: DomainWeight[],
  performance: QuestionPerformanceRecord[],
  count: number
): CertQuestion[] {
  // Build performance lookup
  const perfMap = new Map(performance.map((p) => [p.question_id, p]));
  const targetDifficulty = computeTargetDifficulty(performance);
  const distance = (q: CertQuestion) =>
    Math.abs(q.difficulty - targetDifficulty);

  // Bucket questions
  const unseen: CertQuestion[] = [];
  const incorrect: CertQuestion[] = [];
  const correct: CertQuestion[] = [];

  for (const q of allQuestions) {
    const perf = perfMap.get(q.id);
    if (!perf || perf.times_seen === 0) {
      unseen.push(q);
    } else if (perf.times_correct < perf.times_seen) {
      incorrect.push(q);
    } else {
      correct.push(q);
    }
  }

  // Unseen has no intrinsic priority — use difficulty distance as the primary
  // order so target-matched novel questions get picked first. The final
  // shuffle() mixes chosen items for presentation; what matters here is
  // *which* questions cross the selection threshold.
  unseen.sort((a, b) => distance(a) - distance(b));

  // Sort incorrect by error rate ascending (worst first), then by difficulty
  // distance as a tie-breaker so we don't disturb the accuracy signal.
  incorrect.sort((a, b) => {
    const perfA = perfMap.get(a.id)!;
    const perfB = perfMap.get(b.id)!;
    const rateA = perfA.times_correct / perfA.times_seen;
    const rateB = perfB.times_correct / perfB.times_seen;
    if (rateA !== rateB) return rateA - rateB; // lower accuracy first
    return distance(a) - distance(b);
  });

  // Sort correct by last_seen_at ascending (most stale first), then by
  // difficulty distance as a tie-breaker.
  correct.sort((a, b) => {
    const perfA = perfMap.get(a.id)!;
    const perfB = perfMap.get(b.id)!;
    const dateA = perfA.last_seen_at || "1970-01-01";
    const dateB = perfB.last_seen_at || "1970-01-01";
    const cmp = dateA.localeCompare(dateB);
    if (cmp !== 0) return cmp;
    return distance(a) - distance(b);
  });

  // Select proportionally by domain weight
  const selected: CertQuestion[] = [];
  let remaining = count;

  const sortedDomains = [...domains].sort(
    (a, b) => b.exam_weight - a.exam_weight
  );

  for (let i = 0; i < sortedDomains.length; i++) {
    const domain = sortedDomains[i];
    const isLast = i === sortedDomains.length - 1;
    const domainCount = isLast
      ? remaining
      : Math.round((domain.exam_weight / 100) * count);

    // Filter each bucket by domain
    const domainUnseen = unseen.filter((q) => q.domain_id === domain.id);
    const domainIncorrect = incorrect.filter((q) => q.domain_id === domain.id);
    const domainCorrect = correct.filter((q) => q.domain_id === domain.id);

    // Fill from buckets in priority order
    const domainSelected = takeFromBuckets(
      domainCount,
      domainUnseen,
      domainIncorrect,
      domainCorrect
    );

    selected.push(...domainSelected);
    remaining -= domainSelected.length;
  }

  return shuffle(selected);
}

/**
 * Select questions a user has gotten wrong at least once, ordered by
 * error rate (worst first). Used by the weak-points practice-exam mode.
 *
 * A question qualifies when the user has seen it and missed it more than
 * they've gotten it right (`times_correct < times_seen`). Unseen questions
 * are deliberately excluded — this mode is for reviewing known gaps, not
 * exploring new material.
 */
export function selectWeakPointsQuestions(
  allQuestions: CertQuestion[],
  performance: QuestionPerformanceRecord[],
  count: number
): CertQuestion[] {
  const perfMap = new Map(performance.map((p) => [p.question_id, p]));

  const weak = allQuestions
    .map((q) => ({ q, perf: perfMap.get(q.id) }))
    .filter(
      (entry): entry is { q: CertQuestion; perf: QuestionPerformanceRecord } =>
        !!entry.perf &&
        entry.perf.times_seen > 0 &&
        entry.perf.times_correct < entry.perf.times_seen
    );

  // Lowest accuracy first; oldest last_seen_at breaks ties so stale gaps rise.
  weak.sort((a, b) => {
    const rateA = a.perf.times_correct / a.perf.times_seen;
    const rateB = b.perf.times_correct / b.perf.times_seen;
    if (rateA !== rateB) return rateA - rateB;
    const dateA = a.perf.last_seen_at || "1970-01-01";
    const dateB = b.perf.last_seen_at || "1970-01-01";
    return dateA.localeCompare(dateB);
  });

  return shuffle(weak.slice(0, count).map((entry) => entry.q));
}

/**
 * Count how many weak-point questions a user has available. Used by the
 * session planner to decide whether to emit a weak-points block.
 */
export function countWeakPointsQuestions(
  performance: QuestionPerformanceRecord[]
): number {
  let n = 0;
  for (const p of performance) {
    if (p.times_seen > 0 && p.times_correct < p.times_seen) n++;
  }
  return n;
}

function takeFromBuckets(
  count: number,
  ...buckets: CertQuestion[][]
): CertQuestion[] {
  const result: CertQuestion[] = [];
  for (const bucket of buckets) {
    if (result.length >= count) break;
    const needed = count - result.length;
    result.push(...bucket.slice(0, needed));
  }
  return result;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
