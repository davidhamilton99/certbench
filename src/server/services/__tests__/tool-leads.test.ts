import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The study plan email requested from a free tool, against an in-memory
 * stand-in for the leads table: one email in 24 hours for an address and a
 * tool, an honest answer about what happened, and a claim that is given back
 * when the email could not be sent.
 */

type Row = Record<string, unknown>;
type Sent = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
};
type Step = "read" | "insert" | "claim" | "release";

const h = vi.hoisted(() => ({
  leads: [] as Record<string, unknown>[],
  /** Accounts' email preferences, for an account's own unsubscribe. */
  prefs: [] as Record<string, unknown>[],
  /** The sign-in service's accounts: id to address. */
  accounts: {} as Record<string, string>,
  nextId: 1,
  /** Steps that the database refuses. */
  failing: new Set<string>(),
  /** The next insert meets a row that another request created a moment ago. */
  raceOnInsert: false,
  createAdminClient: vi.fn(),
  sendEmail: vi.fn<(email: Sent) => Promise<boolean>>(async () => true),
}));

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
  // No optional setting is set: the email's footer prints no postal address.
  serverEnvOptional: () => undefined,
}));
vi.mock("@/server/email/resend", () => ({ sendEmail: h.sendEmail }));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: h.createAdminClient }));

import { RESEND_AFTER_MS, captureLead } from "../tool-leads";
import { unsubscribe } from "@/server/email/unsubscribe";
import { ilike } from "@/server/email/__tests__/ilike";
import type { Db } from "@/server/supabase/server";

const refused = (step: Step) => ({ data: null, error: { code: "XX000", message: `${step} refused` } });

/**
 * Just enough of the Supabase query builder for the leads table, and for an
 * account's own unsubscribe (its email preferences and its address), which
 * records the address among the leads.
 */
function fakeAdmin() {
  return {
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: { id, email: h.accounts[id] } }, error: null }),
      },
    },
    from(table: string) {
      if (table === "email_preferences") {
        let patch: Row = {};
        const filters: ((r: Row) => boolean)[] = [];
        const prefs = {
          update: (p: Row) => ((patch = p), prefs),
          eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), prefs),
          select: () => prefs,
          then: (ok: (v: unknown) => unknown) => {
            const hit = h.prefs.filter((r) => filters.every((f) => f(r)));
            for (const row of hit) Object.assign(row, patch);
            return Promise.resolve({ data: hit.map((row) => ({ ...row })), error: null }).then(ok);
          },
        };
        return prefs;
      }
      if (table !== "tool_leads") throw new Error(`unexpected table ${table}`);
      const filters: ((r: Row) => boolean)[] = [];
      let mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
      let payload: Row = {};
      const matching = () => h.leads.filter((r) => filters.every((f) => f(r)));
      // The database answers with copies: a row read earlier does not change when the table does.
      const copies = (rows: Row[]) => rows.map((r) => ({ ...r }));

      const settle = () => {
        if (mode === "select") return h.failing.has("read") ? refused("read") : { data: copies(matching()), error: null };
        if (mode === "upsert") {
          const hit = h.leads.find((r) => r.email === payload.email && r.source === payload.source);
          if (hit) Object.assign(hit, payload);
          else h.leads.push({ id: `lead-${h.nextId}`, unsubscribe_token: `00000000-0000-4000-8000-00000000000${h.nextId++}`, context: {}, ...payload });
          return { data: null, error: null };
        }
        if (mode === "insert") {
          if (h.failing.has("insert")) return refused("insert");
          const taken = h.leads.some((r) => r.email === payload.email && r.source === payload.source);
          if (taken || h.raceOnInsert) {
            h.raceOnInsert = false;
            return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
          }
          const created = {
            id: `lead-${h.nextId}`,
            unsubscribe_token: `00000000-0000-4000-8000-00000000000${h.nextId++}`,
            unsubscribed: false,
            ...payload,
          };
          h.leads.push(created);
          return { data: copies([created]), error: null };
        }
        if (mode === "update") {
          // The claim reads back what it changed; the release does not.
          const step: Step = "context" in payload ? "claim" : "release";
          if (h.failing.has(step)) return refused(step);
          const hit = matching();
          for (const row of hit) Object.assign(row, payload);
          return { data: copies(hit), error: null };
        }
        if (h.failing.has("release")) return refused("release");
        for (const row of matching()) h.leads.splice(h.leads.indexOf(row), 1);
        return { data: null, error: null };
      };

      const q = {
        select: () => q,
        insert: (row: Row) => ((mode = "insert"), (payload = row), q),
        upsert: (row: Row) => ((mode = "upsert"), (payload = row), q),
        update: (patch: Row) => ((mode = "update"), (payload = patch), q),
        delete: () => ((mode = "delete"), q),
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        ilike: (c: string, pattern: string) => {
          const matches = ilike(pattern);
          filters.push((r) => matches(r[c]));
          return q;
        },
        lt: (c: string, v: string) => (filters.push((r) => String(r[c]) < v), q),
        single: async () => {
          const { data, error } = settle();
          return { data: Array.isArray(data) ? data[0] : data, error };
        },
        then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => Promise.resolve(settle()).then(ok, fail),
      };
      return q;
    },
  };
}

const NOON = new Date("2026-11-22T12:00:00.000Z");
const later = (ms: number) => new Date(NOON.getTime() + ms);
const HOUR = 3_600_000;

/** A lead stored earlier: `sentHoursAgo` before noon. */
function stored(email: string, source: string, sentHoursAgo: number, unsubscribed = false) {
  const row = {
    id: `lead-${h.nextId}`,
    email,
    source,
    context: {},
    unsubscribe_token: `00000000-0000-4000-8000-00000000000${h.nextId++}`,
    unsubscribed,
    updated_at: later(-sentHoursAgo * HOUR).toISOString(),
  };
  h.leads.push(row);
  return row;
}

beforeEach(() => {
  h.leads = [];
  h.prefs = [];
  h.accounts = {};
  h.nextId = 1;
  h.failing = new Set();
  h.raceOnInsert = false;
  h.createAdminClient.mockReset();
  h.createAdminClient.mockImplementation(() => fakeAdmin());
  h.sendEmail.mockReset();
  h.sendEmail.mockImplementation(async () => true);
});

describe("captureLead", () => {
  it("stores the lead under the lower-case address and sends the study plan with the unsubscribe address", async () => {
    expect(await captureLead(" Sam@Example.com ", "port-numbers-quiz", { answered: 20, accuracy: 85 }, NOON)).toBe("sent");

    expect(h.leads).toHaveLength(1);
    expect(h.leads[0]).toMatchObject({
      email: "sam@example.com",
      source: "port-numbers-quiz",
      context: { answered: 20, accuracy: 85 },
      updated_at: NOON.toISOString(),
    });

    expect(h.sendEmail).toHaveBeenCalledOnce();
    const email = h.sendEmail.mock.calls[0][0];
    const address = `https://certbench.dev/api/email/unsubscribe?token=${h.leads[0].unsubscribe_token}&scope=lead`;
    expect(email.to).toBe("sam@example.com");
    expect(email.subject).toBe("Your CompTIA study plan");
    expect(email.headers).toEqual({
      "List-Unsubscribe": `<${address}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(email.html).toContain(`href="${address.replace(/&/g, "&amp;")}"`);
    expect(email.text).toContain(`Unsubscribe: ${address}`);
    // The email names its sender and the address at which the sender can be
    // reached, in the footer and at the end of the text part.
    expect(email.html).toContain('Sent by CertBench. To contact CertBench, write to <a href="mailto:support@certbench.dev"');
    expect(
      email.text.endsWith(`\n\nSent by CertBench. To contact CertBench, write to support@certbench.dev.\nUnsubscribe: ${address}`)
    ).toBe(true);
    // The mail service is given a name for this one email, built from the claim: the lead and the time of the send.
    expect(email.idempotencyKey).toBe(`study-plan/${h.leads[0].id}/${NOON.toISOString()}`);
  });

  // The form is public. Before, every accepted request sent the email again.
  it("sends one email in 24 hours for an address and a tool, however the address is typed", async () => {
    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).toBe("sent");
    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, later(HOUR))).toBe("skipped");
    expect(await captureLead("SAM@EXAMPLE.COM", "port-numbers-quiz", {}, later(2 * HOUR))).toBe("skipped");
    expect(await captureLead("Sam@Example.com", "port-numbers-quiz", {}, later(RESEND_AFTER_MS - 1))).toBe("skipped");
    expect(h.sendEmail).toHaveBeenCalledOnce();
    expect(h.leads).toHaveLength(1);

    expect(await captureLead("sam@example.com", "port-numbers-quiz", { answered: 5 }, later(RESEND_AFTER_MS + 1))).toBe("sent");
    expect(h.sendEmail).toHaveBeenCalledTimes(2);
    expect(h.leads).toHaveLength(1);
    expect(h.leads[0]).toMatchObject({ context: { answered: 5 }, updated_at: later(RESEND_AFTER_MS + 1).toISOString() });
  });

  it("counts each tool by itself", async () => {
    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).toBe("sent");
    expect(await captureLead("sam@example.com", "subnetting-practice", {}, NOON)).toBe("sent");
    expect(h.leads.map((r) => r.source)).toEqual(["port-numbers-quiz", "subnetting-practice"]);
  });

  it("never sends to an address that unsubscribed, whoever asks and however long ago", async () => {
    const row = stored("sam@example.com", "port-numbers-quiz", 24 * 30, true);
    const before = row.updated_at;

    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).toBe("skipped");
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(row).toMatchObject({ unsubscribed: true, updated_at: before });
  });

  // The unsubscribe page says "CertBench will not send this study plan email
  // to your address again". An unsubscribe used to hold for one tool only, so
  // the same address was sent the email again from the next tool.
  it("never sends the study plan from any tool to an address that unsubscribed from one of them", async () => {
    const row = stored("sam@example.com", "port-numbers-quiz", 24 * 30, true);

    expect(await captureLead("sam@example.com", "subnetting-practice", {}, NOON)).toBe("skipped");
    expect(await captureLead("Sam@Example.com", "security-plus-acronyms-quiz", {}, NOON)).toBe("skipped");
    expect(h.sendEmail).not.toHaveBeenCalled();
    // No lead is stored for the other tools either: nothing is kept about a request that was not served.
    expect(h.leads).toEqual([row]);
  });

  // The unsubscribe page tells an account "You will no longer receive study
  // emails from CertBench." The form is public, so anyone could still have the
  // study plan sent to that account's address from a tool's page.
  it("never sends the study plan to the address of an account that unsubscribed from study emails", async () => {
    const token = "3f2b8c1e-7a4d-4e9b-9c55-0d1e2f3a4b5c";
    h.prefs = [{ user_id: "u1", unsubscribe_token: token, digest_enabled: true }];
    h.accounts = { u1: "Sam@Example.com" };
    expect(await unsubscribe(fakeAdmin() as unknown as Db, token, null)).toBe("done");

    for (const source of ["port-numbers-quiz", "subnetting-practice", "security-plus-acronyms-quiz"] as const) {
      expect(await captureLead("sam@example.com", source, {}, NOON)).toBe("skipped");
    }
    expect(h.sendEmail).not.toHaveBeenCalled();
    // Another address is sent the plan as before.
    expect(await captureLead("lee@example.com", "port-numbers-quiz", {}, NOON)).toBe("sent");
  });

  it("holds an unsubscribe that was recorded under other capitals, for every tool", async () => {
    stored("Sam@Example.COM", "port-numbers-quiz", 24 * 30, true);
    expect(await captureLead("sam@example.com", "subnetting-practice", {}, NOON)).toBe("skipped");
    expect(await captureLead("SAM@EXAMPLE.COM", "port-numbers-quiz", {}, NOON)).toBe("skipped");
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.leads).toHaveLength(1);
  });

  // "_" is a wildcard in the database's match. It must not make one person's
  // unsubscribe hold for another person's address.
  it("does not take another address's unsubscribe for this one", async () => {
    stored("samXlee@example.com", "port-numbers-quiz", 24 * 30, true);
    stored("sam-lee@example.com", "subnetting-practice", 24 * 30, true);
    expect(await captureLead("sam_lee@example.com", "port-numbers-quiz", {}, NOON)).toBe("sent");
    expect(await captureLead("Sam_Lee@example.com", "subnetting-practice", {}, NOON)).toBe("sent");
    expect(h.sendEmail.mock.calls.map(([email]) => email.to)).toEqual(["sam_lee@example.com", "sam_lee@example.com"]);
  });

  // Addresses were stored as typed before they were lower-cased. Such a row
  // still decides: its unsubscribe holds, and so does the time of its last send.
  it("honors a row stored under the capitals the address was first typed with", async () => {
    stored("Sam@Example.com", "port-numbers-quiz", 24 * 30, true);
    expect(await captureLead("Sam@Example.com", "port-numbers-quiz", {}, NOON)).toBe("skipped");

    stored("Lee@Example.com", "port-numbers-quiz", 1);
    expect(await captureLead("Lee@Example.com", "port-numbers-quiz", {}, NOON)).toBe("skipped");

    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.leads).toHaveLength(2);
  });

  it("sends again from an older row once 24 hours have passed, without a second row", async () => {
    const row = stored("Lee@Example.com", "port-numbers-quiz", 25);
    expect(await captureLead("Lee@Example.com", "port-numbers-quiz", {}, NOON)).toBe("sent");
    expect(h.leads).toHaveLength(1);
    expect(row.updated_at).toBe(NOON.toISOString());
    // The email goes to the lower-case address with that row's own unsubscribe token.
    expect(h.sendEmail.mock.calls[0][0].to).toBe("lee@example.com");
    expect(h.sendEmail.mock.calls[0][0].text).toContain(`token=${row.unsubscribe_token}&scope=lead`);
  });

  // The form used to confirm an email whatever happened to it.
  it("answers failed and removes a new lead when the email could not be sent, so that trying again works", async () => {
    h.sendEmail.mockImplementationOnce(async () => false);
    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).toBe("failed");
    expect(h.leads).toEqual([]);

    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, later(60_000))).toBe("sent");
    expect(h.leads).toHaveLength(1);
  });

  it("gives an older lead its last send time back when the email could not be sent", async () => {
    const row = stored("sam@example.com", "port-numbers-quiz", 48);
    const before = row.updated_at;
    h.sendEmail.mockImplementationOnce(async () => false);

    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).toBe("failed");
    expect(row.updated_at).toBe(before);

    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, later(60_000))).toBe("sent");
    expect(row.updated_at).toBe(later(60_000).toISOString());
  });

  it.each<Step>(["read", "insert"])("answers failed without sending when the %s is refused", async (step) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    h.failing.add(step);
    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).toBe("failed");
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.leads).toEqual([]);
    consoleError.mockRestore();
  });

  it("answers failed without sending when the claim on an older lead is refused", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    stored("sam@example.com", "port-numbers-quiz", 48);
    h.failing.add("claim");
    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).toBe("failed");
    expect(h.sendEmail).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("leaves the sending to the other request when two arrive at once for a new address", async () => {
    h.raceOnInsert = true;
    expect(await captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).toBe("skipped");
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  // A test address used to be answered "skipped", and the form then told its
  // owner that the plan had been sent in the last 24 hours.
  it("answers a test address with its own word, without touching the database", async () => {
    expect(await captureLead("someone+e2e-1@example.com", "port-numbers-quiz", {}, NOON)).toBe("test");
    expect(await captureLead("Someone+RB2@example.com", "port-numbers-quiz", {}, NOON)).toBe("test");
    expect(h.createAdminClient).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  // "Contains +rb" used to take this address for a test one: it was never sent
  // the plan, and the form told its owner the plan had gone in the last 24 hours.
  it("sends the plan to a real address whose tag only begins with the letters of a test tag", async () => {
    expect(await captureLead("anna+rbc@example.com", "port-numbers-quiz", {}, NOON)).toBe("sent");
    expect(await captureLead("sam+e2ex@example.com", "port-numbers-quiz", {}, NOON)).toBe("sent");
    expect(h.sendEmail.mock.calls.map(([email]) => email.to)).toEqual(["anna+rbc@example.com", "sam+e2ex@example.com"]);
  });

  it("never throws: a fault is logged and answered as failed", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    h.createAdminClient.mockImplementation(() => {
      throw new Error("Missing required environment variable SUPABASE_SERVICE_ROLE_KEY");
    });
    await expect(captureLead("sam@example.com", "port-numbers-quiz", {}, NOON)).resolves.toBe("failed");
    expect(consoleError).toHaveBeenCalledWith("captureLead failed:", expect.any(Error));
    consoleError.mockRestore();
  });
});
