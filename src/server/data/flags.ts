import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";

export interface PendingFlag {
  id: string;
  questionId: string;
  reason: string | null;
  createdAt: string;
  questionText: string | null;
}

/** Pending flags with their question text (admin RLS from migration 017). */
export async function listPendingFlags(db: Db): Promise<PendingFlag[]> {
  const { data, error } = await db
    .from("question_flags")
    .select("id, question_id, reason, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new ApiError("internal", error.message);
  const flags = data ?? [];
  if (flags.length === 0) return [];

  const { data: questions, error: qErr } = await db
    .from("cert_questions")
    .select("id, question_text")
    .in(
      "id",
      flags.map((f) => f.question_id)
    );
  if (qErr) throw new ApiError("internal", qErr.message);
  const textById = new Map((questions ?? []).map((q) => [q.id, q.question_text]));

  return flags.map((f) => ({
    id: f.id,
    questionId: f.question_id,
    reason: f.reason,
    createdAt: f.created_at,
    questionText: textById.get(f.question_id) ?? null,
  }));
}

export async function resolveFlag(
  db: Db,
  flagId: string,
  status: "actioned" | "dismissed",
  adminNotes: string | null
): Promise<void> {
  const { error } = await db
    .from("question_flags")
    .update({
      status,
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", flagId);
  if (error) throw new ApiError("internal", error.message);
}
