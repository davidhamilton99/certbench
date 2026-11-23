import {
  DIAGNOSTIC_QUESTION_COUNT,
  FULL_EXAM_CADENCE_DAYS,
  FULL_EXAM_QUESTION_COUNT,
  DOMAIN_DRILL_QUESTION_COUNT,
  SRS_MAX_CARDS_PER_SESSION,
  URGENCY_THRESHOLDS,
  WEAK_POINTS_QUESTION_COUNT,
  WEAK_POINTS_MIN_AVAILABLE,
} from "@/core/constants";
import {
  computeReadinessScore,
  type DomainPerformance,
} from "@/core/readiness/compute-score";
import type { ReadinessTrend } from "@/core/readiness/compute-trend";

// --- Types ---

export interface SessionBlock {
  type:
    | "diagnostic"
    | "srs_review"
    | "domain_drill"
    | "weak_points"
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
  readinessTrend: ReadinessTrend | null;
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
  readinessTrend?: ReadinessTrend | null;
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
    suspended_at?: string | null;
  }[];
  totalQuestionCount: number;
  lastFullExamDate: string | null;
}

// --- Engine ---

/** How long until the exam, as a sentence. */
function examIn(days: number): string {
  if (days <= 0) return "Your exam is today.";
  return `Your exam is in ${days} ${days === 1 ? "day" : "days"}.`;
}

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
          title: "Take the diagnostic",
          description: `The diagnostic has ${DIAGNOSTIC_QUESTION_COUNT} questions and measures your starting point in every domain.`,
          reason: "Your study plan is built from the result of the diagnostic.",
          questionCount: DIAGNOSTIC_QUESTION_COUNT,
          estimatedMinutes: 20,
          color: "primary",
        },
      ],
      readinessScore: 0,
      readinessIsPreliminary: true,
      readinessTrend: null,
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
    if (qp.suspended_at) return false;
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
      title: "Spaced repetition review",
      description: `${srsDue.length} ${srsDue.length === 1 ? "question is" : "questions are"} due for review.`,
      reason: "These are the questions whose next review is due.",
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
      title: `Domain drill: ${weakest.title}`,
      description: `Your score in this domain is ${Math.round(weakest.score)}%. The domain is ${weakest.examWeight}% of the exam.`,
      reason: `This is your weakest domain, and it is ${weakest.examWeight}% of the exam.`,
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
        title: "Full practice exam",
        description: `${examIn(daysUntilExam)} Take a full practice exam under exam conditions.`,
        reason: "Your exam is within a week.",
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
          title: `Domain drill: ${domain.title}`,
          description: `${examIn(daysUntilExam)} Your score in this domain is ${Math.round(domain.score)}%.`,
          reason: "Your exam is within a month, and this domain is below 70%.",
          domainId: domain.domainId,
          domainNumber: domain.domainNumber,
          // The drill page starts a drill of the standard size, so that is the
          // size printed (this block used to say 15 questions).
          questionCount: DOMAIN_DRILL_QUESTION_COUNT,
          estimatedMinutes: 15,
          color: "urgency",
        });
      }
    }
  }

  // 4. WEAK POINTS REVIEW (priority 4) — surface when the user has enough
  //    previously-missed questions to warrant a focused gap-closing session
  const weakCount = input.questionPerformance.reduce((acc, p) => {
    return p.times_seen > 0 && p.times_correct < p.times_seen ? acc + 1 : acc;
  }, 0);

  if (weakCount >= WEAK_POINTS_MIN_AVAILABLE) {
    const wantCount = Math.min(WEAK_POINTS_QUESTION_COUNT, weakCount);
    blocks.push({
      type: "weak_points",
      priority: 4,
      title: "Weak points review",
      description: `You have answered ${weakCount} ${weakCount === 1 ? "question" : "questions"} incorrectly before.`,
      reason: "Answering them again shows which ones you now know.",
      questionCount: wantCount,
      estimatedMinutes: Math.ceil(wantCount * 1.5),
      color: "warning",
    });
  }

  // 5. PRACTICE EXAM (regular cadence, priority 5)
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
      priority: 5,
      title: "Practice exam",
      description: `A practice exam has ${FULL_EXAM_QUESTION_COUNT} questions and covers every domain.`,
      reason: daysSinceFullExam
        ? `Your last full practice exam was ${daysSinceFullExam} days ago.`
        : "You have not yet taken a full practice exam.",
      questionCount: FULL_EXAM_QUESTION_COUNT,
      estimatedMinutes: 90,
      color: "primary",
    });
  }

  // 6. UNSEEN CONTENT (priority 6)
  const seenQuestionIds = new Set(
    input.questionPerformance.map((p) => p.question_id)
  );
  const unseenCount = input.totalQuestionCount - seenQuestionIds.size;

  if (unseenCount > 0) {
    // This block's link opens a full practice exam (see blockHref in
    // SessionBlockCard and the exam page, which starts examType "full" with no
    // count of its own), and a practice exam asks unseen questions first. The
    // block used to say "15 questions"; it says what opens.
    blocks.push({
      type: "new_content",
      priority: 6,
      title: "New questions",
      description: `${
        unseenCount === 1 ? "There is 1 question" : `There are ${unseenCount} questions`
      } that you have not seen yet. A practice exam asks new questions first.`,
      reason: "New questions cover more of the exam objectives.",
      questionCount: FULL_EXAM_QUESTION_COUNT,
      estimatedMinutes: 90,
      color: "primary",
    });
  }

  // Sort by priority
  blocks.sort((a, b) => a.priority - b.priority);

  return {
    blocks,
    readinessScore: readiness.overall_score,
    readinessIsPreliminary: readiness.is_preliminary,
    readinessTrend: input.readinessTrend ?? null,
    domainScores,
    totalQuestionsSeen: readiness.total_questions_seen,
    totalQuestions: input.totalQuestionCount,
    examDate: input.examDate,
    daysUntilExam,
  };
}
