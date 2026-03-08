import { SRS_MAX_INTERVAL_DAYS } from "@/constants/exam-config";

interface SrsInput {
  isCorrect: boolean;
  currentInterval: number;
  currentEase: number;
  currentStreak: number;
}

interface SrsResult {
  interval: number;
  easeFactor: number;
  nextReviewAt: string;
  streak: number;
}

/**
 * Modified SM-2 spaced repetition algorithm for exam prep.
 *
 * Correct answers increase the review interval:
 *   streak 0→1: interval = 1 day
 *   streak 1→2: interval = 6 days
 *   streak 2+:  interval = previous × ease factor
 *
 * Incorrect answers reset interval to 1 day and reduce ease factor.
 * Maximum interval capped at SRS_MAX_INTERVAL_DAYS (30 days) for exam prep.
 */
export function computeSrsUpdate(input: SrsInput): SrsResult {
  const now = new Date();

  if (input.isCorrect) {
    const newStreak = input.currentStreak + 1;
    let newInterval: number;

    if (newStreak === 1) {
      newInterval = 1;
    } else if (newStreak === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(input.currentInterval * input.currentEase);
    }

    newInterval = Math.min(newInterval, SRS_MAX_INTERVAL_DAYS);

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + newInterval);

    return {
      interval: newInterval,
      easeFactor: input.currentEase,
      nextReviewAt: nextReview.toISOString(),
      streak: newStreak,
    };
  } else {
    const newEase = Math.max(1.3, input.currentEase - 0.2);

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + 1);

    return {
      interval: 1,
      easeFactor: Math.round(newEase * 100) / 100,
      nextReviewAt: nextReview.toISOString(),
      streak: 0,
    };
  }
}
