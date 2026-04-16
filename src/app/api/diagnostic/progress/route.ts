import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api/errors";

// Mirror of /api/practice-exam/progress but targeting diagnostic_attempts.
// Needed because DiagnosticExam previously POSTed to the practice-exam
// endpoint with a diagnostic attempt id — that endpoint only looks up
// practice_exam_attempts, so every server-side save silently 404ed.

const saveSchema = z.object({
  attemptId: z.string().uuid(),
  state: z.object({
    questions: z.array(z.unknown()),
    answers: z.array(z.unknown()),
    currentIndex: z.number().int().min(0),
    shuffleMaps: z.record(z.string(), z.array(z.number())),
  }),
});

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function handleGet(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificationId = req.nextUrl.searchParams.get("certificationId");
  if (!certificationId) {
    return NextResponse.json(
      { error: "certificationId is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("diagnostic_attempts")
    .select("id, progress_state, progress_saved_at, started_at")
    .eq("user_id", user.id)
    .eq("certification_id", certificationId)
    .eq("is_complete", false)
    .not("progress_state", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ progress: null });
  }

  const savedAt = new Date(data.progress_saved_at).getTime();
  if (Date.now() - savedAt > TWENTY_FOUR_HOURS_MS) {
    await supabase
      .from("diagnostic_attempts")
      .update({ progress_state: null, progress_saved_at: null })
      .eq("id", data.id);
    return NextResponse.json({ progress: null });
  }

  return NextResponse.json({
    progress: {
      attemptId: data.id,
      ...data.progress_state,
      savedAt,
    },
  });
}

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

  const { attemptId, state } = parsed.data;

  const { data: attempt } = await supabase
    .from("diagnostic_attempts")
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
    .from("diagnostic_attempts")
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
