import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The real env module, so the secret check under test is the one in production.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

const run = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/lifecycle-email", () => ({ runLifecycleEmails: run }));
const capture = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/server/analytics", () => ({ captureServerEvent: capture }));
const report = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/server/api/report-error", () => ({ reportServerError: report }));

/** This handler, as an error report names it. */
const PLACE = { route: "/api/cron/lifecycle", method: "GET", kind: "route" };

import { GET } from "@/app/api/cron/lifecycle/route";

const call = (authorization?: string) =>
  GET(
    new NextRequest("https://certbench.dev/api/cron/lifecycle", {
      headers: authorization === undefined ? {} : { authorization },
    })
  );

/** The names of the events recorded, in order. */
const events = () => (capture.mock.calls as unknown[][]).map((args) => args[1]);

beforeEach(() => {
  run.mockReset();
  capture.mockClear();
  report.mockClear();
  vi.unstubAllEnvs();
});

describe("the daily lifecycle cron", () => {
  it("runs with the Bearer token Vercel sends from CRON_SECRET, and answers with the counts", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    run.mockResolvedValue({ users: 2, failed: 0, countdowns: 1, postExam: 0, pathNudges: 1, pathOffers: 0 });

    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ users: 2, failed: 0, countdowns: 1, pathNudges: 1 });
    expect(run).toHaveBeenCalledOnce();
    expect(report).not.toHaveBeenCalled();
    // The run's numbers land in PostHog, on the job rather than a person.
    expect(capture).toHaveBeenCalledWith(
      "system:lifecycle-cron",
      "lifecycle_run",
      expect.objectContaining({ users: 2, countdowns: 1, pathNudges: 1 })
    );
  });

  // A run that the platform ends at its time limit reports nothing afterwards.
  // The start is recorded first, so that such a run shows as a start without an end.
  it("records the start before the run, and the end after it", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const order: string[] = [];
    capture.mockImplementation(async (...args: unknown[]) => {
      order.push(String(args[1]));
    });
    run.mockImplementation(async () => {
      order.push("run");
      return { users: 0 };
    });

    await call("Bearer s3cret");
    capture.mockImplementation(async () => {});
    expect(order).toEqual(["lifecycle_run_started", "run", "lifecycle_run"]);
    expect(capture).toHaveBeenNthCalledWith(1, "system:lifecycle-cron", "lifecycle_run_started");
  });

  it("says in the run's event when the run stopped before it reached every account", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    run.mockResolvedValue({ users: 900, pages: 1, stoppedEarly: true });

    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stoppedEarly: true });
    expect(capture).toHaveBeenCalledWith(
      "system:lifecycle-cron",
      "lifecycle_run",
      expect.objectContaining({ users: 900, pages: 1, stoppedEarly: true })
    );
  });

  // A revoked key or a sending domain that is not verified: every send of the
  // day refused, and the run used to be recorded as a success (200, no
  // server_error), so neither alert would notice.
  it("answers 500 and reports a server error when the mail service refused every email of the run", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockResolvedValue({ users: 3, failed: 0, countdowns: 0, postExam: 0, pathNudges: 0, pathOffers: 0, sendFailures: 3 });

    const res = await call("Bearer s3cret");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: "Lifecycle run failed" } });
    // The numbers are recorded, then the failure.
    expect(events()).toEqual(["lifecycle_run_started", "lifecycle_run", "lifecycle_run_failed"]);
    expect(capture).toHaveBeenCalledWith("system:lifecycle-cron", "lifecycle_run", expect.objectContaining({ sendFailures: 3 }));
    expect(capture).toHaveBeenCalledWith("system:lifecycle-cron", "lifecycle_run_failed", {
      message: "The mail service refused every email of the run (3 refused)",
    });
    expect(report).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: "The mail service refused every email of the run (3 refused)" }),
      PLACE
    );
    consoleError.mockRestore();
  });

  it("answers 200 when some emails went and some were refused, and when there was nothing to send", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    for (const counts of [
      { countdowns: 1, postExam: 0, pathNudges: 0, pathOffers: 0, sendFailures: 2 },
      { countdowns: 0, postExam: 0, pathNudges: 0, pathOffers: 0, sendFailures: 0 },
    ]) {
      run.mockResolvedValue({ users: 3, failed: 0, ...counts });
      const res = await call("Bearer s3cret");
      expect(res.status).toBe(200);
    }
    expect(report).not.toHaveBeenCalled();
    expect(events()).not.toContain("lifecycle_run_failed");
  });

  it.each([undefined, "Bearer wrong", "s3cret", "Basic s3cret"])("turns away %s with a 401, and never runs", async (auth) => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const res = await call(auth);
    expect(res.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    // A call that is turned away is not a fault of the server.
    expect(report).not.toHaveBeenCalled();
  });

  // Production from July to November 2026: the secret was not set, the route
  // threw before anything ran, Vercel's daily call got an empty 500 and no
  // lifecycle email ever went out, with nothing recorded anywhere. The run
  // must still never start without the secret, and now the failure is
  // recorded: the log names the variable and PostHog has an event for the day.
  it.each([
    ["unset", undefined],
    ["empty", ""],
  ])("answers 500, records why, and never runs, when CRON_SECRET is %s", async (_, value) => {
    vi.stubEnv("CRON_SECRET", value);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    for (const auth of [undefined, "Bearer ", "Bearer undefined"]) {
      capture.mockClear();
      const res = await call(auth);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: { code: "internal", message: "Lifecycle run failed" } });
      expect(capture).toHaveBeenCalledExactlyOnceWith("system:lifecycle-cron", "lifecycle_run_failed", {
        message: "CRON_SECRET is not set",
      });
    }
    // Each of the three calls is also reported as a server error.
    expect(report).toHaveBeenCalledTimes(3);
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("CRON_SECRET") }),
      PLACE
    );
    expect(run).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "lifecycle cron failed:",
      expect.objectContaining({ message: expect.stringContaining("Missing required environment variable CRON_SECRET") })
    );
    consoleError.mockRestore();
  });

  it("answers 500 when the run itself fails", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockRejectedValue(new Error("listUsers failed: timeout"));

    const res = await call("Bearer s3cret");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: "Lifecycle run failed" } });
    expect(consoleError).toHaveBeenCalledWith("lifecycle cron failed:", expect.any(Error));
    expect(capture).toHaveBeenCalledWith("system:lifecycle-cron", "lifecycle_run_failed", {
      message: "listUsers failed: timeout",
    });
    // The start was recorded, then the failure: never a "lifecycle_run".
    expect(events()).toEqual(["lifecycle_run_started", "lifecycle_run_failed"]);
    expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: "listUsers failed: timeout" }), PLACE);
    consoleError.mockRestore();
  });

  // A deployment without the mail service's key: the run refuses to start (it
  // would record every email as failed), and the event names the variable.
  it("records a run that could not start because the mail service's key is missing", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockRejectedValue(
      new Error("Missing required environment variable RESEND_API_KEY: set it in .env.local (dev) or the Vercel environment.")
    );

    const res = await call("Bearer s3cret");
    expect(res.status).toBe(500);
    expect(capture).toHaveBeenCalledWith("system:lifecycle-cron", "lifecycle_run_failed", {
      message: expect.stringContaining("RESEND_API_KEY"),
    });
    consoleError.mockRestore();
  });
});
