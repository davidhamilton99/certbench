import {
  FULL_EXAM_CADENCE_DAYS,
  FULL_EXAM_QUESTION_COUNT,
  DOMAIN_DRILL_QUESTION_COUNT,
  SRS_MAX_CARDS_PER_SESSION,
  URGENCY_THRESHOLDS,
} from "@/constants/exam-config";
import {
  computeReadinessScore,
  getScoreColor,
  type DomainPerformance,
} from "@/lib/readiness/compute-score";

// --- Types ---

export interface SessionBlock {
  type:
    | "diagnostic"
    | "srs_review"
    | "domain_drill"
    | "practice_exam"
    | "new_content";
  priority: number;
  title: string;
  description: string;
  reason: string;
  questionCount?: number;
  questionIds?: string[];
  domainId?: string;
  domainNumber?: string;
  estimatedMinutes?: number;
  color: "primary" | "success" | "warning" | "danger" | "urgency";
}

export interface SessionPlanResult {
  blocks: SessionBlock[];
  readinessScore: number;
  readinessIsPreliminary: boolean;
  domainScores: {
    domainId: string;
    domainNumber: string;
    title: string;
    examWeight: number;
    score: number;
    attempted: number;
    correct: number;
  }[];
  totalQuestionsSeen: number;
  totalQuestions: number;
  examDate: string | null;
  daysUntilExam: number | null;
}

export interface SessionEngineInput {
  diagnosticComplete: boolean;
  examDate: string | null;
  domains: {
    id: string;
    domain_number: string;
    title: string;
    exam_weight: number;
  }[];
  questionPerformance: {
    question_id: string;
    domain_id: string;
    times_seen: number;
    times_correct: number;
    last_seen_at: string | null;
    srs_next_review_at: string | null;
  }[];
  totalQuestionCount: number;
  lastFullExamDate: string | null;
}

// --- Engine ---

export function computeSessionPlan(
  input: SessionEngineInput
): SessionPlanResult {
  const blocks: SessionBlock[] = [];
  const now = new Date();

  // GATE: no diagnostic → single diagnostic block
  if (!input.diagnosticComplete) {
    return {
      blocks: [
        {
          type: "diagnostic",
          priority: 0,
          title: "Take Your Diagnostic",
          description: "25 questions to establish your baseline",
          reason: "Complete the diagnostic exam to unlock your study plan",
          questionCount: 25,
          estimatedMinutes: 20,
          color: "primary",
        },
      ],
      readinessScore: 0,
      readinessIsPreliminary: true,
      domainScores: [],
      totalQuestionsSeen: 0,
      totalQuestions: input.totalQuestionCount,
      examDate: input.examDate,
      daysUntilExam: null,
    };
  }

  // Compute readiness from performance data
  const domainPerformances: DomainPerformance[] = input.domains.map((d) => {
    const domainPerf = input.questionPerformance.filter(
      (p) => p.domain_id === d.id
    );
    return {
      domain_id: d.id,
      domain_number: d.domain_number,
      title: d.title,
      exam_weight: d.exam_weight,
      attempted: domainPerf.reduce((sum, p) => sum + p.times_seen, 0),
      correct: domainPerf.reduce((sum, p) => sum + p.times_correct, 0),
      total_questions: 0,
    };
  });

  const readiness = computeReadinessScore(domainPerformances);

  // Domain scores for display
  const domainScores = readiness.domain_scores.map((ds) => ({
    domainId: ds.domain_id,
    domainNumber: ds.domain_number,
    title: ds.title,
    examWeight: ds.exam_weight,
    score: ds.raw_score,
    attempted: ds.attempted,
    correct: ds.correct,
  }));

  // Days until exam
  let daysUntilExam: number | null = null;
  if (input.examDate) {
    const examDate = new Date(input.examDate);
    daysUntilExam = Math.ceil(
      (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExam < 0) daysUntilExam = null;
  }

  // 1. SRS CARDS DUE (priority 1)
  const srsDue = input.questionPerformance.filter((qp) => {
    if (!qp.srs_next_review_at) return false;
    return new Date(qp.srs_next_review_at) <= now;
  });

  if (srsDue.length > 0) {
    // Sort by most overdue
    srsDue.sort((a, b) => {
      const dateA = a.srs_next_review_at || "";
      const dateB = b.srs_next_review_at || "";
      return dateA.localeCompare(dateB);
    });

    const cardCount = Math.min(srsDue.length, SRS_MAX_CARDS_PER_SESSION);
    blocks.push({
      type: "srs_review",
      priority: 1,
      title: "Spaced Repetition Review",
      description: `${srsDue.length} card${srsDue.length === 1 ? "" : "s"} due for review`,
      reason: "These concepts are at risk of being forgotten",
      questionIds: srsDue.slice(0, cardCount).map((qp) => qp.question_id),
      questionCount: cardCount,
      estimatedMinutes: Math.ceil(cardCount * 1.5),
      color: "warning",
    });
  }

  // 2. WEAKEST DOMAIN DRILL (priority 2)
  const weakDomains = domainScores
    .filter((d) => d.score < 70)
    .sort((a, b) => a.score - b.score);

  if (weakDomains.length > 0) {
    const weakest = weakDomains[0];
    blocks.push({
      type: "domain_drill",
      priority: 2,
      title: `Focus: ${weakest.title}`,
      description: `Score: ${Math.round(weakest.score)}% — ${weakest.examWeight}% of exam`,
      reason: `This domain is your weakest and worth ${weakest.examWeight}% of the exam`,
      domainId: weakest.domainId,
      domainNumber: weakest.domainNumber,
      questionCount: DOMAIN_DRILL_QUESTION_COUNT,
      estimatedMinutes: 15,
      color: "danger",
    });
  }

  // 3. EXAM URGENCY BLOCKS (priority 3)
  if (daysUntilExam !== null) {
    if (daysUntilExam <= URGENCY_THRESHOLDS.FINAL_WEEK) {
      blocks.push({
        type: "practice_exam",
        priority: 3,
        title: "Full Practice Exam",
        description: `${daysUntilExam} day${daysUntilExam === 1 ? "" : "s"} until exam — simulate real conditions`,
        reason: "Final week preparation",
        questionCount: FULL_EXAM_QUESTION_COUNT,
        estimatedMinutes: 90,
        color: "urgency",
      });
    } else if (daysUntilExam <= URGENCY_THRESHOLDS.LAST_MONTH) {
      // Extra targeted drills on weak domains
      for (const domain of weakDomains.slice(1, 3)) {
        blocks.push({
          type: "domain_drill",
          priority: 3,
          title: `Targeted: ${domain.title}`,
          description: `${daysUntilExam} days left — bring this domain up`,
          reason: `${daysUntilExam} days until exam, this domain needs work`,
          domainId: domain.domainId,
          domainNumber: domain.domainNumber,
          questionCount: 15,
          estimatedMinutes: 20,
          color: "urgency",
        });
      }
    }
  }

  // 4. PRACTICE EXAM (regular cadence, priority 4)
  let daysSinceFullExam: number | null = null;
  if (input.lastFullExamDate) {
    daysSinceFullExam = Math.ceil(
      (now.getTime() - new Date(input.lastFullExamDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  if (
    daysSinceFullExam === null ||
    daysSinceFullExam >= FULL_EXAM_CADENCE_DAYS
  ) {
    blocks.push({
      type: "practice_exam",
      priority: 4,
      title: "Practice Exam",
      description: `${FULL_EXAM_QUESTION_COUNT} questions across all domains`,
      reason: daysSinceFullExam
        ? `Last full exam was ${daysSinceFullExam} days ago`
        : "Build your baseline with a full practice exam",
      questionCount: FULL_EXAM_QUESTION_COUNT,
      estimatedMinutes: 90,
      color: "primary",
    });
  }

  // 5. UNSEEN CONTENT (priority 5)
  const seenQuestionIds = new Set(
    input.questionPerformance.map((p) => p.question_id)
  );
  const unseenCount = input.totalQuestionCount - seenQuestionIds.size;

  if (unseenCount > 0) {
    blocks.push({
      type: "new_content",
      priority: 5,
      title: "Explore New Questions",
      description: `${unseenCount} question${unseenCount === 1 ? "" : "s"} you haven't seen yet`,
      reason: "Cover more of the exam objectives",
      questionCount: Math.min(15, unseenCount),
      estimatedMinutes: Math.ceil(Math.min(15, unseenCount) * 1.5),
      color: "primary",
    });
  }

  // Sort by priority
  blocks.sort((a, b) => a.priority - b.priority);

  return {
    blocks,
    readinessScore: readiness.overall_score,
    readinessIsPreliminary: readiness.is_preliminary,
    domainScores,
    totalQuestionsSeen: readiness.total_questions_seen,
    totalQuestions: input.totalQuestionCount,
    examDate: input.examDate,
    daysUntilExam,
  };
}
