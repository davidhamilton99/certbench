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
  if (error) throw new ApiError("internal", error.message);
  return attachCertNames(db, (data ?? []) as Row[]);
}

/** Pending submissions for the admin moderation queue. */
export async function listPendingTestimonials(db: Db): Promise<Testimonial[]> {
  const { data, error } = await db
    .from("testimonials")
    .select(COLUMNS)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new ApiError("internal", error.message);
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
    throw new ApiError("conflict", "You've already shared a story for this exam.");
  }
  if (error) throw new ApiError("internal", error.message);
}

/** Admin: set a testimonial's moderation status. */
export async function setTestimonialStatus(
  db: Db,
  id: string,
  status: "approved" | "hidden"
): Promise<void> {
  const { error } = await db.from("testimonials").update({ status }).eq("id", id);
  if (error) throw new ApiError("internal", error.message);
}
