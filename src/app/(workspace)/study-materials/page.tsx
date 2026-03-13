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

export default async function StudyMaterialsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: studySets } = await supabase
    .from("user_study_sets")
    .select("id, title, category, question_count, is_public, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          My Study Materials
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/study-materials/import">
            <Button variant="secondary">Import Flashcards</Button>
          </Link>
          <Link href="/study-materials/new">
            <Button>Create with AI</Button>
          </Link>
        </div>
      </div>

      {!studySets || studySets.length === 0 ? (
        <EmptyState
          title="No study materials yet"
          description="Paste your notes, textbook excerpts, or any study content and we'll generate practice questions from it."
          actionLabel="Create New"
          actionHref="/study-materials/new"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {studySets.map((set) => (
            <Link key={set.id} href={`/study-materials/${set.id}`}>
              <Card
                padding="md"
                className="hover:bg-bg-page transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-[15px] font-semibold text-text-primary">
                      {set.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {set.category && (
                        <span className="text-[13px] text-text-muted">
                          {set.category}
                        </span>
                      )}
                      <span className="text-[13px] font-mono text-text-muted">
                        {set.question_count}q
                      </span>
                      {set.is_public && (
                        <Badge variant="neutral">Public</Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-[12px] text-text-muted">
                    {new Date(set.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
