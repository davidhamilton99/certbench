import { beforeEach, describe, expect, it, vi } from "vitest";
import { finishStop, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";

/**
 * The daily run end to end, against an in-memory stand-in for the tables it
 * reads and writes: who gets which email, and that the path nudge goes once.
 */

type Row = Record<string, unknown>;

const h = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  users: [] as { id: string; email: string }[],
  today: "",
  enrollments: {} as Record<string, { certificationId: string; examDate: string | null }[]>,
  sendEmail: vi.fn<(email: { to: string; subject: string; html: string; text: string }) => Promise<boolean>>(
    async () => true
  ),
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
vi.mock("@/server/data/enrollments", () => ({
  listEnrollments: async (_db: unknown, userId: string) =>
    (h.enrollments[userId] ?? []).map((e, i) => ({ id: `${userId}-${i}`, enrolledAt: "", ...e })),
}));
vi.mock("@/server/data/profiles", () => ({
  getProfile: async () => ({ displayName: "Sam Lee" }),
}));
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
// Every account has practiced and has reviews due, so the toolkit emails would fire.
vi.mock("@/server/services/session-plan", () => ({
  getSessionPlan: async () => ({
    readinessScore: 48,
    readinessTrend: null,
    daysUntilExam: null,
    totalQuestionsSeen: 40,
    blocks: [{ type: "srs_review", questionCount: 5 }],
  }),
}));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: () => fakeAdmin() }));

import { pathNudgeType, runLifecycleEmails } from "../lifecycle-email";

/** Just enough of the Supabase query builder for the run's reads and writes. */
function fakeAdmin() {
  let nextId = 1;
  const defaults = (table: string, row: Row): Row =>
    table === "email_log"
      ? { sent_on: h.today, ...row }
      : table === "email_preferences"
        ? { digest_enabled: true, daily_reminder_enabled: true, unsubscribe_token: `tok-${row.user_id}`, ...row }
        : row;
  return {
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: h.users.map((u) => ({ ...u, email_confirmed_at: "2026-10-01T00:00:00Z" })) },
          error: null,
        }),
      },
    },
    from(table: string) {
      const rows = (h.tables[table] ??= []);
      const filters: ((r: Row) => boolean)[] = [];
      let written: Row[] | null = null;
      let max = Infinity;
      const result = () => (written ?? rows.filter((r) => filters.every((f) => f(r)))).slice(0, max);
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        gte: (c: string, v: string) => (filters.push((r) => String(r[c]) >= v), q),
        lte: (c: string, v: string) => (filters.push((r) => String(r[c]) <= v), q),
        limit: (n: number) => ((max = n), q),
        upsert: (row: Row, opts: { onConflict: string; ignoreDuplicates?: boolean }) => {
          const full = defaults(table, row);
          const hit = rows.find((r) => opts.onConflict.split(",").every((k) => r[k] === full[k]));
          if (hit) written = opts.ignoreDuplicates ? [] : [Object.assign(hit, row)];
          else {
            const created = { id: nextId++, ...full };
            rows.push(created);
            written = [created];
          }
          return q;
        },
        maybeSingle: async () => ({ data: result()[0] ?? null, error: null }),
        single: async () => ({ data: result()[0], error: null }),
        then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
          Promise.resolve({ data: result(), error: null }).then(ok, fail),
      };
      return q;
    },
  };
}

const MONDAY = new Date("2026-11-02T14:00:00Z");
const TUESDAY = new Date("2026-11-03T14:00:00Z");
const daysBefore = (date: Date, days: number) => new Date(date.getTime() - days * 86_400_000).toISOString();

const played = (...stops: string[]): PathProgress =>
  stops.reduce(
    (p, id) => finishStop(recordRep(p, `a|x|${id}`, true, 0), id, 7, 8, 0),
    EMPTY_PATH_PROGRESS
  );

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

async function run(date: Date) {
  h.today = date.toISOString().slice(0, 10);
  h.sendEmail.mockClear();
  const result = await runLifecycleEmails(date);
  const sent = h.sendEmail.mock.calls.map(([e]) => `${e.to.split("@")[0]}: ${e.subject}`);
  return { result, sent: sent.sort(), emails: h.sendEmail.mock.calls.map(([e]) => e) };
}

beforeEach(() => {
  h.tables = { user_subscriptions: [], profiles: [], path_progress: [], email_preferences: [], email_log: [] };
  h.users = [];
  h.enrollments = {};
});

describe("runLifecycleEmails", () => {
  it("gives an account without Pro its path, not the toolkit's digest and reminders", async () => {
    account("free", { path: { progress: played("warmup", "1.1", "1.2"), savedDaysAgo: 3 } });
    account("pro", { pro: true, path: { progress: played("warmup", "1.1"), savedDaysAgo: 3 } });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual([
      "free: Next on your Security+ path: Change management",
      "pro: CompTIA Security+ readiness: 48%",
    ]);
    expect(monday.result).toMatchObject({ digests: 1, pathNudges: 1, dailyReminders: 0 });

    const nudge = monday.emails.find((e) => e.to === "free@example.com")!;
    expect(nudge.html).toContain(
      `https://certbench.dev/login?next=${encodeURIComponent("/path/security-plus-sy0-701?utm_source=email&utm_medium=lifecycle&utm_campaign=path_nudge")}`
    );
    expect(nudge.text).toContain("It's 2 short stops from here to your readiness checkpoint");

    // Next day: Pro gets its daily review reminder; the nudge never repeats.
    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual(["pro: 5 reviews due today — CompTIA Security+"]);
    expect(h.tables.email_log.filter((r) => r.email_type === pathNudgeType("security-plus-sy0-701"))).toHaveLength(1);
  });

  it("sends an account without Pro a countdown about its path, and holds the nudge for a day", async () => {
    account("dated", {
      examDate: "2026-11-09",
      path: { progress: played("warmup", "1.1"), savedDaysAgo: 3 },
    });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["dated: 7 days to your Security+ exam"]);
    const countdown = monday.emails[0];
    expect(countdown.text).toContain("You're 2 of 10 stops into your Security+ path.");
    expect(countdown.html).toContain(encodeURIComponent("utm_campaign=countdown"));
    expect(countdown.html).not.toContain("/dashboard");

    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual(["dated: Next on your Security+ path: Security concepts"]);
  });

  it("keeps the toolkit countdown for Pro", async () => {
    account("pro", { pro: true, examDate: "2026-11-10" });
    const tuesday = await run(TUESDAY);
    expect(tuesday.sent).toEqual(["pro: 7 days to your CompTIA Security+ exam"]);
    expect(tuesday.emails[0].html).toContain("https://certbench.dev/dashboard");
  });

  it("sends nothing to the unsubscribed, the checkpoint-reached, or the recently active", async () => {
    account("quiet", { unsubscribed: true, path: { progress: played("warmup"), savedDaysAgo: 3 } });
    account("reached", {
      path: { progress: played("warmup", "1.1", "1.2", "1.3", "1.4", "checkpoint"), savedDaysAgo: 3 },
    });
    account("active", { path: { progress: played("warmup", "1.1"), savedDaysAgo: 1 } });
    account("gone", { path: { progress: played("warmup", "1.1"), savedDaysAgo: 9 } });

    const monday = await run(MONDAY);
    expect(monday.sent).toEqual([]);
    expect(monday.result).toMatchObject({ users: 4, pathNudges: 0, digests: 0, dailyReminders: 0 });
  });

  it("nudges toward the checkpoint itself when it's the next stop", async () => {
    account("close", { path: { progress: played("warmup", "1.1", "1.2", "1.3", "1.4"), savedDaysAgo: 2.5 } });
    const monday = await run(MONDAY);
    expect(monday.sent).toEqual(["close: Your Security+ readiness checkpoint is next"]);
  });
});
