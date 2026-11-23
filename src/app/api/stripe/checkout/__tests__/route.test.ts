import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/contracts/common";
import { userMessage } from "@/lib/errors/user-message";

type DbAnswer = { data?: unknown; error: { message: string } | null };

const h = vi.hoisted(() => ({
  /** The signed-in user, or null for a signed-out request. */
  user: { id: "user-1", email: "buyer@example.com" } as { id: string; email: string } | null,
  limit: vi.fn(),
  /** What the read of the buyer's subscription row answers. */
  row: { data: null, error: null } as DbAnswer,
  /** What the write of the new customer id answers. */
  save: { error: null } as DbAnswer,
  saved: [] as unknown[],
  stripe: {
    subscriptions: { list: vi.fn() },
    customers: { create: vi.fn() },
    prices: { list: vi.fn() },
    checkout: { sessions: { create: vi.fn(), list: vi.fn(), expire: vi.fn() } },
  },
}));

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
  serverEnv: (key: string) => (key === "STRIPE_PRO_PRICE_ID" ? "price_from_env" : "secret"),
}));
vi.mock("@/server/auth", async () => {
  const { ApiError } = await import("@/contracts/common");
  return {
    requireUser: async () => {
      if (!h.user) throw new ApiError("unauthorized");
      return { db: {}, user: h.user };
    },
    getOptionalUser: vi.fn(),
    requireAdmin: vi.fn(),
    requirePro: vi.fn(),
  };
});
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: h.limit } }));
vi.mock("@/server/analytics", () => ({ captureServerEvent: vi.fn(async () => {}) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
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
// The real rule for what a customer's subscriptions mean, on a Stripe client that never leaves the test.
vi.mock("@/server/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/stripe")>()),
  getStripe: () => h.stripe,
}));

type Route = typeof import("../route");
let POST: Route["POST"];

const checkout = (body: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  POST(
    new NextRequest("https://certbench.dev/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...headers },
    })
  );

/** The sentence a visitor would read for this answer, as the pages show errors. */
async function shown(res: Response): Promise<string> {
  const { error } = (await res.json()) as { error: { code: ApiError["code"]; message: string } };
  return userMessage(new ApiError(error.code, error.message), "FALLBACK");
}

const subscriptions = (...statuses: string[]) =>
  h.stripe.subscriptions.list.mockResolvedValue({ data: statuses.map((status) => ({ status })), has_more: false });

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  // The route keeps price ids for the life of its module: start each test with none held.
  vi.resetModules();
  ({ POST } = await import("../route"));

  h.user = { id: "user-1", email: "buyer@example.com" };
  h.row = { data: null, error: null };
  h.save = { error: null };
  h.saved = [];
  h.limit.mockReset().mockResolvedValue(true);
  h.stripe.subscriptions.list.mockReset();
  h.stripe.customers.create.mockReset().mockResolvedValue({ id: "cus_new" });
  h.stripe.prices.list
    .mockReset()
    .mockImplementation(async ({ lookup_keys }: { lookup_keys: string[] }) => ({ data: [{ id: `price_${lookup_keys[0]}` }] }));
  h.stripe.checkout.sessions.create.mockReset().mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_1" });
  // No earlier payment page is open unless a test opens one.
  h.stripe.checkout.sessions.list.mockReset().mockResolvedValue({ data: [], has_more: false });
  h.stripe.checkout.sessions.expire.mockReset().mockResolvedValue({ status: "expired" });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("POST /api/stripe/checkout", () => {
  it("turns away a signed-out visitor before anything is counted or created", async () => {
    h.user = null;
    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(401);
    expect(h.limit).not.toHaveBeenCalled();
    expect(h.stripe.customers.create).not.toHaveBeenCalled();
  });

  it("opens a payment page for a new buyer", async () => {
    const res = await checkout({ interval: "quarterly", returnTo: "pricing" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_1" });
    // No customer yet, so there is nothing to ask Stripe about.
    expect(h.stripe.subscriptions.list).not.toHaveBeenCalled();
    expect(h.stripe.checkout.sessions.list).not.toHaveBeenCalled();
    expect(h.stripe.customers.create).toHaveBeenCalledWith(
      { email: "buyer@example.com", metadata: { supabase_user_id: "user-1" } },
      { idempotencyKey: "create-customer-user-1" }
    );
    expect(h.saved).toEqual([
      {
        values: { user_id: "user-1", stripe_customer_id: "cus_new", plan: "free", status: "active" },
        options: { onConflict: "user_id" },
      },
    ]);
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith({
      customer: "cus_new",
      mode: "subscription",
      line_items: [{ price: "price_certbench_pro_quarterly", quantity: 1 }],
      discounts: undefined,
      success_url: "https://certbench.dev/start?upgraded=1",
      cancel_url: "https://certbench.dev/pricing",
      metadata: { supabase_user_id: "user-1" },
    });
  });

  it("returns a buyer to the study path the plan was chosen on", async () => {
    await checkout({ interval: "monthly", returnTo: "path/security-plus-sy0-701" });
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://certbench.dev/path/security-plus-sy0-701?upgraded=1",
        cancel_url: "https://certbench.dev/path/security-plus-sy0-701",
      })
    );
  });

  it("lets a customer whose plan has ended buy again, as the same customer", async () => {
    h.row.data = { stripe_customer_id: "cus_old" };
    subscriptions();

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(200);
    expect(h.stripe.subscriptions.list).toHaveBeenCalledWith({ customer: "cus_old", limit: 10 });
    expect(h.stripe.customers.create).not.toHaveBeenCalled();
    expect(h.saved).toEqual([]);
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_old" }));
  });
});

describe("POST /api/stripe/checkout: one plan for each customer", () => {
  it.each(["active", "trialing"])("refuses a second plan while one is %s", async (status) => {
    h.row.data = { stripe_customer_id: "cus_old" };
    subscriptions(status);

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(409);
    expect(await shown(res)).toBe(
      "This account already has CertBench Pro. If you have just paid, your study path opens as soon as the payment is confirmed. Please reload the page."
    );
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  // Until November 2026 a member whose renewal had failed was let through to
  // a second subscription. Stripe later canceled the unpaid one, and the
  // webhook then took Pro away from the one that was paid.
  it.each(["past_due", "unpaid"])(
    "sends a member whose subscription is %s to the billing page instead of a second plan",
    async (status) => {
      h.row.data = { stripe_customer_id: "cus_old" };
      subscriptions(status);

      const res = await checkout({ interval: "quarterly" });
      expect(res.status).toBe(409);
      expect(await shown(res)).toBe(
        "Your subscription has a payment that has not been completed. Please go to certbench.dev/upgrade, choose Manage billing, and update your payment method. You do not need to subscribe again."
      );
      expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    }
  );
});

// Until November 2026 a buyer who went Back from Stripe, or used a second tab,
// held two payment pages that could both be paid, which started two
// subscriptions for one account.
describe("POST /api/stripe/checkout: one open payment page for each customer", () => {
  it("expires an earlier payment page before it reads the standing and makes a new one", async () => {
    h.row.data = { stripe_customer_id: "cus_old" };
    h.stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_earlier" }], has_more: false });
    subscriptions();

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(200);
    expect(h.stripe.checkout.sessions.list).toHaveBeenCalledExactlyOnceWith({ customer: "cus_old", status: "open", limit: 100 });
    expect(h.stripe.checkout.sessions.expire).toHaveBeenCalledExactlyOnceWith("cs_earlier");
    // The page had expired before the standing was read, and that before the new page was made.
    const expired = h.stripe.checkout.sessions.expire.mock.invocationCallOrder[0];
    const standing = h.stripe.subscriptions.list.mock.invocationCallOrder[0];
    expect(expired).toBeLessThan(standing);
    expect(standing).toBeLessThan(h.stripe.checkout.sessions.create.mock.invocationCallOrder[0]);
  });

  it("answers as for a member who has Pro when an earlier page was paid a moment ago", async () => {
    h.row.data = { stripe_customer_id: "cus_old" };
    h.stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_paid" }], has_more: false });
    // Stripe refuses to expire a page that has been completed, and the plan it started is running.
    h.stripe.checkout.sessions.expire.mockRejectedValue(new Error("The Checkout Session is not open."));
    subscriptions("active");

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(409);
    expect(await shown(res)).toBe(
      "This account already has CertBench Pro. If you have just paid, your study path opens as soon as the payment is confirmed. Please reload the page."
    );
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("makes no new page while an earlier one could not be expired", async () => {
    h.row.data = { stripe_customer_id: "cus_old" };
    h.stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_earlier" }], has_more: false });
    h.stripe.checkout.sessions.expire.mockRejectedValue(new Error("An error occurred with our connection to Stripe."));
    subscriptions();

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toBe("The payment page could not be opened. Please try again.");
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("POST /api/stripe/checkout: what a visitor is told when it fails", () => {
  it("says that the limit was reached, in a sentence", async () => {
    h.limit.mockResolvedValue(false);

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(429);
    expect(h.limit).toHaveBeenCalledWith("/api/stripe/checkout:user-1", { limit: 5, windowSeconds: 3600 });
    expect(await shown(res)).toBe(
      "Too many attempts to open the payment page were made in the past hour. Please try again later, or write to support@certbench.dev."
    );
    expect(h.stripe.customers.create).not.toHaveBeenCalled();
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("names the way out when Stripe has no price for the billing period", async () => {
    h.stripe.prices.list.mockResolvedValue({ data: [] });

    const res = await checkout({ interval: "annual" });
    expect(res.status).toBe(404);
    expect(await shown(res)).toBe(
      "That billing period is not available at present. Please choose monthly billing, or write to support@certbench.dev."
    );
  });

  // Going on without the row would make a second Stripe customer for a paying
  // member, skip the check for a running plan, and reset the row to free.
  it("stops, and creates nothing, when the buyer's subscription row cannot be read", async () => {
    h.row = { data: null, error: { message: "TypeError: fetch failed" } };

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toBe("The payment page could not be opened. Please try again.");
    expect(body.error.message).not.toContain("fetch failed");
    expect(h.stripe.customers.create).not.toHaveBeenCalled();
    expect(h.saved).toEqual([]);
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("still opens the payment page when the new customer id cannot be saved", async () => {
    h.save = { error: { message: "TypeError: fetch failed" } };

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(200);
    expect(consoleError).toHaveBeenCalledWith("[checkout] customer id not saved:", "TypeError: fetch failed");
  });

  it("answers with a sentence when Stripe returns a session without an address", async () => {
    h.stripe.checkout.sessions.create.mockResolvedValue({ url: null });

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toBe("The payment page could not be opened. Please try again.");
  });

  it("does not show Stripe's own words when Stripe fails", async () => {
    h.stripe.checkout.sessions.create.mockRejectedValue(new Error("Invalid API Key provided: sk_live_****"));

    const res = await checkout({ interval: "monthly" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("sk_live");
  });
});

describe("POST /api/stripe/checkout: regional prices", () => {
  it("applies the coupon for the country the request came from", async () => {
    await checkout({ interval: "monthly" }, { "x-vercel-ip-country": "IN" });
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ discounts: [{ coupon: "ppp60" }] })
    );
  });

  it("opens the payment page at the list price when Stripe rejects the coupon", async () => {
    h.stripe.checkout.sessions.create
      .mockRejectedValueOnce(new Error("No such coupon: 'ppp60'"))
      .mockResolvedValueOnce({ url: "https://checkout.stripe.com/c/pay/cs_2" });

    const res = await checkout({ interval: "monthly" }, { "x-vercel-ip-country": "IN" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_2" });
    expect(h.stripe.checkout.sessions.create.mock.calls[1][0]).not.toHaveProperty("discounts");
  });
});

describe("POST /api/stripe/checkout: the price ids", () => {
  it("asks Stripe for a price once, then keeps it", async () => {
    await checkout({ interval: "quarterly" });
    await checkout({ interval: "quarterly" });
    expect(h.stripe.prices.list).toHaveBeenCalledOnce();
    expect(h.stripe.prices.list).toHaveBeenCalledWith({
      lookup_keys: ["certbench_pro_quarterly"],
      active: true,
      limit: 1,
    });

    // Each billing period has its own price.
    await checkout({ interval: "annual" });
    expect(h.stripe.prices.list).toHaveBeenCalledTimes(2);
    expect(h.stripe.checkout.sessions.create.mock.calls.map(([params]) => params.line_items[0].price)).toEqual([
      "price_certbench_pro_quarterly",
      "price_certbench_pro_quarterly",
      "price_certbench_pro_annual",
    ]);
  });

  it("falls back to the configured monthly price, and goes on looking for the real one", async () => {
    h.stripe.prices.list.mockResolvedValue({ data: [] });

    await checkout({ interval: "monthly" });
    await checkout({ interval: "monthly" });
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: "price_from_env", quantity: 1 }] })
    );
    // The fallback is not kept, so the price is found once it exists.
    expect(h.stripe.prices.list).toHaveBeenCalledTimes(2);
  });

  it("asks for the price again after a payment page could not be made", async () => {
    await checkout({ interval: "monthly" });
    expect(h.stripe.prices.list).toHaveBeenCalledOnce();

    // The owner replaced the price in Stripe: the id this instance holds is refused.
    h.stripe.checkout.sessions.create.mockRejectedValueOnce(new Error("The price specified is inactive."));
    expect((await checkout({ interval: "monthly" })).status).toBe(500);

    h.stripe.prices.list.mockResolvedValue({ data: [{ id: "price_replacement" }] });
    expect((await checkout({ interval: "monthly" })).status).toBe(200);
    expect(h.stripe.prices.list).toHaveBeenCalledTimes(2);
    expect(h.stripe.checkout.sessions.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ line_items: [{ price: "price_replacement", quantity: 1 }] })
    );
  });
});

// The purchase is recorded by the webhook, from Stripe, after this page has
// gone. The payment page carries the browser it was opened from, so that the
// record can join that visit and that person in PostHog.
describe("POST /api/stripe/checkout: the visit the payment page is opened from", () => {
  const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
  const ids = { distinctId: "019a8f2e-0b1c-7d2e-9f30-4a5b6c7d8e9f", sessionId: "019a8f2e-1111-7222-8333-444455556666" };
  const kept = {
    posthog_distinct_id: ids.distinctId,
    posthog_session_id: ids.sessionId,
    posthog_user_agent: AGENT,
  };

  it("keeps the browser's ids and user agent on the payment page and on the plan it starts", async () => {
    const res = await checkout({ interval: "monthly", analytics: ids }, { "user-agent": AGENT });

    expect(res.status).toBe(200);
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { supabase_user_id: "user-1", ...kept },
        // A plan whose first payment arrives later is granted by its own change, which has only the subscription.
        subscription_data: { metadata: kept },
      })
    );
  });

  it("keeps them on a page opened at the list price after the coupon was refused", async () => {
    h.stripe.checkout.sessions.create
      .mockRejectedValueOnce(new Error("No such coupon: 'ppp60'"))
      .mockResolvedValueOnce({ url: "https://checkout.stripe.com/c/pay/cs_2" });

    const res = await checkout({ interval: "monthly", analytics: ids }, { "x-vercel-ip-country": "IN", "user-agent": AGENT });
    expect(res.status).toBe(200);
    expect(h.stripe.checkout.sessions.create.mock.calls[1][0]).toMatchObject({
      metadata: { supabase_user_id: "user-1", ...kept },
      subscription_data: { metadata: kept },
    });
  });

  // PostHog blocked in the browser: the request still says what browser it was.
  it("keeps the user agent alone when the browser sends no ids", async () => {
    await checkout({ interval: "monthly" }, { "user-agent": AGENT });
    expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { supabase_user_id: "user-1", posthog_user_agent: AGENT },
        subscription_data: { metadata: { posthog_user_agent: AGENT } },
      })
    );
  });

  it("never refuses a payment over ids that are not ids: it drops them and opens the page", async () => {
    for (const analytics of [{ distinctId: "<img src=x>", sessionId: 42 }, "019a-not-an-object", { distinctId: "x".repeat(129) }]) {
      h.stripe.checkout.sessions.create.mockClear();
      const res = await checkout({ interval: "monthly", analytics });
      expect(res.status).toBe(200);
      expect(h.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { supabase_user_id: "user-1" } })
      );
      expect(h.stripe.checkout.sessions.create.mock.calls[0][0]).not.toHaveProperty("subscription_data");
    }
  });
});
