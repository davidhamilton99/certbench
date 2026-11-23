import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

const SESSION_DB = vi.hoisted(() => ({ client: "the member's own session" }));
const SERVICE_DB = vi.hoisted(() => ({ client: "service role" }));

const insert = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}));
const replace = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true));
const createAdminClient = vi.hoisted(() => vi.fn(() => SERVICE_DB));

vi.mock("@/server/auth", () => ({
  getOptionalUser: vi.fn(),
  requireUser: async () => ({ db: SESSION_DB, user: { id: "user-1" } }),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: async () => true } }));
vi.mock("@/server/data/testimonials", () => ({ insertTestimonial: insert, replaceWithPassStory: replace }));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { ApiError } from "@/contracts/common";
import { POST } from "../route";

const CERT = "9b2f6c1e-3a4d-4e9b-8c55-0d1e2f3a4b5c";
const ALREADY = new ApiError("conflict", "You have already shared a story for this exam.");

const post = (body: unknown) =>
  POST(
    new NextRequest("https://certbench.dev/api/testimonials", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );

const story = { certId: CERT, passed: true, quote: "I passed on my second attempt.", displayName: "Sam K." };

beforeEach(() => {
  insert.mockReset();
  insert.mockImplementation(async () => {});
  replace.mockReset();
  replace.mockImplementation(async () => true);
  createAdminClient.mockClear();
});

describe("POST /api/testimonials", () => {
  it("stores the story with the member's own session", async () => {
    const res = await post(story);
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledExactlyOnceWith(SESSION_DB, "user-1", story);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  // The same fault as on the post-exam link: a "did not pass" comment took the
  // account's one row for the exam, and the pass story sent later was refused.
  it("stores a pass story in place of the member's earlier comment for the exam, with the service client", async () => {
    insert.mockRejectedValueOnce(ALREADY);
    const res = await post(story);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ submitted: true });
    expect(replace).toHaveBeenCalledExactlyOnceWith(SERVICE_DB, "user-1", {
      certId: CERT,
      quote: "I passed on my second attempt.",
      displayName: "Sam K.",
    });
  });

  it("keeps the conflict when the earlier row is a pass story that was already reviewed", async () => {
    insert.mockRejectedValueOnce(ALREADY);
    replace.mockResolvedValueOnce(false);
    const res = await post(story);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "conflict", message: "You have already shared a story for this exam." } });
  });

  it("never lets a did not pass comment take the place of an earlier row", async () => {
    insert.mockRejectedValueOnce(ALREADY);
    const res = await post({ ...story, passed: false, quote: "Subnetting was the hard part." });
    expect(res.status).toBe(409);
    expect(replace).not.toHaveBeenCalled();
  });
});
