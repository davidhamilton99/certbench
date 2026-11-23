import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

interface DbCall {
  table: string;
  op: "upsert" | "update" | "select";
  values: unknown;
  options?: unknown;
  filters: [string, unknown][];
}
type DbAnswer = { data?: unknown; error: { message: string; code?: string } | null };

const h = vi.hoisted(() => ({
  /** The event the signature check hands back, or null for a signature that does not verify. */
  event: null as unknown,
  retrieve: vi.fn(),
  capture: vi.fn(async () => {}),
  /** The report of a fault as a `server_error`. */
  report: vi.fn(async () => {}),
  /** Every database call the handler made, in order. */
  calls: [] as DbCall[],
  /** What a call answers, by "table.op". Anything not listed succeeds. */
  answers: {} as Record<string, DbAnswer>,
  /** Work the handler asked to have done once the response has gone. */
  afterTasks: [] as (() => unknown)[],
  /** When true, `after` refuses, as it does where there is no request to wait for. */
  afterRefuses: false,
}));

vi.mock("@/env", () => ({ serverEnv: () => "whsec_test" }));
vi.mock("@/server/analytics", () => ({ captureServerEvent: h.capture }));
vi.mock("@/server/api/report-error", () => ({ reportServerError: h.report }));
vi.mock("@/server/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: () => {
        if (!h.event) throw new Error("No signatures found matching the expected signature for payload.");
        return h.event;
      },
    },
    subscriptions: { retrieve: h.retrieve },
  }),
}));
vi.mock("@/server/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const call = { table, op: "select", values: undefined, filters: [] } as DbCall;
      const answer = () => {
        h.calls.push(call);
        return Promise.resolve(h.answers[`${table}.${call.op}`] ?? { data: null, error: null });
      };
      const query = {
        upsert(values: unknown, options: unknown) {
          Object.assign(call, { op: "upsert", values, options });
          return query;
        },
        update(values: unknown) {
          Object.assign(call, { op: "update", values });
          return query;
        },
        select(columns: string) {
          Object.assign(call, { op: "select", values: columns });
          return query;
        },
        eq(column: string, value: unknown) {
          call.filters.push([column, value]);
          return query;
        },
        maybeSingle: answer,
        then: (resolve: (a: DbAnswer) => unknown, reject: (e: unknown) => unknown) => answer().then(resolve, reject),
      };
      return query;
    },
  }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    if (h.afterRefuses) throw new Error("`after` was called outside a request scope.");
    h.afterTasks.push(task);
  },
}));

import { POST } from "../route";

const deliver = (signature: string | null = "t=1,v1=abc") =>
  POST(
    new NextRequest("https://certbench.dev/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: signature === null ? {} : { "stripe-signature": signature },
    })
  );

/** Runs what the handler left for after the response. */
const runAfterTasks = async () => {
  for (const task of h.afterTasks.splice(0)) await task();
};

const writes = () => h.calls.filter((c) => c.op !== "select");

/** 1 January 2026, 00:00 UTC, as Stripe sends a time. */
const PERIOD_END = 1767225600;

const checkoutCompleted = (session: Record<string, unknown> = {}) => ({
  id: "evt_checkout",
  type: "checkout.session.completed",
  data: {
    object: {
      customer: "cus_1",
      subscription: "sub_1",
      metadata: { supabase_user_id: "user-1" },
      ...session,
    },
  },
});

const subscriptionEvent = (type: string, status: string) => ({
  id: "evt_sub",
  type,
  data: {
    object: { id: "sub_1", customer: "cus_1", status, items: { data: [{ current_period_end: PERIOD_END }] } },
  },
});

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  h.event = null;
  h.calls = [];
  h.answers = {};
  h.afterTasks = [];
  h.afterRefuses = false;
  h.capture.mockClear();
  h.report.mockClear();
  h.retrieve.mockReset().mockResolvedValue({
    id: "sub_1",
    status: "active",
    items: { data: [{ current_period_end: PERIOD_END }] },
  });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("the Stripe webhook: who may call it", () => {
  it("turns away a call without a signature, and touches nothing", async () => {
    h.event = checkoutCompleted();
    const res = await deliver(null);
    expect(res.status).toBe(400);
    expect(h.calls).toEqual([]);
  });

  it("turns away a signature that does not verify, and touches nothing", async () => {
    const res = await deliver();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid signature" });
    expect(h.calls).toEqual([]);
  });

  it("acknowledges an event it has no use for", async () => {
    h.event = { id: "evt_other", type: "customer.created", data: { object: {} } };
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(h.calls).toEqual([]);
  });
});

describe("the Stripe webhook: a completed checkout", () => {
  it("writes the buyer's Pro row and acknowledges the event", async () => {
    h.event = checkoutCompleted();
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(h.retrieve).toHaveBeenCalledWith("sub_1");
    // Exactly what this event has always written.
    expect(h.calls).toEqual([
      {
        table: "user_subscriptions",
        op: "upsert",
        values: {
          user_id: "user-1",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
          plan: "pro",
          status: "active",
          current_period_end: "2026-01-01T00:00:00.000Z",
        },
        options: { onConflict: "user_id" },
        filters: [],
      },
    ]);
  });

  it("reads the period end from an older API version's field when it is there", async () => {
    h.event = checkoutCompleted();
    h.retrieve.mockResolvedValue({ id: "sub_1", status: "active", current_period_end: PERIOD_END + 86400 });
    await deliver();
    expect(h.calls[0].values).toMatchObject({ current_period_end: "2026-01-02T00:00:00.000Z" });
  });

  it("records the conversion once the response has gone, not before", async () => {
    h.event = checkoutCompleted();
    const res = await deliver();

    expect(res.status).toBe(200);
    // Nothing was sent while Stripe was waiting for its answer.
    expect(h.capture).not.toHaveBeenCalled();
    expect(h.afterTasks).toHaveLength(1);

    await runAfterTasks();
    expect(h.capture).toHaveBeenCalledOnce();
    expect(h.capture).toHaveBeenCalledWith("user-1", "subscription_activated", {
      stripe_subscription_id: "sub_1",
      plan: "pro",
    });
  });

  // Production until November 2026: the result of this write was never read,
  // so a failed write was answered with 200. Stripe took that as delivered and
  // never sent the event again: the buyer had paid and was not Pro, while
  // PostHog counted a conversion.
  it("answers 500 when the Pro row cannot be written, so that Stripe sends the event again", async () => {
    h.event = checkoutCompleted();
    h.answers["user_subscriptions.upsert"] = { error: { message: "TypeError: fetch failed", code: "" } };

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(await res.json()).not.toHaveProperty("received");
    expect(consoleError).toHaveBeenCalledWith(
      "[stripe webhook] subscription upsert failed for event evt_checkout (checkout.session.completed):",
      "TypeError: fetch failed"
    );

    // No conversion is counted for a buyer who does not have Pro.
    await runAfterTasks();
    expect(h.capture).not.toHaveBeenCalledWith("user-1", "subscription_activated", expect.anything());
    // The failure is reported on the job, with no personal data.
    expect(h.capture).toHaveBeenCalledOnce();
    expect(h.capture).toHaveBeenCalledWith("system:stripe-webhook", "stripe_webhook_failed", {
      event_id: "evt_checkout",
      event_type: "checkout.session.completed",
      step: "subscription upsert",
      code: null,
    });
    // And once as a server error, which names the handler and the step, never the database's words.
    expect(h.report).toHaveBeenCalledOnce();
    const [fault, place] = h.report.mock.calls[0] as unknown as [Error, unknown];
    expect(fault.message).toBe("Stripe webhook: subscription upsert failed");
    expect(place).toEqual({ route: "/api/stripe/webhook", method: "POST", kind: "route" });
  });

  it("records the buyer when Stripe delivers the event again after a failed write", async () => {
    h.event = checkoutCompleted();
    h.answers["user_subscriptions.upsert"] = { error: { message: "connection reset", code: "08006" } };
    expect((await deliver()).status).toBe(500);
    await runAfterTasks();
    h.capture.mockClear();

    h.answers = {};
    expect((await deliver()).status).toBe(200);
    await runAfterTasks();
    expect(h.capture).toHaveBeenCalledOnce();
    expect(h.capture).toHaveBeenCalledWith("user-1", "subscription_activated", expect.anything());
  });

  // A step that throws is a failure like any other: without this the answer
  // was the framework's own 500, with no event id in the log and no report.
  it("answers 500, and reports it, when Stripe cannot be asked for the subscription", async () => {
    h.event = checkoutCompleted();
    h.retrieve.mockRejectedValue(new Error("An error occurred with our connection to Stripe. Request was retried 1 times."));

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "The event could not be recorded" });
    expect(h.calls).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "[stripe webhook] event handling failed for event evt_checkout (checkout.session.completed):",
      "An error occurred with our connection to Stripe. Request was retried 1 times."
    );

    await runAfterTasks();
    expect(h.capture).toHaveBeenCalledOnce();
    expect(h.capture).toHaveBeenCalledWith("system:stripe-webhook", "stripe_webhook_failed", {
      event_id: "evt_checkout",
      event_type: "checkout.session.completed",
      step: "event handling",
      code: null,
    });
    // The error that was thrown is the one reported.
    expect(h.report).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: "An error occurred with our connection to Stripe. Request was retried 1 times." }),
      { route: "/api/stripe/webhook", method: "POST", kind: "route" }
    );
  });

  it("still acknowledges a written event where nothing can be scheduled after the response", async () => {
    h.event = checkoutCompleted();
    h.afterRefuses = true;

    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toHaveLength(1);
    expect(h.capture).toHaveBeenCalledWith("user-1", "subscription_activated", expect.anything());
  });

  it("does nothing for a session that carries no account", async () => {
    h.event = checkoutCompleted({ metadata: {} });
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(h.calls).toEqual([]);
    expect(h.afterTasks).toEqual([]);
  });

  it("does nothing for a session without a subscription", async () => {
    h.event = checkoutCompleted({ subscription: null });
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(h.retrieve).not.toHaveBeenCalled();
    expect(h.calls).toEqual([]);
  });
});

describe("the Stripe webhook: an added exam", () => {
  const addOn = () =>
    checkoutCompleted({
      subscription: null,
      metadata: { supabase_user_id: "user-1", kind: "cert_addon", cert_id: "cert-9" },
    });

  it("adds the exam to the buyer's plan and reports it after the response", async () => {
    h.event = addOn();
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(h.calls).toEqual([
      {
        table: "user_enrollments",
        op: "upsert",
        values: { user_id: "user-1", certification_id: "cert-9", is_active: true },
        options: { onConflict: "user_id,certification_id" },
        filters: [],
      },
    ]);
    expect(h.capture).not.toHaveBeenCalled();
    await runAfterTasks();
    expect(h.capture).toHaveBeenCalledWith("user-1", "cert_added", { certification_id: "cert-9" });
  });

  // This write's error used to be logged and then acknowledged with 200.
  it("answers 500 when the exam cannot be added, and reports no purchase", async () => {
    h.event = addOn();
    h.answers["user_enrollments.upsert"] = { error: { message: "permission denied", code: "42501" } };

    const res = await deliver();
    expect(res.status).toBe(500);
    await runAfterTasks();
    expect(h.capture).not.toHaveBeenCalledWith("user-1", "cert_added", expect.anything());
    expect(h.capture).toHaveBeenCalledWith(
      "system:stripe-webhook",
      "stripe_webhook_failed",
      expect.objectContaining({ step: "cert add-on enrollment", code: "42501" })
    );
  });
});

describe("the Stripe webhook: a subscription that changes", () => {
  /** The customer's row, holding the subscription the events below are about unless told otherwise. */
  const known = (holds: string | null = "sub_1") => {
    h.answers["user_subscriptions.select"] = {
      data: { user_id: "user-1", stripe_subscription_id: holds },
      error: null,
    };
  };

  it.each([
    ["active", "pro", "active"],
    ["trialing", "pro", "trialing"],
    ["past_due", "free", "past_due"],
    ["unpaid", "free", "canceled"],
    ["canceled", "free", "canceled"],
  ])("writes a subscription that is %s as plan %s, status %s", async (stripeStatus, plan, status) => {
    known();
    h.event = subscriptionEvent("customer.subscription.updated", stripeStatus);

    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([
      {
        table: "user_subscriptions",
        op: "update",
        values: { plan, status, current_period_end: "2026-01-01T00:00:00.000Z" },
        filters: [["stripe_customer_id", "cus_1"]],
      },
    ]);
  });

  it("answers 500 when the change cannot be written", async () => {
    known();
    h.event = subscriptionEvent("customer.subscription.updated", "active");
    h.answers["user_subscriptions.update"] = { error: { message: "timeout", code: "57014" } };
    expect((await deliver()).status).toBe(500);
  });

  it("acknowledges a change for a customer it has no row for, and writes nothing", async () => {
    h.event = subscriptionEvent("customer.subscription.updated", "active");
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([]);
  });

  // A read that fails must not be taken for "no such customer": the event
  // would be acknowledged and the change (a cancellation, say) lost.
  it("answers 500 when the customer's row cannot be read", async () => {
    h.event = subscriptionEvent("customer.subscription.updated", "canceled");
    h.answers["user_subscriptions.select"] = { data: null, error: { message: "TypeError: fetch failed" } };

    const res = await deliver();
    expect(res.status).toBe(500);
    expect(writes()).toEqual([]);
  });

  it("ends Pro when the subscription is deleted", async () => {
    known();
    h.event = subscriptionEvent("customer.subscription.deleted", "canceled");
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([
      {
        table: "user_subscriptions",
        op: "update",
        values: { plan: "free", status: "canceled", stripe_subscription_id: null },
        filters: [["stripe_customer_id", "cus_1"]],
      },
    ]);
  });

  // A cancellation whose write failed used to leave Pro switched on for good.
  it("answers 500 when the end of a subscription cannot be written", async () => {
    known();
    h.event = subscriptionEvent("customer.subscription.deleted", "canceled");
    h.answers["user_subscriptions.update"] = { error: { message: "TypeError: fetch failed" } };
    expect((await deliver()).status).toBe(500);
  });

  it("answers 500 when the row cannot be read for a deleted subscription", async () => {
    h.event = subscriptionEvent("customer.subscription.deleted", "canceled");
    h.answers["user_subscriptions.select"] = { data: null, error: { message: "TypeError: fetch failed" } };
    const res = await deliver();
    expect(res.status).toBe(500);
    expect(writes()).toEqual([]);
  });

  it("marks the row past due when a payment for its plan fails", async () => {
    known();
    h.event = {
      id: "evt_invoice",
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1", subscription: "sub_1" } },
    };
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([
      {
        table: "user_subscriptions",
        op: "update",
        values: { status: "past_due" },
        filters: [["stripe_customer_id", "cus_1"]],
      },
    ]);
  });

  it("reads the invoice's subscription from the newer shape of the API as well", async () => {
    known("sub_1");
    h.event = {
      id: "evt_invoice",
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1", parent: { subscription_details: { subscription: "sub_other" } } } },
    };
    expect((await deliver()).status).toBe(200);
    expect(writes()).toEqual([]);
  });

  it("answers 500 when the failed payment cannot be recorded", async () => {
    known();
    h.event = { id: "evt_invoice", type: "invoice.payment_failed", data: { object: { customer: "cus_1" } } };
    h.answers["user_subscriptions.update"] = { error: { message: "TypeError: fetch failed" } };
    expect((await deliver()).status).toBe(500);
  });
});

// Stripe can hold more than one subscription for a customer: a first attempt
// whose payment was never completed, beside the plan that was then paid for.
// The unfinished one expires about a day later. Until November 2026 that
// event, matched by customer alone, ended the paid plan.
describe("the Stripe webhook: an event about a subscription the row does not hold", () => {
  const holds = (subscriptionId: string | null) => {
    h.answers["user_subscriptions.select"] = {
      data: { user_id: "user-1", stripe_subscription_id: subscriptionId },
      error: null,
    };
  };
  const about = (type: string, status: string, id: string) => ({
    id: "evt_sub",
    type,
    data: { object: { id, customer: "cus_1", status, items: { data: [{ current_period_end: PERIOD_END }] } } },
  });

  it("leaves the paid plan alone when another subscription of the customer changes", async () => {
    holds("sub_paid");
    h.event = about("customer.subscription.updated", "incomplete_expired", "sub_unfinished");
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([]);
  });

  it("leaves the paid plan alone when another subscription of the customer ends", async () => {
    holds("sub_paid");
    h.event = about("customer.subscription.deleted", "canceled", "sub_unfinished");
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([]);
  });

  it("leaves the paid plan alone when a payment for another subscription fails", async () => {
    holds("sub_paid");
    h.event = {
      id: "evt_invoice",
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1", subscription: "sub_unfinished" } },
    };
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([]);
  });

  it("does not call a payment past due for someone who has never had a plan", async () => {
    holds(null);
    h.event = {
      id: "evt_invoice",
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1", subscription: "sub_first" } },
    };
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([]);
  });

  it("writes nothing for a failed payment of a customer it has no row for", async () => {
    h.event = { id: "evt_invoice", type: "invoice.payment_failed", data: { object: { customer: "cus_unknown" } } };
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([]);
  });

  // A row with no subscription on it (a checkout not yet confirmed, or a plan
  // that has ended) takes the change: events do not always arrive in order,
  // and the subscription's own event may come before the checkout's.
  it("still records a change for a row that holds no subscription yet", async () => {
    holds(null);
    h.event = about("customer.subscription.updated", "active", "sub_new");
    const res = await deliver();
    expect(res.status).toBe(200);
    expect(writes()).toEqual([
      {
        table: "user_subscriptions",
        op: "update",
        values: { plan: "pro", status: "active", current_period_end: "2026-01-01T00:00:00.000Z" },
        filters: [["stripe_customer_id", "cus_1"]],
      },
    ]);
  });
});

// Stripe delivers an event again, for up to three days, when a write failed.
describe("the Stripe webhook: a checkout delivered again after its subscription has ended", () => {
  it.each(["canceled", "incomplete_expired"])(
    "grants nothing and reports no conversion when the subscription is %s by then",
    async (status) => {
      h.retrieve.mockResolvedValue({ id: "sub_1", status, items: { data: [{ current_period_end: PERIOD_END }] } });
      h.event = checkoutCompleted();

      const res = await deliver();
      expect(res.status).toBe(200);
      expect(writes()).toEqual([]);
      await runAfterTasks();
      expect(h.capture).not.toHaveBeenCalled();
    }
  );
});
