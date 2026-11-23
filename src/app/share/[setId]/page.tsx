import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getStudySet, listSetQuestions } from "@/server/data/study-sets";
import { StudySetPlayer } from "@/components/quiz/StudySetPlayer";
import { AttemptPing } from "@/components/workspace/CommunitySetActions";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-arrow";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Shared study set",
  // A link someone shared, not a page to find in search.
  robots: { index: false, follow: true },
};

/**
 * The form of a study set's id. An address that was cut short in a message,
 * or a crawler's guess, is answered with "not found" here: the database
 * rejects anything else as an id, and that reached the visitor as a server
 * error.
 */
const SET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A public share link. No account is needed: the database lets anyone read a set that its owner made public. */
export default async function SharePage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  if (!SET_ID.test(setId)) notFound();
  const db = await createClient();

  const set = await getStudySet(db, setId);
  if (!set || !set.isPublic) notFound();
  const questions = await listSetQuestions(db, setId);

  return (
    <div className="mx-auto grid min-h-svh w-full max-w-2xl content-start gap-6 px-4 py-10">
      <AttemptPing setId={set.id} />
      <header className="flex items-center justify-between gap-4">
        <Logo />
        <Button asChild size="sm">
          <Link href="/start">
            <LinkPending>Start for free</LinkPending>
          </Link>
        </Button>
      </header>
      {/* The page's one main region, where the "Skip to main content" link leads. */}
      <main id="main-content" tabIndex={-1} className="grid content-start gap-6 outline-none">
        <div className="grid gap-2">
          <h1 className="cb-subsection">{set.title}</h1>
          <p className="text-small text-muted-foreground">
            This study set has {set.questionCount} {set.questionCount === 1 ? "question" : "questions"}. It was made and
            shared by a CertBench member.
          </p>
        </div>
        <StudySetPlayer
          setId={set.id}
          questions={questions}
          seed={crypto.randomUUID()}
          persistProgress={false}
          backHref="/start"
          backLabel="Start the study path for your exam"
        />
      </main>
      {/* The player reports a failure in a toast, and only the signed-in workspace
          draws the toast container. This page is outside it, so it draws its own. */}
      <Toaster />
    </div>
  );
}
