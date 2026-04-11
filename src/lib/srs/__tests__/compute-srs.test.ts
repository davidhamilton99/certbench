import { describe, it, expect } from "vitest";
import { computeSrsUpdate } from "../compute-srs";
import { SRS_MAX_INTERVAL_DAYS } from "@/constants/exam-config";

describe("computeSrsUpdate", () => {
  it("sets interval to 1 day on first correct answer (streak 0 -> 1)", () => {
    const result = computeSrsUpdate({
      isCorrect: true,
      currentInterval: 0,
      currentEase: 2.5,
      currentStreak: 0,
    });

    expect(result.interval).toBe(1);
    expect(result.streak).toBe(1);
  });

  it("sets interval to 6 days on second correct answer (streak 1 -> 2)", () => {
    const result = computeSrsUpdate({
      isCorrect: true,
      currentInterval: 1,
      currentEase: 2.5,
      currentStreak: 1,
    });

    expect(result.interval).toBe(6);
    expect(result.streak).toBe(2);
  });

  it("multiplies interval by ease factor on streak 2+ correct", () => {
    const result = computeSrsUpdate({
      isCorrect: true,
      currentInterval: 6,
      currentEase: 2.5,
      currentStreak: 2,
    });

    // 6 * 2.5 = 15
    expect(result.interval).toBe(15);
    expect(result.streak).toBe(3);
  });

  it("preserves ease factor on correct answer", () => {
    const result = computeSrsUpdate({
      isCorrect: true,
      currentInterval: 6,
      currentEase: 2.0,
      currentStreak: 2,
    });

    expect(result.easeFactor).toBe(2.0);
  });

  it("resets interval to 1 on incorrect answer", () => {
    const result = computeSrsUpdate({
      isCorrect: false,
      currentInterval: 15,
      currentEase: 2.5,
      currentStreak: 5,
    });

    expect(result.interval).toBe(1);
  });

  it("resets streak to 0 on incorrect answer", () => {
    const result = computeSrsUpdate({
      isCorrect: false,
      currentInterval: 15,
      currentEase: 2.5,
      currentStreak: 5,
    });

    expect(result.streak).toBe(0);
  });

  it("decreases ease factor by 0.2 on incorrect", () => {
    const result = computeSrsUpdate({
      isCorrect: false,
      currentInterval: 6,
      currentEase: 2.5,
      currentStreak: 2,
    });

    expect(result.easeFactor).toBe(2.3);
  });

  it("does not let ease factor drop below 1.3", () => {
    const result = computeSrsUpdate({
      isCorrect: false,
      currentInterval: 6,
      currentEase: 1.3,
      currentStreak: 2,
    });

    expect(result.easeFactor).toBe(1.3);
  });

  it("clamps ease factor at 1.3 when subtraction would go lower", () => {
    const result = computeSrsUpdate({
      isCorrect: false,
      currentInterval: 6,
      currentEase: 1.4,
      currentStreak: 2,
    });

    expect(result.easeFactor).toBe(1.3);
  });

  it("caps interval at SRS_MAX_INTERVAL_DAYS (30)", () => {
    const result = computeSrsUpdate({
      isCorrect: true,
      currentInterval: 20,
      currentEase: 2.5,
      currentStreak: 3,
    });

    // 20 * 2.5 = 50, capped at 30
    expect(result.interval).toBe(SRS_MAX_INTERVAL_DAYS);
  });

  it("returns a valid ISO date string for nextReviewAt", () => {
    const result = computeSrsUpdate({
      isCorrect: true,
      currentInterval: 1,
      currentEase: 2.5,
      currentStreak: 0,
    });

    expect(() => new Date(result.nextReviewAt)).not.toThrow();
    const date = new Date(result.nextReviewAt);
    expect(date.getTime()).toBeGreaterThan(Date.now());
  });

  it("sets nextReviewAt to +1 day on incorrect", () => {
    const before = new Date();
    const result = computeSrsUpdate({
      isCorrect: false,
      currentInterval: 10,
      currentEase: 2.5,
      currentStreak: 3,
    });

    const reviewDate = new Date(result.nextReviewAt);
    const expectedMin = new Date(before);
    expectedMin.setDate(expectedMin.getDate() + 1);

    // Allow a small window for execution time
    expect(reviewDate.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
  });

  it("increases interval progressively over multiple correct answers", () => {
    let interval = 0;
    let ease = 2.5;
    let streak = 0;

    const intervals: number[] = [];

    for (let i = 0; i < 5; i++) {
      const result = computeSrsUpdate({
        isCorrect: true,
        currentInterval: interval,
        currentEase: ease,
        currentStreak: streak,
      });

      intervals.push(result.interval);
      interval = result.interval;
      ease = result.easeFactor;
      streak = result.streak;
    }

    // 1, 6, 15, 30 (capped), 30 (capped)
    expect(intervals[0]).toBe(1);
    expect(intervals[1]).toBe(6);
    expect(intervals[2]).toBe(15); // 6 * 2.5
    expect(intervals[3]).toBeLessThanOrEqual(SRS_MAX_INTERVAL_DAYS);

    // Each interval should be >= the previous (monotonically increasing or capped)
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
  });
});
