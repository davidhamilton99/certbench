import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const flagSchema = z.object({
  questionId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const unflagSchema = z.object({
  questionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { limited } = rateLimit(`flag:${user.id}`, 20, 3_600_000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many flags. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = flagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { questionId, reason } = parsed.data;

    const { error } = await supabase.from("question_flags").insert({
      user_id: user.id,
      question_id: questionId,
      reason: reason || null,
    });

    if (error) {
      // Unique constraint violation — already flagged
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already flagged" },
          { status: 409 }
        );
      }
      console.error("Flag insert error:", error);
      return NextResponse.json(
        { error: "Failed to flag question" },
        { status: 500 }
      );
    }

    return NextResponse.json({ flagged: true });
  } catch (err) {
    console.error("Flag API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unflagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { questionId } = parsed.data;

    await supabase
      .from("question_flags")
      .delete()
      .eq("user_id", user.id)
      .eq("question_id", questionId);

    return NextResponse.json({ unflagged: true });
  } catch (err) {
    console.error("Unflag API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
