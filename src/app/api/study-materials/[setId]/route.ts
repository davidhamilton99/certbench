import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select("id, user_id")
    .eq("id", setId)
    .single();

  if (!studySet || studySet.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete cascades to questions, bookmarks, and tags
  const { error } = await supabase
    .from("user_study_sets")
    .delete()
    .eq("id", setId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete study set" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select("id, user_id")
    .eq("id", setId)
    .single();

  if (!studySet || studySet.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { isPublic } = (await req.json()) as { isPublic?: boolean };

  const updates: Record<string, unknown> = {};
  if (typeof isPublic === "boolean") {
    updates.is_public = isPublic;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_study_sets")
    .update(updates)
    .eq("id", setId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update study set" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
