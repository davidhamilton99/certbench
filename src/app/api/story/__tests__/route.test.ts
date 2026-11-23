import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";
});

const insert = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}));
const replace = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true));
const capture = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/server/auth", () => ({
  getOptionalUser: async () => ({ db: {}, user: null }),
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: async () => true } }));
vi.mock("@/server/data/testimonials", () => ({ insertTestimonial: insert, replaceWithPassStory: replace }));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: () => ({ admin: true }) }));
vi.mock("@/server/analytics", () => ({ captureServerEvent: capture }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "../route";
import { ApiError } from "@/contracts/common";
import { signStoryToken } from "@/server/story/story-token";

/** What insertTestimonial throws when the account already has a row for the exam. */
const ALREADY = new ApiError("conflict", "You have already shared a story for this exam.");

const post = (body: unknown) =>
  POST(
    new NextRequest("https://certbench.dev/api/story", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );

beforeEach(() => {
  insert.mockReset();
  insert.mockImplementation(async () => {});
  replace.mockReset();
  replace.mockImplementation(async () => true);
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

  // Such a signature used to make the comparison throw, and the endpoint answered 500.
  it("turns away a signature of the right length with a character outside ASCII, as it does any forged link", async () => {
    const [body, sig] = signStoryToken("user-1", "cert-1").split(".");
    const token = `${body}.${sig.slice(0, -1)}${String.fromCharCode(0xe9)}`;
    const res = await post({ token, passed: true, quote: "A long enough story here.", displayName: "X" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: "unauthorized", message: "This link has expired." } });
    expect(insert).not.toHaveBeenCalled();
  });

  it("asks a pass for a sentence or two", async () => {
    const res = await post({ token: signStoryToken("user-1", "cert-1"), passed: true, quote: "ok", displayName: "Sam K." });
    expect(res.status).toBe(400);
    // The sentence the form shows: the same words as the form's own hint.
    expect(await res.json()).toEqual({
      error: { code: "validation_failed", message: "Please write at least 10 characters." },
    });
    expect(insert).not.toHaveBeenCalled();
  });

  // A "did not pass" comment took the account's one row for the exam. The pass
  // story sent later met the unique index, the route answered conflict, and the
  // form thanked the person for a story that was never stored.
  it("stores a pass story in place of the account's earlier comment for the exam", async () => {
    insert.mockRejectedValueOnce(ALREADY);
    const res = await post({
      token: signStoryToken("user-1", "cert-1"),
      passed: true,
      quote: "I passed on my second attempt.",
      displayName: "Sam K.",
    });
    expect(res.status).toBe(200);
    expect(replace).toHaveBeenCalledExactlyOnceWith({ admin: true }, "user-1", {
      certId: "cert-1",
      quote: "I passed on my second attempt.",
      displayName: "Sam K.",
    });
    expect(capture).toHaveBeenCalledWith("user-1", "story_submitted", { passed: true, with_story: true });
  });

  it("keeps the conflict when the earlier row is a pass story that was already reviewed", async () => {
    insert.mockRejectedValueOnce(ALREADY);
    replace.mockResolvedValueOnce(false);
    const res = await post({
      token: signStoryToken("user-1", "cert-1"),
      passed: true,
      quote: "A second story about the same exam.",
      displayName: "Sam K.",
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "conflict", message: "You have already shared a story for this exam." } });
    expect(capture).not.toHaveBeenCalled();
  });

  it("never lets a did not pass comment take the place of an earlier row", async () => {
    insert.mockRejectedValueOnce(ALREADY);
    const res = await post({
      token: signStoryToken("user-1", "cert-1"),
      passed: false,
      quote: "Subnetting was the hard part.",
      displayName: "Sam K.",
    });
    expect(res.status).toBe(409);
    expect(replace).not.toHaveBeenCalled();
  });

  it("counts a miss with nothing written without storing it", async () => {
    const res = await post({ token: signStoryToken("user-1", "cert-1"), passed: false, quote: "", displayName: "Sam K." });
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(capture).toHaveBeenCalledWith("user-1", "story_submitted", { passed: false, with_story: false });
  });
});
