import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/contracts/common";
import { userMessage } from "@/lib/errors/user-message";

type DbAnswer = { data?: unknown; error: { message: string } | null };

const h = vi.hoisted(() => ({
  /** The signed-in user, or null for a signed-out request. */
  user: { id: "user-1" } as { id: string } | null,
  limit: vi.fn(),
  /** What the read of the account's own subscription row answers. */
  row: { data: null, error: null } as DbAnswer,
  reads: [] as string[],
  createPortal: vi.fn(),
}));

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
  serverEnv: () => "secret",
}));
vi.mock("@/server/auth", async () => {
  const { ApiError } = await import("@/contracts/common");
  /** The account's own, row-level-security client: the portal needs no more than that. */
  const db = {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => ({
          maybeSingle: async () => {
            h.reads.push(`${table}.${columns} where ${column} = ${value}`);
            return h.row;
          },
        }),
      }),
    }),
  };
  return {
    requireUser: async () => {
      if (!h.user) throw new ApiError("unauthorized");
      return { db, user: h.user };
    },
    // The portal must not ask for Pro: these fail the test if it ever does.
    requirePro: async () => {
      throw new Error("the portal asked for Pro");
    },
    requireAdmin: async () => {
      throw new Error("the portal asked for an administrator");
    },
    getOptionalUser: vi.fn(),
  };
});
vi.mock("@/server/rate-limit", () => ({ rateLimiter: { check: h.limit } }));
vi.mock("@/server/analytics", () => ({ captureServerEvent: vi.fn(async () => {}) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/server/stripe", () => ({
  getStripe: () => ({ billingPortal: { sessions: { create: h.createPortal } } }),
}));

import { POST } from "../route";

const openPortal = () =>
  POST(
    new NextRequest("https://certbench.dev/api/stripe/portal", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    })
  );

/** The sentence a visitor would read for this answer, as the pages show errors. */
async function shown(res: Response): Promise<string> {
  const { error } = (await res.json()) as { error: { code: ApiError["code"]; message: string } };
  return userMessage(new ApiError(error.code, error.message), "FALLBACK");
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  h.user = { id: "user-1" };
  h.row = { data: { stripe_customer_id: "cus_1" }, error: null };
  h.reads = [];
  h.limit.mockReset().mockResolvedValue(true);
  h.createPortal.mockReset().mockResolvedValue({ url: "https://billing.stripe.com/p/session/bps_1" });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("POST /api/stripe/portal", () => {
  // A member whose renewal failed is not Pro at that moment, and the portal is
  // where the card is put right. The plan is never looked at here.
  it("opens the billing portal for any signed-in account that has a Stripe customer", async () => {
    const res = await openPortal();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://billing.stripe.com/p/session/bps_1" });
    // Only the customer id is read: not the plan, not the status.
    expect(h.reads).toEqual(["user_subscriptions.stripe_customer_id where user_id = user-1"]);
    expect(h.createPortal).toHaveBeenCalledWith({
      customer: "cus_1",
      // The plan and billing page, which every account may open.
      return_url: "https://certbench.dev/upgrade",
    });
  });

  it("turns away a signed-out visitor", async () => {
    h.user = null;
    const res = await openPortal();
    expect(res.status).toBe(401);
    expect(h.createPortal).not.toHaveBeenCalled();
  });

  it("says so when the account has no billing record", async () => {
    h.row = { data: null, error: null };
    const res = await openPortal();
    expect(res.status).toBe(404);
    expect(await shown(res)).toBe("There is no billing record for this account.");
    expect(h.createPortal).not.toHaveBeenCalled();
  });

  it("says so when the account's row has no Stripe customer", async () => {
    h.row = { data: { stripe_customer_id: null }, error: null };
    const res = await openPortal();
    expect(res.status).toBe(404);
    expect(await shown(res)).toBe("There is no billing record for this account.");
  });

  // A read that failed used to be answered as "No billing account found".
  it("does not take a failed read for an account without billing", async () => {
    h.row = { data: null, error: { message: "TypeError: fetch failed" } };

    const res = await openPortal();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toBe("The billing page could not be opened. Please try again.");
    expect(h.createPortal).not.toHaveBeenCalled();
  });

  it("says that the limit was reached, in a sentence", async () => {
    h.limit.mockResolvedValue(false);

    const res = await openPortal();
    expect(res.status).toBe(429);
    expect(h.limit).toHaveBeenCalledWith("/api/stripe/portal:user-1", { limit: 5, windowSeconds: 3600 });
    expect(await shown(res)).toBe(
      "Too many attempts to open the billing page were made in the past hour. Please try again later, or write to support@certbench.dev."
    );
    expect(h.createPortal).not.toHaveBeenCalled();
  });

  it("does not show Stripe's own words when Stripe fails", async () => {
    h.createPortal.mockRejectedValue(new Error("No configuration provided and your live mode default configuration has not been created."));

    const res = await openPortal();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("configuration");
  });
});
