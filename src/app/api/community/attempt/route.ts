import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Increment attempt_count. Using rpc would be ideal but a simple
  // read-then-write is fine for this non-critical counter.
  const { data: set } = await supabase
    .from("user_study_sets")
    .select("attempt_count")
    .eq("id", studySetId)
    .single();

  if (set) {
    await supabase
      .from("user_study_sets")
      .update({ attempt_count: (set.attempt_count ?? 0) + 1 })
      .eq("id", studySetId);
  }

  return NextResponse.json({ ok: true });
}
