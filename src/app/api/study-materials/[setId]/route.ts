import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";

const patchSetSchema = z.object({
  isPublic: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "No updates provided",
});

async function deleteHandler(
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

  const { limited } = rateLimit(`study-set-delete:${user.id}`, 20, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
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

export const DELETE = withErrorHandler(deleteHandler as Parameters<typeof withErrorHandler>[0]);

async function patchHandler(
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

  const { limited } = rateLimit(`study-set-patch:${user.id}`, 20, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
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

  const body = await req.json();
  const parsed = patchSetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (typeof parsed.data.isPublic === "boolean") {
    updates.is_public = parsed.data.isPublic;
    // Reset popularity metrics when unpublishing to prevent gaming
    if (!parsed.data.isPublic) {
      updates.attempt_count = 0;
    }
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

export const PATCH = withErrorHandler(patchHandler as Parameters<typeof withErrorHandler>[0]);
