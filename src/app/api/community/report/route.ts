import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { rateLimit } from "@/lib/rate-limit";
import { withErrorHandler } from "@/lib/api/errors";

const reportSchema = z.object({
  studySetId: z.string().uuid(),
  reason: z.string().min(5, "Please provide a reason (at least 5 characters)").max(1000),
});

async function handler(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 reports per user per hour
  const { limited } = rateLimit(`report:${user.id}`, 5, 3_600_000);
  if (limited) {
    return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429 });
  }

  const parsed = reportSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { studySetId, reason } = parsed.data;

  // Verify the set exists and is public
  const { data: set } = await supabase
    .from("user_study_sets")
    .select("id, user_id")
    .eq("id", studySetId)
    .eq("is_public", true)
    .single();

  if (!set) {
    return NextResponse.json({ error: "Study set not found" }, { status: 404 });
  }

  // Can't report your own set
  if (set.user_id === user.id) {
    return NextResponse.json(
      { error: "You cannot report your own study set" },
      { status: 400 }
    );
  }

  // Insert report (unique constraint prevents duplicates)
  const { error } = await supabase.from("community_reports").insert({
    reporter_id: user.id,
    study_set_id: studySetId,
    reason,
  });

  if (error) {
    // Unique violation = already reported
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You have already reported this study set" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }

  return NextResponse.json({ reported: true });
}

export const POST = withErrorHandler(handler);
