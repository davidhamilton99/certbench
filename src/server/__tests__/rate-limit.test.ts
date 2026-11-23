import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({
  /** Set to stand for a deployment whose service role key is missing: the client cannot be built. */
  missingKey: false,
  rpc: vi.fn(),
}));

const reports = vi.hoisted(() => ({
  /** The report of a fault as a `server_error`. */
  send: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  /** Work the limiter left for after the response. A test runs it when it wants the report sent. */
  afterTasks: [] as (() => unknown)[],
}));

vi.mock("@/server/supabase/admin", () => ({
  createAdminClient: () => {
    if (admin.missingKey) throw new Error("Missing required environment variable SUPABASE_SERVICE_ROLE_KEY");
    return { rpc: admin.rpc };
  },
}));
vi.mock("@/server/api/report-error", () => ({ reportServerError: reports.send }));
vi.mock("@/server/api/after-response", () => ({
  afterResponse: (work: () => unknown) => {
    reports.afterTasks.push(work);
  },
}));

const options = { limit: 5, windowSeconds: 60 };

/** A fresh copy of the limiter, as a new server instance has. */
async function freshLimiter() {
  vi.resetModules();
  return (await import("../rate-limit")).rateLimiter;
}

/** Runs what the limiter left for after the response. */
const runAfterTasks = async () => {
  for (const task of reports.afterTasks.splice(0)) await task();
};

beforeEach(() => {
  admin.missingKey = false;
  admin.rpc.mockReset();
  reports.send.mockClear();
  reports.afterTasks = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("rateLimiter", () => {
  it("asks the database, and allows or refuses as it answers", async () => {
    const rateLimiter = await freshLimiter();
    admin.rpc.mockResolvedValue({ data: true, error: null });
    expect(await rateLimiter.check("/api/health:203.0.113.7", options)).toBe(true);
    expect(admin.rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "/api/health:203.0.113.7",
      p_limit: 5,
      p_window_seconds: 60,
    });

    admin.rpc.mockResolvedValue({ data: false, error: null });
    expect(await rateLimiter.check("/api/health:203.0.113.7", options)).toBe(false);
  });

  it("allows the request when its own database call fails, and says so in the log", async () => {
    const rateLimiter = await freshLimiter();
    admin.rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    expect(await rateLimiter.check("key", options)).toBe(true);
    expect(console.error).toHaveBeenCalledWith("rate limiter error:", "connection refused");
  });

  it("allows the request when the call throws", async () => {
    const rateLimiter = await freshLimiter();
    admin.rpc.mockRejectedValue(new Error("socket hang up"));
    expect(await rateLimiter.check("key", options)).toBe(true);
    expect(console.error).toHaveBeenCalledWith("rate limiter error:", "socket hang up");
  });

  it("allows the request when the service role key is missing, instead of failing every endpoint", async () => {
    const rateLimiter = await freshLimiter();
    admin.missingKey = true;
    expect(await rateLimiter.check("key", options)).toBe(true);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "rate limiter error: requests are not being limited.",
      "Missing required environment variable SUPABASE_SERVICE_ROLE_KEY"
    );
  });

  it("says that the key is missing once for a server instance, not once for each request", async () => {
    const rateLimiter = await freshLimiter();
    admin.missingKey = true;
    for (let i = 0; i < 5; i++) expect(await rateLimiter.check(`key-${i}`, options)).toBe(true);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

// An endpoint without its limit looks the same from outside as one with it.
// Until November 2026 a limiter that let requests through left a line in the
// log and nothing else.
describe("rateLimiter: a request that was let through unlimited is reported", () => {
  /** A key as the endpoints build it: the path and the account's id. */
  const KEY = "/api/stripe/checkout:6f1c2d3e-0000-4000-8000-000000000001";
  const PLACE = { route: "service:rate-limit", kind: "service" };

  /** The one report that was sent: the fault and the place. */
  const sent = () => {
    expect(reports.send).toHaveBeenCalledOnce();
    return reports.send.mock.calls[0] as [Error, unknown];
  };

  it("reports a database call that answered with an error, once the response has gone", async () => {
    const rateLimiter = await freshLimiter();
    admin.rpc.mockResolvedValue({
      data: null,
      error: { message: `duplicate key value violates unique constraint: Key (key)=(${KEY}) already exists.` },
    });

    expect(await rateLimiter.check(KEY, options)).toBe(true);
    // The request has its answer and nothing has been sent yet.
    expect(reports.send).not.toHaveBeenCalled();
    expect(reports.afterTasks).toHaveLength(1);

    await runAfterTasks();
    const [fault, place] = sent();
    expect(place).toEqual(PLACE);
    expect(fault).toBeInstanceOf(Error);
    expect(fault.message).toBe("The rate limiter let a request through: its database call answered with an error.");
    // Neither the key, which holds an account's id or an address, nor the database's own words.
    expect(fault.cause).toBeUndefined();
    expect(JSON.stringify([fault.message, place])).not.toContain("6f1c2d3e");
  });

  it("reports a database call that failed", async () => {
    const rateLimiter = await freshLimiter();
    admin.rpc.mockRejectedValue(new Error(`socket hang up while counting ${KEY}`));

    expect(await rateLimiter.check(KEY, options)).toBe(true);
    await runAfterTasks();
    const [fault, place] = sent();
    expect(place).toEqual(PLACE);
    expect(fault.message).toBe("The rate limiter let a request through: its database call failed.");
    expect(fault.cause).toBeUndefined();
  });

  it("reports a missing service role key once for a server instance", async () => {
    const rateLimiter = await freshLimiter();
    admin.missingKey = true;

    for (let i = 0; i < 5; i++) expect(await rateLimiter.check(`${KEY}-${i}`, options)).toBe(true);
    await runAfterTasks();
    const [fault, place] = sent();
    expect(place).toEqual(PLACE);
    expect(fault.message).toBe("The rate limiter let a request through: its database client could not be built.");
  });

  // A limiter that is down fails for every request. One report says so; the
  // rule is at most one report for one request, and never one for each.
  it("sends one report a minute for a server instance, however many requests fail", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T12:00:00Z"));
    const rateLimiter = await freshLimiter();
    admin.rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });

    for (let i = 0; i < 3; i++) expect(await rateLimiter.check(KEY, options)).toBe(true);
    expect(reports.afterTasks).toHaveLength(1);
    // Every failure is still written to the log.
    expect(console.error).toHaveBeenCalledTimes(3);

    vi.setSystemTime(new Date("2026-11-22T12:00:59.999Z"));
    await rateLimiter.check(KEY, options);
    expect(reports.afterTasks).toHaveLength(1);

    vi.setSystemTime(new Date("2026-11-22T12:01:00Z"));
    await rateLimiter.check(KEY, options);
    expect(reports.afterTasks).toHaveLength(2);
  });

  it("reports nothing when the limiter answers, whether it allows or refuses", async () => {
    const rateLimiter = await freshLimiter();
    admin.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });

    expect(await rateLimiter.check(KEY, options)).toBe(true);
    expect(await rateLimiter.check(KEY, options)).toBe(false);
    expect(reports.afterTasks).toEqual([]);
  });
});

/**
 * Migration 032 (supabase/migrations/032_rate_limit_execute.sql) leaves the
 * right to call check_rate_limit to the service role alone. Once the owner
 * has run it, the database refuses the call from any other client. The limiter
 * lets a request through when its call fails, so a call made with another
 * client would then limit nothing, and only the log and a report would say so.
 * These tests keep the migration and the code in step.
 */
describe("migration 032: who may call check_rate_limit", () => {
  const ROOT = process.cwd();
  const MIGRATION = "supabase/migrations/032_rate_limit_execute.sql";
  const LIMITER = "src/server/rate-limit.ts";
  const FUNCTION = "public.check_rate_limit(text, integer, integer)";

  /** The migration's statements, without its comments. */
  const statements = readFileSync(join(ROOT, MIGRATION), "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join(" ")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean);

  /** Every source file of the application, its tests left out. */
  function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(child);
      return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
    });
  }

  it("does exactly two things, in one transaction", () => {
    expect(statements).toEqual([
      "begin",
      `revoke execute on function ${FUNCTION} from public, anon, authenticated`,
      `grant execute on function ${FUNCTION} to service_role`,
      "commit",
    ]);
  });

  // If this fails, something else has begun to name the function. After the
  // migration only the service role may call it: go through rateLimiter, or
  // make the call with createAdminClient() and list the file here.
  it("is called by the limiter alone, with the service role", () => {
    const named = sources(join(ROOT, "src"))
      .filter((path) => readFileSync(path, "utf8").includes("check_rate_limit"))
      .map((path) => relative(ROOT, path).replace(/\\/g, "/"))
      .sort();
    // The generated database types list the function. Nothing else names it.
    expect(named).toEqual([LIMITER, "src/types/database.gen.ts"]);

    const limiter = readFileSync(join(ROOT, LIMITER), "utf8");
    // The one call, and the client it is made on.
    const clients = [...limiter.matchAll(/(\w+)\.rpc\(\s*"check_rate_limit"/g)].map((match) => match[1]);
    expect(clients).toEqual(["admin"]);
    expect(limiter).toContain('import { createAdminClient } from "@/server/supabase/admin";');
    expect(limiter).toContain("admin = createAdminClient();");
    // No client that acts for an account or for a visitor is built in this file.
    expect(limiter).not.toMatch(/\bcreate(?:Client|AnonClient|ServerClient|BrowserClient)\b/);
  });
});
