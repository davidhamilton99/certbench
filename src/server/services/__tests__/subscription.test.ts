import { describe, expect, it, vi } from "vitest";

// The service module imports the admin client, whose env validation would
// fail outside Next; the pure quota logic under test never touches it.
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import {
  FREE_DAILY_QUESTION_LIMIT,
  quizQuotaError,
} from "../subscription";

describe("quizQuotaError", () => {
  it("allows everything for unlimited (pro) plans", () => {
    expect(quizQuotaError(null, 0, 90)).toBeNull();
    expect(quizQuotaError(null, 9999, 90)).toBeNull();
  });

  it("allows starts that fit the remaining allowance", () => {
    expect(quizQuotaError(20, 0, 10)).toBeNull();
    expect(quizQuotaError(20, 10, 10)).toBeNull(); // exact fit
  });

  it("refuses starts that exceed the remaining allowance", () => {
    expect(quizQuotaError(20, 15, 10)).toMatch(/5 left today/);
    expect(quizQuotaError(20, 0, 90)).toMatch(/20 left today/);
  });

  it("names the limit when the day is exhausted", () => {
    expect(quizQuotaError(20, 20, 10)).toMatch(/20 free questions for today/);
    expect(quizQuotaError(20, 25, 1)).toMatch(/Upgrade to Pro/);
  });

  it("free daily limit fits the plan's smallest sessions", () => {
    // Domain drills (10) and weak-points (15) must be startable on a fresh
    // day; the 90-question full exam must not be.
    expect(quizQuotaError(FREE_DAILY_QUESTION_LIMIT, 0, 10)).toBeNull();
    expect(quizQuotaError(FREE_DAILY_QUESTION_LIMIT, 0, 15)).toBeNull();
    expect(quizQuotaError(FREE_DAILY_QUESTION_LIMIT, 0, 90)).not.toBeNull();
  });
});
