import { notFound } from "next/navigation";
import { requireProPage } from "@/server/auth";
import {
  getSetProgress,
  getStudySet,
  listSetQuestions,
} from "@/server/data/study-sets";
import { StudySetPlayer } from "@/components/quiz/StudySetPlayer";
import { StudySetSettings } from "@/components/workspace/StudySetSettings";
import { ExportPdfButton } from "@/components/workspace/ExportPdfButton";
import { QuestionManager } from "@/components/workspace/QuestionManager";

export const metadata = {
  title: "Study set",
};

export default async function StudySetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const { db, user } = await requireProPage();

  const set = await getStudySet(db, setId);
  if (!set) notFound();
  const isOwner = set.userId === user.id;

  const [questions, progress] = await Promise.all([
    listSetQuestions(db, setId),
    isOwner ? getSetProgress(db, user.id, setId) : Promise.resolve(null),
  ]);

  return (
    <div className="grid gap-6">
      <div className="mx-auto grid w-full max-w-2xl gap-3">
        <div className="grid gap-1.5">
          <h1 className="cb-subsection">{set.title}</h1>
          <p className="text-small text-muted-foreground">
            This study set has {set.questionCount} {set.questionCount === 1 ? "question" : "questions"}.
            {set.description && <> {set.description}</>}
          </p>
        </div>
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
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
        seed={crypto.randomUUID()}
        initialIndex={progress?.currentIndex ?? 0}
        initialCorrect={progress?.correctCount ?? 0}
        persistProgress={isOwner}
      />

      {isOwner && <QuestionManager setId={set.id} questions={questions} />}
    </div>
  );
}
