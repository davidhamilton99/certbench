import { describe, expect, it, vi } from "vitest";

// The service module pulls in the admin client + env at import time; the
// pure helpers under test never touch them.
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
  serverEnv: vi.fn(),
  serverEnvOptional: vi.fn(),
}));

import {
  COUNTDOWN_DAYS,
  POST_EXAM_DAY,
  daysUntil,
  isTestAccount,
} from "../lifecycle-email";

describe("daysUntil", () => {
  const now = new Date("2026-07-05T14:00:00Z");

  it("counts whole UTC calendar days", () => {
    expect(daysUntil("2026-07-05", now)).toBe(0);
    expect(daysUntil("2026-07-06", now)).toBe(1);
    expect(daysUntil("2026-07-12", now)).toBe(7);
    expect(daysUntil("2026-07-19", now)).toBe(14);
  });

  it("is negative for past dates", () => {
    expect(daysUntil("2026-07-01", now)).toBe(-4);
  });

  it("fires the post-exam story request N days after the exam", () => {
    // Cron logic triggers when daysUntil === -POST_EXAM_DAY.
    const examDate = new Date(
      Date.UTC(2026, 6, 5 - POST_EXAM_DAY)
    ).toISOString().slice(0, 10);
    expect(daysUntil(examDate, now)).toBe(-POST_EXAM_DAY);
  });

  it("ignores the time of day of the run", () => {
    const lateNight = new Date("2026-07-05T23:59:00Z");
    expect(daysUntil("2026-07-06", lateNight)).toBe(1);
  });

  it("covers every countdown trigger day", () => {
    for (const d of COUNTDOWN_DAYS) {
      const exam = new Date(Date.UTC(2026, 6, 5 + d));
      const iso = exam.toISOString().slice(0, 10);
      expect(daysUntil(iso, now)).toBe(d);
    }
  });
});

describe("isTestAccount", () => {
  it("blocks the e2e and rebuild test conventions", () => {
    expect(isTestAccount("david.nash.hamilton+e2e-x-1@gmail.com")).toBe(true);
    expect(isTestAccount("david.nash.hamilton+rb1@gmail.com")).toBe(true);
  });

  it("allows real addresses", () => {
    expect(isTestAccount("student@example.com")).toBe(false);
    expect(isTestAccount("david.nash.hamilton@gmail.com")).toBe(false);
  });
});
