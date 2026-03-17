import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminSupabase();

  // Delete user data in order (respecting FK constraints)
  // 0. Question flags
  await admin.from("question_flags").delete().eq("user_id", user.id);

  // 1. SRS cards
  await admin.from("srs_cards").delete().eq("user_id", user.id);

  // 2. Question performance
  await admin.from("question_performance").delete().eq("user_id", user.id);

  // 3. Practice exam answers, then attempts
  const { data: examAttempts } = await admin
    .from("practice_exam_attempts")
    .select("id")
    .eq("user_id", user.id);

  if (examAttempts && examAttempts.length > 0) {
    const attemptIds = examAttempts.map((a) => a.id);
    await admin
      .from("practice_exam_answers")
      .delete()
      .in("attempt_id", attemptIds);
  }
  await admin.from("practice_exam_attempts").delete().eq("user_id", user.id);

  // 4. Diagnostic answers, then attempts
  const { data: diagAttempts } = await admin
    .from("diagnostic_attempts")
    .select("id")
    .eq("user_id", user.id);

  if (diagAttempts && diagAttempts.length > 0) {
    const diagIds = diagAttempts.map((a) => a.id);
    await admin
      .from("diagnostic_answers")
      .delete()
      .in("attempt_id", diagIds);
  }
  await admin.from("diagnostic_attempts").delete().eq("user_id", user.id);

  // 5. Study materials — questions, cert tags, bookmarks, then sets
  const { data: studySets } = await admin
    .from("user_study_sets")
    .select("id")
    .eq("user_id", user.id);

  if (studySets && studySets.length > 0) {
    const setIds = studySets.map((s) => s.id);
    await admin
      .from("user_study_questions")
      .delete()
      .in("study_set_id", setIds);
    await admin
      .from("study_set_cert_tags")
      .delete()
      .in("study_set_id", setIds);
    await admin
      .from("study_set_bookmarks")
      .delete()
      .in("study_set_id", setIds);
  }
  await admin.from("study_set_bookmarks").delete().eq("user_id", user.id);
  await admin.from("user_study_sets").delete().eq("user_id", user.id);

  // 6. Enrollments
  await admin.from("user_enrollments").delete().eq("user_id", user.id);

  // 7. Subscriptions
  await admin.from("subscriptions").delete().eq("user_id", user.id);

  // 8. Profile
  await admin.from("profiles").delete().eq("id", user.id);

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
