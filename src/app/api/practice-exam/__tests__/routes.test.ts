import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Pro is granted for each exam. These endpoints are open to "pro" accounts,
 * and until November 2026 they did not look at which exam was asked for: a
 * member with Pro on one exam could start, resume and submit a practice exam
 * for any other by sending its id. The pages refused; the data did not.
 *
 * The check itself (requireCertAccess, with canAccessCert under it) is the
 * real one here, reading a stand-in for the account's tables. Everything the
 * endpoints read or write after it is a mock, so that a refusal can be shown
 * to have touched nothing.
 */

type Row = Record<string, unknown>;

const h = vi.hoisted(() => ({
  /** The tables the access check reads, by name. */
  tables: {} as Record<string, Record<string, unknown>[]>,
  /** A table whose read fails. */
  broken: null as string | null,
  getInFlightAttempt: vi.fn(),
  getAttempt: vi.fn(),
  createAttempt: vi.fn(),
  completeAttempt: vi.fn(),
  listActiveQuestions: vi.fn(),
  getQuestionsByIds: vi.fn(),
  listDomains: vi.fn(),
  listPerformance: vi.fn(),
  assertCanStartQuiz: vi.fn(),
  updatePerformance: vi.fn(),
  recompute: vi.fn(),
}));

const user = { id: "user-1", email: "member@example.com" };
const db = {
  from: (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    const rows = () => (h.tables[table] ?? []).filter((row) => filters.every((keep) => keep(row)));
    const answer = (data: unknown) =>
      Promise.resolve(
        h.broken === table ? { data: null, error: { message: "connection refused" } } : { data, error: null }
      );
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      limit: () => builder,
      maybeSingle: () => answer(rows()[0] ?? null),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        answer(rows()).then(resolve, reject),
    };
    return builder;
  },
};

vi.mock("@/server/auth", () => ({
  getOptionalUser: vi.fn(),
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  // The account has Pro. Which exam its plan covers is what these tests are about.
  requirePro: async () => ({ db, user }),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: async () => true } }));
vi.mock("@/server/api/report-error", () => ({ reportServerError: vi.fn(async () => {}) }));
vi.mock("@/server/api/after-response", () => ({ afterResponse: () => {} }));
vi.mock("@/server/data/practice-exams", () => ({
  getInFlightAttempt: h.getInFlightAttempt,
  getAttempt: h.getAttempt,
  createAttempt: h.createAttempt,
  completeAttempt: h.completeAttempt,
  saveProgress: vi.fn(),
}));
vi.mock("@/server/data/questions", () => ({
  listActiveQuestions: h.listActiveQuestions,
  getQuestionsByIds: h.getQuestionsByIds,
}));
vi.mock("@/server/data/certifications", () => ({ listDomains: h.listDomains }));
vi.mock("@/server/data/performance", () => ({ listPerformance: h.listPerformance }));
vi.mock("@/server/services/subscription", () => ({ assertCanStartQuiz: h.assertCanStartQuiz }));
vi.mock("@/server/services/submit-exam", () => ({
  updateQuestionPerformanceForAnswers: h.updatePerformance,
  recomputeAndSnapshotReadiness: h.recompute,
}));
// Which questions are chosen is not what is tested here: the whole pool is taken.
vi.mock("@/core/question-selection/select-questions", () => ({
  selectPracticeQuestions: (pool: unknown[]) => pool,
  selectWeakPointsQuestions: (pool: unknown[]) => pool,
}));

import { POST as start } from "../start/route";
import { POST as submit } from "../submit/route";
import { EXAM_NOT_IN_PLAN } from "@/server/data/enrollments";
import { ACCOUNT_NOT_CHECKED } from "@/server/data/account-errors";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
/** Security+ SY0-701, the exam this member's plan covers. */
const SEC_701 = id(701);
/** Its other version, which the same plan opens. */
const SEC_801 = id(801);
/** Network+, which the member has not bought. */
const NETWORK = id(9);
const DOMAIN = id(50);
const ATTEMPT = id(77);

const question = (n: number, certId: string) => ({
  id: id(n),
  certification_id: certId,
  domain_id: DOMAIN,
  sub_objective_id: null,
  question_text: `Question ${n}`,
  options: [
    { text: "First", is_correct: false },
    { text: "Second", is_correct: true },
  ],
  correct_index: 1,
  explanation: `Explanation ${n}`,
  difficulty: 2,
});

const post = (path: string, body: unknown) =>
  new NextRequest(`https://certbench.dev/api/practice-exam/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const refusal = { error: { code: "forbidden", message: EXAM_NOT_IN_PLAN } };

beforeEach(() => {
  vi.clearAllMocks();
  h.broken = null;
  h.tables = {
    user_enrollments: [{ id: "enrollment-1", user_id: "user-1", certification_id: SEC_701, is_active: true }],
    certifications: [
      { id: SEC_701, slug: "security-plus-sy0-701" },
      { id: SEC_801, slug: "security-plus-sy0-801" },
      { id: NETWORK, slug: "network-plus-n10-009" },
    ],
    profiles: [{ id: "user-1", role: "user" }],
  };
  h.getInFlightAttempt.mockResolvedValue(null);
  h.listActiveQuestions.mockImplementation(async (_db: unknown, certId: string) => [question(1, certId), question(2, certId)]);
  h.listDomains.mockResolvedValue([{ id: DOMAIN, domainNumber: "1.0", title: "General Security Concepts", examWeight: 100, sortOrder: 1 }]);
  h.listPerformance.mockResolvedValue([]);
  h.assertCanStartQuiz.mockResolvedValue(undefined);
  h.createAttempt.mockResolvedValue(ATTEMPT);
  h.recompute.mockResolvedValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/practice-exam/start", () => {
  const call = (certId: string) => start(post("start", { certId, examType: "full" }));

  it("starts a practice exam for the exam in the member's plan", async () => {
    const res = await call(SEC_701);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attemptId).toBe(ATTEMPT);
    expect(body.questions).toEqual([
      { id: id(1), question_text: "Question 1", options: ["First", "Second"], domain_id: DOMAIN },
      { id: id(2), question_text: "Question 2", options: ["First", "Second"], domain_id: DOMAIN },
    ]);
    expect(h.createAttempt).toHaveBeenCalledWith(db, "user-1", SEC_701, "full", null, 2, expect.anything());
  });

  it("refuses an exam the member has not bought, before anything is read or written", async () => {
    // Even an attempt already begun on that exam is not handed back.
    h.getInFlightAttempt.mockResolvedValue({
      id: ATTEMPT,
      certificationId: NETWORK,
      examType: "full",
      domainId: null,
      totalQuestions: 2,
      isComplete: false,
      progressState: { index: 0, responses: {}, flagged: [], revealed: [], startedAt: "", seed: "s", questionIds: [id(1)] },
    });

    const res = await call(NETWORK);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(refusal);
    expect(h.getInFlightAttempt).not.toHaveBeenCalled();
    expect(h.listActiveQuestions).not.toHaveBeenCalled();
    expect(h.getQuestionsByIds).not.toHaveBeenCalled();
    expect(h.createAttempt).not.toHaveBeenCalled();
  });

  it("refuses an exam whose enrollment is no longer active", async () => {
    h.tables.user_enrollments = [{ id: "enrollment-1", user_id: "user-1", certification_id: NETWORK, is_active: false }];
    expect((await call(NETWORK)).status).toBe(403);
    expect(h.createAttempt).not.toHaveBeenCalled();
  });

  it("opens the other version of the exam in the plan", async () => {
    const res = await call(SEC_801);
    expect(res.status).toBe(200);
    expect(h.createAttempt).toHaveBeenCalledWith(db, "user-1", SEC_801, "full", null, 2, expect.anything());
  });

  it("opens every exam to the owner", async () => {
    h.tables.profiles = [{ id: "user-1", role: "admin" }];
    expect((await call(NETWORK)).status).toBe(200);
  });

  it("does not turn a member away when the enrollment could not be read: it says so", async () => {
    h.broken = "user_enrollments";
    const res = await call(SEC_701);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: ACCOUNT_NOT_CHECKED } });
    expect(h.createAttempt).not.toHaveBeenCalled();
  });
});

describe("POST /api/practice-exam/submit", () => {
  const attemptOn = (certId: string) =>
    h.getAttempt.mockResolvedValue({
      id: ATTEMPT,
      certificationId: certId,
      examType: "full",
      domainId: null,
      totalQuestions: 1,
      isComplete: false,
      progressState: { index: 0, responses: {}, flagged: [], revealed: [], startedAt: "", seed: "s", questionIds: [id(1)] },
    });
  const call = () =>
    submit(post("submit", { attemptId: ATTEMPT, answers: [{ questionId: id(1), selectedIndex: 1 }] }));

  it("grades an attempt on the exam in the member's plan", async () => {
    attemptOn(SEC_701);
    h.getQuestionsByIds.mockResolvedValue([question(1, SEC_701)]);

    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      correctCount: 1,
      responses: [{ questionId: id(1), correctIndex: 1, isCorrect: true, explanation: "Explanation 1" }],
    });
    expect(h.completeAttempt).toHaveBeenCalledOnce();
    expect(h.updatePerformance).toHaveBeenCalledOnce();
  });

  // An attempt begun before the check existed, or before the exam left the plan.
  it("grades nothing, and returns no answer, for an attempt on an exam that is not in the plan", async () => {
    attemptOn(NETWORK);
    h.getQuestionsByIds.mockResolvedValue([question(1, NETWORK)]);

    const res = await call();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(refusal);
    expect(h.getQuestionsByIds).not.toHaveBeenCalled();
    expect(h.completeAttempt).not.toHaveBeenCalled();
    expect(h.updatePerformance).not.toHaveBeenCalled();
    expect(h.recompute).not.toHaveBeenCalled();
  });

  it("still answers 404 for an attempt that is not the member's", async () => {
    h.getAttempt.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });
});
