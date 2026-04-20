import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api/errors";

/**
 * Cross-device progress for study-set practice quizzes.
 *
 * Upserts into `study_set_progress` — one row per (user, study_set) pair.
 * The client also writes to localStorage for instant response; the server
 * copy is the source of truth when the user moves to a different device.
 *
 * Progress older than 24h is treated as stale and cleared on GET.
 */

const saveSchema = z.object({
  studySetId: z.string().uuid(),
  currentIndex: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
});

const PROGRESS_TTL_MS = 24 * 60 * 60 * 1000;

// GET — Load saved progress for a study set, if any
async function handleGet(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studySetId = req.nextUrl.searchParams.get("studySetId");
  if (!studySetId) {
    return NextResponse.json(
      { error: "studySetId is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("study_set_progress")
    .select("current_index, correct_count, total_questions, saved_at")
    .eq("user_id", user.id)
    .eq("study_set_id", studySetId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ progress: null });
  }

  const savedAtMs = new Date(data.saved_at).getTime();
  if (Date.now() - savedAtMs > PROGRESS_TTL_MS) {
    // Stale — drop it and return null so the client starts fresh.
    await supabase
      .from("study_set_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("study_set_id", studySetId);
    return NextResponse.json({ progress: null });
  }

  return NextResponse.json({
    progress: {
      currentIndex: data.current_index,
      correctCount: data.correct_count,
      total: data.total_questions,
      savedAt: savedAtMs,
    },
  });
}

// POST — Upsert in-progress quiz state
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
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { studySetId, currentIndex, correctCount, totalQuestions } =
    parsed.data;

  if (currentIndex > totalQuestions) {
    return NextResponse.json(
      { error: "currentIndex exceeds totalQuestions" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("study_set_progress").upsert(
    {
      user_id: user.id,
      study_set_id: studySetId,
      current_index: currentIndex,
      correct_count: correctCount,
      total_questions: totalQuestions,
      saved_at: new Date().toISOString(),
    },
    { onConflict: "user_id,study_set_id" }
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }

  return NextResponse.json({ saved: true });
}

// DELETE — Clear progress (called on restart / completion)
async function handleDelete(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studySetId = req.nextUrl.searchParams.get("studySetId");
  if (!studySetId) {
    return NextResponse.json(
      { error: "studySetId is required" },
      { status: 400 }
    );
  }

  await supabase
    .from("study_set_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("study_set_id", studySetId);

  return NextResponse.json({ cleared: true });
}

export const GET = withErrorHandler(handleGet);
export const POST = withErrorHandler(handlePost);
export const DELETE = withErrorHandler(handleDelete);
