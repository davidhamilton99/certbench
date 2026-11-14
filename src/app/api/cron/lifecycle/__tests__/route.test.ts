import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The real env module, so the secret check under test is the one in production.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

const run = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/lifecycle-email", () => ({ runLifecycleEmails: run }));

import { GET } from "@/app/api/cron/lifecycle/route";

const call = (authorization?: string) =>
  GET(
    new NextRequest("https://certbench.dev/api/cron/lifecycle", {
      headers: authorization === undefined ? {} : { authorization },
    })
  );

beforeEach(() => {
  run.mockReset();
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
  });

  it.each([undefined, "Bearer wrong", "s3cret", "Basic s3cret"])("turns away %s with a 401, and never runs", async (auth) => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const res = await call(auth);
    expect(res.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  // Production from July to November 2026: Vercel's daily call got a 500 and
  // no lifecycle email ever went out. The throw names the variable in the
  // function's log; the run must never start without the secret.
  it.each([
    ["unset", undefined],
    ["empty", ""],
  ])("fails naming the variable, and never runs, when CRON_SECRET is %s", async (_, value) => {
    vi.stubEnv("CRON_SECRET", value);
    for (const auth of [undefined, "Bearer ", "Bearer undefined"]) {
      await expect(call(auth)).rejects.toThrow("Missing required environment variable CRON_SECRET");
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("answers 500 when the run itself fails", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockRejectedValue(new Error("listUsers failed: timeout"));

    const res = await call("Bearer s3cret");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: "Lifecycle run failed" } });
    expect(consoleError).toHaveBeenCalledWith("lifecycle cron failed:", expect.any(Error));
    consoleError.mockRestore();
  });
});
