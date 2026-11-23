import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

const captureLead = vi.hoisted(() => vi.fn());
const allowed = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/server/auth", () => ({
  getOptionalUser: async () => ({ db: {}, user: null }),
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: allowed } }));
vi.mock("@/server/services/tool-leads", () => ({ captureLead }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "../route";

const post = (body: unknown) =>
  POST(
    new NextRequest("https://certbench.dev/api/tools/lead", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7" },
    })
  );

beforeEach(() => {
  captureLead.mockReset();
  captureLead.mockResolvedValue("sent");
  allowed.mockReset();
  allowed.mockResolvedValue(true);
});

describe("POST /api/tools/lead", () => {
  // The form used to say "your study plan is on its way" whatever happened.
  it.each(["sent", "skipped", "failed", "test"] as const)("tells the form that the email was %s", async (delivery) => {
    captureLead.mockResolvedValue(delivery);

    const res = await post({ email: "sam@example.com", source: "port-numbers-quiz", context: { answered: 20 } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, delivery });
    expect(captureLead).toHaveBeenCalledExactlyOnceWith("sam@example.com", "port-numbers-quiz", { answered: 20 });
  });

  it("passes an empty context when the tool sends none", async () => {
    await post({ email: "sam@example.com", source: "subnetting-practice" });
    expect(captureLead).toHaveBeenCalledExactlyOnceWith("sam@example.com", "subnetting-practice", {});
  });

  it("turns away a context that is too large before anything is stored", async () => {
    const context = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, "x"]));
    const res = await post({ email: "sam@example.com", source: "port-numbers-quiz", context });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");

    const long = await post({ email: "sam@example.com", source: "port-numbers-quiz", context: { note: "x".repeat(65) } });
    expect(long.status).toBe(400);
    expect(captureLead).not.toHaveBeenCalled();
  });

  it("limits each visitor to five requests an hour", async () => {
    allowed.mockResolvedValue(false);
    const res = await post({ email: "sam@example.com", source: "port-numbers-quiz" });
    expect(res.status).toBe(429);
    expect(allowed).toHaveBeenCalledWith("/api/tools/lead:203.0.113.7", { limit: 5, windowSeconds: 3600 });
    expect(captureLead).not.toHaveBeenCalled();
  });
});
