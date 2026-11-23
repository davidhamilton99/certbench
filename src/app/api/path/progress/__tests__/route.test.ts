import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { finishStop, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";

/**
 * What the progress endpoint answers when the database does not do what it
 * was asked. (That the endpoint reads the exam's id and not its question
 * bank, and what it says about the account's access, is tested in
 * ../../__tests__/routes.test.ts.)
 *
 * Until November 2026 a read or a write that failed was answered with status
 * 200 and `stored: false`. The page counted such a save as saved: its notice
 * went, its retries stopped, and the last save of a visit could be lost to the
 * account without a word. A read that failed was answered as an empty study
 * path, which a member on another device was then shown in place of their own.
 *
 * The data module is the real one here, on a stand-in for the database, so
 * that the tests hold the whole way from the database's answer to the
 * endpoint's.
 */

type Failure = { message: string; code?: string };
type Result = { data: unknown; error: Failure | null };

const h = vi.hoisted(() => ({
  access: { level: "free", proPlan: false } as { level: string; proPlan: boolean },
  /** What the database answers when the saved progress is read. */
  read: { data: null, error: null } as Result,
  /** What it answers when the progress is written. */
  write: { error: null } as { error: Failure | null },
  /** Every row that the endpoint wrote. */
  written: [] as { row: { user_id: string; cert_slug: string; progress: PathProgress }; options: unknown }[],
  /** The account's subscription rows (it has one at most), or the failure of their read. */
  subscriptions: { data: [], error: null } as { data: { plan: string; status: string }[] | null; error: Failure | null },
  /** Work left for after the response: the error report. */
  later: [] as (() => unknown)[],
  reportServerError: vi.fn<(error: unknown, place: Record<string, unknown>) => Promise<void>>(async () => {}),
}));

type Settle<T> = (value: T) => unknown;

const user = { id: "user-1", email: "member@example.com" };
const db = {
  from: (table: string) => {
    if (table === "user_subscriptions") {
      const rows = {
        eq: () => rows,
        // The endpoint reads the account's rows as a list.
        then: (resolve: Settle<typeof h.subscriptions>, reject: Settle<unknown>) =>
          Promise.resolve(h.subscriptions).then(resolve, reject),
        // The plan service reads one row or none.
        maybeSingle: () => Promise.resolve({ data: h.subscriptions.data?.[0] ?? null, error: h.subscriptions.error }),
      };
      return { select: () => rows };
    }
    if (table === "practice_exam_attempts") {
      // The plan service also counts the day's practice questions: none here.
      const rows = {
        eq: () => rows,
        gte: () => rows,
        then: (resolve: Settle<Result>, reject: Settle<unknown>) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      };
      return { select: () => rows };
    }
    if (table !== "path_progress") throw new Error(`Unexpected use of ${table}`);
    const read = {
      eq: () => read,
      maybeSingle: (): Promise<Result> => Promise.resolve(h.read),
    };
    return {
      select: () => read,
      upsert: (row: (typeof h.written)[number]["row"], options: unknown) => {
        h.written.push({ row, options });
        return Promise.resolve(h.write);
      },
    };
  },
};

vi.mock("@/server/auth", () => ({
  getOptionalUser: vi.fn(),
  requireUser: async () => ({ db, user }),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: async () => true } }));
vi.mock("@/server/api/report-error", () => ({ reportServerError: h.reportServerError }));
vi.mock("@/server/api/after-response", () => ({
  afterResponse: (work: () => unknown) => {
    h.later.push(work);
  },
}));
vi.mock("@/server/path/cert-id", () => ({ certIdFor: async () => "cert-701" }));
vi.mock("@/server/path/access", () => ({ getPathAccess: async () => h.access }));

import { GET, POST } from "../route";
import { getUserPlan } from "@/server/services/subscription";
import type { Db } from "@/server/supabase/server";

const CERT = "security-plus-sy0-701";
const NOT_READ = "Your study path could not be read. Please try again.";
const NOT_SAVED = "Your study path could not be saved. Please try again.";
const NOT_CHECKED = "Your account could not be checked. Please try again.";

const read = () => GET(new NextRequest(`https://certbench.dev/api/path/progress?cert=${CERT}`));
const save = (progress: PathProgress) =>
  POST(
    new NextRequest("https://certbench.dev/api/path/progress", {
      method: "POST",
      body: JSON.stringify({ cert: CERT, progress }),
      headers: { "Content-Type": "application/json" },
    })
  );

const answered = (...ids: string[]): PathProgress =>
  ids.reduce((p, id, n) => recordRep(p, id, true, n + 1), EMPTY_PATH_PROGRESS);
const items = (p: PathProgress | undefined) => Object.keys(p?.items ?? {}).sort();

/** The two ways the database says that the table is not there: PostgreSQL's code, and the data API's. */
const NO_TABLE: Failure[] = [
  { code: "42P01", message: 'relation "public.path_progress" does not exist' },
  { code: "PGRST205", message: "Could not find the table 'public.path_progress' in the schema cache" },
];
/** Ways a request fails: refused by a rule, not answered in time, and a failure with no code at all. */
const FAILURES: Failure[] = [
  { code: "42501", message: 'new row violates row-level security policy for table "path_progress"' },
  { code: "", message: "TimeoutError: The operation was aborted due to timeout" },
  { message: "TypeError: fetch failed" },
];

/** Send what was left for after the response, and say what was reported. */
async function reported() {
  for (const work of h.later) await work();
  return h.reportServerError.mock.calls.map(([, place]) => place);
}

beforeEach(() => {
  vi.clearAllMocks();
  h.access = { level: "free", proPlan: false };
  h.read = { data: null, error: null };
  h.write = { error: null };
  h.written = [];
  h.subscriptions = { data: [], error: null };
  h.later = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/path/progress: reading the saved study path", () => {
  it("answers with what is stored, and with an empty study path for an account that has saved nothing yet", async () => {
    h.read = { data: { progress: answered("a|1.1|w1") }, error: null };
    const stored = await read();
    expect(stored.status).toBe(200);
    const body = await stored.json();
    expect(body).toMatchObject({ stored: true, access: "free", certId: "cert-701" });
    expect(items(body.progress)).toEqual(["a|1.1|w1"]);

    // No row: nothing has been saved, which is an answer.
    h.read = { data: null, error: null };
    const empty = await (await read()).json();
    expect(empty).toMatchObject({ stored: true, progress: EMPTY_PATH_PROGRESS });
    expect(await reported()).toEqual([]);
  });

  it.each(FAILURES)("answers with an internal error and a sentence when the read failed ($message)", async (failure) => {
    h.read = { data: null, error: failure };
    const res = await read();
    // Never status 200 with an empty study path: the page would show it in place of the member's own.
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: NOT_READ } });
    // The database's own words stay in the server's log.
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(failure.message));
    // The fault is reported once, by where it happened and with no account in it.
    expect(await reported()).toEqual([
      { route: "/api/path/progress", path: "/api/path/progress", method: "GET", kind: "route" },
    ]);
  });

  it.each(NO_TABLE)("answers 'not stored' only where the table does not exist ($code)", async (failure) => {
    h.read = { data: null, error: failure };
    const res = await read();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stored: false, progress: EMPTY_PATH_PROGRESS, access: "free" });
    // Saving is not available in this database: nothing failed, and nothing is reported.
    expect(await reported()).toEqual([]);
  });
});

describe("POST /api/path/progress: saving the study path", () => {
  it("merges what was sent into what is stored, and writes the result for this account and exam", async () => {
    h.read = { data: { progress: answered("a|1.1|stored") }, error: null };
    const res = await save(finishStop(answered("a|1.2|sent"), "warmup", 1, 1, 5));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stored: true });
    expect(h.written).toHaveLength(1);
    const [{ row, options }] = h.written;
    expect(row).toMatchObject({ user_id: "user-1", cert_slug: CERT });
    expect(items(row.progress)).toEqual(["a|1.1|stored", "a|1.2|sent"]);
    expect(row.progress.stops).toHaveProperty("warmup");
    expect(options).toEqual({ onConflict: "user_id,cert_slug" });
    expect(await reported()).toEqual([]);
  });

  it.each(FAILURES)("answers with an internal error and a sentence when the write failed ($message)", async (failure) => {
    h.write = { error: failure };
    const res = await save(answered("a|1.1|w1"));
    // Never status 200: the page would count the save as saved and stop sending it.
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: NOT_SAVED } });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(failure.message));
    expect(await reported()).toEqual([
      { route: "/api/path/progress", path: "/api/path/progress", method: "POST", kind: "route" },
    ]);
  });

  it("answers that the save failed, and writes nothing, when what is stored could not be read first", async () => {
    h.read = { data: null, error: FAILURES[1] };
    const res = await save(answered("a|1.1|w1"));
    expect(res.status).toBe(500);
    // The request was a save, so the sentence says that the save failed.
    expect(await res.json()).toEqual({ error: { code: "internal", message: NOT_SAVED } });
    // Written over a copy that could not be read, the save would have erased what another device stored.
    expect(h.written).toEqual([]);
    expect(await reported()).toHaveLength(1);
  });

  it.each(NO_TABLE)("answers 'not stored', and writes nothing, only where the table does not exist ($code)", async (failure) => {
    h.read = { data: null, error: failure };
    const res = await save(answered("a|1.1|w1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stored: false });
    expect(h.written).toEqual([]);
    expect(await reported()).toEqual([]);
  });

  it("answers 'not stored' when the table is gone by the time of the write", async () => {
    h.write = { error: NO_TABLE[0] };
    const res = await save(answered("a|1.1|w1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stored: false });
  });
});

/**
 * A member whose last payment did not go through has no Pro while the payment
 * is owed. The study path showed such a member the offer of Pro, and the
 * press of a plan ended in a refusal at the checkout. The endpoint now says
 * that a payment is owed, and the page shows the way to the billing page
 * where the offer would have been.
 */
describe("GET /api/path/progress: a payment that is owed", () => {
  /** What a subscription can be, and no subscription at all. */
  const STANDINGS = ["active", "trialing", "past_due", "unpaid", "incomplete", "canceled", null] as const;
  const subscriptionIs = (status: (typeof STANDINGS)[number]) => {
    h.subscriptions = { data: status ? [{ plan: "pro", status }] : [], error: null };
  };

  it("says that a payment is owed for a subscription that is past due", async () => {
    subscriptionIs("past_due");
    const res = await read();
    expect(res.status).toBe(200);
    // No Pro while the payment is owed: the access check answers "free" for such an account.
    expect(await res.json()).toMatchObject({ access: "free", proPlan: false, paymentPastDue: true });
  });

  it.each(STANDINGS.filter((status) => status !== "past_due"))(
    "says nothing of it for a subscription that is %s",
    async (status) => {
      subscriptionIs(status);
      const body = await (await read()).json();
      // Sent only when it is true.
      expect(body).not.toHaveProperty("paymentPastDue");
    }
  );

  it.each(STANDINGS)("agrees with the plan service, which the billing page asks (%s)", async (status) => {
    subscriptionIs(status);
    const body = await (await read()).json();
    const plan = await getUserPlan(db as unknown as Db, user.id);
    // The billing page says "Your last payment did not go through." for exactly the accounts named here.
    expect(body.paymentPastDue === true).toBe(plan.paymentPastDue);
  });

  it("does not take a failed read for 'no payment is owed': the account could not be checked", async () => {
    h.subscriptions = { data: null, error: { message: "TimeoutError: The operation was aborted due to timeout" } };
    const res = await read();
    // Answered as "not owed", the page would show the offer to the member this is for.
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: NOT_CHECKED } });
    expect(await reported()).toHaveLength(1);
  });

  it("is read once when the study path is read, and not at all when it is saved", async () => {
    let subscriptionReads = 0;
    const real = db.from;
    db.from = (table: string) => {
      if (table === "user_subscriptions") subscriptionReads += 1;
      return real(table);
    };
    try {
      await read();
      expect(subscriptionReads).toBe(1);
      await save(answered("a|1.1|w1"));
      expect(subscriptionReads).toBe(1);
    } finally {
      db.from = real;
    }
  });
});
