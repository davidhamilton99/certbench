/**
 * Quiz engine — pure domain types. No React, no IO.
 *
 * One engine drives every quiz-like surface (diagnostic, practice exam,
 * SRS review, study sets, community attempts); QuizConfig captures what
 * differs between them.
 */

export type QuizMode =
  | "diagnostic"
  | "practice_exam"
  | "srs"
  | "study_set"
  | "community";

export interface QuizConfig {
  mode: QuizMode;
  /**
   * - "server_at_end": answers collected locally, graded in one submit
   *   (diagnostic, practice exams)
   * - "client_immediate": graded locally per question, revealed instantly
   *   (study sets, community)
   * - "server_per_question": each answer committed to the server as it is
   *   given (SRS — the SM-2 update happens server-side per card)
   */
  grading: "server_at_end" | "client_immediate" | "server_per_question";
  /** Whether the user can flag questions for a pre-submit review pass. */
  allowFlagging: boolean;
  /** Whether a review screen is offered before final submission. */
  allowReview: boolean;
}

/** A response value — shape depends on the question kind. */
export type ResponseValue =
  | { kind: "single"; selectedIndex: number }
  | { kind: "multi"; selectedIndexes: number[] }
  | { kind: "ordering"; order: number[] }
  | { kind: "matching"; pairs: Record<string, string> };

export interface QuestionGrade {
  isCorrect: boolean;
  /** 0–100 for partial-credit kinds; 0 or 100 for binary kinds. */
  score: number;
}

export interface QuizResponse {
  value: ResponseValue;
  /** Present once graded (immediately in client modes, at submit otherwise). */
  grade?: QuestionGrade;
  answeredAt: string;
}

export interface QuizStateActive {
  status: "active";
  index: number;
  responses: Record<string, QuizResponse>;
  flagged: string[];
  /** Question ids whose answers have been revealed (immediate-feedback modes). */
  revealed: string[];
  startedAt: string;
}

export interface QuizStateReview {
  status: "review";
  index: number;
  responses: Record<string, QuizResponse>;
  flagged: string[];
  revealed: string[];
  startedAt: string;
}

export interface QuizStateSubmitting {
  status: "submitting";
  index: number;
  responses: Record<string, QuizResponse>;
  flagged: string[];
  revealed: string[];
  startedAt: string;
}

export interface QuizStateResults {
  status: "results";
  responses: Record<string, QuizResponse>;
  flagged: string[];
}

export interface QuizStateError {
  status: "error";
  message: string;
  /** Snapshot of the state to return to on RETRY. */
  resume: QuizStateActive | QuizStateReview;
}

export type QuizState =
  | QuizStateActive
  | QuizStateReview
  | QuizStateSubmitting
  | QuizStateResults
  | QuizStateError;

export type QuizEvent =
  | { type: "ANSWER"; questionId: string; value: ResponseValue }
  | { type: "GRADE"; questionId: string; grade: QuestionGrade }
  | { type: "REVEAL"; questionId: string }
  | { type: "NAVIGATE"; to: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "TOGGLE_FLAG"; questionId: string }
  | { type: "ENTER_REVIEW" }
  | { type: "EXIT_REVIEW" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_FAILURE"; message: string }
  | { type: "RETRY" };

/**
 * The serializable resume snapshot — written to the DB (progress_state /
 * study_set_progress) and fed back through restoreQuizState() after a
 * refresh or device switch. The shuffle seed travels with it so restored
 * sessions render identical option order.
 */
export interface QuizSnapshot {
  index: number;
  responses: Record<string, QuizResponse>;
  flagged: string[];
  revealed: string[];
  startedAt: string;
  seed: string;
}
