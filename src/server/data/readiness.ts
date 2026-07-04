import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import type { SnapshotRow } from "@/core/readiness/compute-trend";

/**
 * Recent snapshots newest-first — feeds computeReadinessTrend and the
 * analytics charts.
 */
export async function listRecentSnapshots(
  db: Db,
  userId: string,
  certId: string,
  limit = 60
): Promise<SnapshotRow[]> {
  const { data, error } = await db
    .from("readiness_snapshots")
    .select("overall_score, computed_at")
    .eq("user_id", userId)
    .eq("certification_id", certId)
    .order("computed_at", { ascending: false })
    .limit(limit);
  if (error) throw new ApiError("internal", error.message);
  return data ?? [];
}
