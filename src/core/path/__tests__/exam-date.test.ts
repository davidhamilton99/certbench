import { describe, expect, it } from "vitest";
import { pathProgressSchema } from "@/contracts/path";
import { EXAM_DATE_HORIZON_DAYS, isoInDays, isPlannableExamDate } from "../checkpoint";
import { sanitizePathProgress } from "../progress";
import { EMPTY_PATH_PROGRESS } from "../types";

const now = Date.UTC(2026, 10, 13, 12); // 13 November 2026, noon UTC

describe("an exam date to plan toward", () => {
  it("is a real calendar date from today to two years out", () => {
    expect(isPlannableExamDate("2026-11-13", now)).toBe(true);
    expect(isPlannableExamDate("2027-03-01", now)).toBe(true);
    expect(isPlannableExamDate(isoInDays(EXAM_DATE_HORIZON_DAYS, now), now)).toBe(true);
  });

  it("is never a mistyped year, a day gone by or beyond, or a day that doesn't exist", () => {
    // What a browser's date input reports when 12092026 is typed into the year first.
    expect(isPlannableExamDate("120920-02-06", now)).toBe(false);
    expect(isPlannableExamDate("2026-11-12", now)).toBe(false);
    expect(isPlannableExamDate(isoInDays(EXAM_DATE_HORIZON_DAYS + 1, now), now)).toBe(false);
    expect(isPlannableExamDate("2027-02-30", now)).toBe(false);
    expect(isPlannableExamDate("", now)).toBe(false);
  });
});

describe("a saved goal whose dates can't be right", () => {
  const bad = { ...EMPTY_PATH_PROGRESS, goal: { examDate: "120920-02-06", target: "2026-1-9", minutes: 20, at: 1 } };
  const repaired = { examDate: null, target: null, minutes: 20, at: 1 };

  it("loses only the dates on the device", () => {
    expect(sanitizePathProgress(bad).goal).toEqual(repaired);
  });

  it("doesn't get the whole save refused by the account", () => {
    const parsed = pathProgressSchema.safeParse(bad);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.goal).toEqual(repaired);
  });
});
