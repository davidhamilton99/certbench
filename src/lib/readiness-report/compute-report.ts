/**
 * Compute a full exam-readiness report from raw data.
 * Pure functions — no DB or network calls.
 */

import { MIN_SAMPLE_SIZE, READINESS_THRESHOLDS } from "@/constants/exam-config";

/* ------------------------------------------------------------------ */
/*  Input types (match DB row shapes)                                  */
/* ------------------------------------------------------------------ */

export interface DomainRow {
  id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
}

export interface PerfRow {
  question_id: string;
  domain_id: string;
  times_seen: number;
  times_correct: number;
  last_seen_at: string;
}

export interface SnapshotDomainScore {
  domain_id: string;
  raw_score: number;
  confidence_factor: number;
}

export interface SnapshotRow {
  overall_score: number;
  domain_scores: SnapshotDomainScore[];
  computed_at: string;
  is_preliminary: boolean;
  total_questions_seen: number;
}

/* ------------------------------------------------------------------ */
/*  Output types                                                       */
/* ------------------------------------------------------------------ */

export type Classification = "strong" | "adequate" | "weak" | "critical";
export type Trend = "up" | "down" | "stable" | "new";

export interface DomainReport {
  domain_id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
  accuracy: number;
  attempted: number;
  correct: number;
  total_questions: number;
  coverage_pct: number;
  confidence_factor: number;
  classification: Classification;
  trend: Trend;
}

export interface StudyTimeEstimate {
  estimated_hours: number;
  daily_pace_minutes: number | null;
  days_until_exam: number | null;
}

export interface FullReport {
  overall_score: number;
  is_preliminary: boolean;
  total_questions_seen: number;
  total_questions: number;
  coverage_pct: number;
  domains: DomainReport[];
  studyTime: StudyTimeEstimate;
  srs_due_count: number;
  recent_exam_days_ago: number | null;
  exam_date: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function classify(accuracy: number, confidence: number): Classification {
  if (accuracy >= 80 && confidence >= 0.8) return "strong";
  if (accuracy >= 60) return "adequate";
  if (accuracy >= 40) return "weak";
  return "critical";
}

function computeTrend(
  domainId: string,
  snapshots: SnapshotRow[]
): Trend {
  if (snapshots.length < 2) return "new";

  const recent = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  const recentDomain = (recent.domain_scores as SnapshotDomainScore[]).find(
    (d) => d.domain_id === domainId
  );
  const prevDomain = (prev.domain_scores as SnapshotDomainScore[]).find(
    (d) => d.domain_id === domainId
  );

  if (!recentDomain || !prevDomain) return "new";

  const delta = recentDomain.raw_score - prevDomain.raw_score;
  if (delta > 3) return "up";
  if (delta < -3) return "down";
  return "stable";
}

/* ------------------------------------------------------------------ */
/*  Main computation                                                   */
/* ------------------------------------------------------------------ */

export interface ComputeReportInput {
  domains: DomainRow[];
  performances: PerfRow[];
  questionCountsByDomain: Record<string, number>;
  totalQuestions: number;
  snapshots: SnapshotRow[];
  examDate: string | null;
  srsDueCount: number;
  lastExamCompletedAt: string | null;
}

export function computeReport(input: ComputeReportInput): FullReport {
  const {
    domains,
    performances,
    questionCountsByDomain,
    totalQuestions,
    snapshots,
    examDate,
    srsDueCount,
    lastExamCompletedAt,
  } = input;

  /* Aggregate performance by domain */
  const perfByDomain = new Map<
    string,
    { attempted: number; correct: number }
  >();

  for (const p of performances) {
    const entry = perfByDomain.get(p.domain_id) || {
      attempted: 0,
      correct: 0,
    };
    if (p.times_seen > 0) {
      entry.attempted += p.times_seen;
      entry.correct += p.times_correct;
    }
    perfByDomain.set(p.domain_id, entry);
  }

  /* Build domain reports */
  const domainReports: DomainReport[] = domains.map((d) => {
    const perf = perfByDomain.get(d.id) || { attempted: 0, correct: 0 };
    const domainTotal = questionCountsByDomain[d.id] || 0;
    const uniqueSeen = performances.filter(
      (p) => p.domain_id === d.id && p.times_seen > 0
    ).length;

    const accuracy =
      perf.attempted > 0
        ? Math.round((perf.correct / perf.attempted) * 10000) / 100
        : 0;
    const confidence = Math.min(1.0, uniqueSeen / MIN_SAMPLE_SIZE);
    const coverage =
      domainTotal > 0
        ? Math.round((uniqueSeen / domainTotal) * 10000) / 100
        : 0;

    return {
      domain_id: d.id,
      domain_number: d.domain_number,
      title: d.title,
      exam_weight: d.exam_weight,
      accuracy,
      attempted: perf.attempted,
      correct: perf.correct,
      total_questions: domainTotal,
      coverage_pct: coverage,
      confidence_factor: confidence,
      classification: classify(accuracy, confidence),
      trend: computeTrend(d.id, snapshots),
    };
  });

  /* Overall score (domain-weighted, confidence-penalised) */
  let weightedSum = 0;
  let weightTotal = 0;
  for (const dr of domainReports) {
    const domainScore = dr.accuracy * dr.confidence_factor;
    weightedSum += domainScore * dr.exam_weight;
    weightTotal += dr.exam_weight;
  }
  const overallScore =
    weightTotal > 0
      ? Math.round((weightedSum / weightTotal) * 100) / 100
      : 0;

  const isPreliminary = domainReports.some((d) => d.confidence_factor < 1.0);

  /* Total questions seen (unique) */
  const totalSeen = performances.filter((p) => p.times_seen > 0).length;
  const coveragePct =
    totalQuestions > 0
      ? Math.round((totalSeen / totalQuestions) * 10000) / 100
      : 0;

  /* Study time estimate */
  const unseenQuestions = totalQuestions - totalSeen;
  const lowAccuracyQuestions = performances.filter(
    (p) =>
      p.times_seen > 0 &&
      p.times_correct / p.times_seen < 0.6
  ).length;

  // 2 min per unseen question, 1.5 min per low-accuracy question
  const estimatedMinutes = unseenQuestions * 2 + lowAccuracyQuestions * 1.5;
  const estimatedHours = Math.round((estimatedMinutes / 60) * 10) / 10;

  let daysUntilExam: number | null = null;
  let dailyPace: number | null = null;

  if (examDate) {
    const examMs = new Date(examDate).getTime();
    const nowMs = Date.now();
    daysUntilExam = Math.max(
      0,
      Math.ceil((examMs - nowMs) / (1000 * 60 * 60 * 24))
    );
    if (daysUntilExam > 0) {
      dailyPace = Math.round(estimatedMinutes / daysUntilExam);
    }
  }

  /* Recent exam info */
  let recentExamDaysAgo: number | null = null;
  if (lastExamCompletedAt) {
    const diff = Date.now() - new Date(lastExamCompletedAt).getTime();
    recentExamDaysAgo = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  return {
    overall_score: overallScore,
    is_preliminary: isPreliminary,
    total_questions_seen: totalSeen,
    total_questions: totalQuestions,
    coverage_pct: coveragePct,
    domains: domainReports,
    studyTime: {
      estimated_hours: estimatedHours,
      daily_pace_minutes: dailyPace,
      days_until_exam: daysUntilExam,
    },
    srs_due_count: srsDueCount,
    recent_exam_days_ago: recentExamDaysAgo,
    exam_date: examDate,
  };
}
