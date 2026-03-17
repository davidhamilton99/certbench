import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl;
    const status = url.searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const perPage = 25;
    const offset = (page - 1) * perPage;

    const db = getAdminSupabase();

    let query = db
      .from("question_flags")
      .select(
        `
        id,
        reason,
        status,
        admin_notes,
        created_at,
        reviewed_at,
        user_id,
        question_id,
        profiles!question_flags_user_id_fkey ( display_name, email ),
        cert_questions!question_flags_question_id_fkey ( question_text, difficulty )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: flags, count, error } = await query;

    if (error) {
      console.error("Admin flags query error:", error);
      return NextResponse.json(
        { error: "Failed to load flags" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      flags: flags || [],
      total: count || 0,
      page,
      perPage,
    });
  } catch (err) {
    console.error("Admin flags API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  flagId: z.string().uuid(),
  status: z.enum(["actioned", "dismissed"]),
  adminNotes: z.string().max(1000).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { flagId, status, adminNotes } = parsed.data;
    const db = getAdminSupabase();

    const { error } = await db
      .from("question_flags")
      .update({
        status,
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", flagId);

    if (error) {
      console.error("Admin flag update error:", error);
      return NextResponse.json(
        { error: "Failed to update flag" },
        { status: 500 }
      );
    }

    return NextResponse.json({ updated: true });
  } catch (err) {
    console.error("Admin flags PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
