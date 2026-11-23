import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { ApiError } from "@/contracts/common";

const mockUser = { id: "user-1" } as User;
const mockDb = {} as never;

const auth = {
  getOptionalUser: vi.fn(),
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
};
const rateLimiter = { check: vi.fn() };
/** The owner's report of a fault, and the work left for after the response. */
const report = vi.hoisted(() => ({
  reportServerError: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  later: [] as (() => unknown)[],
}));

vi.mock("@/server/auth", () => ({
  getOptionalUser: (...a: unknown[]) => auth.getOptionalUser(...a),
  requireUser: (...a: unknown[]) => auth.requireUser(...a),
  requireAdmin: (...a: unknown[]) => auth.requireAdmin(...a),
  requirePro: (...a: unknown[]) => auth.requirePro(...a),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimiter: {
    check: (...a: unknown[]) => rateLimiter.check(...a),
  },
}));
vi.mock("@/server/api/report-error", () => ({ reportServerError: report.reportServerError }));
vi.mock("@/server/api/after-response", () => ({
  afterResponse: (work: () => unknown) => {
    report.later.push(work);
  },
}));

import { defineEndpoint } from "../define-endpoint";

const echoContract = {
  path: "/api/test/echo",
  method: "POST",
  input: z.object({ value: z.number().int().min(0) }),
  output: z.object({ doubled: z.number() }),
} as const;

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test/echo", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  report.later = [];
  auth.requireUser.mockResolvedValue({ db: mockDb, user: mockUser });
  auth.getOptionalUser.mockResolvedValue({ db: mockDb, user: null });
  rateLimiter.check.mockResolvedValue(true);
});

describe("defineEndpoint", () => {
  it("runs the full pipeline and returns handler output as JSON", async () => {
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async ({ input, user }) => {
        expect(user).toBe(mockUser);
        return { doubled: input.value * 2 };
      },
    });

    const res = await route(post({ value: 21 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ doubled: 42 });
  });

  it("rejects unauthenticated requests with the uniform envelope", async () => {
    auth.requireUser.mockRejectedValue(new ApiError("unauthorized"));
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async () => ({ doubled: 0 }),
    });

    const res = await route(post({ value: 1 }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "unauthorized", message: "unauthorized" },
    });
  });

  it("rejects malformed input with 400 before reaching the handler", async () => {
    const handler = vi.fn();
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler,
    });

    const res = await route(post({ value: -5 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 429 when the rate limiter denies, keyed by user id", async () => {
    rateLimiter.check.mockResolvedValue(false);
    const route = defineEndpoint(echoContract, {
      auth: "user",
      rateLimit: { limit: 5, windowSeconds: 60 },
      handler: async () => ({ doubled: 0 }),
    });

    const res = await route(post({ value: 1 }));
    expect(res.status).toBe(429);
    expect(rateLimiter.check).toHaveBeenCalledWith("/api/test/echo:user-1", {
      limit: 5,
      windowSeconds: 60,
    });
  });

  it("skips the rate limiter when not configured", async () => {
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async () => ({ doubled: 0 }),
    });
    await route(post({ value: 1 }));
    expect(rateLimiter.check).not.toHaveBeenCalled();
  });

  it("maps thrown ApiErrors from the handler to their status codes", async () => {
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async () => {
        throw new ApiError("quota_exceeded", "Monthly limit reached");
      },
    });

    const res = await route(post({ value: 1 }));
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({
      error: { code: "quota_exceeded", message: "Monthly limit reached" },
    });
  });

  it("masks unexpected errors as internal without leaking details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async () => {
        throw new Error("connection string leaked!");
      },
    });

    const res = await route(post({ value: 1 }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("internal");
    expect(body.error.message).not.toContain("connection string");
    consoleError.mockRestore();
  });

  it("reports an unexpected error to the owner, after the response and not before", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const fault = new Error("connection string leaked!");
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async () => {
        throw fault;
      },
    });

    const res = await route(post({ value: 1 }));
    expect(res.status).toBe(500);
    // Nothing is sent while the visitor waits.
    expect(report.reportServerError).not.toHaveBeenCalled();
    expect(report.later).toHaveLength(1);

    await report.later[0]();
    expect(report.reportServerError).toHaveBeenCalledTimes(1);
    expect(report.reportServerError).toHaveBeenCalledWith(fault, {
      route: "/api/test/echo",
      path: "/api/test/echo",
      method: "POST",
      kind: "route",
    });
    consoleError.mockRestore();
  });

  // Many data functions throw the database's own text inside an internal
  // ApiError. That text names tables, columns and policies: it is logged and
  // reported, and the caller reads a sentence that says nothing of them.
  it.each([
    'new row violates row-level security policy for table "user_subscriptions"',
    "permission denied for table profiles",
    'duplicate key value violates unique constraint "user_enrollments_pkey"',
    "canceling statement due to statement timeout",
    "TypeError: fetch failed",
    "The operation was aborted due to timeout",
    "Something went wrong",
    // A database's text that happens to end with a full stop is still not for the caller.
    'relation "profiles" does not exist.',
    "Could not find the table public.user_subscriptions in the schema cache.",
    "Malformed options JSON on question 4f0c.",
  ])("answers an internal ApiError that carries %s with a sentence of its own", async (text) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const fault = new ApiError("internal", text);
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async () => {
        throw fault;
      },
    });

    const res = await route(post({ value: 1 }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "internal", message: "The request could not be completed. Please try again." },
    });
    // The fault itself is still logged and reported.
    expect(consoleError).toHaveBeenCalledWith("[POST /api/test/echo]", fault);
    consoleError.mockRestore();
  });

  // The sentences the product itself throws with an internal error must all
  // still reach the caller.
  it.each([
    "Your account could not be checked. Please try again.",
    "Your answers could not be recorded. Please try again.",
    "The payment page could not be opened. Please try again.",
    "The billing page could not be opened. Please try again.",
    "The comment could not be saved. Please try again.",
    "The testimonials could not be read. Please try again.",
  ])("keeps the product's own sentence: %s", async (sentence) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async () => {
        throw new ApiError("internal", sentence);
      },
    });
    const res = await route(post({ value: 1 }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toBe(sentence);
    consoleError.mockRestore();
  });

  it("reports a fault that was thrown as an internal ApiError, and still answers with its sentence", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const fault = new ApiError("internal", "Your account could not be checked. Please try again.");
    auth.requireUser.mockRejectedValue(fault);
    const route = defineEndpoint(echoContract, {
      auth: "user",
      handler: async () => ({ doubled: 0 }),
    });

    const res = await route(post({ value: 1 }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "internal", message: "Your account could not be checked. Please try again." },
    });
    expect(consoleError).toHaveBeenCalledWith("[POST /api/test/echo]", fault);
    expect(report.later).toHaveLength(1);
    await report.later[0]();
    expect(report.reportServerError).toHaveBeenCalledWith(fault, expect.objectContaining({ route: "/api/test/echo" }));
    consoleError.mockRestore();
  });

  it("does not report a refusal: it is an answer, not a fault", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const refusals = [
      new ApiError("unauthorized"),
      new ApiError("forbidden", "Pro subscription required"),
      new ApiError("not_found", "That exam is not available."),
      new ApiError("quota_exceeded", "The hands-on labs on your study path are included with Pro."),
      new ApiError("conflict"),
    ];
    for (const refusal of refusals) {
      const route = defineEndpoint(echoContract, {
        auth: "user",
        handler: async () => {
          throw refusal;
        },
      });
      const res = await route(post({ value: 1 }));
      expect(res.status).toBe(refusal.status);
    }
    // Bad input and a rate limit are refusals as well.
    await defineEndpoint(echoContract, { auth: "user", handler: async () => ({ doubled: 0 }) })(post({ value: -5 }));
    rateLimiter.check.mockResolvedValue(false);
    await defineEndpoint(echoContract, {
      auth: "user",
      rateLimit: { limit: 5, windowSeconds: 60 },
      handler: async () => ({ doubled: 0 }),
    })(post({ value: 1 }));

    expect(report.later).toHaveLength(0);
    expect(report.reportServerError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("parses GET input from query params", async () => {
    const getContract = {
      path: "/api/test/get",
      method: "GET",
      input: z.object({ q: z.string() }),
      output: z.object({ echo: z.string() }),
    } as const;

    const route = defineEndpoint(getContract, {
      auth: "public",
      handler: async ({ input }) => ({ echo: input.q }),
    });

    const res = await route(
      new NextRequest("http://localhost/api/test/get?q=hello")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ echo: "hello" });
  });

  it("public endpoints rate-limit anonymous callers by forwarded IP", async () => {
    const route = defineEndpoint(echoContract, {
      auth: "public",
      rateLimit: { limit: 5, windowSeconds: 60 },
      handler: async () => ({ doubled: 0 }),
    });

    const req = new NextRequest("http://localhost/api/test/echo", {
      method: "POST",
      body: JSON.stringify({ value: 1 }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      },
    });
    await route(req);
    expect(rateLimiter.check).toHaveBeenCalledWith(
      "/api/test/echo:203.0.113.7",
      { limit: 5, windowSeconds: 60 }
    );
  });
});
