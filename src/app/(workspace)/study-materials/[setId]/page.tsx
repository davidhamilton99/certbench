import { notFound, redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import {
  getSetProgress,
  getStudySet,
  listSetQuestions,
} from "@/server/data/study-sets";
import { StudySetPlayer } from "@/components/quiz/StudySetPlayer";
import { StudySetSettings } from "@/components/workspace/StudySetSettings";
import { ExportPdfButton } from "@/components/workspace/ExportPdfButton";

export const metadata = {
  title: "Study set",
};

export default async function StudySetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const set = await getStudySet(db, setId);
  if (!set) notFound();
  const isOwner = set.userId === user.id;

  const [questions, progress] = await Promise.all([
    listSetQuestions(db, setId),
    isOwner ? getSetProgress(db, user.id, setId) : Promise.resolve(null),
  ]);

  return (
    <div className="grid gap-6">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{set.title}</h1>
          <p className="text-sm text-muted-foreground">
            {set.questionCount} question{set.questionCount === 1 ? "" : "s"}
            {set.description && <> · {set.description}</>}
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <ExportPdfButton
              title={set.title}
              category={set.category}
              questions={questions}
            />
            <StudySetSettings setId={set.id} isPublic={set.isPublic} />
          </div>
        )}
      </div>

      <StudySetPlayer
        setId={set.id}
        questions={questions}
        initialIndex={progress?.currentIndex ?? 0}
        initialCorrect={progress?.correctCount ?? 0}
        persistProgress={isOwner}
      />
    </div>
  );
}
