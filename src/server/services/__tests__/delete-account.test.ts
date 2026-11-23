import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/contracts/common";

vi.mock("@/env", () => ({ serverEnv: vi.fn(), publicEnv: {} }));

const h = vi.hoisted(() => ({
  /** What the read of the member's subscription row answers. */
  row: {
    data: null as { stripe_customer_id: string | null } | null,
    error: null as { message: string } | null,
  },
  reads: [] as string[],
  deleteUser: vi.fn(),
  list: vi.fn(),
  cancel: vi.fn(),
  /** The list of the customer's payment pages, and the expiry of one. */
  pages: vi.fn(),
  expire: vi.fn(),
  /** When set, building the Stripe client fails, as it does without its key. */
  noStripe: null as Error | null,
}));

vi.mock("@/server/supabase/admin", () => ({
  createAdminClient: () => ({
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
    auth: { admin: { deleteUser: h.deleteUser } },
  }),
}));

// The real cancellation code, against a Stripe client that never leaves the test.
vi.mock("@/server/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/stripe")>()),
  getStripe: () => {
    if (h.noStripe) throw h.noStripe;
    return {
      subscriptions: { list: h.list, cancel: h.cancel },
      checkout: { sessions: { list: h.pages, expire: h.expire } },
    };
  },
}));

import {
  ACCOUNT_NOT_DELETED,
  CANCELED_BUT_NOT_DELETED,
  SUBSCRIPTION_NOT_CANCELED,
  deleteAccount,
} from "../delete-account";

const subscriptions = (...subs: { id: string; status: string }[]) =>
  h.list.mockResolvedValue({ data: subs, has_more: false });

/** The customer's payment pages that are still open. A test that names none has none. */
const openPaymentPages = (...ids: string[]) =>
  h.pages.mockResolvedValue({ data: ids.map((id) => ({ id })), has_more: false });

/** Runs the deletion and returns the error it ends with. */
async function failure(): Promise<ApiError> {
  const err = await deleteAccount("user-1").then(
    () => null,
    (e: unknown) => e
  );
  expect(err).toBeInstanceOf(ApiError);
  return err as ApiError;
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  h.row = { data: null, error: null };
  h.reads = [];
  h.noStripe = null;
  h.deleteUser.mockReset().mockResolvedValue({ data: {}, error: null });
  h.list.mockReset();
  h.cancel.mockReset().mockResolvedValue({ status: "canceled" });
  h.pages.mockReset();
  openPaymentPages();
  h.expire.mockReset().mockResolvedValue({ status: "expired" });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("deleteAccount", () => {
  it("deletes an account that never had a billing record without calling Stripe", async () => {
    await deleteAccount("user-1");
    expect(h.reads).toEqual(["user_subscriptions.stripe_customer_id where user_id = user-1"]);
    expect(h.list).not.toHaveBeenCalled();
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("deletes an account whose row has no Stripe customer without calling Stripe", async () => {
    h.row.data = { stripe_customer_id: null };
    await deleteAccount("user-1");
    expect(h.list).not.toHaveBeenCalled();
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
  });

  // Until November 2026 the account was deleted and the subscription was left
  // running at Stripe, with no account from which to cancel it.
  it("cancels every live subscription of the customer first, and only then deletes the account", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    subscriptions({ id: "sub_paid", status: "active" }, { id: "sub_late", status: "past_due" });

    await deleteAccount("user-1");

    expect(h.list).toHaveBeenCalledWith({ customer: "cus_9", limit: 100 });
    expect(h.cancel.mock.calls.map(([id]) => id)).toEqual(["sub_paid", "sub_late"]);
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
    // The last cancellation came before the deletion.
    expect(h.cancel.mock.invocationCallOrder[1]).toBeLessThan(h.deleteUser.mock.invocationCallOrder[0]);
  });

  it("deletes the account of a customer whose subscriptions have all ended", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    subscriptions({ id: "sub_old", status: "canceled" });
    await deleteAccount("user-1");
    expect(h.cancel).not.toHaveBeenCalled();
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("keeps the account, and says why, when Stripe cannot be reached", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    h.list.mockRejectedValue(new Error("An error occurred with our connection to Stripe. Request was retried 1 times."));

    const err = await failure();
    expect(err.message).toBe(
      "Your account could not be deleted because your subscription could not be canceled. Please try again, or write to support@certbench.dev."
    );
    expect(err.message).toBe(SUBSCRIPTION_NOT_CANCELED);
    // Not "internal": the member reads this sentence, and an internal error is shown as a general one.
    expect(err.code).toBe("conflict");
    expect(h.deleteUser).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it("keeps the account when one of two subscriptions cannot be canceled", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    subscriptions({ id: "sub_1", status: "active" }, { id: "sub_2", status: "active" });
    h.cancel.mockResolvedValueOnce({ status: "canceled" }).mockRejectedValueOnce(new Error("Request timed out"));

    expect((await failure()).message).toBe(SUBSCRIPTION_NOT_CANCELED);
    expect(h.deleteUser).not.toHaveBeenCalled();
  });

  it("keeps the account when the Stripe client cannot be built", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    h.noStripe = new Error("Missing required environment variable STRIPE_SECRET_KEY");

    expect((await failure()).message).toBe(SUBSCRIPTION_NOT_CANCELED);
    expect(h.deleteUser).not.toHaveBeenCalled();
  });

  it("keeps the account, and leaves Stripe alone, when the subscription row cannot be read", async () => {
    h.row = { data: null, error: { message: "TypeError: fetch failed" } };

    const err = await failure();
    expect(err.message).toBe(ACCOUNT_NOT_DELETED);
    expect(err.message).not.toContain("fetch failed");
    expect(h.list).not.toHaveBeenCalled();
    expect(h.cancel).not.toHaveBeenCalled();
    expect(h.deleteUser).not.toHaveBeenCalled();
  });

  it("says that the subscription is canceled when the deletion itself then fails", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    subscriptions({ id: "sub_paid", status: "active" });
    h.deleteUser.mockResolvedValue({ data: null, error: { message: "Database error deleting user" } });

    const err = await failure();
    expect(err.message).toBe(
      "Your subscription has been canceled, but your account could not be deleted. Please try again, or write to support@certbench.dev."
    );
    expect(err.message).toBe(CANCELED_BUT_NOT_DELETED);
    expect(err.code).toBe("conflict");
  });

  it("never shows the database's own words when the deletion fails", async () => {
    h.deleteUser.mockResolvedValue({ data: null, error: { message: "Database error deleting user" } });

    const err = await failure();
    expect(err.message).toBe(ACCOUNT_NOT_DELETED);
    expect(err.code).toBe("internal");
  });

  it("deletes the account of a customer that Stripe no longer has", async () => {
    h.row.data = { stripe_customer_id: "cus_gone" };
    h.list.mockRejectedValue(
      Object.assign(new Error("No such customer: 'cus_gone'"), { code: "resource_missing", param: "customer" })
    );
    await deleteAccount("user-1");
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
  });
});

// An open payment page can still be paid. Until November 2026 it outlived the
// account, and one that was paid afterwards started a subscription that no
// account held and that nobody could cancel from the site.
describe("deleteAccount: payment pages that are still open", () => {
  it("expires them before the subscriptions are canceled and the account is deleted", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    openPaymentPages("cs_plan", "cs_added_exam");
    subscriptions({ id: "sub_paid", status: "active" });

    await deleteAccount("user-1");

    expect(h.pages).toHaveBeenCalledExactlyOnceWith({ customer: "cus_9", status: "open", limit: 100 });
    expect(h.expire.mock.calls.map(([id]) => id)).toEqual(["cs_plan", "cs_added_exam"]);
    expect(h.cancel.mock.calls.map(([id]) => id)).toEqual(["sub_paid"]);
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
    // The last page had expired before the subscriptions were read: a page
    // that was paid a moment earlier has its subscription in that list.
    expect(h.expire.mock.invocationCallOrder[1]).toBeLessThan(h.list.mock.invocationCallOrder[0]);
    expect(h.cancel.mock.invocationCallOrder[0]).toBeLessThan(h.deleteUser.mock.invocationCallOrder[0]);
  });

  it("expires them for an account that never had a subscription", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    openPaymentPages("cs_abandoned");
    subscriptions();

    await deleteAccount("user-1");

    expect(h.expire).toHaveBeenCalledExactlyOnceWith("cs_abandoned");
    expect(h.cancel).not.toHaveBeenCalled();
    expect(h.expire.mock.invocationCallOrder[0]).toBeLessThan(h.deleteUser.mock.invocationCallOrder[0]);
  });

  it("keeps the account, and cancels nothing, when a payment page cannot be expired", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    openPaymentPages("cs_1", "cs_2");
    subscriptions({ id: "sub_paid", status: "active" });
    h.expire.mockResolvedValueOnce({ status: "expired" }).mockRejectedValueOnce(new Error("The Checkout Session is not open."));

    const err = await failure();
    // The same answer as for a subscription that could not be canceled.
    expect(err.message).toBe(SUBSCRIPTION_NOT_CANCELED);
    expect(err.code).toBe("conflict");
    expect(h.list).not.toHaveBeenCalled();
    expect(h.cancel).not.toHaveBeenCalled();
    expect(h.deleteUser).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it("keeps the account when the payment pages cannot be read", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    subscriptions({ id: "sub_paid", status: "active" });
    h.pages.mockRejectedValue(new Error("An error occurred with our connection to Stripe."));

    expect((await failure()).message).toBe(SUBSCRIPTION_NOT_CANCELED);
    expect(h.expire).not.toHaveBeenCalled();
    expect(h.cancel).not.toHaveBeenCalled();
    expect(h.deleteUser).not.toHaveBeenCalled();
  });

  it("does not ask Stripe for them when the account has no Stripe customer", async () => {
    h.row.data = { stripe_customer_id: null };
    await deleteAccount("user-1");
    expect(h.pages).not.toHaveBeenCalled();
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("has none to expire for a customer that Stripe no longer has", async () => {
    h.row.data = { stripe_customer_id: "cus_gone" };
    const gone = () =>
      Object.assign(new Error("No such customer: 'cus_gone'"), { code: "resource_missing", param: "customer" });
    h.pages.mockRejectedValue(gone());
    h.list.mockRejectedValue(gone());

    await deleteAccount("user-1");
    expect(h.expire).not.toHaveBeenCalled();
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
  });

  // An expired payment page is not a canceled subscription: the member is not told that one was canceled.
  it("says only that the account was not deleted when the deletion fails after a page has expired", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    openPaymentPages("cs_abandoned");
    subscriptions();
    h.deleteUser.mockResolvedValue({ data: null, error: { message: "Database error deleting user" } });

    const err = await failure();
    expect(err.message).toBe(ACCOUNT_NOT_DELETED);
    expect(err.code).toBe("internal");
  });
});
