import "server-only";

import type { Db } from "@/server/supabase/server";
import type { Json } from "@/types/database.gen";
import { sanitizePathProgress } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathCert, type PathProgress } from "@/core/path/types";

/**
 * Saved study path progress, one row for each account and exam.
 *
 * A read or a write that failed is not an answer. Both functions throw when
 * the database refuses a request or does not answer in time, and the caller
 * says so: the endpoint answers with an internal error, which is reported, and
 * the page keeps the progress on the device, says that it was not saved or
 * that the account was not reached, and asks again. They used to answer
 * `stored: false` instead. The page took that for a save that had worked, and
 * for an account whose study path was empty.
 *
 * `stored: false` is kept for the one case it was made for: the table that
 * holds the progress does not exist in this database (migration 026 has not
 * been run there). Saving is then not available at all, nothing has been
 * lost, and the study path works from the device alone.
 */

/**
 * The two ways the database says that a table does not exist: PostgreSQL's own
 * code for an undefined table, and the data API's code for a table that it
 * does not know (PostgREST's errors, "Group 2: Schema Cache").
 */
const NO_SUCH_TABLE: ReadonlySet<string> = new Set(["42P01", "PGRST205"]);

interface DatabaseError {
  code?: string;
  message: string;
}

const tableMissing = (error: DatabaseError) => NO_SUCH_TABLE.has(error.code ?? "");

/**
 * The error for a read or a write that failed. The database's own words go to
 * the server log and nowhere else: the endpoint answers with a sentence of its
 * own.
 */
function failure(what: "read" | "write", error: DatabaseError): Error {
  console.error(`[path_progress] the ${what} failed: ${error.message}`);
  return new Error(`The saved study path could not be ${what === "read" ? "read" : "written"}.`);
}

/**
 * The account's saved progress on one exam. `stored` is false only where
 * saving is not available (see above). An account with nothing saved yet has
 * empty progress and `stored: true`. Throws when the read failed.
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
    if (!tableMissing(error)) throw failure("read", error);
    console.warn("[path_progress] the table does not exist in this database; progress stays on the device");
    return { progress: EMPTY_PATH_PROGRESS, stored: false };
  }
  return { progress: data ? sanitizePathProgress(data.progress) : EMPTY_PATH_PROGRESS, stored: true };
}

/**
 * Write the account's progress on one exam. True once it is stored; false
 * only where saving is not available (see above). Throws when the write failed.
 */
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
    if (!tableMissing(error)) throw failure("write", error);
    console.warn("[path_progress] the table does not exist in this database; progress stays on the device");
    return false;
  }
  return true;
}
