import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * What enrolling does to the exams an account already has, for each kind of
 * account. (That the endpoint reads the exam's id and not its question bank,
 * and when the welcome email is sent, is tested in ../../__tests__/routes.test.ts.)
 *
 * Making an exam "the only active one" switches every other exam off. That is
 * right for a free account, which studies one exam at a time. Until November
 * 2026 a member whose payment was past due was taken for a free account here,
 * because an account has no Pro while a payment is owed. Answering the exam
 * date question, or pressing a plan in the offer, then switched off an exam
 * that had been added to the plan by purchase, or replaced the plan's own exam
 * with another: and that was what Pro opened once the payment had been made.
 */

type Result = { data: unknown; error: { message: string } | null };

const h = vi.hoisted(() => ({
  access: { level: "free", proPlan: false } as { level: string; proPlan: boolean },
  /** The account's enrollment rows. */
  enrollments: { data: [], error: null } as { data: unknown; error: { message: string } | null },
  /** The account's subscription row. */
  subscription: { data: null, error: null } as { data: unknown; error: { message: string } | null },
  /** How many times the subscription row was read. */
  subscriptionReads: 0,
  /** Work left for after the response. */
  later: [] as (() => unknown)[],
  otherVersionIds: vi.fn<(...args: unknown[]) => Promise<string[]>>(async () => []),
  updateProfile: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  makeOnlyActiveEnrollment: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  setExamDate: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  switchVersion: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  sendWelcome: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
}));

const user = { id: "user-1", email: "member@example.com" };
const db = {
  from: (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      // The subscription row is read as one row or none.
      maybeSingle: (): Promise<Result> => {
        if (table !== "user_subscriptions") throw new Error(`Unexpected single read of ${table}`);
        h.subscriptionReads += 1;
        return Promise.resolve(h.subscription);
      },
      // The enrollments are read as a list.
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) => {
        if (table !== "user_enrollments") throw new Error(`Unexpected list read of ${table}`);
        return Promise.resolve(h.enrollments).then(resolve, reject);
      },
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
vi.mock("@/server/path/cert-id", () => ({ certIdFor: async () => "cert-701" }));
vi.mock("@/server/path/access", () => ({ getPathAccess: async () => h.access }));
vi.mock("@/server/data/enrollments", () => ({ otherVersionIds: h.otherVersionIds }));
vi.mock("@/server/data/profiles", () => ({ updateProfile: h.updateProfile }));
vi.mock("@/server/services/enrollment-writes", () => ({
  makeOnlyActiveEnrollment: h.makeOnlyActiveEnrollment,
  setExamDate: h.setExamDate,
  switchVersion: h.switchVersion,
}));
vi.mock("@/server/services/lifecycle-email", () => ({ sendWelcome: h.sendWelcome }));

import { POST as enroll } from "../route";

const NOT_CHECKED = "Your account could not be checked. Please try again.";

/** Enrolls in Security+ SY0-701, whose id here is "cert-701". */
const call = (examDate: string | null = null) =>
  enroll(
    new NextRequest("https://certbench.dev/api/path/enroll", {
      method: "POST",
      body: JSON.stringify({ cert: "security-plus-sy0-701", examDate }),
      headers: { "Content-Type": "application/json" },
    })
  );

const active = (certificationId: string, examDate: string | null = null) => ({
  certification_id: certificationId,
  is_active: true,
  exam_date: examDate,
});
const has = (...rows: unknown[]) => {
  h.enrollments = { data: rows, error: null };
};
const subscriptionIs = (row: { plan: string; status: string } | null) => {
  h.subscription = { data: row, error: null };
};

/** Nothing was switched off, switched on or moved. */
const expectNoEnrollmentChange = () => {
  expect(h.makeOnlyActiveEnrollment).not.toHaveBeenCalled();
  expect(h.switchVersion).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  h.access = { level: "free", proPlan: false };
  h.enrollments = { data: [], error: null };
  h.subscription = { data: null, error: null };
  h.subscriptionReads = 0;
  h.later = [];
  h.otherVersionIds.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/path/enroll: a free account studies one exam at a time", () => {
  it("makes this exam the account's exam, without a look at any payment, when there is no other exam", async () => {
    const res = await call("2027-03-01");
    expect(await res.json()).toEqual({ enrolled: true });
    expect(h.makeOnlyActiveEnrollment).toHaveBeenCalledWith("user-1", "cert-701", "2027-03-01");
    expect(h.subscriptionReads).toBe(0);
  });

  it("moves an account that has never bought anything from another exam to this one", async () => {
    has(active("cert-net"));
    const res = await call();
    expect(await res.json()).toEqual({ enrolled: true });
    expect(h.makeOnlyActiveEnrollment).toHaveBeenCalledWith("user-1", "cert-701", undefined);
    expect(h.subscriptionReads).toBe(1);
  });

  it("moves an account that began a checkout and never paid", async () => {
    has(active("cert-net"));
    subscriptionIs({ plan: "free", status: "active" });
    expect(await (await call()).json()).toEqual({ enrolled: true });
    expect(h.makeOnlyActiveEnrollment).toHaveBeenCalledOnce();
  });

  // A plan that has ended is over: the account is a free account again. Whether
  // an exam bought as an addition should come back with a new plan is the
  // owner's decision, and nothing here changes what happens today.
  it("treats a former member, whose plan has ended, as a free account", async () => {
    has(active("cert-701"), active("cert-net"));
    subscriptionIs({ plan: "free", status: "canceled" });
    expect(await (await call()).json()).toEqual({ enrolled: true });
    expect(h.makeOnlyActiveEnrollment).toHaveBeenCalledWith("user-1", "cert-701", undefined);
  });
});

describe("POST /api/path/enroll: a member whose payment is past due keeps their exams", () => {
  // Written by the webhook as plan "free" (a subscription that is past due) or
  // left as plan "pro" (a failed invoice): the status is what says it.
  const pastDue = [
    { plan: "free", status: "past_due" },
    { plan: "pro", status: "past_due" },
  ];

  it.each(pastDue)(
    "sets the date on an exam they have and leaves an added exam switched on (plan $plan)",
    async (row) => {
      has(active("cert-701"), active("cert-net"));
      subscriptionIs(row);

      const res = await call("2027-03-01");
      expect(await res.json()).toEqual({ enrolled: true });
      expect(h.setExamDate).toHaveBeenCalledExactlyOnceWith("user-1", "cert-701", "2027-03-01");
      expectNoEnrollmentChange();
      // Nor are they welcomed as a new account.
      expect(h.updateProfile).not.toHaveBeenCalled();
      expect(h.later).toHaveLength(0);
    }
  );

  // The press of a plan in the offer sends no date.
  it("changes nothing at all when no date is sent", async () => {
    has(active("cert-701"), active("cert-net"));
    subscriptionIs(pastDue[0]);
    expect(await (await call()).json()).toEqual({ enrolled: true });
    expect(h.setExamDate).not.toHaveBeenCalled();
    expectNoEnrollmentChange();
  });

  it("does not replace the exam of their plan with another exam", async () => {
    has(active("cert-net"));
    subscriptionIs(pastDue[0]);
    const res = await call("2027-03-01");
    expect(await res.json()).toEqual({ enrolled: false });
    expect(h.setExamDate).not.toHaveBeenCalled();
    expectNoEnrollmentChange();
  });

  it("still moves them to the other version of an exam they have", async () => {
    has(active("cert-801", "2027-05-05"), active("cert-net"));
    subscriptionIs(pastDue[0]);
    h.otherVersionIds.mockResolvedValue(["cert-801"]);
    const res = await call();
    expect(await res.json()).toEqual({ enrolled: true });
    expect(h.switchVersion).toHaveBeenCalledExactlyOnceWith("user-1", "cert-801", "cert-701", "2027-05-05");
    expect(h.makeOnlyActiveEnrollment).not.toHaveBeenCalled();
  });

  // A failed read is not "not past due": going on would switch their exams off.
  it("changes nothing, and says so, when the payment could not be looked up", async () => {
    has(active("cert-701"), active("cert-net"));
    h.subscription = { data: null, error: { message: "connection refused" } };
    const res = await call("2027-03-01");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: NOT_CHECKED } });
    expect(h.setExamDate).not.toHaveBeenCalled();
    expectNoEnrollmentChange();
  });
});

describe("POST /api/path/enroll: a Pro member", () => {
  beforeEach(() => {
    h.access = { level: "pro", proPlan: true };
  });

  it("keeps an added exam when the date of another is set, and no payment is looked up", async () => {
    has(active("cert-701"), active("cert-net"));
    const res = await call("2027-03-01");
    expect(await res.json()).toEqual({ enrolled: true });
    expect(h.setExamDate).toHaveBeenCalledExactlyOnceWith("user-1", "cert-701", "2027-03-01");
    expectNoEnrollmentChange();
    expect(h.subscriptionReads).toBe(0);
  });

  it("claims a first exam when the plan was bought before one was chosen", async () => {
    const res = await call();
    expect(await res.json()).toEqual({ enrolled: true });
    expect(h.makeOnlyActiveEnrollment).toHaveBeenCalledWith("user-1", "cert-701", undefined);
  });
});

describe("POST /api/path/enroll: when the enrollments cannot be read", () => {
  it("answers 500 in a sentence, and keeps the database's own words out of the answer", async () => {
    h.enrollments = { data: null, error: { message: 'relation "user_enrollments" does not exist' } };
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: NOT_CHECKED } });
    expectNoEnrollmentChange();
  });
});
