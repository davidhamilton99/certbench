import { DIAGNOSTIC_QUESTION_COUNT } from "@/constants/exam-config";
import type { CertQuestion, DomainWeight } from "./types";

/**
 * Select questions for the diagnostic exam.
 * - 25 questions total
 * - Proportional to domain weights
 * - Only diagnostic-eligible questions
 * - Shuffled within selection
 */
export function selectDiagnosticQuestions(
  allQuestions: CertQuestion[],
  domains: DomainWeight[]
): CertQuestion[] {
  const count = DIAGNOSTIC_QUESTION_COUNT;
  const selected: CertQuestion[] = [];

  // Group questions by domain
  const questionsByDomain = new Map<string, CertQuestion[]>();
  for (const q of allQuestions) {
    const existing = questionsByDomain.get(q.domain_id) || [];
    existing.push(q);
    questionsByDomain.set(q.domain_id, existing);
  }

  // Select proportionally by domain weight
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

    const domainQuestions = questionsByDomain.get(domain.id) || [];
    const shuffled = shuffle([...domainQuestions]);
    const picked = shuffled.slice(0, Math.min(domainCount, shuffled.length));

    selected.push(...picked);
    remaining -= picked.length;
  }

  return shuffle(selected);
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
