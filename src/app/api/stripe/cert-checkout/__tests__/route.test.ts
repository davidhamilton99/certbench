import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/contracts/common";
import { userMessage } from "@/lib/errors/user-message";

type DbAnswer = { data?: unknown; error: { message: string } | null };

const CERT_ID = "5b1f6f0e-3c1a-4a59-9d55-0d2f6f0f8a11";
const OTHER_VERSION_ID = "9a0e4c62-7f1b-4f0a-8a46-2b7f1f4c1d22";
/** The exam the member's plan already covers, unless a test says otherwise. */
const PLAN_EXAM_ID = "3c2d1e0f-4a5b-4c6d-8e7f-90a1b2c3d4e5";

const h = vi.hoisted(() => ({
  /** Whether the signed-in account has Pro. */
  pro: true,
  limit: vi.fn(),
  cert: null as { id: string; name: string; examCode: string } | null,
  enrollments: [] as { certificationId: string }[],
  otherVersions: [] as string[],
  row: { data: null, error: null } as DbAnswer,
  save: { error: null } as DbAnswer,
  saved: [] as unknown[],
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn(), list: vi.fn(), expire: vi.fn() } },
  },
}));

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
  serverEnv: () => "secret",
}));
vi.mock("@/server/auth", async () => {
  const { ApiError } = await import("@/contracts/common");
  return {
    requirePro: async () => {
      if (!h.pro) throw new ApiError("forbidden", "Pro subscription required");
      return { db: {}, user: { id: "user-1", email: "member@example.com" } };
    },
    requireUser: vi.fn(),
    getOptionalUser: vi.fn(),
    requireAdmin: vi.fn(),
  };
});
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: h.limit } }));
vi.mock("@/server/analytics", () => ({ captureServerEvent: vi.fn(async () => {}) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/server/data/certifications", () => ({ getCertification: async () => h.cert }));
vi.mock("@/server/data/enrollments", () => ({
  listEnrollments: async () => h.enrollments,
  otherVersionIds: async () => h.otherVersions,
}));
vi.mock("@/server/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => h.row }) }),
      upsert: async (values: unknown, options: unknown) => {
        h.saved.push({ values, options });
        return h.save;
      },
    }),
  }),
}));
// The real expiry of open payment pages, on a Stripe client that never leaves the test.
vi.mock("@/server/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/stripe")>()),
  getStripe: () => h.stripe,
}));

import { POST } from "../route";

const addExam = (headers: Record<string, string> = {}) =>
  POST(
    new NextRequest("https://certbench.dev/api/stripe/cert-checkout", {
      method: "POST",
      body: JSON.stringify({ certId: CERT_ID }),
      headers: { "Content-Type": "application/json", ...headers },
    })
  );

/** The sentence a visitor would read for this answer, as the pages show errors. */
async function shown(res: Response): Promise<string> {
  const { error } = (await res.json()) as { error: { code: ApiError["code"]; message: string } };
  return userMessage(new ApiError(error.code, error.message), "FALLBACK");
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  h.pro = true;
  h.cert = { id: CERT_ID, name: "CompTIA Network+", examCode: "N10-009" };
  h.enrollments = [{ certificationId: PLAN_EXAM_ID }];
  h.otherVersions = [];
  h.row = { data: { stripe_customer_id: "cus_1" }, error: null };
  h.save = { error: null };
  h.saved = [];
  h.limit.mockReset().mockResolvedValue(true);
  h.stripe.customers.create.mockReset().mockResolvedValue({ id: "cus_new" });
  h.stripe.checkout.sessions.create.mockReset().mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_1" });
  // No earlier payment page is open unless a test opens one.
  h.stripe.checkout.sessions.list.mockReset().mockResolvedValue({ data: [], has_more: false });
  h.stripe.checkout.sessions.expire.mockReset().mockResolvedValue({ status: "expired" });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("POST /api/stripe/cert-checkout", () => {
  it("opens a one-time payment page for the exam, at the three-month price", async () => {
    const res = await addExam();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_1" });
    expect(h.stripe.customers.create).not.toHaveBeenCalled();
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith({
      customer: "cus_1",
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 3900,
            product_data: { name: "CertBench: CompTIA Network+ (N10-009)" },
          },
          quantity: 1,
        },
      ],
      discounts: undefined,
      success_url: "https://certbench.dev/upgrade?added=1",
      cancel_url: "https://certbench.dev/upgrade",
      metadata: { supabase_user_id: "user-1", cert_id: CERT_ID, kind: "cert_addon" },
    });
  });

  it("is open to Pro accounts only", async () => {
    h.pro = false;
    const res = await addExam();
    expect(res.status).toBe(403);
    expect(h.limit).not.toHaveBeenCalled();
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("gives a member without a Stripe customer one, and saves only its id", async () => {
    h.row = { data: null, error: null };
    const res = await addExam();

    expect(res.status).toBe(200);
    expect(h.stripe.customers.create).toHaveBeenCalledWith(
      { email: "member@example.com", metadata: { supabase_user_id: "user-1" } },
      { idempotencyKey: "create-customer-user-1" }
    );
    // Never the plan or the status: the row may belong to a paying member.
    expect(h.saved).toEqual([
      { values: { user_id: "user-1", stripe_customer_id: "cus_new" }, options: { onConflict: "user_id" } },
    ]);
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_new" }));
  });

  it("opens the payment page at the list price when Stripe rejects the regional coupon", async () => {
    h.stripe.checkout.sessions.create
      .mockRejectedValueOnce(new Error("No such coupon: 'ppp40'"))
      .mockResolvedValueOnce({ url: "https://checkout.stripe.com/c/pay/cs_2" });

    const res = await addExam({ "x-vercel-ip-country": "BR" });
    expect(res.status).toBe(200);
    expect(h.stripe.checkout.sessions.create.mock.calls[0][0]).toMatchObject({ discounts: [{ coupon: "ppp40" }] });
    expect(h.stripe.checkout.sessions.create.mock.calls[1][0]).not.toHaveProperty("discounts");
  });
});

describe("POST /api/stripe/cert-checkout: what a member is told when it refuses", () => {
  it("says that the limit was reached, in a sentence", async () => {
    h.limit.mockResolvedValue(false);

    const res = await addExam();
    expect(res.status).toBe(429);
    expect(h.limit).toHaveBeenCalledWith("/api/stripe/cert-checkout:user-1", { limit: 5, windowSeconds: 3600 });
    expect(await shown(res)).toBe(
      "Too many attempts to open the payment page were made in the past hour. Please try again later, or write to support@certbench.dev."
    );
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("says that the certification could not be found", async () => {
    h.cert = null;
    const res = await addExam();
    expect(res.status).toBe(404);
    expect(await shown(res)).toBe("That certification could not be found.");
  });

  it("does not charge for an exam that is already in the plan", async () => {
    h.enrollments = [{ certificationId: CERT_ID }];
    const res = await addExam();
    expect(res.status).toBe(409);
    expect(await shown(res)).toBe("That certification is already in your plan.");
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  // Until November 2026 a member who bought Pro before choosing an exam was
  // offered, and sold, the exam their plan includes, whenever the study path's
  // claim of it had not answered yet or had failed.
  it("does not charge a member whose plan covers no exam yet, and says the exam is included", async () => {
    h.enrollments = [];

    const res = await addExam();
    expect(res.status).toBe(409);
    expect(await shown(res)).toBe("This exam is included in your plan. Please reload the study path to open it.");
    expect(h.stripe.customers.create).not.toHaveBeenCalled();
    expect(h.stripe.checkout.sessions.list).not.toHaveBeenCalled();
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("does not charge for another version of an exam the plan covers", async () => {
    h.cert = { id: CERT_ID, name: "CompTIA Security+", examCode: "SY0-801" };
    h.enrollments = [{ certificationId: OTHER_VERSION_ID }];
    h.otherVersions = [OTHER_VERSION_ID];

    const res = await addExam();
    expect(res.status).toBe(409);
    expect(await shown(res)).toBe("Your plan already covers SY0-801.");
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("stops, and creates nothing, when the member's subscription row cannot be read", async () => {
    h.row = { data: null, error: { message: "TypeError: fetch failed" } };

    const res = await addExam();
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toBe("The payment page could not be opened. Please try again.");
    expect(h.stripe.customers.create).not.toHaveBeenCalled();
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("still opens the payment page when the new customer id cannot be saved", async () => {
    h.row = { data: null, error: null };
    h.save = { error: { message: "TypeError: fetch failed" } };

    const res = await addExam();
    expect(res.status).toBe(200);
    expect(consoleError).toHaveBeenCalledWith("[cert checkout] customer id not saved:", "TypeError: fetch failed");
  });

  it("answers with a sentence when Stripe returns a session without an address", async () => {
    h.stripe.checkout.sessions.create.mockResolvedValue({ url: null });
    const res = await addExam();
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toBe("The payment page could not be opened. Please try again.");
  });
});

// Until November 2026 two payment pages for one exam could be open at once,
// from the Back button or a second tab, and both could be paid.
describe("POST /api/stripe/cert-checkout: one open payment page for each customer", () => {
  it("expires an earlier payment page before it makes a new one", async () => {
    h.stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_earlier" }], has_more: false });

    const res = await addExam();
    expect(res.status).toBe(200);
    expect(h.stripe.checkout.sessions.list).toHaveBeenCalledExactlyOnceWith({ customer: "cus_1", status: "open", limit: 100 });
    expect(h.stripe.checkout.sessions.expire).toHaveBeenCalledExactlyOnceWith("cs_earlier");
    expect(h.stripe.checkout.sessions.expire.mock.invocationCallOrder[0]).toBeLessThan(
      h.stripe.checkout.sessions.create.mock.invocationCallOrder[0]
    );
  });

  it("answers as for a member who has Pro, and makes no new page, when an earlier page refuses to expire", async () => {
    h.stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_paid" }], has_more: false });
    // Stripe refuses to expire a page that was paid a moment ago.
    h.stripe.checkout.sessions.expire.mockRejectedValue(new Error("The Checkout Session is not open."));

    const res = await addExam();
    expect(res.status).toBe(409);
    expect(await shown(res)).toBe(
      "This account already has CertBench Pro. If you have just paid, your study path opens as soon as the payment is confirmed. Please reload the page."
    );
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it("has no earlier page to expire for a member who is given a Stripe customer here", async () => {
    h.row = { data: null, error: null };
    const res = await addExam();
    expect(res.status).toBe(200);
    expect(h.stripe.checkout.sessions.list).not.toHaveBeenCalled();
  });
});

// The purchase is recorded by the webhook, from Stripe, after this page has
// gone. The payment page carries the browser it was opened from, so that the
// record can join that visit and that person in PostHog.
describe("POST /api/stripe/cert-checkout: the visit the payment page is opened from", () => {
  const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
  const addExamFrom = (analytics: unknown, headers: Record<string, string> = {}) =>
    POST(
      new NextRequest("https://certbench.dev/api/stripe/cert-checkout", {
        method: "POST",
        body: JSON.stringify({ certId: CERT_ID, analytics }),
        headers: { "Content-Type": "application/json", ...headers },
      })
    );

  it("keeps the browser's ids and user agent on the payment page", async () => {
    const res = await addExamFrom(
      { distinctId: "019a8f2e-0b1c-7d2e-9f30-4a5b6c7d8e9f", sessionId: "019a8f2e-1111-7222-8333-444455556666" },
      { "user-agent": AGENT }
    );

    expect(res.status).toBe(200);
    const page = h.stripe.checkout.sessions.create.mock.calls[0][0];
    expect(page.metadata).toEqual({
      supabase_user_id: "user-1",
      cert_id: CERT_ID,
      kind: "cert_addon",
      posthog_distinct_id: "019a8f2e-0b1c-7d2e-9f30-4a5b6c7d8e9f",
      posthog_session_id: "019a8f2e-1111-7222-8333-444455556666",
      posthog_user_agent: AGENT,
    });
    // A single payment starts no plan.
    expect(page).not.toHaveProperty("subscription_data");
  });

  it("never refuses a payment over ids that are not ids: it drops them and opens the page", async () => {
    const res = await addExamFrom({ distinctId: "not an id!", sessionId: ["019a"] });
    expect(res.status).toBe(200);
    expect(h.stripe.checkout.sessions.create.mock.calls[0][0].metadata).toEqual({
      supabase_user_id: "user-1",
      cert_id: CERT_ID,
      kind: "cert_addon",
    });
  });
});
