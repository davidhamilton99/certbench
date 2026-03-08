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

  // Get user's active certification for contextual filtering
  const { data: enrollment } = await supabase
    .from("user_enrollments")
    .select("certification_id, certifications(slug, name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  const cert = enrollment?.certifications as unknown as {
    slug: string;
    name: string;
  } | null;
  const certSlug = cert?.slug;
  const certName = cert?.name;

  // Fetch public community sets, optionally filtered by certification
  let query = supabase
    .from("user_study_sets")
    .select(
      "id, user_id, title, category, question_count, is_public, created_at"
    )
    .eq("is_public", true)
    .neq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // If user has active cert, filter by cert tag
  if (certSlug) {
    const { data: taggedSetIds } = await supabase
      .from("study_set_cert_tags")
      .select("study_set_id")
      .eq("certification_slug", certSlug);

    if (taggedSetIds && taggedSetIds.length > 0) {
      const ids = taggedSetIds.map((t) => t.study_set_id);
      query = query.in("id", ids);
    }
  }

  const { data: sets } = await query;

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

  // Get bookmark counts
  const setIds = (sets || []).map((s) => s.id);
  let bookmarkCounts = new Map<string, number>();
  if (setIds.length > 0) {
    const { data: counts } = await supabase
      .from("study_set_bookmarks")
      .select("study_set_id")
      .in("study_set_id", setIds);
    if (counts) {
      for (const c of counts) {
        bookmarkCounts.set(
          c.study_set_id,
          (bookmarkCounts.get(c.study_set_id) || 0) + 1
        );
      }
    }
  }

  const enrichedSets = (sets || []).map((s) => ({
    ...s,
    creatorName: creatorMap.get(s.user_id) || "Unknown",
    bookmarkCount: bookmarkCounts.get(s.id) || 0,
    isBookmarked: bookmarkedIds.has(s.id),
  }));

  // Sort by bookmark count desc, then date desc
  enrichedSets.sort((a, b) => {
    if (b.bookmarkCount !== a.bookmarkCount)
      return b.bookmarkCount - a.bookmarkCount;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return (
    <CommunityList
      sets={enrichedSets}
      certName={certName || null}
      certSlug={certSlug || null}
    />
  );
}
