import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
}));

import {
  isUnsubscribeToken,
  parseUnsubscribeScope,
  unsubscribe,
  unsubscribeHeaders,
  unsubscribeUrl,
} from "../unsubscribe";
import type { Db } from "@/server/supabase/server";

const TOKEN = "3f2b8c1e-7a4d-4e9b-9c55-0d1e2f3a4b5c";

type Row = Record<string, unknown>;

/** Just enough of the query builder for an update that reads back what it changed. */
function fakeAdmin(tables: Record<string, Row[]>, failing = false) {
  const updates: { table: string; patch: Row }[] = [];
  const admin = {
    from(table: string) {
      let patch: Row = {};
      const filters: ((r: Row) => boolean)[] = [];
      const q = {
        update: (p: Row) => ((patch = p), q),
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        select: () => q,
        then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => {
          updates.push({ table, patch });
          if (failing) return Promise.resolve({ data: null, error: { message: "connection lost" } }).then(ok, fail);
          const hit = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          for (const row of hit) Object.assign(row, patch);
          return Promise.resolve({ data: hit, error: null }).then(ok, fail);
        },
      };
      return q;
    },
  };
  return { admin: admin as unknown as Db, updates };
}

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

  it("reads the two narrower scopes and treats anything else as every study email", () => {
    expect(parseUnsubscribeScope("lead")).toBe("lead");
    expect(parseUnsubscribeScope("daily")).toBe("daily");
    for (const other of [null, undefined, "", "all", "LEAD"]) expect(parseUnsubscribeScope(other)).toBeNull();
  });
});

describe("unsubscribe", () => {
  it("stops every study email to an account, and leaves the daily reminder setting alone", async () => {
    const row = { user_id: "u1", unsubscribe_token: TOKEN, digest_enabled: true, daily_reminder_enabled: true };
    const { admin } = fakeAdmin({ email_preferences: [row] });
    expect(await unsubscribe(admin, TOKEN, null)).toBe("done");
    expect(row).toMatchObject({ digest_enabled: false, daily_reminder_enabled: true });
  });

  it("stops only the daily reminder for a link of that scope", async () => {
    const row = { user_id: "u1", unsubscribe_token: TOKEN, digest_enabled: true, daily_reminder_enabled: true };
    const { admin } = fakeAdmin({ email_preferences: [row] });
    expect(await unsubscribe(admin, TOKEN, "daily")).toBe("done");
    expect(row).toMatchObject({ digest_enabled: true, daily_reminder_enabled: false });
  });

  it("stops the study plan email for a lead, in the leads table only", async () => {
    const lead = { id: "l1", unsubscribe_token: TOKEN, unsubscribed: false };
    const { admin, updates } = fakeAdmin({ tool_leads: [lead], email_preferences: [] });
    expect(await unsubscribe(admin, TOKEN, "lead")).toBe("done");
    expect(lead.unsubscribed).toBe(true);
    expect(updates.map((u) => u.table)).toEqual(["tool_leads"]);
  });

  it("is safe to repeat: the second call finds the row and answers the same", async () => {
    const row = { user_id: "u1", unsubscribe_token: TOKEN, digest_enabled: true };
    const { admin } = fakeAdmin({ email_preferences: [row] });
    expect(await unsubscribe(admin, TOKEN, null)).toBe("done");
    expect(await unsubscribe(admin, TOKEN, null)).toBe("done");
    expect(row.digest_enabled).toBe(false);
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
