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
    return NextResponse.json(
      { error: "studySetId is required" },
      { status: 400 }
    );
  }

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from("study_set_bookmarks")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("study_set_id", studySetId)
    .single();

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from("study_set_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("study_set_id", studySetId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to remove bookmark" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmarked: false });
  } else {
    // Add bookmark
    const { error } = await supabase.from("study_set_bookmarks").insert({
      user_id: user.id,
      study_set_id: studySetId,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to bookmark" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmarked: true });
  }
}
