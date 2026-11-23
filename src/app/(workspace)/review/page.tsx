import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { listEnrollments } from "@/server/data/enrollments";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { listMissedQuestions } from "@/server/data/review";
import { QuestionFlagButton } from "@/components/quiz/QuestionFlagButton";
import { ReviewedAnswers } from "@/components/quiz/ReviewedAnswers";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Review",
};

/** The most questions the page lists. It is passed to the query and printed in the sentence, so the two agree. */
const REVIEW_LIMIT = 25;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const { db, user } = await requireProPage();

  const enrollments = await listEnrollments(db, user.id);
  if (enrollments.length === 0) redirect("/onboarding");

  let active = certSlug ? await getCertificationBySlug(db, certSlug) : null;
  if (!active || !enrollments.some((e) => e.certificationId === active!.id)) {
    const certs = await listActiveCertifications(db);
    active =
      certs.find((c) => c.id === enrollments[0].certificationId) ?? null;
  }
  if (!active) redirect("/onboarding");

  const missed = await listMissedQuestions(db, user.id, active.id, REVIEW_LIMIT);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Review</h1>
        <p className="text-small text-muted-foreground">
          These are {active.name} questions that you have answered incorrectly at least once. The questions with the
          lowest scores are first, and up to {REVIEW_LIMIT} are listed.
        </p>
      </div>

      {missed.length === 0 ? (
        <div className="grid gap-4 rounded-lg border border-dashed border-input p-8">
          <p className="text-small text-muted-foreground">
            You have no questions to review. A question that you answer incorrectly is listed here.
          </p>
          <Button asChild variant="outline" className="justify-self-start">
            <Link href="/dashboard">Return to your study plan</Link>
          </Button>
        </div>
      ) : (
        <ol className="grid gap-3">
          {missed.map((m, i) => (
            <li key={m.question.id}>
              <details className="glass rounded-lg px-4 py-3">
                <summary className="flex cursor-pointer items-start gap-3 text-small [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="mr-1.5 text-note tabular-nums text-muted-foreground">{i + 1}.</span>
                    {m.question.question_text}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-note tabular-nums text-muted-foreground">
                    {m.timesCorrect} of {m.timesSeen} correct
                  </span>
                </summary>
                <div className="mt-3 grid gap-1.5 border-t border-border pt-3 text-small">
                  {/* The answers in their stored order, each under its letter: an explanation that
                      names an answer by its letter ("option B") names the answer lettered B here,
                      as it did where the question was answered. */}
                  <ReviewedAnswers
                    options={m.question.options.map((option) => option.text)}
                    correctIndex={m.question.correct_index}
                  />
                  {m.question.explanation && (
                    <p className="mt-1 text-muted-foreground">{m.question.explanation}</p>
                  )}
                  <div className="mt-1">
                    <QuestionFlagButton questionId={m.question.id} />
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
