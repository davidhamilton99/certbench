import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api/errors";

const saveSchema = z.object({
  attemptId: z.string().uuid(),
  state: z.object({
    questions: z.array(z.unknown()),
    answers: z.array(z.unknown()),
    currentIndex: z.number().int().min(0),
    flagged: z.array(z.number().int()),
    shuffleMaps: z.record(z.string(), z.array(z.number())),
  }),
});

// GET — Load saved progress for an incomplete attempt
async function handleGet(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificationId = req.nextUrl.searchParams.get("certificationId");
  const examType = req.nextUrl.searchParams.get("examType") || "full";

  if (!certificationId) {
    return NextResponse.json(
      { error: "certificationId is required" },
      { status: 400 }
    );
  }

  // Find the most recent incomplete attempt with saved progress
  let query = supabase
    .from("practice_exam_attempts")
    .select("id, progress_state, progress_saved_at, started_at, exam_type")
    .eq("user_id", user.id)
    .eq("certification_id", certificationId)
    .eq("is_complete", false)
    .not("progress_state", "is", null)
    .order("started_at", { ascending: false })
    .limit(1);

  if (examType) {
    query = query.eq("exam_type", examType);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ progress: null });
  }

  // Check if progress is older than 24 hours
  const savedAt = new Date(data.progress_saved_at).getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (Date.now() - savedAt > twentyFourHours) {
    // Expired — clear it
    await supabase
      .from("practice_exam_attempts")
      .update({ progress_state: null, progress_saved_at: null })
      .eq("id", data.id);
    return NextResponse.json({ progress: null });
  }

  return NextResponse.json({
    progress: {
      attemptId: data.id,
      ...data.progress_state,
      savedAt: savedAt,
    },
  });
}

// POST — Save in-progress exam state
async function handlePost(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = saveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400 }
    );
  }

  const { attemptId, state } = parsed.data;

  // Verify the attempt belongs to this user and is not complete
  const { data: attempt } = await supabase
    .from("practice_exam_attempts")
    .select("id, user_id, is_complete")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attempt.is_complete) {
    return NextResponse.json(
      { error: "Attempt already completed" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("practice_exam_attempts")
    .update({
      progress_state: state,
      progress_saved_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }

  return NextResponse.json({ saved: true });
}

export const GET = withErrorHandler(handleGet);
export const POST = withErrorHandler(handlePost);
