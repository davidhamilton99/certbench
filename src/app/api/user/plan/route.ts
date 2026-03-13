import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/subscription";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(supabase, user.id);
  return NextResponse.json(plan);
}
