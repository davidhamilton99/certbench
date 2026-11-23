import "server-only";

import type { Db } from "@/server/supabase/server";
import { createAdminClient } from "@/server/supabase/admin";
import { sendEmail } from "@/server/email/resend";
import { studyPlanEmail } from "@/server/email/templates";
import { unsubscribeHeaders, unsubscribeUrl } from "@/server/email/unsubscribe";
import type { LeadDelivery, ToolSource } from "@/contracts/tools";

/**
 * How long before the same address may be sent the study plan from the same
 * tool again. The form is public, so without this anyone could have CertBench
 * email a third person each time the form is submitted.
 */
export const RESEND_AFTER_MS = 24 * 60 * 60 * 1000;

/** Test-convention addresses never get lead mail (mirrors lifecycle email). */
function isTestAccount(email: string): boolean {
  return email.includes("+e2e") || email.includes("+rb");
}

/** A lead that has been claimed for one send, and how to give the claim back. */
interface ClaimedLead {
  id: string;
  token: string;
  /** The row's earlier `updated_at`, or null for a row this request created. */
  restore: string | null;
}

/**
 * Records a free-tool email lead and sends the study plan email, at most once
 * in 24 hours for each address and tool. It answers what happened, so that the
 * form can say so:
 *  - "sent": the mail service accepted the email.
 *  - "skipped": nothing was sent on purpose (sent in the last 24 hours,
 *    unsubscribed, or a test address).
 *  - "failed": the lead could not be stored or the email could not be sent.
 *
 * A lead's `updated_at` is the time of its last send. A send is claimed by
 * moving that time forward before the email goes out, so two requests at once
 * cannot both send; when the send fails the claim is given back (a new row is
 * removed, an older row gets its time back), so that trying again in a few
 * minutes works. Never throws: a failure is logged and answered as "failed".
 */
export async function captureLead(
  email: string,
  source: ToolSource,
  context: Record<string, string | number>,
  now: Date = new Date()
): Promise<LeadDelivery> {
  try {
    // One row for an address however it is typed: the key is the lower-case
    // form. Otherwise the same person could be sent the email once for each
    // way of writing the capitals.
    const typed = email.trim();
    const address = typed.toLowerCase();
    if (isTestAccount(address)) return "skipped";
    const admin = createAdminClient();

    const lead = await claimLead(admin, address, typed, source, context, now);
    if (lead === "skipped" || lead === "failed") return lead;

    const url = unsubscribeUrl(lead.token, "lead");
    const sent = await sendEmail({
      to: address,
      headers: unsubscribeHeaders(url),
      ...studyPlanEmail({ source, unsubscribeUrl: url }),
    });
    if (sent) return "sent";

    await releaseLead(admin, lead);
    return "failed";
  } catch (err) {
    console.error("captureLead failed:", err);
    return "failed";
  }
}

/** Finds or creates the lead and claims one send for it. */
async function claimLead(
  admin: Db,
  address: string,
  typed: string,
  source: ToolSource,
  context: Record<string, string | number>,
  now: Date
): Promise<ClaimedLead | "skipped" | "failed"> {
  const sentAt = now.toISOString();

  // A row stored before addresses were lower-cased keeps the form it was typed
  // in, so that form is looked up as well: an unsubscribe recorded on such a
  // row still holds, and so does the time of its last send.
  const { data: rows, error: readError } = await admin
    .from("tool_leads")
    .select("id, unsubscribe_token, unsubscribed, updated_at")
    .in("email", [...new Set([address, typed])])
    .eq("source", source);
  if (readError) {
    console.error("tool lead read failed:", readError.message);
    return "failed";
  }

  // Someone who unsubscribed is never sent the email again, whoever asks.
  if (rows.some((row) => row.unsubscribed)) return "skipped";

  // Where both forms have a row, the one sent last decides whether 24 hours have passed.
  const existing = [...rows].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];

  if (!existing) {
    const { data: created, error } = await admin
      .from("tool_leads")
      .insert({ email: address, source, context, updated_at: sentAt })
      .select("id, unsubscribe_token")
      .single();
    if (error) {
      // 23505 is a unique violation: another request for the same address and
      // tool created the row a moment ago, and that request is sending.
      if (error.code === "23505") return "skipped";
      console.error("tool lead insert failed:", error.message);
      return "failed";
    }
    return { id: created.id, token: created.unsubscribe_token, restore: null };
  }

  // The claim: only a row whose last send is more than 24 hours old is moved
  // forward, and the database lets one request at a time do it.
  const cutoff = new Date(now.getTime() - RESEND_AFTER_MS).toISOString();
  const { data: claimed, error } = await admin
    .from("tool_leads")
    .update({ context, updated_at: sentAt })
    .eq("id", existing.id)
    .eq("unsubscribed", false)
    .lt("updated_at", cutoff)
    .select("id");
  if (error) {
    console.error("tool lead claim failed:", error.message);
    return "failed";
  }
  if (!claimed || claimed.length === 0) return "skipped";
  return { id: existing.id, token: existing.unsubscribe_token, restore: existing.updated_at };
}

/** Gives a claim back after a send that failed, so that the next attempt is not skipped. */
async function releaseLead(admin: Db, lead: ClaimedLead): Promise<void> {
  const { error } =
    lead.restore === null
      ? await admin.from("tool_leads").delete().eq("id", lead.id)
      : await admin.from("tool_leads").update({ updated_at: lead.restore }).eq("id", lead.id);
  if (error) console.error("tool lead release failed:", error.message);
}
