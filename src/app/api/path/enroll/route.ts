import { defineEndpoint } from "@/server/api/define-endpoint";
import { afterResponse } from "@/server/api/after-response";
import { enrollInPath } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { certIdFor } from "@/server/path/cert-id";
import { getPathAccess } from "@/server/path/access";
import { accountNotChecked } from "@/server/data/account-errors";
import { otherVersionIds } from "@/server/data/enrollments";
import { updateProfile } from "@/server/data/profiles";
import { makeOnlyActiveEnrollment, setExamDate, switchVersion } from "@/server/services/enrollment-writes";
import { sendWelcome } from "@/server/services/lifecycle-email";
import type { Db } from "@/server/supabase/server";

/**
 * Whether the account's last payment did not go through: the subscription row
 * is marked past due. Stripe is still collecting, and when the payment is made
 * the plan returns with the exams that are active then. A read that fails is
 * not an answer: it throws the "account could not be checked" error.
 */
async function paymentPastDue(db: Db, userId: string): Promise<boolean> {
  const { data, error } = await db.from("user_subscriptions").select("status").eq("user_id", userId).maybeSingle();
  if (error) throw accountNotChecked("plan", error);
  return data?.status === "past_due";
}

/**
 * Point the account at the exam it's studying. Pro access is scoped to
 * enrolled exams, so a free account holds exactly one active enrollment (the
 * path it's on) and buying Pro unlocks that exam. Pro accounts add exams by
 * purchase only; here they can set the date on an exam they already have, or
 * move to another version of it (Pro covers both Security+ versions). The
 * writes go through the server (accounts can only read enrollments).
 *
 * A member whose payment is past due keeps their exams as a Pro member does.
 * While the payment is owed the account has no Pro, and it used to be taken
 * for a free account here: answering the exam date question, or pressing a
 * plan in the offer, made that one exam the only active one. An exam added to
 * the plan by purchase was switched off, or the plan's own exam was replaced
 * by another, and that is what Pro then opened once the payment was made.
 *
 * The learner's screen moves on as soon as this answers, so it reads the
 * exam's id (not its question bank), reads the enrollments and the plan
 * together, and sends the welcome email after the response has gone.
 */
export const POST = defineEndpoint(enrollInPath, {
  auth: "user",
  rateLimit: { limit: 30, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const certId = await certIdFor(input.cert);
    if (!certId) throw new ApiError("not_found", "That exam is not available.");

    const [{ data: existing, error: readErr }, { proPlan }] = await Promise.all([
      db.from("user_enrollments").select("certification_id, is_active, exam_date").eq("user_id", user.id),
      getPathAccess(db, user, certId),
    ]);
    // The database's own words go to the server log, not into the answer.
    if (readErr) throw accountNotChecked("enrollments", readErr);
    const mine = existing?.find((e) => e.certification_id === certId);

    const anyActive = (existing ?? []).some((e) => e.is_active);
    // Making this exam the only active one switches the others off. That is
    // right for a free account. It is asked about the payment only when there
    // is another active exam to lose.
    const otherActive = (existing ?? []).some((e) => e.is_active && e.certification_id !== certId);
    const keepsExams = proPlan || (otherActive && (await paymentPastDue(db, user.id)));
    // A Pro account with no exam yet claims its first one here; after that,
    // more exams are added by purchase.
    if (keepsExams && anyActive) {
      if (!mine?.is_active) {
        // Another version of an exam they have: they move to this one.
        const versions = await otherVersionIds(db, certId);
        const from = (existing ?? []).find((e) => e.is_active && versions.includes(e.certification_id));
        if (!from) return { enrolled: false };
        await switchVersion(user.id, from.certification_id, certId, input.examDate ?? from.exam_date ?? null);
        return { enrolled: true };
      }
      if (input.examDate) await setExamDate(user.id, certId, input.examDate);
      return { enrolled: true };
    }

    // Free (or Pro with no exam yet): this exam becomes the one active enrollment.
    await makeOnlyActiveEnrollment(user.id, certId, input.examDate ?? undefined);

    await updateProfile(db, user.id, { onboardingCompleted: true });
    // The welcome email is sent once the response has gone: the learner's next
    // screen does not wait for the email provider. Deduped internally and
    // never throws.
    const { id: userId, email } = user;
    if (email) afterResponse(() => sendWelcome(userId, email, certId));
    return { enrolled: true };
  },
});
