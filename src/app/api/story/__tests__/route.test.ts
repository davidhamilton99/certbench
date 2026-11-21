import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";
});

const insert = vi.hoisted(() => vi.fn(async () => {}));
const capture = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/server/auth", () => ({
  getOptionalUser: async () => ({ db: {}, user: null }),
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: async () => true } }));
vi.mock("@/server/data/testimonials", () => ({ insertTestimonial: insert }));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: () => ({ admin: true }) }));
vi.mock("@/server/analytics", () => ({ captureServerEvent: capture }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "../route";
import { signStoryToken } from "@/server/story/story-token";

const post = (body: unknown) =>
  POST(
    new NextRequest("https://certbench.dev/api/story", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );

beforeEach(() => {
  insert.mockClear();
  capture.mockClear();
});

describe("POST /api/story", () => {
  it("saves a pass story as the person the email went to, for moderation", async () => {
    const res = await post({
      token: signStoryToken("user-1", "cert-1"),
      passed: true,
      quote: "The checkpoint told me exactly what to fix.",
      displayName: "Sam K.",
    });
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({ admin: true }, "user-1", {
      certId: "cert-1",
      passed: true,
      quote: "The checkpoint told me exactly what to fix.",
      displayName: "Sam K.",
    });
    expect(capture).toHaveBeenCalledWith("user-1", "story_submitted", { passed: true, with_story: true });
  });

  it("turns away a forged or expired link", async () => {
    const res = await post({ token: "forged.token-value", passed: true, quote: "A long enough story here.", displayName: "X" });
    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it("asks a pass for a sentence or two", async () => {
    const res = await post({ token: signStoryToken("user-1", "cert-1"), passed: true, quote: "ok", displayName: "Sam K." });
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("counts a miss with nothing written without storing it", async () => {
    const res = await post({ token: signStoryToken("user-1", "cert-1"), passed: false, quote: "", displayName: "Sam K." });
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(capture).toHaveBeenCalledWith("user-1", "story_submitted", { passed: false, with_story: false });
  });
});
