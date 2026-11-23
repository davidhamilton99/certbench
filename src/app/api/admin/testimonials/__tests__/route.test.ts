import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

const SESSION_DB = vi.hoisted(() => ({ client: "the admin's own session" }));
const SERVICE_DB = vi.hoisted(() => ({ client: "service role" }));

const requireAdmin = vi.hoisted(() => vi.fn());
const setTestimonialStatus = vi.hoisted(() => vi.fn());
const createAdminClient = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth", () => ({
  getOptionalUser: vi.fn(),
  requireUser: vi.fn(),
  requireAdmin,
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: async () => true } }));
vi.mock("@/server/data/testimonials", () => ({ setTestimonialStatus }));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { ApiError } from "@/contracts/common";
import { POST } from "../route";

const ID = "9b2f6c1e-3a4d-4e9b-8c55-0d1e2f3a4b5c";

const post = (body: unknown) =>
  POST(
    new NextRequest("https://certbench.dev/api/admin/testimonials", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );

beforeEach(() => {
  requireAdmin.mockReset();
  requireAdmin.mockResolvedValue({ db: SESSION_DB, user: { id: "owner" } });
  setTestimonialStatus.mockReset();
  setTestimonialStatus.mockResolvedValue(undefined);
  createAdminClient.mockReset();
  createAdminClient.mockReturnValue(SERVICE_DB);
  revalidatePath.mockReset();
});

describe("POST /api/admin/testimonials", () => {
  // The session's client has no update policy on the table (migration 022):
  // with it, an approval changed no row and was still answered as done.
  it("makes an admin's change with the service client, and rebuilds the home page", async () => {
    const res = await post({ id: ID, status: "approved" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ moderated: true });
    expect(setTestimonialStatus).toHaveBeenCalledExactlyOnceWith(SERVICE_DB, ID, "approved");
    // The home page prints approved testimonials: an approval shows at once.
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("rebuilds the home page when a testimonial is hidden as well", async () => {
    const res = await post({ id: ID, status: "hidden" });
    expect(res.status).toBe(200);
    expect(setTestimonialStatus).toHaveBeenCalledExactlyOnceWith(SERVICE_DB, ID, "hidden");
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("turns away anyone who is not an admin before the service client is created", async () => {
    requireAdmin.mockRejectedValue(new ApiError("forbidden"));
    const res = await post({ id: ID, status: "approved" });
    expect(res.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(setTestimonialStatus).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("says so when no testimonial was changed, and does not rebuild the home page", async () => {
    setTestimonialStatus.mockRejectedValue(
      new ApiError("not_found", "This testimonial could not be found, so nothing was changed.")
    );
    const res = await post({ id: ID, status: "approved" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "not_found", message: "This testimonial could not be found, so nothing was changed." },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers 409 with the sentence when asked to approve a comment from someone who did not pass", async () => {
    const sentence = "This comment is from someone who did not pass the exam, so it cannot be approved. It can be hidden.";
    setTestimonialStatus.mockRejectedValue(new ApiError("conflict", sentence));
    const res = await post({ id: ID, status: "approved" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "conflict", message: sentence } });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["a status that is not a moderation decision", { id: ID, status: "pending" }],
    ["an id that is not a UUID", { id: "abc", status: "approved" }],
  ])("refuses %s", async (_, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(setTestimonialStatus).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
