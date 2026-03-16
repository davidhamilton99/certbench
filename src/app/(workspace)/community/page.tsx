import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommunityList } from "@/components/workspace/CommunityList";

export const metadata = {
  title: "Community — CertBench",
};

export default async function CommunityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's active certification for default filter
  const { data: enrollment } = await supabase
    .from("user_enrollments")
    .select("certification_id, certifications(slug, name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const cert = enrollment?.certifications as unknown as {
    slug: string;
    name: string;
  } | null;

  // Get all certifications for filter dropdown
  const { data: allCerts } = await supabase
    .from("certifications")
    .select("slug, name")
    .order("name");

  // Fetch all public community sets with denormalized bookmark_count
  const { data: sets } = await supabase
    .from("user_study_sets")
    .select(
      "id, user_id, title, category, question_count, is_public, is_featured, attempt_count, bookmark_count, created_at"
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(500);

  // Get cert tags for all sets
  const setIds = (sets || []).map((s) => s.id);
  let certTagMap = new Map<string, { slug: string; domain: string | null }[]>();
  if (setIds.length > 0) {
    const { data: tags } = await supabase
      .from("study_set_cert_tags")
      .select("study_set_id, certification_slug, domain_tag")
      .in("study_set_id", setIds);
    if (tags) {
      for (const t of tags) {
        const existing = certTagMap.get(t.study_set_id) || [];
        existing.push({ slug: t.certification_slug, domain: t.domain_tag });
        certTagMap.set(t.study_set_id, existing);
      }
    }
  }

  // Get creators' display names
  const creatorIds = [...new Set((sets || []).map((s) => s.user_id))];
  let creatorMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) {
      creatorMap = new Map(profiles.map((p) => [p.id, p.display_name]));
    }
  }

  // Get user's bookmarks
  const { data: bookmarks } = await supabase
    .from("study_set_bookmarks")
    .select("study_set_id")
    .eq("user_id", user.id);
  const bookmarkedIds = new Set(
    (bookmarks || []).map((b) => b.study_set_id)
  );

  const enrichedSets = (sets || []).map((s) => ({
    id: s.id,
    user_id: s.user_id,
    title: s.title,
    category: s.category,
    question_count: s.question_count,
    is_featured: s.is_featured,
    attempt_count: s.attempt_count,
    created_at: s.created_at,
    creatorName: creatorMap.get(s.user_id) || "Unknown",
    bookmarkCount: s.bookmark_count ?? 0,
    isBookmarked: bookmarkedIds.has(s.id),
    certTags: certTagMap.get(s.id) || [],
  }));

  const certifications = (allCerts || []).map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  return (
    <CommunityList
      sets={enrichedSets}
      certifications={certifications}
      activeCertSlug={cert?.slug || null}
      activeCertName={cert?.name || null}
    />
  );
}
