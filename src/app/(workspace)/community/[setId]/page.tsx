import { notFound } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { getStudySet, listSetQuestions } from "@/server/data/study-sets";
import { listBookmarkedSetIds } from "@/server/data/community";
import { StudySetPlayer } from "@/components/quiz/StudySetPlayer";
import {
  AttemptPing,
  CommunitySetActions,
} from "@/components/workspace/CommunitySetActions";

export const metadata = {
  title: "Community study set",
};

export default async function CommunitySetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const { db, user } = await requireProPage();

  const set = await getStudySet(db, setId);
  if (!set || !set.isPublic) notFound();

  const [questions, bookmarks] = await Promise.all([
    listSetQuestions(db, setId),
    listBookmarkedSetIds(db, user.id),
  ]);

  return (
    <div className="grid gap-6">
      <AttemptPing setId={set.id} />
      <div className="mx-auto grid w-full max-w-2xl gap-3">
        <div className="grid gap-1.5">
          <h1 className="cb-subsection">{set.title}</h1>
          <p className="text-small text-muted-foreground">
            This study set has {set.questionCount} {set.questionCount === 1 ? "question" : "questions"}.
            {set.description && <> {set.description}</>}
          </p>
        </div>
        <CommunitySetActions
          setId={set.id}
          initialBookmarked={bookmarks.has(set.id)}
        />
      </div>

      <StudySetPlayer
        setId={set.id}
        questions={questions}
        seed={crypto.randomUUID()}
        persistProgress={false}
        backHref="/community"
        backLabel="Return to the community study sets"
      />
    </div>
  );
}
