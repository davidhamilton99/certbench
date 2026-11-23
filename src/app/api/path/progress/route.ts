import { defineEndpoint } from "@/server/api/define-endpoint";
import { getPathProgress, savePathProgress } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import {
  getPathProgress as loadProgress,
  savePathProgress as storeProgress,
} from "@/server/data/path-progress";
import { mergePathProgress, sanitizePathProgress } from "@/core/path/progress";
import { certIdFor } from "@/server/path/cert-id";
import { getPathAccess } from "@/server/path/access";
import { accountNotChecked } from "@/server/data/account-errors";
import type { Db } from "@/server/supabase/server";

/**
 * Saved progress on a study path. Any signed-in user: the free stretch of
 * the path is free with an account, so this is deliberately NOT behind Pro.
 * Rows are scoped to the caller by RLS as well as by the user id here.
 *
 * A read or a write that failed is answered with an internal error and one of
 * the two sentences below, never with `stored: false`. The page then keeps
 * the progress on the device, says that it was not saved or that the account
 * was not reached, and asks again. Answered `stored: false` with status 200,
 * a save that the database had refused was counted as saved, and a read that
 * had failed was shown as an empty study path. The endpoint factory writes
 * the error to the log and reports it. `stored: false` now has one meaning:
 * the table that holds the progress does not exist in this database yet
 * (src/server/data/path-progress.ts).
 */
const PATH_NOT_READ = "Your study path could not be read. Please try again.";
const PATH_NOT_SAVED = "Your study path could not be saved. Please try again.";

/** The data layer has written the reason to the log. The caller is told in a sentence. */
const notRead = (): never => {
  throw new ApiError("internal", PATH_NOT_READ);
};
const notSaved = (): never => {
  throw new ApiError("internal", PATH_NOT_SAVED);
};

/**
 * Whether the account's last payment did not go through: its subscription is
 * marked past due. Such an account has no Pro while the payment is owed, and
 * the checkout would refuse it a second plan, so the page shows it the way to
 * the billing page where it would have made the offer.
 *
 * The plan service knows the same fact (`getUserPlan` gives the billing page
 * its `paymentPastDue`), and the two are held together by a test beside this
 * file. It is not called here because it also counts the day's practice
 * questions, a second read that this request has no use for. This is one
 * column, asked for beside the other reads, so nothing waits for it.
 *
 * A read that failed is not an answer: it throws the "account could not be
 * checked" error, as the access check beside it does. Taken for "no payment
 * is owed", it would show the offer to the very member this is here for.
 */
async function paymentPastDue(db: Db, userId: string): Promise<boolean> {
  const { data, error } = await db.from("user_subscriptions").select("status").eq("user_id", userId);
  if (error) throw accountNotChecked("plan", error);
  return (data ?? []).some((subscription) => subscription.status === "past_due");
}

/**
 * This is the request a returning learner's screen waits for, so it reads
 * only what it answers with: the saved progress, the account's access and
 * whether a payment is owed, all started at once. It needs the exam's id and
 * not its questions.
 */
export const GET = defineEndpoint(getPathProgress, {
  auth: "user",
  rateLimit: { limit: 240, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const [saved, account, pastDue] = await Promise.all([
      loadProgress(db, user.id, input.cert).catch(notRead),
      certIdFor(input.cert).then(async (certId) =>
        certId ? { certId, access: await getPathAccess(db, user, certId) } : null
      ),
      paymentPastDue(db, user.id),
    ]);
    if (!account) throw new ApiError("not_found", "That exam is not available.");
    return {
      ...saved,
      access: account.access.level === "pro" ? ("pro" as const) : ("free" as const),
      proPlan: account.access.proPlan,
      certId: account.certId,
      // Sent only when it is true: an answer without it says that no payment is owed.
      ...(pastDue ? { paymentPastDue: true as const } : {}),
    };
  },
});

export const POST = defineEndpoint(savePathProgress, {
  auth: "user",
  rateLimit: { limit: 480, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    // What is stored is read first and merged with what was sent. When that
    // read fails nothing is merged and nothing is written, so the save failed.
    const { progress: stored, stored: available } = await loadProgress(db, user.id, input.cert).catch(notSaved);
    if (!available) return { ok: true as const, stored: false };
    const merged = mergePathProgress(stored, sanitizePathProgress(input.progress));
    return { ok: true as const, stored: await storeProgress(db, user.id, input.cert, merged).catch(notSaved) };
  },
});
