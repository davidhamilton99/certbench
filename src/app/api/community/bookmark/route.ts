import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { rateLimit } from "@/lib/rate-limit";

const bookmarkSchema = z.object({
  studySetId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 bookmark toggles per user per minute
  const { limited } = rateLimit(`bookmark:${user.id}`, 20, 60_000);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = bookmarkSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "studySetId must be a valid UUID" },
      { status: 400 }
    );
  }

  const { studySetId } = parsed.data;

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
