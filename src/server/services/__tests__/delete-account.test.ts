import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
  /**
   * Accounts that still hold a row in each table whose reference to the
   * profile has no delete rule. While one is left, deleting that user fails,
   * as the database refuses it.
   */
  blocking: { question_flags: [] as string[], community_reports: [] as string[] } as Record<string, string[]>,
  /** A delete of rows in a table: answers the error set for that table in deleteErrors. */
  rowDelete: vi.fn(),
  deleteErrors: {} as Record<string, { message: string; code?: string } | undefined>,
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
      delete: () => ({
        eq: async (column: string, value: string) => h.rowDelete(table, column, value),
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
  h.blocking = { question_flags: [], community_reports: [] };
  h.deleteErrors = {};
  h.rowDelete.mockReset().mockImplementation(async (table: string, column: string, value: string) => {
    const error = h.deleteErrors[table] ?? null;
    const owner = { question_flags: "user_id", community_reports: "reporter_id" }[table];
    if (!error && column === owner) h.blocking[table] = (h.blocking[table] ?? []).filter((id) => id !== value);
    return { error };
  });
  // The database refuses to delete a user who still holds a flag or a report.
  h.deleteUser.mockReset().mockImplementation(async (id: string) =>
    Object.values(h.blocking).some((owners) => owners.includes(id))
      ? { data: null, error: { message: "Database error deleting user" } }
      : { data: {}, error: null }
  );
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
    // Not a retry: once the cancellation is reported the account has no Pro,
    // and the profile page, where the deletion is asked for, is for Pro only.
    expect(err.message).toBe(
      "Your subscription has been canceled, but your account could not be deleted. Please write to support@certbench.dev and ask for it to be deleted."
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

// question_flags.user_id and community_reports.reporter_id reference the
// profile with no delete rule (migrations 013 and 015). Until November 2026 a
// member who had flagged a question or reported a study set had the
// subscription canceled and then kept an account that could never be deleted.
describe("deleteAccount: question flags and study set reports", () => {
  it("deletes a paying member who has flagged a question and reported a study set", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    subscriptions({ id: "sub_paid", status: "active" });
    h.blocking = { question_flags: ["user-1"], community_reports: ["user-1"] };

    await deleteAccount("user-1");

    expect(h.rowDelete.mock.calls).toEqual([
      ["question_flags", "user_id", "user-1"],
      ["community_reports", "reporter_id", "user-1"],
    ]);
    expect(h.cancel.mock.calls.map(([id]) => id)).toEqual(["sub_paid"]);
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
    expect(await h.deleteUser.mock.results[0].value).toEqual({ data: {}, error: null });
    // Both rows were gone before anything was done at Stripe.
    expect(h.rowDelete.mock.invocationCallOrder[1]).toBeLessThan(h.pages.mock.invocationCallOrder[0]);
  });

  it("deletes a member with a flag who never had a Stripe customer", async () => {
    h.blocking = { question_flags: ["user-1"], community_reports: [] };

    await deleteAccount("user-1");

    expect(h.rowDelete).toHaveBeenCalledWith("question_flags", "user_id", "user-1");
    expect(await h.deleteUser.mock.results[0].value).toEqual({ data: {}, error: null });
  });

  it("deletes only the rows of the account that is deleted", async () => {
    h.blocking = { question_flags: ["user-1", "user-2"], community_reports: ["user-2"] };

    await deleteAccount("user-1");

    expect(h.blocking).toEqual({ question_flags: ["user-2"], community_reports: ["user-2"] });
  });

  it("keeps the account, and cancels nothing, when the flags cannot be deleted", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    openPaymentPages("cs_open");
    subscriptions({ id: "sub_paid", status: "active" });
    h.blocking = { question_flags: ["user-1"], community_reports: [] };
    h.deleteErrors.question_flags = { message: "TypeError: fetch failed" };

    const err = await failure();
    expect(err.message).toBe(ACCOUNT_NOT_DELETED);
    expect(err.message).not.toContain("fetch failed");
    expect(err.code).toBe("internal");
    expect(h.pages).not.toHaveBeenCalled();
    expect(h.expire).not.toHaveBeenCalled();
    expect(h.list).not.toHaveBeenCalled();
    expect(h.cancel).not.toHaveBeenCalled();
    expect(h.deleteUser).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it("keeps the account, and cancels nothing, when the study set reports cannot be deleted", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    subscriptions({ id: "sub_paid", status: "active" });
    h.blocking = { question_flags: [], community_reports: ["user-1"] };
    h.deleteErrors.community_reports = { message: "permission denied for table community_reports" };

    const err = await failure();
    expect(err.message).toBe(ACCOUNT_NOT_DELETED);
    expect(h.pages).not.toHaveBeenCalled();
    expect(h.cancel).not.toHaveBeenCalled();
    expect(h.deleteUser).not.toHaveBeenCalled();
  });

  // The live database has differed from the migration files before. A table it
  // does not have holds no row that could stand in the way of the deletion.
  it.each([
    ["question_flags", { message: "Could not find the table 'public.question_flags' in the schema cache", code: "PGRST205" }],
    ["community_reports", { message: 'relation "public.community_reports" does not exist', code: "42P01" }],
  ])("deletes the account when %s does not exist in the database", async (table, error) => {
    h.row.data = { stripe_customer_id: "cus_9" };
    subscriptions({ id: "sub_paid", status: "active" });
    h.deleteErrors[table] = error;

    await deleteAccount("user-1");

    expect(h.cancel).toHaveBeenCalledWith("sub_paid");
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
    expect(await h.deleteUser.mock.results[0].value).toEqual({ data: {}, error: null });
  });

  it("still stops for any other failure of the same delete", async () => {
    h.row.data = { stripe_customer_id: "cus_9" };
    h.deleteErrors.question_flags = { message: "permission denied for table question_flags", code: "42501" };

    expect((await failure()).message).toBe(ACCOUNT_NOT_DELETED);
    expect(h.pages).not.toHaveBeenCalled();
    expect(h.deleteUser).not.toHaveBeenCalled();
  });

  it("leaves both tables alone when the subscription row cannot be read", async () => {
    h.row = { data: null, error: { message: "TypeError: fetch failed" } };
    h.blocking = { question_flags: ["user-1"], community_reports: ["user-1"] };

    expect((await failure()).message).toBe(ACCOUNT_NOT_DELETED);
    expect(h.rowDelete).not.toHaveBeenCalled();
  });
});

describe("migration 034: the account rows that did not cascade", () => {
  const MIGRATIONS = join(process.cwd(), "supabase/migrations");
  const read = (file: string) => readFileSync(join(MIGRATIONS, file), "utf8");

  /** A migration's statements, without its comments. */
  const statements = (file: string) =>
    read(file)
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--"))
      .join(" ")
      .split(";")
      .map((statement) => statement.replace(/\s+/g, " ").trim().toLowerCase())
      .filter(Boolean);

  it("recreates both foreign keys with ON DELETE CASCADE, in one transaction", () => {
    expect(statements("034_cascade_account_rows.sql")).toEqual([
      "begin",
      "alter table public.question_flags drop constraint question_flags_user_id_fkey, add constraint question_flags_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade",
      "alter table public.community_reports drop constraint community_reports_reporter_id_fkey, add constraint community_reports_reporter_id_fkey foreign key (reporter_id) references public.profiles (id) on delete cascade",
      "commit",
    ]);
  });

  // The live database has differed from these files before: the owner's check
  // looks for every key that would refuse a deletion, not only the two known.
  it("asks the database, before anything runs, for every key that would refuse an account's deletion", () => {
    const header = read("034_cascade_account_rows.sql")
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith("--"))
      .map((line) => line.trim().replace(/^--\s?/, ""))
      .join(" ")
      .replace(/\s+/g, " ");
    expect(header).toContain(
      "select conrelid::regclass as table_name, conname, confdeltype from pg_constraint where contype = 'f' and confrelid in ('public.profiles'::regclass, 'auth.users'::regclass) and confdeltype in ('a', 'r') order by 1, 2;"
    );
  });

  // If this fails, a migration has added a reference to an account with no
  // delete rule: the database would then refuse to delete that account, after
  // its subscription had been canceled. Give it ON DELETE CASCADE.
  it("leaves no other reference to an account without a delete rule", () => {
    const withoutRule: string[] = [];
    for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql")).sort()) {
      read(file)
        .split(/\r?\n/)
        .forEach((line) => {
          if (line.trim().startsWith("--")) return;
          if (/references\s+(public\.)?(profiles|auth\.users)\s*\(/i.test(line) && !/on delete cascade/i.test(line)) {
            withoutRule.push(`${file}: ${line.trim()}`);
          }
        });
    }
    expect(withoutRule).toEqual([
      "013_community_production.sql: reporter_id uuid NOT NULL REFERENCES profiles(id),",
      "015_question_flags.sql: user_id uuid NOT NULL REFERENCES profiles(id),",
    ]);
  });
});
