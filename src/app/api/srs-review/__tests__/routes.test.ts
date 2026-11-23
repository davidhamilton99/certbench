import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Pro is granted for each exam. These endpoints are open to "pro" accounts,
 * and until November 2026 they did not look at which exam was asked for: a
 * member with Pro on one exam could start a review of another exam's due
 * questions, and be told the answer to any of them, by sending ids. The pages
 * refused; the data did not.
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
  listDueCards: vi.fn(),
  getCardSchedule: vi.fn(),
  getQuestionsByIds: vi.fn(),
  updatePerformance: vi.fn(),
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
vi.mock("@/server/data/srs", () => ({
  listDueCards: h.listDueCards,
  getCardSchedule: h.getCardSchedule,
  setSuspended: vi.fn(),
}));
vi.mock("@/server/data/questions", () => ({ getQuestionsByIds: h.getQuestionsByIds }));
vi.mock("@/server/services/submit-exam", () => ({ updateQuestionPerformanceForAnswers: h.updatePerformance }));

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
  new NextRequest(`https://certbench.dev/api/srs-review/${path}`, {
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
  h.listDueCards.mockResolvedValue({
    cards: [{ question_id: id(1), srs_next_review_at: "2026-11-20T00:00:00.000Z" }],
    totalDue: 1,
  });
  h.getCardSchedule.mockResolvedValue({ intervalDays: 3, nextReviewAt: "2026-11-25T00:00:00.000Z", streak: 2 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/srs-review/start", () => {
  const call = (certId: string) => start(post("start", { certId }));

  it("gives the due questions of the exam in the member's plan, without their answers", async () => {
    h.getQuestionsByIds.mockResolvedValue([question(1, SEC_701)]);
    const res = await call(SEC_701);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDue).toBe(1);
    expect(body.cards).toHaveLength(1);
    expect(body.cards[0]).toMatchObject({ questionId: id(1), questionText: "Question 1", options: ["First", "Second"] });
    expect(body.cards[0]).not.toHaveProperty("correctIndex");
    expect(h.listDueCards).toHaveBeenCalledWith(db, "user-1", SEC_701, expect.any(Number));
  });

  it("refuses an exam the member has not bought, before anything is read", async () => {
    const res = await call(NETWORK);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(refusal);
    expect(h.listDueCards).not.toHaveBeenCalled();
    expect(h.getQuestionsByIds).not.toHaveBeenCalled();
  });

  it("opens the other version of the exam in the plan, and every exam to the owner", async () => {
    h.getQuestionsByIds.mockResolvedValue([]);
    expect((await call(SEC_801)).status).toBe(200);
    h.tables.profiles = [{ id: "user-1", role: "admin" }];
    expect((await call(NETWORK)).status).toBe(200);
  });

  it("does not turn a member away when the enrollment could not be read: it says so", async () => {
    h.broken = "user_enrollments";
    const res = await call(SEC_701);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: ACCOUNT_NOT_CHECKED } });
    expect(h.listDueCards).not.toHaveBeenCalled();
  });
});

describe("POST /api/srs-review/submit", () => {
  const call = (certId: string) => submit(post("submit", { certId, questionId: id(1), selectedIndex: 1 }));

  it("marks an answer to a question of the exam in the member's plan", async () => {
    h.getQuestionsByIds.mockResolvedValue([question(1, SEC_701)]);
    const res = await call(SEC_701);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      isCorrect: true,
      correctIndex: 1,
      explanation: "Explanation 1",
      nextReviewAt: "2026-11-25T00:00:00.000Z",
      intervalDays: 3,
      streak: 2,
    });
    expect(h.updatePerformance).toHaveBeenCalledOnce();
  });

  it("tells nothing about a question of an exam the member has not bought", async () => {
    h.getQuestionsByIds.mockResolvedValue([question(1, NETWORK)]);
    const res = await call(NETWORK);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(refusal);
    expect(h.updatePerformance).not.toHaveBeenCalled();
    expect(h.getCardSchedule).not.toHaveBeenCalled();
  });

  // The exam is the question's own: naming an exam that is in the plan does not open another exam's question.
  it("is not misled by a request that names the member's own exam for another exam's question", async () => {
    h.getQuestionsByIds.mockResolvedValue([question(1, NETWORK)]);
    const res = await call(SEC_701);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(refusal);
    expect(h.updatePerformance).not.toHaveBeenCalled();
  });

  it("marks a question of the other version of the exam in the plan", async () => {
    h.getQuestionsByIds.mockResolvedValue([question(1, SEC_801)]);
    expect((await call(SEC_801)).status).toBe(200);
  });

  it("still answers 404 for a question that does not exist", async () => {
    h.getQuestionsByIds.mockResolvedValue([]);
    expect((await call(SEC_701)).status).toBe(404);
  });
});
