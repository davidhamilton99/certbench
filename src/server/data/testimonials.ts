import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";

export interface Testimonial {
  id: string;
  passed: boolean;
  quote: string;
  displayName: string;
  certName: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  certification_id: string | null;
  passed: boolean;
  quote: string;
  display_name: string;
  created_at: string;
}

const COLUMNS =
  "id, certification_id, passed, quote, display_name, created_at";

/** What the person who sent a comment is told when it could not be stored. */
export const COMMENT_NOT_SAVED = "The comment could not be saved. Please try again.";

/** What the page that lists testimonials reports when they could not be read. */
export const TESTIMONIALS_NOT_READ = "The testimonials could not be read. Please try again.";

/** What the admin is told when a testimonial's status could not be changed. */
export const TESTIMONIAL_NOT_UPDATED = "The testimonial could not be updated. Please try again.";

/** What the admin is told when asked to approve a comment from someone who did not pass. */
export const NOT_A_PASS_STORY =
  "This comment is from someone who did not pass the exam, so it cannot be approved. It can be hidden.";

/**
 * The error for a fault that the database reports on this table.
 *
 * The database's own text names tables, columns, constraints and policies, and
 * an endpoint answers its caller with the message of an ApiError
 * (src/server/api/define-endpoint.ts). One of the callers is public
 * (/api/story). So the database's text goes to the server log, and the caller
 * is given a sentence.
 */
function databaseFault(what: string, cause: { message: string; code?: string }, sentence: string): ApiError {
  console.error(`[testimonials] ${what} failed${cause.code ? ` (${cause.code})` : ""}: ${cause.message}`);
  return new ApiError("internal", sentence);
}

/** Resolve certification_id → name for a set of rows (avoids an embedded join). */
async function attachCertNames(
  db: Db,
  rows: Row[]
): Promise<Testimonial[]> {
  const certIds = [
    ...new Set(rows.map((r) => r.certification_id).filter((id): id is string => !!id)),
  ];
  const names = new Map<string, string>();
  if (certIds.length > 0) {
    const { data } = await db
      .from("certifications")
      .select("id, name")
      .in("id", certIds);
    for (const c of data ?? []) names.set(c.id, c.name);
  }
  return rows.map((r) => ({
    id: r.id,
    passed: r.passed,
    quote: r.quote,
    displayName: r.display_name,
    certName: r.certification_id ? names.get(r.certification_id) ?? null : null,
    createdAt: r.created_at,
  }));
}

/** Approved, passed stories for public display (newest first). */
export async function listApprovedTestimonials(
  db: Db,
  limit = 12
): Promise<Testimonial[]> {
  const { data, error } = await db
    .from("testimonials")
    .select(COLUMNS)
    .eq("status", "approved")
    .eq("passed", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw databaseFault("the read of the approved testimonials", error, TESTIMONIALS_NOT_READ);
  return attachCertNames(db, (data ?? []) as Row[]);
}

/**
 * Pending submissions for the moderation queue, oldest first.
 *
 * `db` must be the service client (createAdminClient), and the caller must
 * have checked the admin role before it asks. An account's own client may read
 * approved stories and its own, and no others (migration 022), so the queue
 * read with it is empty for every story that someone else wrote.
 */
export async function listPendingTestimonials(db: Db): Promise<Testimonial[]> {
  const { data, error } = await db
    .from("testimonials")
    .select(COLUMNS)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw databaseFault("the read of the testimonials waiting for review", error, TESTIMONIALS_NOT_READ);
  return attachCertNames(db, (data ?? []) as Row[]);
}

/** Insert a user's submission (RLS forces status = pending). */
export async function insertTestimonial(
  db: Db,
  userId: string,
  input: {
    certId: string | null;
    passed: boolean;
    quote: string;
    displayName: string;
  }
): Promise<void> {
  const { error } = await db.from("testimonials").insert({
    user_id: userId,
    certification_id: input.certId,
    passed: input.passed,
    quote: input.quote,
    display_name: input.displayName,
  });
  // 23505 = unique violation: already submitted for this cert.
  if (error?.code === "23505") {
    throw new ApiError("conflict", "You have already shared a story for this exam.");
  }
  if (error) throw databaseFault("the insert of a testimonial", error, COMMENT_NOT_SAVED);
}

/**
 * A pass story that takes the place of the account's earlier comment for the
 * same exam, when that comment says the person did not pass, or is still
 * waiting for review. The table holds one row for an account and an exam
 * (migration 022), so a pass story sent after a "did not pass" comment used to
 * meet the unique index, and the form thanked the person for a story that was
 * never stored. The row now holds the story, waiting for review again.
 *
 * Answers whether a row was replaced: an approved or hidden pass story stays
 * as it is. `db` must be the service client: the table has no update policy
 * for accounts.
 */
export async function replaceWithPassStory(
  db: Db,
  userId: string,
  input: { certId: string; quote: string; displayName: string }
): Promise<boolean> {
  const { data, error } = await db
    .from("testimonials")
    .update({ passed: true, quote: input.quote, display_name: input.displayName, status: "pending" })
    .eq("user_id", userId)
    .eq("certification_id", input.certId)
    .or("passed.eq.false,status.eq.pending")
    .select("id");
  if (error) throw databaseFault("the replacement of a testimonial", error, COMMENT_NOT_SAVED);
  return (data ?? []).length > 0;
}

/**
 * Moderation: sets a testimonial's status.
 *
 * `db` must be the service client (createAdminClient), and the caller must
 * have checked the admin role first. The table has no update policy for
 * accounts (migration 022: "Moderation happens via the service-role admin
 * client"), so an update made with an account's own client changes no row and
 * reports no error. For that reason an update that changed no row is an error
 * here: an approval must never appear to succeed when nothing was approved.
 *
 * Only a pass story can be approved. A comment from someone who did not pass
 * is sent from the same link ("What you found difficult") and waits in the
 * same queue, but it is never published: approved, it would still be readable
 * by anyone who holds the site's public key, with the name and the result
 * (the read policy of migration 022 asks only for the status; migration 036
 * adds the result). So an approval changes only a row whose result is a pass,
 * and is refused for any other.
 */
export async function setTestimonialStatus(
  db: Db,
  id: string,
  status: "approved" | "hidden"
): Promise<void> {
  const update = db.from("testimonials").update({ status }).eq("id", id);
  const { data, error } = await (status === "approved" ? update.eq("passed", true) : update).select("id");
  if (error) throw databaseFault("the update of a testimonial's status", error, TESTIMONIAL_NOT_UPDATED);
  if (data && data.length > 0) return;
  if (status === "approved") {
    const { data: rows, error: readError } = await db.from("testimonials").select("passed").eq("id", id);
    if (readError) throw databaseFault("the read of a testimonial's result", readError, TESTIMONIAL_NOT_UPDATED);
    if (rows?.[0]?.passed === false) throw new ApiError("conflict", NOT_A_PASS_STORY);
  }
  throw new ApiError("not_found", "This testimonial could not be found, so nothing was changed.");
}
