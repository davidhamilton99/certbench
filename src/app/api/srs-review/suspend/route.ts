import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";

// Suspend or unsuspend an SRS card. Suspending sets suspended_at and
// removes the card from review rotation; unsuspending clears it. The
// card's SRS schedule (interval, ease, next review) is left untouched
// so resuming picks up where it left off. History (times_seen /
// times_correct) is also preserved.

const bodySchema = z.object({
  questionId: z.string().uuid(),
  suspend: z.boolean(),
});

async function handler(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = rateLimit(`srs-suspend:${user.id}`, 120, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { questionId, suspend } = parsed.data;
  const suspendedAt = suspend ? new Date().toISOString() : null;

  // RLS ("Users manage own performance") scopes this to the caller's row.
  const { data, error } = await supabase
    .from("question_performance")
    .update({ suspended_at: suspendedAt })
    .eq("user_id", user.id)
    .eq("question_id", questionId)
    .select("question_id, suspended_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    );
  }

  if (!data) {
    // No performance row means the card has never been answered. Nothing to
    // suspend — return 404 so callers can distinguish "not found" from
    // "already in desired state".
    return NextResponse.json(
      { error: "No performance record for this question" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    questionId: data.question_id,
    suspendedAt: data.suspended_at,
  });
}

export const POST = withErrorHandler(handler);
