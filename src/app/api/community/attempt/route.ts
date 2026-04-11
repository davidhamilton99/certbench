import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod/v4";
import { rateLimit } from "@/lib/rate-limit";
import { withErrorHandler } from "@/lib/api/errors";

const attemptSchema = z.object({
  studySetId: z.string().uuid(),
});

function getAdminSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function handler(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 attempts per user per minute
  const { limited } = rateLimit(`attempt:${user.id}`, 30, 60_000);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = attemptSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing studySetId" }, { status: 400 });
  }

  const { studySetId } = parsed.data;

  // Use service role for atomic increment on another user's set
  const admin = getAdminSupabase();

  // Atomic increment — only on public sets
  const { error } = await admin.rpc("increment_attempt_count", {
    set_id: studySetId,
  });

  if (error) {
    // Fallback: non-atomic increment (if RPC not yet deployed)
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
  }

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandler(handler);
