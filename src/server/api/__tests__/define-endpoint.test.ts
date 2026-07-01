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
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

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
