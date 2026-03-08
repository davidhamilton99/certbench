import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certSlug = request.nextUrl.searchParams.get("cert");
  const range = parseInt(request.nextUrl.searchParams.get("range") || "30", 10);

  if (!certSlug) {
    return NextResponse.json(
      { error: "Missing cert parameter" },
      { status: 400 }
    );
  }

  if (![7, 30, 90].includes(range)) {
    return NextResponse.json(
      { error: "Range must be 7, 30, or 90" },
      { status: 400 }
    );
  }

  // Look up certification by slug
  const { data: cert, error: certError } = await supabase
    .from("certifications")
    .select("id, name, slug")
    .eq("slug", certSlug)
    .single();

  if (certError || !cert) {
    return NextResponse.json(
      { error: "Certification not found" },
      { status: 404 }
    );
  }

  // Compute date cutoff
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);

  // Fetch readiness snapshots and domain metadata in parallel
  const [snapshotsResult, domainsResult] = await Promise.all([
    supabase
      .from("readiness_snapshots")
      .select(
        "overall_score, domain_scores, computed_at, is_preliminary, total_questions_seen"
      )
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .gte("computed_at", cutoff.toISOString())
      .order("computed_at", { ascending: true }),

    supabase
      .from("cert_domains")
      .select("id, domain_number, title, exam_weight")
      .eq("certification_id", cert.id)
      .order("domain_number"),
  ]);

  if (snapshotsResult.error) {
    return NextResponse.json(
      { error: "Failed to fetch snapshots" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    snapshots: snapshotsResult.data || [],
    domains: domainsResult.data || [],
    certName: cert.name,
  });
}
