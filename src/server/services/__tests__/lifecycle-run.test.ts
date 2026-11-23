import { beforeEach, describe, expect, it, vi } from "vitest";
import { finishStop, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";

/**
 * The daily run end to end, against an in-memory stand-in for the tables it
 * reads and writes: who gets which email, that a one-time email goes once, and
 * what the run does when an email cannot be sent, when the accounts fill more
 * than one page, and when its time runs out.
 */

type Row = Record<string, unknown>;
type Sent = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

const h = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  users: [] as { id: string; email: string }[],
  today: "",
  /** Row ids, counted across every client a test creates, as the database counts them. */
  nextId: 1,
  enrollments: {} as Record<string, { certificationId: string; examDate: string | null }[]>,
  /** Accounts whose enrollments can't be read. */
  failing: new Set<string>(),
  /** The most accounts the sign-in service returns on one page. */
  pageSize: 1000,
  /** A sign-in service that answers every page with the first one. */
  ignoresPage: false,
  /** A page of accounts that cannot be read. */
  failingPage: 0,
  /** The pages of accounts the run asked for, in order. */
  pagesAsked: [] as number[],
  /**
   * The most rows the database gives one select, by table (1,000 for a table
   * not named). Production answers with at most 1,000 and says nothing of the
   * rest; a test sets it lower to show what a read that does not page loses.
   */
  maxRows: {} as Record<string, number>,
  sendEmail: vi.fn<(email: Sent) => Promise<boolean>>(async () => true),
  structure: {
    certSlug: "security-plus-sy0-701",
    examName: "Security+",
    examCode: "SY0-701",
    domains: [
      {
        number: "1.0",
        title: "General Security Concepts",
        weight: 12,
        objectives: [
          { code: "1.1", title: "Security controls" },
          { code: "1.2", title: "Security concepts" },
          { code: "1.3", title: "Change management" },
          { code: "1.4", title: "Cryptography" },
        ],
      },
      {
        number: "2.0",
        title: "Threats, Vulnerabilities, and Mitigations",
        weight: 22,
        objectives: [
          { code: "2.1", title: "Threat actors" },
          { code: "2.2", title: "Threat vectors" },
        ],
      },
    ],
  },
}));

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
  serverEnv: vi.fn(),
  serverEnvOptional: vi.fn(),
}));
vi.mock("@/server/email/resend", () => ({ sendEmail: h.sendEmail }));
const capture = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/server/analytics", () => ({ captureServerEvent: capture }));
vi.mock("@/server/data/enrollments", () => ({
  listEnrollments: async (_db: unknown, userId: string) => {
    if (h.failing.has(userId)) throw new Error("enrollments read failed");
    return (h.enrollments[userId] ?? []).map((e, i) => ({ id: `${userId}-${i}`, enrolledAt: "", ...e }));
  },
}));
// The run reads no profile: no email greets its reader by name. The stand-in
// is here to show that, with a name that would be noticed if it were printed.
const getProfile = vi.hoisted(() => vi.fn(async () => ({ displayName: "Zebedee Quux" })));
vi.mock("@/server/data/profiles", () => ({ getProfile }));
vi.mock("@/server/data/certifications", () => ({
  getCertification: async (_db: unknown, id: string) => ({
    id,
    slug: "security-plus-sy0-701",
    name: "CompTIA Security+",
  }),
}));
vi.mock("@/server/data/path-progress", () => ({
  getPathProgress: async (_db: unknown, userId: string) => ({
    progress: h.tables.path_progress?.find((r) => r.user_id === userId)?.progress ?? {
      items: {},
      stops: {},
      checkpoint: null,
      goal: null,
    },
    stored: true,
  }),
}));
vi.mock("@/server/path/bank", () => ({
  loadPathBank: async () => ({ certId: "sec", structure: h.structure, questions: [], byId: new Map() }),
}));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: () => fakeAdmin() }));

import { pathNudgeType, pathOfferType, runLifecycleEmails, sendWelcome } from "../lifecycle-email";
import { serverEnv } from "@/env";
import { verifyStoryToken } from "@/server/story/story-token";

/** Just enough of the Supabase query builder for the run's reads and writes. */
function fakeAdmin() {
  const defaults = (table: string, row: Row): Row =>
    table === "email_log"
      ? { sent_on: h.today, ...row }
      : table === "email_preferences"
        ? { digest_enabled: true, daily_reminder_enabled: true, unsubscribe_token: `tok-${row.user_id}`, ...row }
        : row;
  return {
    auth: {
      admin: {
        listUsers: async ({ page = 1, perPage = 50 }: { page?: number; perPage?: number } = {}) => {
          h.pagesAsked.push(page);
          if (page === h.failingPage) return { data: { users: [] }, error: { message: "upstream timeout" } };
          const size = Math.min(perPage, h.pageSize);
          const start = h.ignoresPage ? 0 : (page - 1) * size;
          return {
            data: {
              users: h.users
                .slice(start, start + size)
                .map((u) => ({ ...u, email_confirmed_at: "2026-10-01T00:00:00Z" })),
            },
            error: null,
          };
        },
      },
    },
    from(table: string) {
      const rows = (h.tables[table] ??= []);
      const filters: ((r: Row) => boolean)[] = [];
      const orders: string[] = [];
      let written: Row[] | null = null;
      let deleting = false;
      let max = Infinity;
      let range: [number, number] | null = null;
      let counted = false;
      const matching = () => rows.filter((r) => filters.every((f) => f(r)));
      const settle = () => {
        if (deleting) {
          for (const row of matching()) rows.splice(rows.indexOf(row), 1);
          return { data: null, error: null };
        }
        if (written) return { data: written.slice(0, max), error: null };
        const all = matching().sort((a, b) => {
          for (const column of orders) {
            const [x, y] = [String(a[column]), String(b[column])];
            if (x !== y) return x < y ? -1 : 1;
          }
          return 0;
        });
        const asked = range ? all.slice(range[0], range[1] + 1) : all;
        return {
          data: asked.slice(0, Math.min(max, h.maxRows[table] ?? 1000)),
          error: null,
          ...(counted ? { count: all.length } : {}),
        };
      };
      const q = {
        select: (_columns?: string, options?: { count?: string }) => ((counted = options?.count === "exact"), q),
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        gte: (c: string, v: string) => (filters.push((r) => String(r[c]) >= v), q),
        lte: (c: string, v: string) => (filters.push((r) => String(r[c]) <= v), q),
        order: (c: string) => (orders.push(c), q),
        range: (from: number, to: number) => ((range = [from, to]), q),
        limit: (n: number) => ((max = n), q),
        delete: () => ((deleting = true), q),
        upsert: (row: Row, opts: { onConflict: string; ignoreDuplicates?: boolean }) => {
          const full = defaults(table, row);
          const hit = rows.find((r) => opts.onConflict.split(",").every((k) => r[k] === full[k]));
          if (hit) written = opts.ignoreDuplicates ? [] : [Object.assign(hit, row)];
          else {
            const created = { id: h.nextId++, ...full };
            rows.push(created);
            written = [created];
          }
          return q;
        },
        maybeSingle: async () => ({ data: settle().data?.[0] ?? null, error: null }),
        single: async () => ({ data: settle().data?.[0], error: null }),
        then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => Promise.resolve(settle()).then(ok, fail),
      };
      return q;
    },
  };
}

const MONDAY = new Date("2026-11-02T14:00:00Z");
const TUESDAY = new Date("2026-11-03T14:00:00Z");
const WEDNESDAY = new Date("2026-11-04T14:00:00Z");
const daysBefore = (date: Date, days: number) => new Date(date.getTime() - days * 86_400_000).toISOString();

const played = (...stops: string[]): PathProgress =>
  stops.reduce(
    (p, id) => finishStop(recordRep(p, `a|x|${id}`, true, 0), id, 7, 8, 0),
    EMPTY_PATH_PROGRESS
  );

/** Played through the readiness checkpoint, taken `hoursAgo` before Monday's run. */
const tookCheckpoint = (hoursAgo: number): PathProgress => ({
  ...played("warmup", "1.1", "1.2", "1.3", "1.4", "checkpoint"),
  checkpoint: {
    score: 64,
    at: MONDAY.getTime() - hoursAgo * 3_600_000,
    domains: [
      { number: "1.0", correct: 2, total: 3 },
      { number: "2.0", correct: 1, total: 2 },
    ],
  },
});

function account(
  id: string,
  opts: {
    pro?: boolean;
    examDate?: string;
    path?: { progress: PathProgress; savedDaysAgo: number };
    unsubscribed?: boolean;
  }
) {
  h.users.push({ id, email: `${id}@example.com` });
  h.enrollments[id] = [{ certificationId: "sec", examDate: opts.examDate ?? null }];
  if (opts.pro) h.tables.user_subscriptions.push({ user_id: id, plan: "pro", status: "active" });
  if (opts.unsubscribed) {
    h.tables.email_preferences.push({
      user_id: id,
      digest_enabled: false,
      daily_reminder_enabled: true,
      unsubscribe_token: `tok-${id}`,
    });
  }
  if (opts.path) {
    h.tables.path_progress.push({
      user_id: id,
      cert_slug: "security-plus-sy0-701",
      progress: opts.path.progress,
      updated_at: daysBefore(MONDAY, opts.path.savedDaysAgo),
    });
  }
}

async function run(date: Date, options?: Parameters<typeof runLifecycleEmails>[1]) {
  h.today = date.toISOString().slice(0, 10);
  h.sendEmail.mockClear();
  h.pagesAsked = [];
  const result = await runLifecycleEmails(date, options);
  const emails = h.sendEmail.mock.calls.map(([e]) => e);
  // No lifecycle email ever sends anyone into the old workspace.
  for (const e of emails) expect(e.html + e.text).not.toContain("/dashboard");
  const sent = emails.map((e) => `${e.to.split("@")[0]}: ${e.subject}`);
  return { result, sent: sent.sort(), emails };
}

/** The email types recorded as sent, as "account: type". */
const logged = () => h.tables.email_log.map((r) => `${r.user_id}: ${r.email_type}`).sort();

beforeEach(() => {
  h.tables = { user_subscriptions: [], profiles: [], path_progress: [], email_preferences: [], email_log: [] };
  h.users = [];
  h.enrollments = {};
  h.failing = new Set();
  h.nextId = 1;
  h.pageSize = 1000;
  h.ignoresPage = false;
  h.failingPage = 0;
  h.pagesAsked = [];
  h.maxRows = {};
  getProfile.mockClear();
  h.sendEmail.mockReset();
  h.sendEmail.mockImplementation(async () => true);
  capture.mockClear();
  // The mail service's key is checked at the start of a run, and the post-exam
  // links are signed with the service role's key.
  vi.mocked(serverEnv).mockReset();
  vi.mocked(serverEnv).mockReturnValue("test-service-role-secret");
});

describe("runLifecycleEmails", () => {
  it("asks how the exam went two days after it, on links that need no sign-in", async () => {
    account("sat", { examDate: "2026-10-31" });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["sat: How did your CompTIA Security+ exam go?"]);
    const links = [...monday.emails[0].html.matchAll(/href="([^"]*\/story\?[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    expect(links).toHaveLength(2);
    for (const [link, answer] of links.map((l, i) => [l, i === 0 ? "pass" : "fail"] as const)) {
      const url = new URL(link);
      expect(url.origin + url.pathname).toBe("https://certbench.dev/story");
      expect(url.searchParams.get("r")).toBe(answer);
      expect(url.searchParams.get("utm_campaign")).toBe("postexam");
      expect(verifyStoryToken(url.searchParams.get("t")!)).toMatchObject({ userId: "sat", certId: "sec" });
    }
    expect(monday.emails[0].text).toContain("https://certbench.dev/story?t=");
    expect(monday.emails[0].html + monday.emails[0].text).not.toContain("/feedback");
  });

  it("records each email in PostHog against its person, and counts what Resend refused", async () => {
    account("free", { path: { progress: played("warmup", "1.1", "1.2"), savedDaysAgo: 3 } });
    account("dated", { examDate: "2026-11-09" });
    h.sendEmail.mockImplementation(async (e) => !e.to.startsWith("dated"));

    const monday = await run(MONDAY);

    // A refused send is counted as a send failure. It is not an account whose pass failed.
    expect(monday.result).toMatchObject({ pathNudges: 1, countdowns: 0, sendFailures: 1, recentPaths: 1, failed: 0 });
    expect(capture).toHaveBeenCalledWith("free", "lifecycle_email_sent", {
      email_type: pathNudgeType("security-plus-sy0-701"),
    });
    expect(capture).toHaveBeenCalledWith("dated", "lifecycle_email_failed", { email_type: "countdown_7" });
    expect(capture).toHaveBeenCalledTimes(2);
  });

  // An email that could not be sent used to stay in the log as sent. The
  // countdown for that day was lost, and a one-time email was lost for good.
  it("does not record a refused email as sent, so a second run on the same day sends it", async () => {
    account("free", { path: { progress: played("warmup", "1.1", "1.2"), savedDaysAgo: 3 } });
    account("dated", { examDate: "2026-11-09" });
    h.sendEmail.mockImplementation(async (e) => !e.to.startsWith("dated"));

    await run(MONDAY);
    expect(logged()).toEqual([`free: ${pathNudgeType("security-plus-sy0-701")}`]);

    h.sendEmail.mockImplementation(async () => true);
    const again = await run(MONDAY);
    // The countdown goes now, and the email that did go the first time is not repeated.
    expect(again.sent).toEqual(["dated: 7 days until your Security+ exam"]);
    expect(again.result).toMatchObject({ countdowns: 1, pathNudges: 0, sendFailures: 0 });
    expect(logged()).toEqual(["dated: countdown_7", `free: ${pathNudgeType("security-plus-sy0-701")}`]);
  });

  it("tries a one-time email again on the next day when it could not be sent, and then never again", async () => {
    account("free", { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    account("decided", { path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });
    h.sendEmail.mockImplementation(async () => false);

    const monday = await run(MONDAY);
    expect(monday.result).toMatchObject({ pathNudges: 0, pathOffers: 0, sendFailures: 2, failed: 0 });
    expect(logged()).toEqual([]);

    h.sendEmail.mockImplementation(async () => true);
    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual([
      "decided: Your Security+ checkpoint: 64%",
      "free: Your next Security+ step: Security controls",
    ]);
    expect(tuesday.result).toMatchObject({ pathNudges: 1, pathOffers: 1, sendFailures: 0 });

    expect((await run(WEDNESDAY)).sent).toEqual([]);
    expect(logged()).toEqual([
      `decided: ${pathOfferType("security-plus-sy0-701")}`,
      `free: ${pathNudgeType("security-plus-sy0-701")}`,
    ]);
  });

  // A send that got no answer may still have been accepted. Each attempt at the
  // same email on the same day now carries the same key, built from the claim
  // (the type, the account and the day), and the mail service sends it once.
  it("names each email to the mail service by its claim: the type, the account and the day", async () => {
    account("dated", { examDate: "2026-11-09" });
    account("free", { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    h.sendEmail.mockImplementation(async () => false);
    const keys = async (date: Date) =>
      (await run(date)).emails.map((email) => (email as Sent & { idempotencyKey?: string }).idempotencyKey).sort();

    const expected = ["countdown_7/dated/2026-11-02", `${pathNudgeType("security-plus-sy0-701")}/free/2026-11-02`];
    expect(await keys(MONDAY)).toEqual(expected);
    // Both sends failed and gave their claims back. A second run on the same day
    // tries the same two emails, with the same two keys.
    expect(await keys(MONDAY)).toEqual(expected);
    // The next day is another claim: the nudge, which was never sent, has a key of that day.
    expect(await keys(TUESDAY)).toEqual([`${pathNudgeType("security-plus-sy0-701")}/free/2026-11-03`]);
  });

  it("counts a send that throws as a send failure, gives the claim back, and goes on to the next account", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    account("first", { examDate: "2026-11-09" });
    account("second", { examDate: "2026-11-09" });
    h.sendEmail.mockImplementationOnce(async () => {
      throw new Error("socket hang up");
    });

    const monday = await run(MONDAY);
    expect(monday.result).toMatchObject({ users: 2, countdowns: 1, sendFailures: 1, failed: 0 });
    expect(logged()).toEqual(["second: countdown_7"]);
    expect(capture).toHaveBeenCalledWith("first", "lifecycle_email_failed", { email_type: "countdown_7" });
    expect(consoleError).toHaveBeenCalledWith("lifecycle email countdown_7 failed:", expect.any(Error));
    consoleError.mockRestore();
  });

  // Without the key every send fails. Before, such a run wrote a row for each
  // email it did not send, which used up the one-time emails for everyone due.
  it("refuses to start without the mail service's key, before anything is read or written", async () => {
    account("free", { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    vi.mocked(serverEnv).mockImplementation((key) => {
      if (key === "RESEND_API_KEY") throw new Error("Missing required environment variable RESEND_API_KEY");
      return "test-service-role-secret";
    });

    h.today = "2026-11-02";
    await expect(runLifecycleEmails(MONDAY)).rejects.toThrow("Missing required environment variable RESEND_API_KEY");
    expect(h.pagesAsked).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.tables.email_log).toEqual([]);
    expect(h.tables.email_preferences).toEqual([]);
  });

  it("gives every lifecycle email the unsubscribe address in its footer and in both headers", async () => {
    account("sat", { examDate: "2026-10-31" });
    account("dated", { examDate: "2026-11-09" });
    account("free", { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    account("decided", { path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual([
      "dated: 7 days until your Security+ exam",
      "decided: Your Security+ checkpoint: 64%",
      "free: Your next Security+ step: Security controls",
      "sat: How did your CompTIA Security+ exam go?",
    ]);
    for (const email of monday.emails) {
      const address = `https://certbench.dev/api/email/unsubscribe?token=tok-${email.to.split("@")[0]}`;
      // The second header tells a mail client that one POST unsubscribes (RFC 8058).
      // Without it the client can only open the address, which changes nothing.
      expect(email.headers).toEqual({
        "List-Unsubscribe": `<${address}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });
      expect(email.html).toContain(`href="${address}"`);
      expect(email.text).toContain(`Unsubscribe: ${address}`);
      // Every email names its sender and the address at which the sender can be
      // reached, in the footer and at the end of the text part.
      expect(email.html).toContain('Sent by CertBench. To contact CertBench, write to <a href="mailto:support@certbench.dev"');
      expect(
        email.text.endsWith(
          `\n\nSent by CertBench. To contact CertBench, write to support@certbench.dev.\nUnsubscribe: ${address}`
        )
      ).toBe(true);
    }
  });

  it("nudges an account without Pro back to its path, and sends Pro no nudge", async () => {
    account("free", { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    account("pro", { pro: true, path: { progress: played("warmup", "1.1"), savedDaysAgo: 3 } });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["free: Your next Security+ step: Security controls"]);
    expect(monday.result).toMatchObject({ users: 2, failed: 0, pathNudges: 1, pages: 1, stoppedEarly: false });

    const nudge = monday.emails[0];
    expect(nudge.html).toContain(
      `https://certbench.dev/login?next=${encodeURIComponent("/path/security-plus-sy0-701?utm_source=email&utm_medium=lifecycle&utm_campaign=path_nudge")}`
    );
    expect(nudge.text).toContain("Your readiness checkpoint follows it.");

    // Next day: the nudge never repeats.
    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual([]);
    expect(h.tables.email_log.filter((r) => r.email_type === pathNudgeType("security-plus-sy0-701"))).toHaveLength(1);
  });

  it("sends an account without Pro a countdown about its path, and holds the nudge for a day", async () => {
    account("dated", {
      examDate: "2026-11-09",
      path: { progress: played("warmup", "1.1"), savedDaysAgo: 3 },
    });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["dated: 7 days until your Security+ exam"]);
    const countdown = monday.emails[0];
    expect(countdown.text).toContain("You have completed 2 of the 11 steps in your Security+ study path.");
    expect(countdown.html).toContain(encodeURIComponent("utm_campaign=countdown"));

    const tuesday = await run(TUESDAY);
    // Two stops in, the checkpoint is next: the nudge names it.
    expect(tuesday.sent).toEqual(["dated: Your Security+ readiness checkpoint is next"]);
  });

  it("gives Pro its countdown on the path too, counting the whole path", async () => {
    account("free", { examDate: "2026-11-10", path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });
    account("pro", { pro: true, examDate: "2026-11-10", path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });

    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual(["free: 7 days until your Security+ exam", "pro: 7 days until your Security+ exam"]);
    expect(tuesday.result).toMatchObject({ countdowns: 2, pathOffers: 0 });
    const text = (who: string) => tuesday.emails.find((e) => e.to === `${who}@example.com`)!.text;
    // What is still free comes from the exam's own public page of labs: 12 for Security+ SY0-701.
    expect(text("free")).toContain(
      "You have completed 6 steps of your Security+ study path, including the readiness checkpoint. The remaining 5 steps are included with Pro. One practice exam is free, and so are 12 hands-on labs."
    );
    expect(text("pro")).not.toContain("is free");
    expect(text("pro")).toContain("You have completed 6 of the 11 steps in your Security+ study path.");
    expect(text("pro")).toContain("utm_campaign%3Dcountdown");
  });

  it("names the date of the exam in the last countdown, the day before it", async () => {
    account("eve", { examDate: "2026-11-03", path: { progress: played("warmup", "1.1"), savedDaysAgo: 3 } });
    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["eve: Your Security+ exam is on November 3, 2026"]);
    expect(monday.emails[0].text).toMatch(/^Your exam is on November 3, 2026\.\n/);
  });

  it("starts Pro's path in its countdown when it has not begun", async () => {
    account("pro", { pro: true, examDate: "2026-11-10" });
    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual(["pro: 7 days until your Security+ exam"]);
    expect(tuesday.emails[0].text).toContain("Your Security+ study path is ready. It has 11 steps");
    expect(tuesday.emails[0].text).toContain("Start the study path: https://certbench.dev/login?next=");
  });

  // Every account with an exam used to cost a read of its preferences (and, the
  // first time, a new row) on every run, whether or not anything was due.
  it("reads nothing more for an account with nothing due today, and still sends what is due", async () => {
    account("later", { examDate: "2026-11-20" });
    account("undated", {});
    account("dated", { examDate: "2026-11-09" });
    account("sat", { examDate: "2026-10-31" });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["dated: 7 days until your Security+ exam", "sat: How did your CompTIA Security+ exam go?"]);
    expect(monday.result).toMatchObject({ users: 4, countdowns: 1, postExam: 1 });
    // Only the two accounts that had an email due had their preferences read, and so made.
    expect(h.tables.email_preferences.map((row) => row.user_id).sort()).toEqual(["dated", "sat"]);
  });

  it("sends nothing to the unsubscribed, the recently active, or anyone gone a week", async () => {
    account("quiet", { unsubscribed: true, path: { progress: played("warmup"), savedDaysAgo: 3 } });
    account("active", { path: { progress: played("warmup", "1.1"), savedDaysAgo: 1 } });
    account("gone", { path: { progress: played("warmup", "1.1"), savedDaysAgo: 9 } });
    account("long-decided", { path: { progress: tookCheckpoint(8 * 24), savedDaysAgo: 8 } });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual([]);
    expect(monday.result).toMatchObject({ users: 4, pathNudges: 0, pathOffers: 0, countdowns: 0 });
  });

  it("follows up once on a checkpoint taken without buying: the result and the rest of the path", async () => {
    account("decided", { path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["decided: Your Security+ checkpoint: 64%"]);
    expect(monday.result).toMatchObject({ pathOffers: 1, pathNudges: 0 });
    const followUp = monday.emails[0];
    expect(followUp.html).toContain(encodeURIComponent("utm_campaign=path_offer"));
    // Warm-up, four learn stops and the checkpoint done; five of eleven left.
    expect(followUp.text).toContain("- All 5 remaining steps of your Security+ study path");
    expect(followUp.text).toContain("\nWithout Pro, one practice exam is free, and so are 12 hands-on labs.\n");
    expect(followUp.text).toContain(
      "The area to focus on next is Threats, Vulnerabilities, and Mitigations, which accounts for 22% of the exam."
    );

    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual([]);
    expect(h.tables.email_log.filter((r) => r.email_type === pathOfferType("security-plus-sy0-701"))).toHaveLength(1);
  });

  it("never sends the follow-up to Pro", async () => {
    account("pro", { pro: true, path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });
    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual([]);
    expect(tuesday.result).toMatchObject({ pathOffers: 0 });
  });

  it("lets a countdown go first, and follows up the day after", async () => {
    account("dated", { examDate: "2026-11-09", path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });
    expect((await run(MONDAY)).sent).toEqual(["dated: 7 days until your Security+ exam"]);
    expect((await run(TUESDAY)).sent).toEqual(["dated: Your Security+ checkpoint: 64%"]);
  });

  // A second run on the same day (by hand, after a run that ran out of time,
  // or a cron call delivered twice) found the countdown already claimed and
  // went on to send the offer: two study emails in one day.
  it("sends no second study email when the day's run is repeated after a countdown", async () => {
    account("dated", { examDate: "2026-11-09", path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });
    expect((await run(MONDAY)).sent).toEqual(["dated: 7 days until your Security+ exam"]);
    const again = await run(MONDAY);
    expect(again.sent).toEqual([]);
    expect(again.result).toMatchObject({ countdowns: 0, pathOffers: 0 });
    expect(logged()).toEqual(["dated: countdown_7"]);
    // The offer waits for the next day, as it does after a countdown sent in the same run.
    expect((await run(TUESDAY)).sent).toEqual(["dated: Your Security+ checkpoint: 64%"]);
  });

  it("counts an account whose pass fails, and still reaches everyone after it", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    account("broken", { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    account("free", { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    h.failing.add("broken");

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["free: Your next Security+ step: Security controls"]);
    expect(monday.result).toMatchObject({ users: 2, failed: 1, pathNudges: 1 });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("nudges toward the checkpoint itself when it is the next step", async () => {
    account("close", { path: { progress: played("warmup", "1.1", "1.2", "1.3", "1.4"), savedDaysAgo: 2.5 } });
    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["close: Your Security+ readiness checkpoint is next"]);
  });

  // The greeting printed the first word of the display name, which was often a
  // title ("Dr.") or a mailbox name, and needed a filter against a stranger's
  // markup and links. No email greets its reader by name now.
  it("greets nobody by name in any lifecycle email, and reads no profile for a greeting", async () => {
    account("sat", { examDate: "2026-10-31" });
    account("dated", { examDate: "2026-11-09" });
    account("free", { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    account("decided", { path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });

    const monday = await run(MONDAY);
    expect(monday.emails).toHaveLength(4);
    for (const email of monday.emails) {
      for (const part of [email.subject, email.html, email.text]) expect(part).not.toMatch(/Zebedee|Quux/);
    }
    expect(monday.emails.map((e) => /<h1[^>]*>([^<]*)<\/h1>/.exec(e.html)?.[1]).sort()).toEqual([
      "Continue your study path",
      "How did your exam go?",
      "Your checkpoint result",
      "Your exam is in 7 days",
    ]);
    expect(getProfile).not.toHaveBeenCalled();
  });
});

describe("runLifecycleEmails, beyond one page of accounts", () => {
  const five = () => {
    for (const id of ["a", "b", "c", "d", "e"]) {
      account(id, { path: { progress: played("warmup"), savedDaysAgo: 3 } });
    }
  };

  // The run used to read the first page only: account 1,001 onward was never reached.
  it("reads every page of accounts until a page comes back empty", async () => {
    five();
    h.pageSize = 2;

    const monday = await run(MONDAY);
    expect(h.pagesAsked).toEqual([1, 2, 3, 4]);
    expect(monday.result).toMatchObject({ users: 5, pages: 3, pathNudges: 5, stoppedEarly: false });
    expect(monday.sent).toHaveLength(5);
  });

  it("ends, with nobody emailed twice, when the service repeats a page it has already given", async () => {
    five();
    h.ignoresPage = true;

    const monday = await run(MONDAY);
    expect(h.pagesAsked).toEqual([1, 2]);
    expect(monday.result).toMatchObject({ users: 5, pages: 1, pathNudges: 5 });
    expect(monday.sent).toHaveLength(5);
  });

  it("fails, naming the page, when a later page cannot be read; a second run finishes without repeating an email", async () => {
    five();
    h.pageSize = 2;
    h.failingPage = 2;

    h.today = "2026-11-02";
    await expect(runLifecycleEmails(MONDAY)).rejects.toThrow("listUsers failed on page 2: upstream timeout");
    expect(logged()).toHaveLength(2);

    h.failingPage = 0;
    const again = await run(MONDAY);
    expect(again.sent.map((s) => s.split(":")[0])).toEqual(["c", "d", "e"]);
    expect(logged()).toHaveLength(5);
  });

  // The database answers one select with at most 1,000 rows and says nothing
  // of the rest. The Pro list was read with one select: past 1,000
  // subscriptions, a member who had paid could be sent the offer to buy Pro.
  it("reads every Pro member past the most rows one select gives, and offers Pro to none of them", async () => {
    h.maxRows = { user_subscriptions: 2 };
    for (const id of ["pro-a", "pro-b", "pro-c"]) {
      account(id, { pro: true, path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });
    }
    account("free", { path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["free: Your Security+ checkpoint: 64%"]);
    expect(monday.result).toMatchObject({ users: 4, pathOffers: 1 });
  });

  it("reads every recently saved study path past the most rows one select gives", async () => {
    h.maxRows = { path_progress: 2 };
    five();

    const monday = await run(MONDAY);
    expect(monday.result).toMatchObject({ recentPaths: 5, pathNudges: 5 });
    expect(monday.sent).toHaveLength(5);
  });

  it("stops before anyone is emailed when the Pro list cannot be read whole", async () => {
    five();
    h.maxRows = { user_subscriptions: 0 };
    account("pro", { pro: true, path: { progress: tookCheckpoint(30), savedDaysAgo: 30 / 24 } });

    h.today = "2026-11-02";
    await expect(runLifecycleEmails(MONDAY)).rejects.toThrow("pro lookup failed: A paged read ended after 0 of 1 rows");
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  // Vercel ends the function at 300 seconds, and a run that is ended there
  // reports nothing. The run stops itself first and says so.
  it("stops taking new accounts when its time is spent, says so, and the next run finishes the rest", async () => {
    five();
    // A clock that moves 100 ms each time it is read: once for the deadline,
    // then once before each account.
    let now = 0;
    const clock = () => (now += 100);

    const monday = await run(MONDAY, { budgetMs: 250, clock });
    expect(monday.result).toMatchObject({ users: 2, pathNudges: 2, stoppedEarly: true });
    expect(monday.sent.map((s) => s.split(":")[0])).toEqual(["a", "b"]);

    const again = await run(MONDAY);
    expect(again.result).toMatchObject({ users: 5, pathNudges: 3, stoppedEarly: false });
    expect(again.sent.map((s) => s.split(":")[0])).toEqual(["c", "d", "e"]);
  });
});

describe("sendWelcome", () => {
  const SUBJECT = "Your CompTIA Security+ study path is saved";
  const welcomed = () => h.tables.email_log.filter((r) => r.email_type === "welcome");

  async function welcome(date: Date, email = "new@example.com") {
    h.today = date.toISOString().slice(0, 10);
    h.sendEmail.mockClear();
    await sendWelcome("new", email, "sec");
    return h.sendEmail.mock.calls.map(([e]) => e.subject);
  }

  // The enrollment route calls this each time a learner without Pro confirms an
  // exam, which happens again before every checkout. The log's claim covers one
  // day, so each later day used to send the welcome again.
  it("welcomes an account once, however often and on however many days it confirms an exam", async () => {
    expect(await welcome(MONDAY)).toEqual([SUBJECT]);
    expect(await welcome(MONDAY)).toEqual([]);
    expect(await welcome(TUESDAY)).toEqual([]);
    expect(await welcome(WEDNESDAY)).toEqual([]);
    expect(welcomed()).toHaveLength(1);
    expect(capture).toHaveBeenCalledExactlyOnceWith("new", "lifecycle_email_sent", { email_type: "welcome" });
  });

  it("tries again the next time when the welcome could not be sent, and then never again", async () => {
    h.sendEmail.mockImplementationOnce(async () => false);
    expect(await welcome(MONDAY)).toEqual([SUBJECT]);
    expect(welcomed()).toHaveLength(0);

    expect(await welcome(TUESDAY)).toEqual([SUBJECT]);
    expect(welcomed()).toHaveLength(1);
    expect(await welcome(WEDNESDAY)).toEqual([]);
  });

  // The welcome used to be sent as a transactional email: no unsubscribe
  // header, and sent whatever the preferences said. It goes to an address that
  // nobody has confirmed, so it now carries what every other email carries.
  it("carries the unsubscribe address in its footer, in its text part and in both headers", async () => {
    expect(await welcome(MONDAY)).toEqual([SUBJECT]);
    const email = h.sendEmail.mock.calls[0][0];
    const address = "https://certbench.dev/api/email/unsubscribe?token=tok-new";
    expect(email.headers).toEqual({
      "List-Unsubscribe": `<${address}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(email.html).toContain(`href="${address}"`);
    expect(email.text).toContain(
      `Sent by CertBench. To contact CertBench, write to support@certbench.dev.\nUnsubscribe: ${address}`
    );
    // The preferences row that holds the token is created with the welcome.
    expect(h.tables.email_preferences).toMatchObject([{ user_id: "new", digest_enabled: true, unsubscribe_token: "tok-new" }]);
  });

  it("is not sent to an account that has unsubscribed, on that day or on a later one", async () => {
    h.tables.email_preferences.push({ user_id: "new", digest_enabled: false, unsubscribe_token: "tok-new" });
    expect(await welcome(MONDAY)).toEqual([]);
    expect(await welcome(TUESDAY)).toEqual([]);
    expect(welcomed()).toHaveLength(0);
    expect(capture).not.toHaveBeenCalled();
  });

  // The welcome goes to an address that nobody has confirmed, and the display
  // name is whatever was typed at sign-up. It is no longer printed at all.
  it("welcomes by no name, and reads no profile for a greeting", async () => {
    expect(await welcome(MONDAY)).toEqual([SUBJECT]);
    const email = h.sendEmail.mock.calls[0][0];
    expect(email.html).toContain(">Welcome to CertBench</h1>");
    expect(email.text).toMatch(/^Welcome to CertBench\.\n/);
    for (const part of [email.subject, email.html, email.text]) expect(part).not.toMatch(/Zebedee|Quux/);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("never welcomes a test account, and never throws when the email cannot be prepared", async () => {
    expect(await welcome(MONDAY, "someone+e2e-1@example.com")).toEqual([]);
    expect(welcomed()).toHaveLength(0);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    h.sendEmail.mockImplementationOnce(async () => {
      throw new Error("socket hang up");
    });
    await expect(sendWelcome("new", "new@example.com", "sec")).resolves.toBeUndefined();
    expect(welcomed()).toHaveLength(0);
    consoleError.mockRestore();
  });
});
