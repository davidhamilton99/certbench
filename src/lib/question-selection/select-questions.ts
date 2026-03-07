import type {
  CertQuestion,
  DomainWeight,
  QuestionPerformanceRecord,
} from "./types";

/**
 * Select questions for practice exams using the priority bucket system:
 * 1. Never seen (highest priority)
 * 2. Seen and answered incorrectly (by error rate desc)
 * 3. Seen and answered correctly (oldest first)
 *
 * Questions are distributed proportionally by domain weight.
 */
export function selectPracticeQuestions(
  allQuestions: CertQuestion[],
  domains: DomainWeight[],
  performance: QuestionPerformanceRecord[],
  count: number
): CertQuestion[] {
  // Build performance lookup
  const perfMap = new Map(performance.map((p) => [p.question_id, p]));

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

  // Sort incorrect by error rate descending (worst first)
  incorrect.sort((a, b) => {
    const perfA = perfMap.get(a.id)!;
    const perfB = perfMap.get(b.id)!;
    const rateA = perfA.times_correct / perfA.times_seen;
    const rateB = perfB.times_correct / perfB.times_seen;
    return rateA - rateB; // lower accuracy first
  });

  // Sort correct by last_seen_at ascending (most stale first)
  correct.sort((a, b) => {
    const perfA = perfMap.get(a.id)!;
    const perfB = perfMap.get(b.id)!;
    const dateA = perfA.last_seen_at || "1970-01-01";
    const dateB = perfB.last_seen_at || "1970-01-01";
    return dateA.localeCompare(dateB);
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
