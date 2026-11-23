import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/contracts/common";

/**
 * The four study path endpoints that need an exam's id and not its questions:
 * progress, enroll, lab and answers. Each used to load the exam's whole
 * question bank (about a megabyte on a new server instance) to learn that id.
 */

type Result = { data: unknown; error: { message: string } | null };

const h = vi.hoisted(() => ({
  certId: "cert-701" as string | null,
  access: { level: "free", proPlan: false } as { level: string; proPlan: boolean },
  accessFailure: null as Error | null,
  enrollments: { data: [], error: null } as Result,
  progress: { progress: { items: {}, stops: {}, checkpoint: null, rehearsals: [], labs: {}, goal: null }, stored: true },
  keys: [] as { id: string; correct_index: number }[],
  /** Work left for after the response. */
  later: [] as (() => unknown)[],
  /** The order in which the reads of the progress request began. */
  started: [] as string[],
  loadProgress: vi.fn(),
  certIdFor: vi.fn(),
  getPathAccess: vi.fn(),
  listAnswerKeys: vi.fn(),
  /** True: the history was updated. False: it could not be read, and nothing was written. */
  updatePerformance: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true),
  recompute: vi.fn<(...args: unknown[]) => Promise<null>>(async () => null),
  otherVersionIds: vi.fn<(...args: unknown[]) => Promise<string[]>>(async () => []),
  updateProfile: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  makeOnlyActiveEnrollment: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  setExamDate: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  switchVersion: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  sendWelcome: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  loadPathBank: vi.fn(() => {
    throw new Error("These endpoints must not load the question bank.");
  }),
}));

const user = { id: "user-1", email: "member@example.com" };
const db = {
  from: () => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(h.enrollments).then(resolve, reject),
    };
    return builder;
  },
};

vi.mock("@/server/auth", () => ({
  getOptionalUser: vi.fn(),
  requireUser: async () => ({ db, user }),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: async () => true } }));
vi.mock("@/server/api/report-error", () => ({ reportServerError: vi.fn(async () => {}) }));
vi.mock("@/server/api/after-response", () => ({
  afterResponse: (work: () => unknown) => {
    h.later.push(work);
  },
}));
vi.mock("@/server/path/bank", () => ({ loadPathBank: h.loadPathBank }));
vi.mock("@/server/path/cert-id", () => ({ certIdFor: h.certIdFor }));
vi.mock("@/server/path/access", () => ({ getPathAccess: h.getPathAccess }));
vi.mock("@/server/data/path-progress", () => ({
  getPathProgress: h.loadProgress,
  savePathProgress: vi.fn(async () => true),
}));
vi.mock("@/server/data/questions", () => ({ listAnswerKeys: h.listAnswerKeys }));
vi.mock("@/server/services/submit-exam", () => ({
  updateQuestionPerformanceForAnswers: h.updatePerformance,
  recomputeAndSnapshotReadiness: h.recompute,
}));
vi.mock("@/server/data/enrollments", () => ({ otherVersionIds: h.otherVersionIds }));
vi.mock("@/server/data/profiles", () => ({ updateProfile: h.updateProfile }));
vi.mock("@/server/services/enrollment-writes", () => ({
  makeOnlyActiveEnrollment: h.makeOnlyActiveEnrollment,
  setExamDate: h.setExamDate,
  switchVersion: h.switchVersion,
}));
vi.mock("@/server/services/lifecycle-email", () => ({ sendWelcome: h.sendWelcome }));

import { GET as getProgress } from "../progress/route";
import { regionPricing } from "@/lib/pricing/ppp";
import { POST as enroll } from "../enroll/route";
import { POST as getLab } from "../lab/route";
import { POST as recordAnswers } from "../answers/route";
import { pbqRegistry } from "@/data/pbq";

const CERT = "security-plus-sy0-701";
const NOT_CHECKED = "Your account could not be checked. Please try again.";

const post = (path: string, body: unknown) =>
  new NextRequest(`https://certbench.dev/api/path/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const Q = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeEach(() => {
  vi.clearAllMocks();
  h.certId = "cert-701";
  h.access = { level: "free", proPlan: false };
  h.accessFailure = null;
  h.enrollments = { data: [], error: null };
  h.keys = [];
  h.later = [];
  h.started = [];
  h.certIdFor.mockImplementation(async () => {
    h.started.push("exam id");
    return h.certId;
  });
  h.loadProgress.mockImplementation(async () => {
    h.started.push("saved progress");
    return h.progress;
  });
  h.getPathAccess.mockImplementation(async () => {
    if (h.accessFailure) throw h.accessFailure;
    return h.access;
  });
  h.listAnswerKeys.mockImplementation(async () => h.keys);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  // Whatever each request did, none of them read the question bank.
  expect(h.loadPathBank).not.toHaveBeenCalled();
});

describe("GET /api/path/progress", () => {
  const call = () => getProgress(new NextRequest(`https://certbench.dev/api/path/progress?cert=${CERT}`));

  it("answers with the saved progress and what the account can open", async () => {
    h.access = { level: "pro", proPlan: true };
    const res = await call();
    expect(res.status).toBe(200);
    // With the offer's prices for the learner's region (here no country: the list prices).
    expect(await res.json()).toEqual({
      ...h.progress,
      access: "pro",
      proPlan: true,
      certId: "cert-701",
      pricing: regionPricing(null),
    });
    expect(h.getPathAccess).toHaveBeenCalledWith(db, user, "cert-701");
  });

  it("answers 'free' for an account without Pro on this exam, and for a Pro member who has not added it", async () => {
    expect((await (await call()).json()).access).toBe("free");
    h.access = { level: "free", proPlan: true };
    expect(await (await call()).json()).toMatchObject({ access: "free", proPlan: true });
  });

  it("starts the saved progress and the exam's id together, neither waiting for the other", async () => {
    let releaseProgress: (value: unknown) => void = () => {};
    h.loadProgress.mockImplementation(() => {
      h.started.push("saved progress");
      return new Promise((resolve) => (releaseProgress = resolve));
    });
    const pending = call();
    await vi.waitFor(() => expect(h.getPathAccess).toHaveBeenCalled());
    // The exam's id and the access check have run while the saved progress is still on its way.
    expect(h.started).toEqual(["saved progress", "exam id"]);
    releaseProgress(h.progress);
    expect((await pending).status).toBe(200);
  });

  it("answers 404 for an exam the database does not have", async () => {
    h.certId = null;
    const res = await call();
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toBe("That exam is not available.");
    expect(h.getPathAccess).not.toHaveBeenCalled();
  });

  it("does not answer 'free' when the account could not be read", async () => {
    h.accessFailure = new ApiError("internal", NOT_CHECKED);
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: NOT_CHECKED } });
  });
});

describe("POST /api/path/enroll", () => {
  const call = (examDate: string | null = null) => enroll(post("enroll", { cert: CERT, examDate }));

  it("makes this exam the free account's one exam", async () => {
    const res = await call("2027-03-01");
    expect(await res.json()).toEqual({ enrolled: true });
    expect(h.makeOnlyActiveEnrollment).toHaveBeenCalledWith("user-1", "cert-701", "2027-03-01");
    expect(h.updateProfile).toHaveBeenCalledWith(db, "user-1", { onboardingCompleted: true });
  });

  it("answers before the welcome email is sent, and sends it once the response has gone", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    // The learner's next screen is not kept waiting for the email provider.
    expect(h.sendWelcome).not.toHaveBeenCalled();
    expect(h.later).toHaveLength(1);
    await h.later[0]();
    expect(h.sendWelcome).toHaveBeenCalledWith("user-1", "member@example.com", "cert-701");
  });

  it("sets the date for a Pro member on an exam they have, without touching anything else", async () => {
    h.access = { level: "pro", proPlan: true };
    h.enrollments = { data: [{ certification_id: "cert-701", is_active: true, exam_date: null }], error: null };
    const res = await call("2027-03-01");
    expect(await res.json()).toEqual({ enrolled: true });
    expect(h.setExamDate).toHaveBeenCalledWith("user-1", "cert-701", "2027-03-01");
    expect(h.makeOnlyActiveEnrollment).not.toHaveBeenCalled();
    expect(h.later).toHaveLength(0);
  });

  it("moves a Pro member to the other version of an exam they have", async () => {
    h.access = { level: "free", proPlan: true };
    h.enrollments = { data: [{ certification_id: "cert-801", is_active: true, exam_date: "2027-05-05" }], error: null };
    h.otherVersionIds.mockResolvedValue(["cert-801"]);
    const res = await call();
    expect(await res.json()).toEqual({ enrolled: true });
    expect(h.switchVersion).toHaveBeenCalledWith("user-1", "cert-801", "cert-701", "2027-05-05");
  });

  it("does not add an exam a Pro member has not bought", async () => {
    h.access = { level: "free", proPlan: true };
    h.enrollments = { data: [{ certification_id: "cert-net", is_active: true, exam_date: null }], error: null };
    const res = await call();
    expect(await res.json()).toEqual({ enrolled: false });
    expect(h.makeOnlyActiveEnrollment).not.toHaveBeenCalled();
    expect(h.switchVersion).not.toHaveBeenCalled();
  });

  it("answers 404 for an exam the database does not have, and 500 when the enrollments cannot be read", async () => {
    h.certId = null;
    expect((await call()).status).toBe(404);
    h.certId = "cert-701";
    h.enrollments = { data: null, error: { message: "connection refused" } };
    expect((await call()).status).toBe(500);
    expect(h.makeOnlyActiveEnrollment).not.toHaveBeenCalled();
  });
});

describe("POST /api/path/lab", () => {
  const lab = pbqRegistry[CERT][0];
  const call = (id: string = lab.id) => getLab(post("lab", { cert: CERT, id }));

  it("gives a Pro member the lab", async () => {
    h.access = { level: "pro", proPlan: true };
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).lab.id).toBe(lab.id);
  });

  it("refuses an account without Pro on this exam", async () => {
    const res = await call();
    expect(res.status).toBe(402);
    expect((await res.json()).error.message).toBe("The hands-on labs on your study path are included with Pro.");
  });

  it("answers 404 for a lab or an exam that does not exist", async () => {
    h.access = { level: "pro", proPlan: true };
    const missing = await call("no-such-lab");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.message).toBe("That lab is not available.");
    h.certId = null;
    expect((await call()).status).toBe(404);
  });

  it("does not refuse a member when the account could not be read: it says so", async () => {
    h.accessFailure = new ApiError("internal", NOT_CHECKED);
    const res = await call();
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toBe(NOT_CHECKED);
  });
});

describe("POST /api/path/answers", () => {
  const call = (answers: { questionId: string; selectedIndex: number }[]) =>
    recordAnswers(post("answers", { cert: CERT, answers }));

  it("grades the answers from the database's own key, reading only the questions answered", async () => {
    h.keys = [
      { id: Q(1), correct_index: 2 },
      { id: Q(2), correct_index: 0 },
    ];
    const res = await call([
      { questionId: Q(1), selectedIndex: 2 },
      { questionId: Q(2), selectedIndex: 3 },
    ]);
    expect(await res.json()).toEqual({ ok: true });
    expect(h.listAnswerKeys).toHaveBeenCalledWith(db, "cert-701", [Q(1), Q(2)]);
    expect(h.updatePerformance).toHaveBeenCalledWith(db, {
      userId: "user-1",
      certificationId: "cert-701",
      answers: [
        { questionId: Q(1), selectedIndex: 2 },
        { questionId: Q(2), selectedIndex: 3 },
      ],
      questions: h.keys,
      upsertNew: true,
    });
    expect(h.recompute).toHaveBeenCalledWith(db, { userId: "user-1", certificationId: "cert-701" });
  });

  it("counts one answer for each question: the last one given", async () => {
    h.keys = [{ id: Q(1), correct_index: 2 }];
    await call([
      { questionId: Q(1), selectedIndex: 0 },
      { questionId: Q(1), selectedIndex: 2 },
    ]);
    const [, recorded] = h.updatePerformance.mock.calls[0] as [unknown, { answers: unknown[] }];
    expect(recorded.answers).toEqual([{ questionId: Q(1), selectedIndex: 2 }]);
  });

  it("ignores a question from another exam, or one that has been retired", async () => {
    // The key holds only this exam's active questions: Q(9) is not among them.
    h.keys = [{ id: Q(1), correct_index: 1 }];
    await call([
      { questionId: Q(1), selectedIndex: 1 },
      { questionId: Q(9), selectedIndex: 1 },
    ]);
    const [, recorded] = h.updatePerformance.mock.calls[0] as [unknown, { answers: unknown[] }];
    expect(recorded.answers).toEqual([{ questionId: Q(1), selectedIndex: 1 }]);
  });

  it("writes nothing when none of the questions belongs to this exam", async () => {
    h.keys = [];
    const res = await call([{ questionId: Q(9), selectedIndex: 1 }]);
    expect(await res.json()).toEqual({ ok: true });
    expect(h.updatePerformance).not.toHaveBeenCalled();
    expect(h.recompute).not.toHaveBeenCalled();
  });

  // The history service writes nothing when it cannot read what the member
  // already has (see submit-exam.ts). The route then says so, and takes no
  // readiness score from answers that were not recorded.
  it("answers 500 with a sentence, and records no score, when the member's history could not be read", async () => {
    h.keys = [{ id: Q(1), correct_index: 2 }];
    h.updatePerformance.mockResolvedValueOnce(false);
    const res = await call([{ questionId: Q(1), selectedIndex: 2 }]);
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toBe("Your answers could not be recorded. Please try again.");
    expect(h.recompute).not.toHaveBeenCalled();
  });

  it("refuses an id that is not a question id before anything is read", async () => {
    const res = await call([{ questionId: "not-a-uuid", selectedIndex: 1 }]);
    expect(res.status).toBe(400);
    expect(h.listAnswerKeys).not.toHaveBeenCalled();
  });

  it("answers 404 for an exam the database does not have", async () => {
    h.certId = null;
    expect((await call([{ questionId: Q(1), selectedIndex: 1 }])).status).toBe(404);
  });
});
