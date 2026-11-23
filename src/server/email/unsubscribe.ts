import "server-only";

import { publicEnv } from "@/env";
import type { Db } from "@/server/supabase/server";

/**
 * Unsubscribing from CertBench email.
 *
 * Every email carries one address, `unsubscribeUrl(token)`, in its footer and
 * in its List-Unsubscribe header. A POST to that address makes the change: a
 * mail client's own "Unsubscribe" button sends one (RFC 8058), and so does the
 * button on the page at /unsubscribe. A GET changes nothing and leads to that
 * page, which says what will stop and asks first. Mail scanners open the links
 * in a message, so an address that acted on a GET unsubscribed people who had
 * not asked.
 */

/** The address in every email. POST acts; GET leads to the page. */
export const UNSUBSCRIBE_API_PATH = "/api/email/unsubscribe";

/** The page that asks before anything changes. */
export const UNSUBSCRIBE_PAGE_PATH = "/unsubscribe";

/**
 * Which emails a link stops. `null` is every study email to an account.
 * "lead" is the study plan email requested from a free tool: it stops for the
 * address, whichever tool the request came from. "daily" is the daily study
 * reminder, which is no longer sent: its links still work.
 */
export type UnsubscribeScope = "lead" | "daily" | null;

export function parseUnsubscribeScope(value: unknown): UnsubscribeScope {
  return value === "lead" || value === "daily" ? value : null;
}

/**
 * The token is a UUID, in the form the database prints one. The shape check
 * keeps anything else out of the query: the column is a UUID column, so a
 * value in any other shape (36 hyphens, for example) is refused by the
 * database, and a link that is simply not valid was then reported as a
 * failure to save.
 */
export function isUnsubscribeToken(value: unknown): value is string {
  return (
    typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/** The address an email carries for one recipient. */
export function unsubscribeUrl(token: string, scope: UnsubscribeScope = null): string {
  const query = new URLSearchParams({ token });
  if (scope) query.set("scope", scope);
  return `${publicEnv.NEXT_PUBLIC_APP_URL}${UNSUBSCRIBE_API_PATH}?${query}`;
}

/**
 * The two headers that give a mail client its own "Unsubscribe" button. The
 * second tells the client that one POST to the address is enough (RFC 8058);
 * without it the client can only open the address, which changes nothing.
 */
export function unsubscribeHeaders(url: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Every lead stored for one address: whichever tool it came from, and however
 * the capitals of the address were typed. An address is one address to the
 * person who owns it, so an unsubscribe, and the check for one before a send,
 * are both made for the address and not for one of its rows. Leads stored
 * before addresses were lower-cased keep the capitals they were typed with.
 *
 * The database matches without regard to capitals (ILIKE, with its wildcard
 * characters escaped), and the rows are then compared here as well, so that a
 * wildcard can never bring in a lead of another address.
 */
export async function leadsForAddress(admin: Db, address: string) {
  const wanted = address.trim().toLowerCase();
  const { data, error } = await admin
    .from("tool_leads")
    .select("id, email, source, unsubscribe_token, unsubscribed, updated_at")
    .ilike("email", wanted.replace(/[\\%_]/g, "\\$&"));
  if (error) return { rows: null, error };
  return { rows: (data ?? []).filter((row) => row.email.toLowerCase() === wanted), error: null };
}

/** "invalid": no row holds this token. "failed": the change could not be saved. */
export type UnsubscribeOutcome = "done" | "invalid" | "failed";

/**
 * Makes the change for one token. Only the POST handler calls this. It is safe
 * to repeat: the second call finds the row already changed and answers "done".
 */
export async function unsubscribe(
  admin: Db,
  token: string,
  scope: UnsubscribeScope
): Promise<UnsubscribeOutcome> {
  const updatedAt = new Date().toISOString();

  if (scope === "lead") {
    // The link belongs to one tool's lead, and the page says that the study
    // plan email will not be sent to the address again. So the change is made
    // for the address: every lead that holds it, from any tool.
    const { data: own, error: readError } = await admin
      .from("tool_leads")
      .select("id, email")
      .eq("unsubscribe_token", token);
    if (readError) return failed("tool_leads", readError.message);
    if (!own || own.length === 0) return "invalid";

    const { rows, error: listError } = await leadsForAddress(admin, own[0].email);
    if (listError) return failed("tool_leads", listError.message);

    // The link's own lead is always among them, whatever the match returned.
    const ids = [...new Set([...own, ...rows].map((row) => row.id))];
    const { data, error } = await admin
      .from("tool_leads")
      .update({ unsubscribed: true, updated_at: updatedAt })
      .in("id", ids)
      .select("id");
    if (error) return failed("tool_leads", error.message);
    return data && data.length > 0 ? "done" : "invalid";
  }

  const patch =
    scope === "daily"
      ? { daily_reminder_enabled: false, updated_at: updatedAt }
      : { digest_enabled: false, updated_at: updatedAt };
  const { data, error } = await admin
    .from("email_preferences")
    .update(patch)
    .eq("unsubscribe_token", token)
    .select("user_id");
  if (error) return failed("email_preferences", error.message);
  return data && data.length > 0 ? "done" : "invalid";
}

function failed(table: string, message: string): "failed" {
  console.error(`unsubscribe failed (${table}):`, message);
  return "failed";
}
