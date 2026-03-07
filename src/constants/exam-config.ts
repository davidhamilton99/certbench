// Exam configuration constants

/** Number of questions in a diagnostic exam */
export const DIAGNOSTIC_QUESTION_COUNT = 25;

/** Number of questions in a full practice exam */
export const FULL_EXAM_QUESTION_COUNT = 90;

/** Number of questions in a domain drill */
export const DOMAIN_DRILL_QUESTION_COUNT = 10;

/** Minimum questions per domain for confident readiness score */
export const MIN_SAMPLE_SIZE = 15;

/** Days between suggested full practice exams */
export const FULL_EXAM_CADENCE_DAYS = 3;

/** Maximum SRS interval in days (capped for exam prep) */
export const SRS_MAX_INTERVAL_DAYS = 30;

/** Default SRS ease factor */
export const SRS_DEFAULT_EASE_FACTOR = 2.5;

/** Maximum SRS cards shown per session */
export const SRS_MAX_CARDS_PER_SESSION = 20;

/** Readiness score colour thresholds */
export const READINESS_THRESHOLDS = {
  GREEN: 75,
  ORANGE: 40,
} as const;

/** Exam urgency thresholds (days until exam) */
export const URGENCY_THRESHOLDS = {
  FINAL_WEEK: 7,
  LAST_MONTH: 30,
} as const;
