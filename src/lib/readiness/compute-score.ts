import { MIN_SAMPLE_SIZE, READINESS_THRESHOLDS } from "@/constants/exam-config";

export interface DomainPerformance {
  domain_id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
  attempted: number;
  correct: number;
  total_questions: number;
}

export interface DomainScoreResult {
  domain_id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
  attempted: number;
  correct: number;
  total_questions: number;
  raw_score: number;
  confidence_factor: number;
  weighted_score: number;
}

export interface ReadinessResult {
  overall_score: number;
  domain_scores: DomainScoreResult[];
  total_questions_seen: number;
  is_preliminary: boolean;
}

/**
 * Compute readiness score using the architecture formula:
 *
 * ReadinessScore = Σ (DomainScore_i × DomainWeight_i) / Σ DomainWeight_i
 *
 * DomainScore_i = (correct_i / attempted_i) × 100 × ConfidenceFactor_i
 * ConfidenceFactor_i = min(1.0, attempted_i / MinSampleSize)
 */
export function computeReadinessScore(
  domainPerformances: DomainPerformance[]
): ReadinessResult {
  let totalWeightedScore = 0;
  let totalQuestionsSeen = 0;
  let isPreliminary = false;

  const domainScores: DomainScoreResult[] = domainPerformances.map((dp) => {
    const rawScore =
      dp.attempted > 0 ? (dp.correct / dp.attempted) * 100 : 0;
    const confidenceFactor = Math.min(1.0, dp.attempted / MIN_SAMPLE_SIZE);

    if (confidenceFactor < 1.0) {
      isPreliminary = true;
    }

    const weightedScore = rawScore * confidenceFactor * (dp.exam_weight / 100);

    totalWeightedScore += weightedScore;
    totalQuestionsSeen += dp.attempted;

    return {
      ...dp,
      raw_score: Math.round(rawScore * 100) / 100,
      confidence_factor: Math.round(confidenceFactor * 100) / 100,
      weighted_score: Math.round(weightedScore * 100) / 100,
    };
  });

  // totalWeightedScore is already scaled by (exam_weight / 100), so it sums
  // to at most 100 when all domains are at 100% accuracy with full confidence.
  // We must NOT divide by partial totalWeight — that would inflate the score
  // when a student has only studied a subset of domains.
  const overallScore =
    domainPerformances.length > 0
      ? Math.round(totalWeightedScore * 100) / 100
      : 0;

  return {
    overall_score: overallScore,
    domain_scores: domainScores,
    total_questions_seen: totalQuestionsSeen,
    is_preliminary: isPreliminary,
  };
}

/**
 * Get the colour for a readiness score
 */
export function getScoreColor(
  score: number
): "success" | "warning" | "danger" {
  if (score >= READINESS_THRESHOLDS.GREEN) return "success";
  if (score >= READINESS_THRESHOLDS.ORANGE) return "warning";
  return "danger";
}
