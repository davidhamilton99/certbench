import { notFound, redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getStudySet, listSetQuestions } from "@/server/data/study-sets";
import { listBookmarkedSetIds } from "@/server/data/community";
import { StudySetPlayer } from "@/components/quiz/StudySetPlayer";
import {
  AttemptPing,
  CommunitySetActions,
} from "@/components/workspace/CommunitySetActions";

export const metadata = {
  title: "Community set",
};

export default async function CommunitySetPage({
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
  if (!set || !set.isPublic) notFound();

  const [questions, bookmarks] = await Promise.all([
    listSetQuestions(db, setId),
    listBookmarkedSetIds(db, user.id),
  ]);

  return (
    <div className="grid gap-6">
      <AttemptPing setId={set.id} />
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{set.title}</h1>
          <p className="text-sm text-muted-foreground">
            {set.questionCount} question{set.questionCount === 1 ? "" : "s"}
            {set.description && <> · {set.description}</>}
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
        backLabel="Back to community"
      />
    </div>
  );
}
