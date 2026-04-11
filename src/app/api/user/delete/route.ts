import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function handler() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = rateLimit(`user-delete:${user.id}`, 3, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const admin = getAdminSupabase();

  // --- Phase 1: Fetch parent IDs needed to delete children (parallel) ---
  const [{ data: examAttempts }, { data: diagAttempts }, { data: studySets }] =
    await Promise.all([
      admin
        .from("practice_exam_attempts")
        .select("id")
        .eq("user_id", user.id),
      admin
        .from("diagnostic_attempts")
        .select("id")
        .eq("user_id", user.id),
      admin
        .from("user_study_sets")
        .select("id")
        .eq("user_id", user.id),
    ]);

  // --- Phase 2: Delete all leaf-level records (no FK dependents) in parallel ---
  const leafDeletes: PromiseLike<unknown>[] = [
    admin.from("question_flags").delete().eq("user_id", user.id),
    admin.from("srs_cards").delete().eq("user_id", user.id),
    admin.from("question_performance").delete().eq("user_id", user.id),
    admin.from("readiness_snapshots").delete().eq("user_id", user.id),
  ];

  if (examAttempts && examAttempts.length > 0) {
    const attemptIds = examAttempts.map((a) => a.id);
    leafDeletes.push(
      admin.from("practice_exam_answers").delete().in("attempt_id", attemptIds)
    );
  }
  if (diagAttempts && diagAttempts.length > 0) {
    const diagIds = diagAttempts.map((a) => a.id);
    leafDeletes.push(
      admin.from("diagnostic_answers").delete().in("attempt_id", diagIds)
    );
  }
  if (studySets && studySets.length > 0) {
    const setIds = studySets.map((s) => s.id);
    leafDeletes.push(
      admin.from("user_study_questions").delete().in("study_set_id", setIds),
      admin.from("study_set_cert_tags").delete().in("study_set_id", setIds),
      admin.from("study_set_bookmarks").delete().in("study_set_id", setIds)
    );
  }

  await Promise.all(leafDeletes);

  // --- Phase 3: Delete parent records now that children are gone (parallel) ---
  await Promise.all([
    admin.from("practice_exam_attempts").delete().eq("user_id", user.id),
    admin.from("diagnostic_attempts").delete().eq("user_id", user.id),
    admin.from("study_set_bookmarks").delete().eq("user_id", user.id),
    admin.from("user_study_sets").delete().eq("user_id", user.id),
  ] as PromiseLike<unknown>[]);

  // --- Phase 4: Delete top-level user records (parallel) ---
  await Promise.all([
    admin.from("user_enrollments").delete().eq("user_id", user.id),
    admin.from("subscriptions").delete().eq("user_id", user.id),
    admin.from("profiles").delete().eq("id", user.id),
  ] as PromiseLike<unknown>[]);

  // 9. Delete the auth user
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(handler as unknown as Parameters<typeof withErrorHandler>[0]);
