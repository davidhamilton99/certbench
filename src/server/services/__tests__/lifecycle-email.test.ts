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
  freeLabCount,
} from "../lifecycle-email";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { PATH_CERTS } from "@/core/path/types";

// The emails say how many hands-on labs are free for an exam. The number is
// the one the exam's public page of labs offers: 12 for each of the four exams
// that have such a page, and none for Security+ SY0-801, which has no page.
describe("freeLabCount", () => {
  it("is the number of labs free on the exam's public page of labs, and none without a page", () => {
    expect(Object.fromEntries(PATH_CERTS.map((cert) => [cert, freeLabCount(cert)]))).toEqual({
      "security-plus-sy0-701": FREE_LAB_COUNT,
      "security-plus-sy0-801": 0,
      "network-plus-n10-009": FREE_LAB_COUNT,
      "a-plus-core1-220-1201": FREE_LAB_COUNT,
      "a-plus-core2-220-1202": FREE_LAB_COUNT,
    });
    expect(FREE_LAB_COUNT).toBe(12);
  });
});

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

// The test addresses are told apart by one shared function, tested in
// src/server/email/__tests__/test-address.test.ts.
