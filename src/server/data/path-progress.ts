import type { Db } from "@/server/supabase/server";
import type { Json } from "@/types/database.gen";
import { sanitizePathProgress } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathCert, type PathProgress } from "@/core/path/types";

/**
 * Saved path progress. Saving is a convenience — the path works from the
 * device alone — so a failed read or write (including the table not existing
 * yet) degrades to `stored: false` instead of failing the request.
 */

export async function getPathProgress(
  db: Db,
  userId: string,
  cert: PathCert
): Promise<{ progress: PathProgress; stored: boolean }> {
  const { data, error } = await db
    .from("path_progress")
    .select("progress")
    .eq("user_id", userId)
    .eq("cert_slug", cert)
    .maybeSingle();
  if (error) {
    console.warn("[path_progress] read failed; continuing without saved progress", error.message);
    return { progress: EMPTY_PATH_PROGRESS, stored: false };
  }
  return { progress: data ? sanitizePathProgress(data.progress) : EMPTY_PATH_PROGRESS, stored: true };
}

export async function savePathProgress(
  db: Db,
  userId: string,
  cert: PathCert,
  progress: PathProgress
): Promise<boolean> {
  const { error } = await db.from("path_progress").upsert(
    {
      user_id: userId,
      cert_slug: cert,
      progress: progress as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,cert_slug" }
  );
  if (error) {
    console.warn("[path_progress] save failed; progress stays on the device", error.message);
    return false;
  }
  return true;
}
