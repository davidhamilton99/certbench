import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studySetId } = (await req.json()) as { studySetId: string };

  if (!studySetId) {
    return NextResponse.json({ error: "Missing studySetId" }, { status: 400 });
  }

  // Use service role to bypass RLS — we need to update another user's set
  const admin = getAdminSupabase();

  // Only increment on public sets (safety check)
  const { data: set } = await admin
    .from("user_study_sets")
    .select("attempt_count, is_public")
    .eq("id", studySetId)
    .single();

  if (set && set.is_public) {
    await admin
      .from("user_study_sets")
      .update({ attempt_count: (set.attempt_count ?? 0) + 1 })
      .eq("id", studySetId);
  }

  return NextResponse.json({ ok: true });
}
