import { defineEndpoint } from "@/server/api/define-endpoint";
import { enrollInPath } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { loadPathBank } from "@/server/path/bank";
import { getPathAccess } from "@/server/path/access";
import { updateProfile } from "@/server/data/profiles";
import { makeOnlyActiveEnrollment, setExamDate } from "@/server/services/enrollment-writes";
import { sendWelcome } from "@/server/services/lifecycle-email";

/**
 * Point the account at the exam it's studying. Pro access is scoped to
 * enrolled exams, so a free account holds exactly one active enrollment — the
 * path it's on — and buying Pro unlocks that exam. Pro accounts add exams by
 * purchase only; here they can just set the date on an exam they already have.
 * The writes go through the server (accounts can only read enrollments).
 */
export const POST = defineEndpoint(enrollInPath, {
  auth: "user",
  rateLimit: { limit: 30, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const bank = await loadPathBank(input.cert);
    if (!bank) throw new ApiError("not_found", "That exam isn't available.");
    const certId = bank.certId;

    const { data: existing, error: readErr } = await db
      .from("user_enrollments")
      .select("certification_id, is_active, exam_date")
      .eq("user_id", user.id);
    if (readErr) throw new ApiError("internal", readErr.message);
    const mine = existing?.find((e) => e.certification_id === certId);

    const { proPlan } = await getPathAccess(db, user, certId);
    const anyActive = (existing ?? []).some((e) => e.is_active);
    // A Pro account with no exam yet claims its first one here; after that,
    // more exams are added by purchase.
    if (proPlan && anyActive) {
      if (!mine?.is_active) return { enrolled: false };
      if (input.examDate) await setExamDate(user.id, certId, input.examDate);
      return { enrolled: true };
    }

    // Free (or Pro with no exam yet): this exam becomes the one active enrollment.
    await makeOnlyActiveEnrollment(user.id, certId, input.examDate ?? undefined);

    await updateProfile(db, user.id, { onboardingCompleted: true });
    // Deduped internally and never throws.
    if (user.email) await sendWelcome(user.id, user.email, certId);
    return { enrolled: true };
  },
});
