import { defineEndpoint } from "@/server/api/define-endpoint";
import { afterResponse } from "@/server/api/after-response";
import { enrollInPath } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { certIdFor } from "@/server/path/cert-id";
import { getPathAccess } from "@/server/path/access";
import { otherVersionIds } from "@/server/data/enrollments";
import { updateProfile } from "@/server/data/profiles";
import { makeOnlyActiveEnrollment, setExamDate, switchVersion } from "@/server/services/enrollment-writes";
import { sendWelcome } from "@/server/services/lifecycle-email";

/**
 * Point the account at the exam it's studying. Pro access is scoped to
 * enrolled exams, so a free account holds exactly one active enrollment (the
 * path it's on) and buying Pro unlocks that exam. Pro accounts add exams by
 * purchase only; here they can set the date on an exam they already have, or
 * move to another version of it (Pro covers both Security+ versions). The
 * writes go through the server (accounts can only read enrollments).
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
    if (readErr) throw new ApiError("internal", readErr.message);
    const mine = existing?.find((e) => e.certification_id === certId);

    const anyActive = (existing ?? []).some((e) => e.is_active);
    // A Pro account with no exam yet claims its first one here; after that,
    // more exams are added by purchase.
    if (proPlan && anyActive) {
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
