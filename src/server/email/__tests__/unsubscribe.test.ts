import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
}));

import {
  ACCOUNT_UNSUBSCRIBE_SOURCE,
  isUnsubscribeToken,
  leadsForAddress,
  parseUnsubscribeScope,
  unsubscribe,
  unsubscribeHeaders,
  unsubscribeUrl,
} from "../unsubscribe";
import { ilike } from "./ilike";
import type { Db } from "@/server/supabase/server";

const TOKEN = "3f2b8c1e-7a4d-4e9b-9c55-0d1e2f3a4b5c";
const OTHER_TOKEN = "7c1d9a2b-5e6f-4a3b-8c9d-1e2f3a4b5c6d";

type Row = Record<string, unknown>;

/**
 * Just enough of the query builder for a read, and for an update that reads
 * back what it changed. `failing` is the number of the request that the
 * database refuses (1 is the first), or true for every request.
 */
function fakeAdmin(
  tables: Record<string, Row[]>,
  failing: boolean | number = false,
  /** The sign-in service's accounts: id to address. */
  users: Record<string, string | null> = {}
) {
  /** Every request made, in order: the table, and the change when it was an update or an upsert. */
  const requests: { table: string; patch: Row | null }[] = [];
  const admin = {
    auth: {
      admin: {
        getUserById: async (id: string) => {
          requests.push({ table: "auth.users", patch: null });
          if (failing === true || failing === requests.length) return { data: { user: null }, error: { message: "connection lost" } };
          return id in users
            ? { data: { user: { id, email: users[id] ?? undefined } }, error: null }
            : { data: { user: null }, error: { message: "User not found" } };
        },
      },
    },
    from(table: string) {
      let patch: Row | null = null;
      let upsert: { row: Row; keys: string[] } | null = null;
      const filters: ((r: Row) => boolean)[] = [];
      const q = {
        update: (p: Row) => ((patch = p), q),
        upsert: (row: Row, opts: { onConflict: string }) => ((upsert = { row, keys: opts.onConflict.split(",") }), q),
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        ilike: (c: string, pattern: string) => {
          const matches = ilike(pattern);
          filters.push((r) => matches(r[c]));
          return q;
        },
        select: () => q,
        then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => {
          requests.push({ table, patch: patch ?? upsert?.row ?? null });
          if (failing === true || failing === requests.length) {
            return Promise.resolve({ data: null, error: { message: "connection lost" } }).then(ok, fail);
          }
          if (upsert) {
            const { row, keys } = upsert;
            const rows = (tables[table] ??= []);
            const hit = rows.find((r) => keys.every((key) => r[key] === row[key]));
            if (hit) Object.assign(hit, row);
            else rows.push({ id: `row-${rows.length + 1}`, ...row });
            return Promise.resolve({ data: null, error: null }).then(ok, fail);
          }
          const hit = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          if (patch) for (const row of hit) Object.assign(row, patch);
          // The database answers with copies: a row read earlier does not change when the table does.
          return Promise.resolve({ data: hit.map((row) => ({ ...row })), error: null }).then(ok, fail);
        },
      };
      return q;
    },
  };
  return { admin: admin as unknown as Db, requests };
}

/** A study plan lead as the table stores it. */
const lead = (id: string, email: string, source: string, token = `${id}-token`, unsubscribed = false) => ({
  id,
  email,
  source,
  unsubscribe_token: token,
  unsubscribed,
  updated_at: "2026-11-01T12:00:00.000Z",
});

describe("the unsubscribe address", () => {
  it("is the one address an email carries, for every study email or for one kind", () => {
    expect(unsubscribeUrl(TOKEN)).toBe(`https://certbench.dev/api/email/unsubscribe?token=${TOKEN}`);
    expect(unsubscribeUrl(TOKEN, "lead")).toBe(`https://certbench.dev/api/email/unsubscribe?token=${TOKEN}&scope=lead`);
  });

  it("comes with the header that lets a mail client unsubscribe with one POST (RFC 8058)", () => {
    const url = unsubscribeUrl(TOKEN);
    expect(unsubscribeHeaders(url)).toEqual({
      "List-Unsubscribe": `<${url}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("accepts only a token in the shape the database issues", () => {
    expect(isUnsubscribeToken(TOKEN)).toBe(true);
    expect(isUnsubscribeToken(TOKEN.toUpperCase())).toBe(true);
    for (const junk of [null, undefined, "", "abc", `${TOKEN}0`, `${TOKEN.slice(0, 35)}'`, 42]) {
      expect(isUnsubscribeToken(junk)).toBe(false);
    }
  });

  // The column is a UUID column. A value of the right length that is not a
  // UUID used to pass the check, the database refused the query, and a link
  // that was simply not valid was reported as a failure to save.
  it("turns away 36 characters of the right alphabet that are not a UUID", () => {
    const hex = TOKEN.replace(/-/g, "");
    for (const junk of ["-".repeat(36), "a".repeat(36), `${hex}-abc`, `${TOKEN.slice(0, 35)}g`, TOKEN.replace(/-/g, "_")]) {
      expect(junk).toHaveLength(36);
      expect(isUnsubscribeToken(junk)).toBe(false);
    }
    // A character outside ASCII that counts as one character is turned away as well.
    expect(isUnsubscribeToken(`${TOKEN.slice(0, 35)}${String.fromCharCode(0xe9)}`)).toBe(false);
  });

  it("reads the two narrower scopes and treats anything else as every study email", () => {
    expect(parseUnsubscribeScope("lead")).toBe("lead");
    expect(parseUnsubscribeScope("daily")).toBe("daily");
    for (const other of [null, undefined, "", "all", "LEAD"]) expect(parseUnsubscribeScope(other)).toBeNull();
  });
});

describe("unsubscribe", () => {
  it("stops every study email to an account, and leaves the daily reminder setting alone", async () => {
    const row = { user_id: "u1", unsubscribe_token: TOKEN, digest_enabled: true, daily_reminder_enabled: true };
    const { admin } = fakeAdmin({ email_preferences: [row] }, false, { u1: "sam@example.com" });
    expect(await unsubscribe(admin, TOKEN, null)).toBe("done");
    expect(row).toMatchObject({ digest_enabled: false, daily_reminder_enabled: true });
  });

  // The page tells an account that it will no longer receive study emails from
  // CertBench, and the study plan email, which anyone can request for any
  // address on a tool's page, used to be sent to it all the same.
  it("records an account's address as unsubscribed from the study plan email as well", async () => {
    const row = { user_id: "u1", unsubscribe_token: TOKEN, digest_enabled: true };
    const tables: Record<string, Row[]> = { email_preferences: [row], tool_leads: [] };
    const { admin } = fakeAdmin(tables, false, { u1: " Sam@Example.com " });
    expect(await unsubscribe(admin, TOKEN, null)).toBe("done");
    expect(tables.tool_leads).toEqual([
      expect.objectContaining({ email: "sam@example.com", source: ACCOUNT_UNSUBSCRIBE_SOURCE, unsubscribed: true }),
    ]);
    // The row is found by the read that every study plan email is checked against.
    const { rows } = await leadsForAddress(admin, "SAM@example.com");
    expect(rows?.map((lead) => [lead.source, lead.unsubscribed])).toEqual([[ACCOUNT_UNSUBSCRIBE_SOURCE, true]]);

    // Safe to repeat: the same row, not a second one.
    expect(await unsubscribe(admin, TOKEN, null)).toBe("done");
    expect(tables.tool_leads).toHaveLength(1);
  });

  it("answers failed when the account's address cannot be read or recorded, so that pressing again finishes it", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const [refused, table] of [
      [2, "auth.users"],
      [3, "tool_leads"],
    ] as const) {
      const row = { user_id: "u1", unsubscribe_token: TOKEN, digest_enabled: true };
      const tables: Record<string, Row[]> = { email_preferences: [row], tool_leads: [] };
      expect(await unsubscribe(fakeAdmin(tables, refused, { u1: "sam@example.com" }).admin, TOKEN, null)).toBe("failed");
      expect(tables.tool_leads).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith(`unsubscribe failed (${table}):`, "connection lost");
      // The next press, with the service answering, records it.
      expect(await unsubscribe(fakeAdmin(tables, false, { u1: "sam@example.com" }).admin, TOKEN, null)).toBe("done");
      expect(tables.tool_leads).toHaveLength(1);
    }
    consoleError.mockRestore();
  });

  it("stops only the daily reminder for a link of that scope", async () => {
    const row = { user_id: "u1", unsubscribe_token: TOKEN, digest_enabled: true, daily_reminder_enabled: true };
    const tables: Record<string, Row[]> = { email_preferences: [row], tool_leads: [] };
    const { admin } = fakeAdmin(tables, false, { u1: "sam@example.com" });
    expect(await unsubscribe(admin, TOKEN, "daily")).toBe("done");
    expect(row).toMatchObject({ digest_enabled: true, daily_reminder_enabled: false });
    expect(tables.tool_leads).toEqual([]);
  });

  it("stops the study plan email for a lead, in the leads table only", async () => {
    const row = lead("l1", "sam@example.com", "port-numbers-quiz", TOKEN);
    const { admin, requests } = fakeAdmin({ tool_leads: [row], email_preferences: [] });
    expect(await unsubscribe(admin, TOKEN, "lead")).toBe("done");
    expect(row.unsubscribed).toBe(true);
    expect([...new Set(requests.map((request) => request.table))]).toEqual(["tool_leads"]);
    // Two reads (the link's lead, then every lead of its address) and one change.
    expect(requests.map((request) => Boolean(request.patch))).toEqual([false, false, true]);
  });

  // The page says "CertBench will not send this study plan email to your
  // address again". The link used to stop the email from one tool only, so the
  // same address was sent it again from the next tool.
  it("stops the study plan email from every tool for the address, however its capitals were typed", async () => {
    const leads = [
      lead("port", "Sam@Example.com", "port-numbers-quiz", TOKEN),
      lead("subnet", "sam@example.com", "subnetting-practice"),
      lead("acronyms", "SAM@EXAMPLE.COM", "security-plus-acronyms-quiz"),
      lead("someone-else", "lee@example.com", "port-numbers-quiz", OTHER_TOKEN),
    ];
    const { admin } = fakeAdmin({ tool_leads: leads });

    expect(await unsubscribe(admin, TOKEN, "lead")).toBe("done");
    expect(leads.map((row) => [row.id, row.unsubscribed])).toEqual([
      ["port", true],
      ["subnet", true],
      ["acronyms", true],
      ["someone-else", false],
    ]);
  });

  // "_" and "%" are wildcards in the database's match, and its REST layer reads
  // "*" as "%". None of them may reach a lead of another address.
  it("leaves another address alone when the two differ only where a pattern has a wildcard", async () => {
    const leads = [
      lead("mine", "sam_lee@example.com", "port-numbers-quiz", TOKEN),
      lead("one-character", "samXlee@example.com", "port-numbers-quiz"),
      lead("mine-too", "SAM_LEE@example.com", "subnetting-practice"),
      lead("percent", "sam%@example.com", "port-numbers-quiz", OTHER_TOKEN),
      lead("a-run", "samuel@example.com", "port-numbers-quiz"),
    ];
    const { admin } = fakeAdmin({ tool_leads: leads });

    expect(await unsubscribe(admin, TOKEN, "lead")).toBe("done");
    expect(leads.filter((row) => row.unsubscribed).map((row) => row.id)).toEqual(["mine", "mine-too"]);

    expect(await unsubscribe(admin, OTHER_TOKEN, "lead")).toBe("done");
    expect(leads.filter((row) => row.unsubscribed).map((row) => row.id)).toEqual(["mine", "mine-too", "percent"]);

    // An asterisk cannot be escaped on its way to the database. The rows that
    // come back are compared again, so the wider match changes nothing.
    const starred = [lead("star", "sam*@example.com", "port-numbers-quiz", TOKEN), lead("wider", "samuel@example.com", "port-numbers-quiz")];
    expect(await unsubscribe(fakeAdmin({ tool_leads: starred }).admin, TOKEN, "lead")).toBe("done");
    expect(starred.map((row) => row.unsubscribed)).toEqual([true, false]);
  });

  it("is safe to repeat: the second call finds the row and answers the same", async () => {
    const row = { user_id: "u1", unsubscribe_token: TOKEN, digest_enabled: true };
    const { admin } = fakeAdmin({ email_preferences: [row] }, false, { u1: "sam@example.com" });
    expect(await unsubscribe(admin, TOKEN, null)).toBe("done");
    expect(await unsubscribe(admin, TOKEN, null)).toBe("done");
    expect(row.digest_enabled).toBe(false);

    const leads = [lead("port", "sam@example.com", "port-numbers-quiz", TOKEN), lead("subnet", "sam@example.com", "subnetting-practice")];
    const again = fakeAdmin({ tool_leads: leads }).admin;
    expect(await unsubscribe(again, TOKEN, "lead")).toBe("done");
    expect(await unsubscribe(again, TOKEN, "lead")).toBe("done");
    expect(leads.map((l) => l.unsubscribed)).toEqual([true, true]);
  });

  it.each([
    [1, "the read of the link's lead"],
    [2, "the read of the address's leads"],
    [3, "the change"],
  ])("answers failed for a lead, and changes nothing, when request %i is refused: %s", async (refused) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const leads = [lead("port", "sam@example.com", "port-numbers-quiz", TOKEN), lead("subnet", "sam@example.com", "subnetting-practice")];
    const { admin } = fakeAdmin({ tool_leads: leads }, refused);
    expect(await unsubscribe(admin, TOKEN, "lead")).toBe("failed");
    expect(leads.map((l) => l.unsubscribed)).toEqual([false, false]);
    expect(consoleError).toHaveBeenCalledWith("unsubscribe failed (tool_leads):", "connection lost");
    consoleError.mockRestore();
  });

  it("answers invalid when no row holds the token", async () => {
    const { admin } = fakeAdmin({ email_preferences: [], tool_leads: [] });
    expect(await unsubscribe(admin, TOKEN, null)).toBe("invalid");
    expect(await unsubscribe(admin, TOKEN, "lead")).toBe("invalid");
  });

  it("answers failed, and logs why, when the change could not be saved", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = fakeAdmin({}, true);
    expect(await unsubscribe(admin, TOKEN, null)).toBe("failed");
    expect(await unsubscribe(admin, TOKEN, "lead")).toBe("failed");
    expect(consoleError).toHaveBeenCalledWith("unsubscribe failed (email_preferences):", "connection lost");
    expect(consoleError).toHaveBeenCalledWith("unsubscribe failed (tool_leads):", "connection lost");
    consoleError.mockRestore();
  });
});

describe("leadsForAddress", () => {
  const leads = [
    lead("port", "Sam@Example.com", "port-numbers-quiz"),
    lead("subnet", "sam@example.com", "subnetting-practice"),
    lead("underscore", "sam_lee@example.com", "port-numbers-quiz"),
    lead("one-character", "samXlee@example.com", "port-numbers-quiz"),
    lead("someone-else", "lee@example.com", "port-numbers-quiz"),
  ];

  it("finds every lead of an address, from any tool and in any capitals", async () => {
    const { admin } = fakeAdmin({ tool_leads: leads });
    const { rows, error } = await leadsForAddress(admin, " SAM@example.COM ");
    expect(error).toBeNull();
    expect(rows?.map((row) => row.id)).toEqual(["port", "subnet"]);
    expect(rows?.[0]).toEqual(leads[0]);
  });

  it("finds no lead of another address through a wildcard character", async () => {
    const { admin } = fakeAdmin({ tool_leads: leads });
    expect((await leadsForAddress(admin, "sam_lee@example.com")).rows?.map((row) => row.id)).toEqual(["underscore"]);
    expect((await leadsForAddress(admin, "sam%@example.com")).rows).toEqual([]);
    expect((await leadsForAddress(admin, "*@example.com")).rows).toEqual([]);
  });

  it("answers the database's error, and no rows, when the read is refused", async () => {
    const { admin } = fakeAdmin({ tool_leads: leads }, true);
    expect(await leadsForAddress(admin, "sam@example.com")).toEqual({ rows: null, error: { message: "connection lost" } });
  });
});
