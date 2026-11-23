import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The public story endpoint with the real data function behind it and a
 * database that refuses the insert. The endpoint used to answer with the
 * database's own text, which names a table and a policy, to anyone who sent a
 * request. (route.test.ts replaces the data function, so it cannot show this.)
 */

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";
});

const database = vi.hoisted(() => ({
  text: 'new row violates row-level security policy for table "testimonials"',
  code: "42501",
}));
const capture = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/server/auth", () => ({
  getOptionalUser: async () => ({ db: {}, user: null }),
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: async () => true } }));
vi.mock("@/server/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ insert: async () => ({ error: { message: database.text, code: database.code } }) }),
  }),
}));
vi.mock("@/server/analytics", () => ({ captureServerEvent: capture }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "../route";
import { signStoryToken } from "@/server/story/story-token";

describe("POST /api/story, when the database refuses the comment", () => {
  it("answers 500 with a sentence and none of the database's own words, which go to the server log", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(
      new NextRequest("https://certbench.dev/api/story", {
        method: "POST",
        body: JSON.stringify({
          token: signStoryToken("user-1", "cert-1"),
          passed: true,
          quote: "The checkpoint told me exactly what to fix.",
          displayName: "Sam K.",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({
      error: { code: "internal", message: "The comment could not be saved. Please try again." },
    });
    expect(body).not.toContain("row-level");
    expect(body).not.toContain("testimonials");
    expect(consoleError).toHaveBeenCalledWith(`[testimonials] the insert of a testimonial failed (42501): ${database.text}`);
    // Nothing was stored, so nothing is recorded as submitted.
    expect(capture).not.toHaveBeenCalledWith("user-1", "story_submitted", expect.anything());
    consoleError.mockRestore();
  });
});
