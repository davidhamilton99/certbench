import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/server/supabase/server";
import { listEnrollments } from "@/server/data/enrollments";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { listMissedQuestions } from "@/server/data/review";
import { QuestionFlagButton } from "@/components/quiz/QuestionFlagButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Review",
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const enrollments = await listEnrollments(db, user.id);
  if (enrollments.length === 0) redirect("/onboarding");

  let active = certSlug ? await getCertificationBySlug(db, certSlug) : null;
  if (!active || !enrollments.some((e) => e.certificationId === active!.id)) {
    const certs = await listActiveCertifications(db);
    active =
      certs.find((c) => c.id === enrollments[0].certificationId) ?? null;
  }
  if (!active) redirect("/onboarding");

  const missed = await listMissedQuestions(db, user.id, active.id);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        <p className="text-sm text-muted-foreground">
          {active.name} · questions you&apos;ve missed, worst first
        </p>
      </div>

      {missed.length === 0 ? (
        <div className="grid gap-4 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing to review yet — missed questions will collect here.
          </p>
          <Button asChild variant="outline" className="justify-self-center">
            <Link href="/dashboard">Back to your plan</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {missed.map((m, i) => (
            <details
              key={m.question.id}
              className="group rounded-lg border bg-card px-4 py-3"
            >
              <summary className="flex cursor-pointer items-start gap-3 text-sm [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 shrink-0 rounded bg-danger/10 px-1.5 py-0.5 font-mono text-[11px] text-danger">
                  {m.timesCorrect}/{m.timesSeen}
                </span>
                <span className="leading-relaxed">
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                    {i + 1}.
                  </span>
                  {m.question.question_text}
                </span>
              </summary>
              <div className="mt-3 grid gap-1.5 border-t pt-3 text-sm">
                {m.question.options.map((option, oi) => (
                  <p
                    key={oi}
                    className={cn(
                      "flex items-start gap-2 rounded px-2 py-1",
                      oi === m.question.correct_index &&
                        "bg-success/10 text-success"
                    )}
                  >
                    {oi === m.question.correct_index && (
                      <Check className="mt-0.5 size-3.5 shrink-0" />
                    )}
                    {option.text}
                  </p>
                ))}
                {m.question.explanation && (
                  <p className="mt-1 text-muted-foreground">
                    {m.question.explanation}
                  </p>
                )}
                <div className="mt-1">
                  <QuestionFlagButton questionId={m.question.id} />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
