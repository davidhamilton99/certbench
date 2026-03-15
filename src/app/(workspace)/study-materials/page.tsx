import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Study Materials — CertBench",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function StudyMaterialsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: studySets } = await supabase
    .from("user_study_sets")
    .select("id, title, category, question_count, is_public, created_at, bookmark_count, attempt_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const publicCount = studySets?.filter(s => s.is_public).length ?? 0;
  const totalQuestions = studySets?.reduce((sum, s) => sum + (s.question_count || 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            My Study Materials
          </h1>
          {studySets && studySets.length > 0 && (
            <p className="text-[14px] text-text-secondary mt-0.5">
              {studySets.length} {studySets.length === 1 ? "set" : "sets"} &middot; {totalQuestions} questions
              {publicCount > 0 && ` \u00b7 ${publicCount} shared`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/study-materials/import">
            <Button variant="secondary" size="sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Import
            </Button>
          </Link>
          <Link href="/study-materials/new">
            <Button size="sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              Create with AI
            </Button>
          </Link>
        </div>
      </div>

      {!studySets || studySets.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          }
          title="No study materials yet"
          description="Upload your notes, textbook excerpts, or flashcards and AI will generate tailored practice questions from them."
          actionLabel="Create with AI"
          actionHref="/study-materials/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {studySets.map((set) => (
            <Link key={set.id} href={`/study-materials/${set.id}`}>
              <Card
                padding="md"
                className="hover:bg-bg-page hover:border-primary/20 transition-all cursor-pointer h-full"
              >
                <div className="flex flex-col gap-3 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-text-primary leading-snug line-clamp-2">
                      {set.title}
                    </h3>
                    {set.is_public && (
                      <Badge variant="success">Public</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-auto">
                    <span className="text-[13px] font-mono text-text-secondary tabular-nums">
                      {set.question_count}q
                    </span>
                    {set.category && (
                      <>
                        <span className="text-border">&middot;</span>
                        <span className="text-[12px] text-text-muted truncate">
                          {set.category}
                        </span>
                      </>
                    )}
                    <span className="ml-auto text-[12px] text-text-muted whitespace-nowrap">
                      {timeAgo(set.created_at)}
                    </span>
                  </div>

                  {/* Community metrics (only for public sets) */}
                  {set.is_public && (set.bookmark_count > 0 || set.attempt_count > 0) && (
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      {set.bookmark_count > 0 && (
                        <span className="flex items-center gap-1 text-[12px] text-text-muted">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                          </svg>
                          {set.bookmark_count}
                        </span>
                      )}
                      {set.attempt_count > 0 && (
                        <span className="flex items-center gap-1 text-[12px] text-text-muted">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          {set.attempt_count}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
