import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import {
  EMPTY_PROGRESS,
  sanitizeProgress,
  type DrillProgress,
  type DrillTool,
} from "@/core/drill-rounds/drill-rounds";

/** A user's saved progress on one free drill (empty if they've never saved). */
export async function getDrillProgress(
  db: Db,
  userId: string,
  tool: DrillTool
): Promise<DrillProgress> {
  const { data, error } = await db
    .from("drill_progress")
    .select("items, rounds")
    .eq("user_id", userId)
    .eq("tool", tool)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  return data ? sanitizeProgress(data) : EMPTY_PROGRESS;
}

export async function saveDrillProgress(
  db: Db,
  userId: string,
  tool: DrillTool,
  progress: DrillProgress
): Promise<void> {
  const { error } = await db.from("drill_progress").upsert(
    {
      user_id: userId,
      tool,
      items: progress.items,
      rounds: progress.rounds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tool" }
  );
  if (error) throw new ApiError("internal", error.message);
}
