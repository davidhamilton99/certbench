import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  /** Every Stripe client that was built, with the key and the settings it was given. */
  built: [] as { key: unknown; config: unknown }[],
}));

vi.mock("@/env", () => ({ serverEnv: (name: string) => `value of ${name}` }));
// The real library is never loaded: getStripe is checked for what it asks of
// it, and the other functions are handed a client of the test's own.
vi.mock("stripe", () => ({
  default: class {
    constructor(key: unknown, config: unknown) {
      h.built.push({ key, config });
    }
  },
}));

import { cancelLiveSubscriptions, expireOpenCheckouts, getStripe, subscriptionStanding } from "../stripe";

type Client = Parameters<typeof subscriptionStanding>[0];
type CheckoutClient = Parameters<typeof expireOpenCheckouts>[0];

describe("getStripe", () => {
  // The library's own limits are 80 seconds for an answer and two more
  // attempts: a buyer's request, or the answer to a webhook, could wait minutes.
  it("gives every call to Stripe 15 seconds and one more attempt", () => {
    getStripe();
    expect(h.built).toHaveLength(1);
    expect(h.built[0].key).toBe("value of STRIPE_SECRET_KEY");
    expect(h.built[0].config).toMatchObject({ timeout: 15_000, maxNetworkRetries: 1 });
  });

  it("builds the client once and keeps it", () => {
    expect(getStripe()).toBe(getStripe());
    expect(h.built).toHaveLength(1);
  });
});

/** A Stripe client whose customer has subscriptions in these states. */
const stripeWith = (...statuses: string[]) => {
  const list = vi.fn(async () => ({ data: statuses.map((status) => ({ status })), has_more: false }));
  return { client: { subscriptions: { list } } as unknown as Client, list };
};

describe("subscriptionStanding", () => {
  it("counts an active or trialing plan, which a second checkout would duplicate", async () => {
    expect(await subscriptionStanding(stripeWith("active").client, "cus_1")).toBe("paid");
    expect(await subscriptionStanding(stripeWith("incomplete_expired", "trialing").client, "cus_1")).toBe("paid");
  });

  it("lets someone buy again once a plan has ended", async () => {
    expect(await subscriptionStanding(stripeWith().client, "cus_1")).toBe("none");
    expect(await subscriptionStanding(stripeWith("incomplete_expired").client, "cus_1")).toBe("none");
  });

  // Until November 2026 a failed renewal counted as "lapsed", so the member was
  // offered a second subscription instead of the card form. Stripe then
  // canceled the unpaid one and the paid one lost Pro with it.
  it.each(["past_due", "unpaid"])(
    "sends a member whose plan is %s to the billing portal, not to a second plan",
    async (status) => {
      expect(await subscriptionStanding(stripeWith(status).client, "cus_1")).toBe("payment_due");
      expect(await subscriptionStanding(stripeWith("incomplete_expired", status).client, "cus_1")).toBe("payment_due");
    }
  );

  // Someone whose first payment was never completed has never had Pro: they
  // try again with a new checkout. The unfinished attempt expires by itself,
  // and the webhook ignores it because the row holds the plan that was paid.
  it("lets a buyer whose first payment was never completed try again", async () => {
    expect(await subscriptionStanding(stripeWith("incomplete").client, "cus_1")).toBe("none");
    expect(await subscriptionStanding(stripeWith("incomplete", "incomplete_expired").client, "cus_1")).toBe("none");
  });

  it("says the plan is paid when one subscription is running and another is not", async () => {
    expect(await subscriptionStanding(stripeWith("past_due", "active").client, "cus_1")).toBe("paid");
  });

  it("asks Stripe about this customer", async () => {
    const { client, list } = stripeWith();
    await subscriptionStanding(client, "cus_42");
    expect(list).toHaveBeenCalledWith({ customer: "cus_42", limit: 10 });
  });
});

describe("cancelLiveSubscriptions", () => {
  /** A Stripe client that serves these pages of subscriptions, one page for each call. */
  const stripeWithPages = (...pages: { id: string; status: string }[][]) => {
    const list = vi.fn();
    pages.forEach((data, i) => list.mockResolvedValueOnce({ data, has_more: i < pages.length - 1 }));
    const cancel = vi.fn(async (id: string) => ({ id, status: "canceled" }));
    return { client: { subscriptions: { list, cancel } } as unknown as Client, list, cancel };
  };

  it("cancels every subscription that could still charge the customer", async () => {
    const { client, list, cancel } = stripeWithPages([
      { id: "sub_active", status: "active" },
      { id: "sub_trial", status: "trialing" },
      { id: "sub_late", status: "past_due" },
      { id: "sub_unpaid", status: "unpaid" },
      { id: "sub_first", status: "incomplete" },
      { id: "sub_paused", status: "paused" },
    ]);

    expect(await cancelLiveSubscriptions(client, "cus_7")).toBe(6);
    expect(list).toHaveBeenCalledWith({ customer: "cus_7", limit: 100 });
    expect(cancel.mock.calls.map(([id]) => id)).toEqual([
      "sub_active",
      "sub_trial",
      "sub_late",
      "sub_unpaid",
      "sub_first",
      "sub_paused",
    ]);
  });

  it("leaves alone a subscription that has already ended", async () => {
    const { client, cancel } = stripeWithPages([
      { id: "sub_gone", status: "canceled" },
      { id: "sub_expired", status: "incomplete_expired" },
    ]);
    expect(await cancelLiveSubscriptions(client, "cus_7")).toBe(0);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("does nothing for a customer without subscriptions", async () => {
    const { client, cancel } = stripeWithPages([]);
    expect(await cancelLiveSubscriptions(client, "cus_7")).toBe(0);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("reads every page before it cancels anything", async () => {
    const { client, list, cancel } = stripeWithPages(
      [
        { id: "sub_1", status: "active" },
        { id: "sub_2", status: "canceled" },
      ],
      [{ id: "sub_3", status: "past_due" }]
    );

    expect(await cancelLiveSubscriptions(client, "cus_7")).toBe(2);
    expect(list).toHaveBeenNthCalledWith(1, { customer: "cus_7", limit: 100 });
    expect(list).toHaveBeenNthCalledWith(2, { customer: "cus_7", limit: 100, starting_after: "sub_2" });
    expect(cancel.mock.calls.map(([id]) => id)).toEqual(["sub_1", "sub_3"]);
    // Both pages were read before the first cancellation.
    expect(list.mock.invocationCallOrder[1]).toBeLessThan(cancel.mock.invocationCallOrder[0]);
  });

  it("fails when Stripe cannot be reached, so that the caller stops", async () => {
    const list = vi.fn().mockRejectedValue(new Error("An error occurred with our connection to Stripe."));
    const cancel = vi.fn();
    const client = { subscriptions: { list, cancel } } as unknown as Client;
    await expect(cancelLiveSubscriptions(client, "cus_7")).rejects.toThrow("connection to Stripe");
    expect(cancel).not.toHaveBeenCalled();
  });

  it("fails when one cancellation fails", async () => {
    const { client, cancel } = stripeWithPages([
      { id: "sub_1", status: "active" },
      { id: "sub_2", status: "active" },
    ]);
    cancel.mockRejectedValueOnce(new Error("Request timed out"));
    await expect(cancelLiveSubscriptions(client, "cus_7")).rejects.toThrow("Request timed out");
  });

  it("treats a customer that Stripe does not have as having nothing to cancel", async () => {
    const missing = Object.assign(new Error("No such customer: 'cus_old'"), {
      code: "resource_missing",
      param: "customer",
    });
    const list = vi.fn().mockRejectedValue(missing);
    const cancel = vi.fn();
    const client = { subscriptions: { list, cancel } } as unknown as Client;
    expect(await cancelLiveSubscriptions(client, "cus_old")).toBe(0);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("does not mistake another missing object for a missing customer", async () => {
    const missing = Object.assign(new Error("No such subscription: 'sub_1'"), {
      code: "resource_missing",
      param: "id",
    });
    const { client, cancel } = stripeWithPages([{ id: "sub_1", status: "active" }]);
    cancel.mockRejectedValueOnce(missing);
    await expect(cancelLiveSubscriptions(client, "cus_7")).rejects.toThrow("No such subscription");
  });
});

// An open Checkout Session can still be paid. Until November 2026 deleting an
// account left them open, and one that was paid afterwards started a
// subscription for a customer with no account.
describe("expireOpenCheckouts", () => {
  /** A Stripe client that serves these pages of open payment pages, one page of the list for each call. */
  const stripeWithOpenPages = (...pages: { id: string }[][]) => {
    const list = vi.fn();
    pages.forEach((data, i) => list.mockResolvedValueOnce({ data, has_more: i < pages.length - 1 }));
    const expire = vi.fn(async (id: string) => ({ id, status: "expired" }));
    return { client: { checkout: { sessions: { list, expire } } } as unknown as CheckoutClient, list, expire };
  };

  it("expires every payment page of the customer that is still open", async () => {
    const { client, list, expire } = stripeWithOpenPages([{ id: "cs_plan" }, { id: "cs_added_exam" }]);

    expect(await expireOpenCheckouts(client, "cus_7")).toBe(2);
    // Only this customer's pages, and only the open ones: a completed or expired page is left alone.
    expect(list).toHaveBeenCalledExactlyOnceWith({ customer: "cus_7", status: "open", limit: 100 });
    expect(expire.mock.calls.map(([id]) => id)).toEqual(["cs_plan", "cs_added_exam"]);
  });

  it("does nothing for a customer without an open payment page", async () => {
    const { client, expire } = stripeWithOpenPages([]);
    expect(await expireOpenCheckouts(client, "cus_7")).toBe(0);
    expect(expire).not.toHaveBeenCalled();
  });

  it("reads every page of the list before it expires anything", async () => {
    const { client, list, expire } = stripeWithOpenPages([{ id: "cs_1" }, { id: "cs_2" }], [{ id: "cs_3" }]);

    expect(await expireOpenCheckouts(client, "cus_7")).toBe(3);
    expect(list).toHaveBeenNthCalledWith(1, { customer: "cus_7", status: "open", limit: 100 });
    expect(list).toHaveBeenNthCalledWith(2, { customer: "cus_7", status: "open", limit: 100, starting_after: "cs_2" });
    expect(expire.mock.calls.map(([id]) => id)).toEqual(["cs_1", "cs_2", "cs_3"]);
    // Both pages of the list were read before the first expiry.
    expect(list.mock.invocationCallOrder[1]).toBeLessThan(expire.mock.invocationCallOrder[0]);
  });

  it("fails when Stripe cannot be reached, so that the caller stops", async () => {
    const list = vi.fn().mockRejectedValue(new Error("An error occurred with our connection to Stripe."));
    const expire = vi.fn();
    const client = { checkout: { sessions: { list, expire } } } as unknown as CheckoutClient;
    await expect(expireOpenCheckouts(client, "cus_7")).rejects.toThrow("connection to Stripe");
    expect(expire).not.toHaveBeenCalled();
  });

  // A page that was paid in the moment between the list and its expiry: Stripe
  // refuses to expire it. The caller must stop, because that page has just
  // started a subscription.
  it("fails when one payment page cannot be expired", async () => {
    const { client, expire } = stripeWithOpenPages([{ id: "cs_1" }, { id: "cs_2" }]);
    expire.mockRejectedValueOnce(new Error("The Checkout Session is not open."));
    await expect(expireOpenCheckouts(client, "cus_7")).rejects.toThrow("is not open");
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it("treats a customer that Stripe does not have as having nothing to expire", async () => {
    const missing = Object.assign(new Error("No such customer: 'cus_old'"), {
      code: "resource_missing",
      param: "customer",
    });
    const list = vi.fn().mockRejectedValue(missing);
    const expire = vi.fn();
    const client = { checkout: { sessions: { list, expire } } } as unknown as CheckoutClient;
    expect(await expireOpenCheckouts(client, "cus_old")).toBe(0);
    expect(expire).not.toHaveBeenCalled();
  });

  it("does not mistake another missing object for a missing customer", async () => {
    const missing = Object.assign(new Error("No such checkout session: 'cs_1'"), {
      code: "resource_missing",
      param: "id",
    });
    const { client, expire } = stripeWithOpenPages([{ id: "cs_1" }]);
    expire.mockRejectedValueOnce(missing);
    await expect(expireOpenCheckouts(client, "cus_7")).rejects.toThrow("No such checkout session");
  });
});
