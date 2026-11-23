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
 * "lead" is the study plan email requested from a free tool. "daily" is the
 * daily study reminder, which is no longer sent: its links still work.
 */
export type UnsubscribeScope = "lead" | "daily" | null;

export function parseUnsubscribeScope(value: unknown): UnsubscribeScope {
  return value === "lead" || value === "daily" ? value : null;
}

/** The token is a UUID. The shape check keeps anything else out of the query. */
export function isUnsubscribeToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
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
    const { data, error } = await admin
      .from("tool_leads")
      .update({ unsubscribed: true, updated_at: updatedAt })
      .eq("unsubscribe_token", token)
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
