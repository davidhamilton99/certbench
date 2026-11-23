import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Pro is granted for each exam. These endpoints are open to "pro" accounts,
 * and until November 2026 they did not look at which exam was asked for: a
 * member with Pro on one exam could start, resume and submit the diagnostic
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
  saveProgress: vi.fn(),
  listDiagnosticQuestions: vi.fn(),
  getQuestionsByIds: vi.fn(),
  listDomains: vi.fn(),
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
vi.mock("@/server/data/diagnostics", () => ({
  getInFlightAttempt: h.getInFlightAttempt,
  getAttempt: h.getAttempt,
  createAttempt: h.createAttempt,
  completeAttempt: h.completeAttempt,
  saveProgress: h.saveProgress,
}));
vi.mock("@/server/data/questions", () => ({
  listDiagnosticQuestions: h.listDiagnosticQuestions,
  getQuestionsByIds: h.getQuestionsByIds,
}));
vi.mock("@/server/data/certifications", () => ({ listDomains: h.listDomains }));
vi.mock("@/server/services/submit-exam", () => ({
  updateQuestionPerformanceForAnswers: h.updatePerformance,
  recomputeAndSnapshotReadiness: h.recompute,
}));
// Which questions are chosen is not what is tested here: the whole pool is taken.
vi.mock("@/core/question-selection/select-diagnostic", () => ({
  selectDiagnosticQuestions: (pool: unknown[]) => pool,
}));

import { POST as start } from "../start/route";
import { POST as submit } from "../submit/route";
import { POST as saveProgress } from "../progress/route";
import { startDiagnostic } from "@/contracts/diagnostic";
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

const snapshot = { index: 0, responses: {}, flagged: [], revealed: [], startedAt: "", seed: "s", questionIds: [id(1)] };

const post = (path: string, body: unknown) =>
  new NextRequest(`https://certbench.dev/api/diagnostic/${path}`, {
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
  h.listDiagnosticQuestions.mockImplementation(async (_db: unknown, certId: string) => [question(1, certId), question(2, certId)]);
  h.listDomains.mockResolvedValue([{ id: DOMAIN, domainNumber: "1.0", title: "General Security Concepts", examWeight: 100, sortOrder: 1 }]);
  h.createAttempt.mockResolvedValue(ATTEMPT);
  h.recompute.mockResolvedValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/diagnostic/start", () => {
  const call = (certId: string) => start(post("start", { certId }));

  it("starts the diagnostic for the exam in the member's plan", async () => {
    const res = await call(SEC_701);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attemptId).toBe(ATTEMPT);
    // Questions leave without their answers.
    expect(body.questions).toEqual([
      { id: id(1), question_text: "Question 1", options: ["First", "Second"], domain_id: DOMAIN },
      { id: id(2), question_text: "Question 2", options: ["First", "Second"], domain_id: DOMAIN },
    ]);
    expect(h.createAttempt).toHaveBeenCalledWith(db, "user-1", SEC_701, 2, expect.anything());
  });

  it("refuses an exam the member has not bought, before anything is read or written", async () => {
    // Even an attempt already begun on that exam is not handed back.
    h.getInFlightAttempt.mockResolvedValue({
      id: ATTEMPT,
      certificationId: NETWORK,
      totalQuestions: 1,
      isComplete: false,
      progressState: snapshot,
    });

    const res = await call(NETWORK);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(refusal);
    expect(h.getInFlightAttempt).not.toHaveBeenCalled();
    expect(h.listDiagnosticQuestions).not.toHaveBeenCalled();
    expect(h.getQuestionsByIds).not.toHaveBeenCalled();
    expect(h.createAttempt).not.toHaveBeenCalled();
  });

  it("opens the other version of the exam in the plan, and every exam to the owner", async () => {
    expect((await call(SEC_801)).status).toBe(200);
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

  // The result prints each explanation whole beside the answers. An explanation
  // that says "option B" is right only if the diagnostic showed the stored order.
  describe("a question whose explanation names an answer by its letter", () => {
    const lettered = (n: number, certId: string) => ({
      ...question(n, certId),
      explanation: "A router forwards packets between networks (option B). A switch (option A) forwards frames.",
    });

    it("is sent with keepOrder in a new attempt, and no other question is", async () => {
      h.listDiagnosticQuestions.mockResolvedValue([question(1, SEC_701), lettered(2, SEC_701)]);
      const res = await call(SEC_701);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.questions).toEqual([
        { id: id(1), question_text: "Question 1", options: ["First", "Second"], domain_id: DOMAIN },
        { id: id(2), question_text: "Question 2", options: ["First", "Second"], domain_id: DOMAIN, keepOrder: true },
      ]);
      // The page reads the answer through the contract, which keeps the flag.
      const read = startDiagnostic.output.parse(body);
      expect(read.questions.map((q) => q.keepOrder)).toEqual([undefined, true]);
    });

    it("is sent with keepOrder again when the attempt is resumed", async () => {
      h.getInFlightAttempt.mockResolvedValue({
        id: ATTEMPT,
        certificationId: SEC_701,
        totalQuestions: 2,
        isComplete: false,
        progressState: { ...snapshot, questionIds: [id(2), id(1)] },
      });
      h.getQuestionsByIds.mockResolvedValue([question(1, SEC_701), lettered(2, SEC_701)]);

      const res = await call(SEC_701);
      expect(res.status).toBe(200);
      const body = await res.json();
      // In the attempt's own order.
      expect(body.questions).toEqual([
        { id: id(2), question_text: "Question 2", options: ["First", "Second"], domain_id: DOMAIN, keepOrder: true },
        { id: id(1), question_text: "Question 1", options: ["First", "Second"], domain_id: DOMAIN },
      ]);
      expect(h.createAttempt).not.toHaveBeenCalled();
    });
  });
});

describe("POST /api/diagnostic/submit", () => {
  const attemptOn = (certId: string) =>
    h.getAttempt.mockResolvedValue({
      id: ATTEMPT,
      certificationId: certId,
      totalQuestions: 1,
      isComplete: false,
      progressState: snapshot,
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

  // A refusal's message is shown to the member as it is written, so each one is a sentence.
  it("says in a sentence what is wrong with a submission", async () => {
    const message = async (res: Response) => ((await res.json()) as { error: { message: string } }).error.message;
    h.getAttempt.mockResolvedValue(null);
    expect(await message(await call())).toBe("This diagnostic could not be found. Please start it again.");
    h.getAttempt.mockResolvedValue({ id: ATTEMPT, certificationId: SEC_701, totalQuestions: 1, isComplete: true, progressState: snapshot });
    expect(await message(await call())).toBe("This diagnostic has already been submitted.");
    attemptOn(SEC_701);
    h.getQuestionsByIds.mockResolvedValue([question(1, NETWORK)]);
    expect(await message(await call())).toBe("None of the answers that were sent belong to this diagnostic.");
  });

  // The progress route stores the snapshot as the browser sends it. Until
  // November 2026 an attempt on one exam could carry another exam's question
  // ids, and those questions were graded, with their answers and explanations
  // returned and the answers filed under the attempt's exam.
  describe("questions of another exam in the stored snapshot", () => {
    const attemptWith = (questionIds: string[]) =>
      h.getAttempt.mockResolvedValue({
        id: ATTEMPT,
        certificationId: SEC_701,
        totalQuestions: questionIds.length,
        isComplete: false,
        progressState: { ...snapshot, questionIds },
      });
    const answering = (...ns: number[]) =>
      submit(post("submit", { attemptId: ATTEMPT, answers: ns.map((n) => ({ questionId: id(n), selectedIndex: 1 })) }));

    it("grades only the questions of the attempt's own exam", async () => {
      attemptWith([id(1), id(2)]);
      h.getQuestionsByIds.mockResolvedValue([question(1, SEC_701), question(2, NETWORK)]);

      const res = await answering(1, 2);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.totalQuestions).toBe(1);
      expect(body.responses.map((r: { questionId: string }) => r.questionId)).toEqual([id(1)]);
      expect(JSON.stringify(body)).not.toContain("Explanation 2");
      expect(h.completeAttempt.mock.calls[0][3].map((r: { questionId: string }) => r.questionId)).toEqual([id(1)]);
      const written = h.updatePerformance.mock.calls[0][1];
      expect(written.certificationId).toBe(SEC_701);
      expect(written.answers.map((a: { questionId: string }) => a.questionId)).toEqual([id(1)]);
      expect(written.questions.map((q: { id: string }) => q.id)).toEqual([id(1)]);
    });

    it("grades nothing, and writes nothing, when every question belongs to another exam", async () => {
      attemptWith([id(2)]);
      h.getQuestionsByIds.mockResolvedValue([question(2, NETWORK)]);

      const res = await answering(2);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("validation_failed");
      expect(h.completeAttempt).not.toHaveBeenCalled();
      expect(h.updatePerformance).not.toHaveBeenCalled();
      expect(h.recompute).not.toHaveBeenCalled();
    });
  });
});

describe("POST /api/diagnostic/progress", () => {
  const snapshotOf = (count: number) => ({
    ...snapshot,
    startedAt: "2026-11-22T12:00:00.000Z",
    questionIds: Array.from({ length: count }, (_, n) => id(1000 + n)),
  });
  const call = (count: number) => saveProgress(post("progress", { attemptId: ATTEMPT, snapshot: snapshotOf(count) }));

  it("stores the snapshot of a diagnostic", async () => {
    const res = await call(25);
    expect(res.status).toBe(200);
    expect(h.saveProgress).toHaveBeenCalledOnce();
  });

  it("refuses a snapshot that names more than 200 questions, and stores nothing", async () => {
    expect((await call(200)).status).toBe(200);
    h.saveProgress.mockClear();

    const res = await call(201);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
    expect(h.saveProgress).not.toHaveBeenCalled();
  });
});
