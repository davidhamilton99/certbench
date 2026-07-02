import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getStudySet, listSetQuestions } from "@/server/data/study-sets";
import { StudySetPlayer } from "@/components/quiz/StudySetPlayer";
import { AttemptPing } from "@/components/workspace/CommunitySetActions";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Shared study set",
};

/** Public share link — no auth required (RLS allows public-set reads). */
export default async function SharePage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const db = await createClient();

  const set = await getStudySet(db, setId);
  if (!set || !set.isPublic) notFound();
  const questions = await listSetQuestions(db, setId);

  return (
    <div className="mx-auto grid min-h-svh w-full max-w-2xl content-start gap-6 px-4 py-10">
      <AttemptPing setId={set.id} />
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          CertBench
        </Link>
        <Button asChild size="sm">
          <Link href="/register">Create your own sets</Link>
        </Button>
      </header>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{set.title}</h1>
        <p className="text-sm text-muted-foreground">
          {set.questionCount} question{set.questionCount === 1 ? "" : "s"} · shared
          on CertBench
        </p>
      </div>
      <StudySetPlayer
        setId={set.id}
        questions={questions}
        persistProgress={false}
        backHref="/register"
        backLabel="Study smarter — join free"
      />
    </div>
  );
}
