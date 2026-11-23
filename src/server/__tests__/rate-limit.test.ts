import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({
  /** Set to stand for a deployment whose service role key is missing: the client cannot be built. */
  missingKey: false,
  rpc: vi.fn(),
}));

vi.mock("@/server/supabase/admin", () => ({
  createAdminClient: () => {
    if (admin.missingKey) throw new Error("Missing required environment variable SUPABASE_SERVICE_ROLE_KEY");
    return { rpc: admin.rpc };
  },
}));

const options = { limit: 5, windowSeconds: 60 };

/** A fresh copy of the limiter, as a new server instance has. */
async function freshLimiter() {
  vi.resetModules();
  return (await import("../rate-limit")).rateLimiter;
}

beforeEach(() => {
  admin.missingKey = false;
  admin.rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
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
